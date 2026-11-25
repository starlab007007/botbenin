-- One private, rebuildable search projection for every branch of the live fabric.
create or replace function public.waouh_search_normalize(value text)
returns text language sql immutable parallel safe set search_path='' as $$
 select regexp_replace(translate(lower(coalesce(value,'')),
  'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ','aaaaaaceeeeiiiinooooouuuuyy'),'[^a-z0-9]+',' ','g');
$$;

create or replace function public.waouh_search_domain(value jsonb)
returns text language sql immutable parallel safe set search_path='' as $$
 select case
  when public.waouh_search_normalize(coalesce(value->>'category','')||' '||coalesce(value->>'subject','')) ~ '(emploi|recrutement|candidature|job|stage)' then 'job'
  when public.waouh_search_normalize(coalesce(value->>'category','')||' '||coalesce(value->>'subject','')) ~ '(immobilier|appartement|villa|chambre|parcelle|terrain)' then 'property'
  when value->>'intent'='ANNOUNCE' or value->'evidence'->>'offer_kind'='announcement' then 'announcement'
  when value->'evidence'->>'offer_kind'='service' or public.waouh_search_normalize(value->>'category') ~ '(service|prestataire|plomb|reparation)' then 'service'
  else 'product' end;
$$;

create table public.waouh_search_documents(
 fabric_id text primary key,
 source_key text not null,
 intent text not null,
 domain text not null,
 country_code text,
 city_normalized text not null,
 title_normalized text not null,
 search_vector tsvector not null,
 price_min numeric,
 observed_at timestamptz,
 indexed_at timestamptz not null default now()
);
create index waouh_search_documents_text_idx on public.waouh_search_documents using gin(search_vector);
create index waouh_search_documents_filter_idx on public.waouh_search_documents(intent,domain,country_code,city_normalized);
create index waouh_search_documents_observed_idx on public.waouh_search_documents(observed_at desc,fabric_id);
alter table public.waouh_search_documents enable row level security;
revoke all on public.waouh_search_documents from public,anon,authenticated;
grant select,insert,update,delete on public.waouh_search_documents to service_role;

create or replace function public.waouh_search_refresh_id(p_id text)
returns void language plpgsql security definer set search_path='' as $$
declare r jsonb; country text;
begin
 select to_jsonb(f) into r from public.waouh_signal_fabric f where f.fabric_id=p_id limit 1;
 if r is null then delete from public.waouh_search_documents where fabric_id=p_id;return;end if;
 if p_id like 'external:%' then
  select country_code into country from public.waouh_external_commerce_signals where id=(r->>'source_record_id')::uuid;
 else country:=coalesce(r->'evidence'->>'country_code','BJ');end if;
 insert into public.waouh_search_documents(fabric_id,source_key,intent,domain,country_code,city_normalized,title_normalized,search_vector,price_min,observed_at)
 values(p_id,coalesce(r->>'source_key','unknown'),coalesce(r->>'intent','UNKNOWN'),public.waouh_search_domain(r),country,
  btrim(public.waouh_search_normalize(r->>'city')),btrim(public.waouh_search_normalize(r->>'subject')),
  setweight(to_tsvector('simple',public.waouh_search_normalize(coalesce(r->>'subject','')||' '||coalesce(r->>'brand','')||' '||coalesce(r->>'model',''))),'A')||
  setweight(to_tsvector('simple',public.waouh_search_normalize(coalesce(r->>'category',''))),'B')||
  setweight(to_tsvector('simple',public.waouh_search_normalize(coalesce(r->>'raw_text',''))),'C'),
  (r->>'price_min')::numeric,(r->>'observed_at')::timestamptz)
 on conflict(fabric_id) do update set source_key=excluded.source_key,intent=excluded.intent,domain=excluded.domain,
  country_code=excluded.country_code,city_normalized=excluded.city_normalized,title_normalized=excluded.title_normalized,
  search_vector=excluded.search_vector,price_min=excluded.price_min,observed_at=excluded.observed_at,indexed_at=now();
end;
$$;

