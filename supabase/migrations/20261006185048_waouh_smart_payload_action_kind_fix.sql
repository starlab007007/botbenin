-- WAOUH Smart Event Envelope — action kind NULL guard.
-- PostgreSQL NULL NOT IN (...) evaluates to NULL, not TRUE. Explicitly handle
-- NULL so legacy {id,label} actions are classified as commerce/reply/etc.

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='waouh_smart_enrich_payload'
  limit 1;

  if v_definition is null then
    raise exception 'waouh_smart_enrich_payload not found';
  end if;

  if position('if v_kind not in' in v_definition) = 0 then
    raise exception 'expected action-kind guard not found';
  end if;

  v_definition := replace(
    v_definition,
    'if v_kind not in',
    'if v_kind is null or v_kind not in'
  );
  execute v_definition;
end;
$migration$;
