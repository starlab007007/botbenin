-- Keep a matching reference visible when its canonical title does not match the query.
do $recall$ declare definition text;begin
 definition:=pg_get_functiondef('public.waouh_search_unified(text,text,text[],boolean,text,numeric,text,text,integer,integer)'::regprocedure);
 definition:=replace(definition,
  'where a.alias_id=f.fabric_id and exists(select 1 from public.waouh_signal_fabric leader',
  'where a.alias_id=f.fabric_id and exists(select 1 from candidates matched where matched.fabric_id=a.canonical_id) and exists(select 1 from public.waouh_signal_fabric leader');
 execute definition;
end;$recall$;
do $indexes$ begin
if to_regclass('public.waouh_collection_entries') is not null then
create index waouh_collection_entries_alias_idx on public.waouh_collection_entries(alias_of) where alias_of is not null;
end if;
if to_regclass('public.waouh_collection_platforms') is not null then
create index waouh_collection_platforms_engine_idx on public.waouh_collection_platforms(engine_key);
end if;
end;$indexes$;

-- System articles serve existing negotiations; their external source remains the search authority.
do $copies$ declare definition text;begin
 definition:=pg_get_functiondef('public.waouh_search_refresh_id(text)'::regprocedure);
 definition:=replace(definition,' select to_jsonb(f) into r',
  $guard$ if p_id like 'article:%' and exists(select 1 from public.waouh_articles a join public.waouh_users u on u.id=a.seller_id
   where 'article:'||a.id::text=p_id and u.web_session_id like 'nexus-ext|%') then
   delete from public.waouh_search_documents where fabric_id=p_id;return;end if;
 select to_jsonb(f) into r$guard$);
 execute definition;
 delete from public.waouh_search_documents d using public.waouh_articles a,public.waouh_users u
 where d.fabric_id='article:'||a.id::text and u.id=a.seller_id and u.web_session_id like 'nexus-ext|%';
end;$copies$;
