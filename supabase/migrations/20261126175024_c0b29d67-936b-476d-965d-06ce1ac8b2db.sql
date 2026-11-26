CREATE OR REPLACE FUNCTION public.waouh_search_references(value jsonb, p_sources text[])
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $function$
 with alias_ids as materialized(
  select a.alias_id from public.waouh_search_aliases a where a.canonical_id=value->>'fabric_id'
 ), members as(
  select value as row,0 as position
  union all
  -- Only read the offers view when this record actually has aliases (almost never):
  -- scanning it for every result made each search exceed the time limit.
  select to_jsonb(f),1 from public.waouh_signal_fabric f
  where exists(select 1 from alias_ids) and f.fabric_id in (select alias_id from alias_ids)
   and(p_sources is null or f.source_key=any(p_sources)) and public.waouh_search_current(f.evidence)
 ), images as(
  select image,min(position*100000+ordinality) as position from members
  cross join lateral jsonb_array_elements(case when jsonb_typeof(row->'evidence'->'photos')='array' then row->'evidence'->'photos' else '[]'::jsonb end) with ordinality p(image,ordinality)
  group by image
 )
 select jsonb_set(value,'{evidence}',coalesce(value->'evidence','{}'::jsonb)||jsonb_build_object(
  'photos',coalesce((select jsonb_agg(image order by position) from images),'[]'::jsonb),
  'references',coalesce((select jsonb_agg(jsonb_build_object('fabric_id',row->>'fabric_id','source_key',row->>'source_key','source_url',row->>'source_url')) from members),'[]'::jsonb)));
$function$;