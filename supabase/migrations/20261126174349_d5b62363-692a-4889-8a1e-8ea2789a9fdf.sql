create or replace function public.waouh_search_unified(p_query text, p_mode text DEFAULT 'find_sellers', p_sources text[] DEFAULT NULL, p_internal_only boolean DEFAULT false, p_city text DEFAULT NULL, p_budget numeric DEFAULT NULL, p_domain text DEFAULT NULL, p_country text DEFAULT NULL, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
returns jsonb language plpgsql stable set search_path='' as $fn$
declare query tsquery; terms text; numbers text; result jsonb;
begin
 if length(coalesce(p_query,''))>1000 or p_limit not between 1 and 200 or p_offset not between 0 and 100000 or
  p_mode not in('find_sellers','find_buyers') or(p_domain is not null and p_domain not in('product','service','job','property','announcement')) then
  raise exception 'invalid_unified_search';end if;
 select string_agg(quote_literal(t)||':*',' | ') filter(where t !~ '^[0-9]+$'),
  string_agg(quote_literal(t),' & ') filter(where t ~ '^[0-9]+$') into terms,numbers
 from(select distinct t from regexp_split_to_table(public.waouh_search_normalize(p_query),'\s+') t
  where length(t) between 2 and 30 and not(t ~ '^[0-9]{4,}$') and t<>all(array['le','la','les','un','une','des','de','du','au','aux','et','ou','pour','je','cherche','recherche','veux','besoin','vendre','acheter','avec','sur','dans','fcfa','cfa','prix','disponible','vente']) limit 16) words;
 if terms is not null or numbers is not null then
  query:=to_tsquery('simple',concat_ws(' & ',case when terms is not null then '('||terms||')' end,numbers));end if;
 with candidates as materialized(
  select d.fabric_id,case when query is null then 0 else ts_rank_cd(d.search_vector,query) end as rank,d.observed_at
  from public.waouh_search_documents d
  where (query is null or d.search_vector@@query)
   and d.intent=any(case when p_mode='find_buyers' then array['BUY','RFQ','ANNOUNCE'] else array['SELL','ANNOUNCE'] end)
   and(p_sources is null or d.source_key=any(p_sources))
   and(not p_internal_only or d.fabric_id like 'article:%' or d.fabric_id like 'catalog:%')
   and(p_domain is null or d.domain=p_domain or(p_domain='announcement' and d.domain='job'))
   and(p_country is null or d.country_code=p_country)
   and(p_budget is null or d.price_min is null or d.price_min<=p_budget)
   and(p_city is null or d.city_normalized='' or d.city_normalized like '%'||btrim(public.waouh_search_normalize(p_city))||'%')
 ),
 -- The fabric view is a UNION of several sources: read it ONCE, then hash-join.
 fabric as materialized(
  select f.* from public.waouh_signal_fabric f
 ),
 eligible as materialized(
  select to_jsonb(f) as record,c.rank,c.observed_at,c.fabric_id from candidates c
  join fabric f on f.fabric_id=c.fabric_id
  where public.waouh_search_current(f.evidence) and not exists(select 1 from public.waouh_search_aliases a where a.alias_id=f.fabric_id and exists(select 1 from candidates matched where matched.fabric_id=a.canonical_id) and exists(select 1 from fabric leader where leader.fabric_id=a.canonical_id and (p_sources is null or leader.source_key=any(p_sources)) and public.waouh_search_current(leader.evidence)))
 ), page as(
  select record,rank from eligible order by rank desc,observed_at desc nulls last,fabric_id limit p_limit offset p_offset
 )
 select jsonb_build_object('records',coalesce((select jsonb_agg(public.waouh_search_references(record,p_sources)) from page),'[]'::jsonb),
  'total',(select count(*) from eligible),'offset',p_offset,'limit',p_limit,
  'next_offset',case when (select count(*) from eligible)>p_offset+p_limit then p_offset+p_limit else null end,
  'indexed',true,'checked_at',now()) into result;
 return result;
end;
$fn$;