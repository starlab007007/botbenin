-- Explicit, reversible reference grouping. Never merge offers by title or phone alone.
create table public.waouh_search_aliases(
 alias_id text primary key,
 canonical_id text not null,
 reason text not null check(length(reason)>=10),
 created_at timestamptz not null default now(),
 check(alias_id<>canonical_id),
 check(alias_id ~ '^external:[0-9a-f-]{36}$' and canonical_id ~ '^external:[0-9a-f-]{36}$')
);
create index waouh_search_aliases_canonical_idx on public.waouh_search_aliases(canonical_id);
alter table public.waouh_search_aliases enable row level security;
revoke all on public.waouh_search_aliases from public,anon,authenticated;
grant select,insert,update,delete on public.waouh_search_aliases to service_role;

create or replace function public.waouh_search_canonical(p_id text,p_sources text[] default null)
returns text language sql stable security invoker set search_path='' as $$
 select coalesce((select a.canonical_id from public.waouh_search_aliases a join public.waouh_signal_fabric f on f.fabric_id=a.canonical_id
  where a.alias_id=p_id and(p_sources is null or f.source_key=any(p_sources)) and public.waouh_search_current(f.evidence) limit 1),p_id);
$$;
create or replace function public.waouh_search_group(p_keep text,p_alias text,p_reason text,p_same_offer boolean)
returns boolean language plpgsql set search_path='' as $$
declare keep public.waouh_search_documents;other public.waouh_search_documents;
begin
 if p_same_offer is distinct from true or length(btrim(p_reason))<10 or p_keep=p_alias or p_keep !~ '^external:[0-9a-f-]{36}$' or p_alias !~ '^external:[0-9a-f-]{36}$' then
  raise exception 'invalid_reference_group';end if;
 perform pg_advisory_xact_lock(hashtextextended('waouh-reference-groups',0));
 select * into strict keep from public.waouh_search_documents where fabric_id=p_keep;
 select * into strict other from public.waouh_search_documents where fabric_id=p_alias;
 if(select count(*) from public.waouh_signal_fabric f where f.fabric_id in(p_keep,p_alias) and public.waouh_search_current(f.evidence))<>2 then raise exception 'reference_not_current';end if;
 if keep.intent<>other.intent or keep.domain<>other.domain or keep.country_code is distinct from other.country_code or
  exists(select 1 from public.waouh_search_aliases where alias_id=p_keep or canonical_id=p_alias) then raise exception 'incompatible_reference_group';end if;
 insert into public.waouh_search_aliases(alias_id,canonical_id,reason) values(p_alias,p_keep,left(btrim(p_reason),1000))
 on conflict(alias_id) do update set canonical_id=excluded.canonical_id,reason=excluded.reason,created_at=now();
 return true;
end;$$;

create or replace function public.waouh_search_references(value jsonb,p_sources text[])
returns jsonb language sql stable security invoker set search_path='' as $$
 with members as(
  select value as row,0 as position
  union all
  select to_jsonb(f),1 from public.waouh_search_aliases a join public.waouh_signal_fabric f on f.fabric_id=a.alias_id
  where a.canonical_id=value->>'fabric_id' and(p_sources is null or f.source_key=any(p_sources)) and public.waouh_search_current(f.evidence)
 ), images as(
  select image,min(position*100000+ordinality) as position from members
  cross join lateral jsonb_array_elements(case when jsonb_typeof(row->'evidence'->'photos')='array' then row->'evidence'->'photos' else '[]'::jsonb end) with ordinality p(image,ordinality)
  group by image
 )
 select jsonb_set(value,'{evidence}',coalesce(value->'evidence','{}'::jsonb)||jsonb_build_object(
  'photos',coalesce((select jsonb_agg(image order by position) from images),'[]'::jsonb),
  'references',coalesce((select jsonb_agg(jsonb_build_object('fabric_id',row->>'fabric_id','source_key',row->>'source_key','source_url',row->>'source_url')) from members),'[]'::jsonb)));
$$;

-- Preserve the reviewed search contract while adding canonical reference grouping.
do $references$
declare definition text;
begin
 definition:=pg_get_functiondef('public.waouh_search_unified(text,text,text[],boolean,text,numeric,text,text,integer,integer)'::regprocedure);
 definition:=replace(definition,'jsonb_agg(record) from page','jsonb_agg(public.waouh_search_references(record,p_sources)) from page');
 definition:=replace(definition,'where public.waouh_search_current(f.evidence)',
  'where public.waouh_search_current(f.evidence) and not exists(select 1 from public.waouh_search_aliases a where a.alias_id=f.fabric_id and exists(select 1 from public.waouh_signal_fabric leader where leader.fabric_id=a.canonical_id and (p_sources is null or leader.source_key=any(p_sources)) and public.waouh_search_current(leader.evidence)))');
 execute definition;
end;$references$;
revoke all on function public.waouh_search_canonical(text,text[]),public.waouh_search_group(text,text,text,boolean),public.waouh_search_references(jsonb,text[]) from public,anon,authenticated;
grant execute on function public.waouh_search_canonical(text,text[]),public.waouh_search_group(text,text,text,boolean),public.waouh_search_references(jsonb,text[]) to service_role;