create or replace function public.waouh_search_sync()
returns trigger language plpgsql security definer set search_path='' as $$
declare value jsonb; key text; related record; old_value jsonb;
begin
 value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 old_value:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 if tg_table_name='waouh_users' then
  for related in select id from public.waouh_buyer_profiles where user_id=(value->>'id')::uuid loop
   perform public.waouh_search_refresh_id('buyer:'||related.id);end loop;
 elsif tg_table_name='waouh_radar_profiles' then
  for related in select id from public.waouh_radar_signals where contact_phone in(value->>'contact_phone',old_value->>'contact_phone') loop
   perform public.waouh_search_refresh_id('radar:'||related.id);end loop;
 else
  key:=case tg_table_name when 'waouh_articles' then 'article:' when 'waouh_buyer_profiles' then 'buyer:'
   when 'waouh_unified_catalog' then 'catalog:' when 'waouh_external_listings' then 'legacy_external:'
   when 'waouh_radar_signals' then 'radar:' when 'waouh_scout_reports' then 'scout:' else 'external:' end;
  perform public.waouh_search_refresh_id(key||(value->>'id'));
  if tg_table_name='waouh_articles' then
   for related in select id from public.waouh_unified_catalog where source_ref_id=(value->>'id')::uuid loop
    perform public.waouh_search_refresh_id('catalog:'||related.id);end loop;
  elsif tg_table_name='waouh_radar_signals' then
   for related in select id from public.waouh_external_listings where source_url in(value->>'raw_url',old_value->>'raw_url') loop
    perform public.waouh_search_refresh_id('legacy_external:'||related.id);end loop;
  end if;
 end if;
 return null;
end;
$$;
do $sync$
declare name text;
begin
 foreach name in array array['waouh_articles','waouh_buyer_profiles','waouh_unified_catalog','waouh_external_listings',
  'waouh_radar_signals','waouh_scout_reports','waouh_external_commerce_signals','waouh_users','waouh_radar_profiles'] loop
  execute format('create trigger waouh_search_sync after insert or update or delete on public.%I for each row execute function public.waouh_search_sync()',name);
 end loop;
end;
$sync$;

-- Eligibility is checked against the live source, not an old cached copy.
create or replace function public.waouh_search_current(evidence jsonb)
returns boolean language plpgsql stable set search_path='' as $$
declare value text; deadline timestamptz;
begin
 if evidence->>'availability' in('unavailable','out_of_stock','sold','closed') then return false;end if;
 foreach value in array array[evidence->>'deadline',evidence->>'closing_date',evidence->>'expires_at'] loop
  if value is not null then
   begin
    deadline:=case when value ~ '^\d{4}-\d{2}-\d{2}$' then (value||'T23:59:59+01:00')::timestamptz
     when value ~ '^\d{4}-\d{2}-\d{2}T' then value::timestamptz else null end;
   exception when others then deadline:=null;end;
   if deadline<=now() then return false;end if;
  end if;
 end loop;
 return true;
end;
$$;

create or replace function public.waouh_search_unified(
 p_query text,p_mode text default 'find_sellers',p_sources text[] default null,p_internal_only boolean default false,
 p_city text default null,p_budget numeric default null,p_domain text default null,p_country text default null,
 p_limit integer default 100,p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
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
 ), eligible as materialized(
  select to_jsonb(f) as record,c.rank,c.observed_at,c.fabric_id from candidates c
  join public.waouh_signal_fabric f on f.fabric_id=c.fabric_id
  where public.waouh_search_current(f.evidence)
 ), page as(
  select record,rank from eligible order by rank desc,observed_at desc nulls last,fabric_id limit p_limit offset p_offset
 )
 select jsonb_build_object('records',coalesce((select jsonb_agg(record) from page),'[]'::jsonb),
  'total',(select count(*) from eligible),'offset',p_offset,'limit',p_limit,
  'next_offset',case when (select count(*) from eligible)>p_offset+p_limit then p_offset+p_limit else null end,
  'indexed',true,'checked_at',now()) into result;
 return result;
end;
$$;

do $backfill$ declare row record;begin
 for row in select distinct fabric_id from public.waouh_signal_fabric loop perform public.waouh_search_refresh_id(row.fabric_id);end loop;
end;$backfill$;

revoke all on function public.waouh_search_normalize(text),public.waouh_search_domain(jsonb),public.waouh_search_refresh_id(text),
 public.waouh_search_sync(),public.waouh_search_current(jsonb),public.waouh_search_unified(text,text,text[],boolean,text,numeric,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.waouh_search_normalize(text),public.waouh_search_domain(jsonb),public.waouh_search_current(jsonb),
 public.waouh_search_refresh_id(text),public.waouh_search_unified(text,text,text[],boolean,text,numeric,text,text,integer,integer) to service_role;
