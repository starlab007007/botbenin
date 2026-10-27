create or replace function public.waouh_require_module_access(p_key text) returns void language plpgsql stable security invoker set search_path='' as $$
begin if not public.waouh_module_access_allowed(p_key) then raise exception 'Ce module est actuellement indisponible.' using errcode='42501'; end if; end $$;
revoke all on function public.waouh_require_module_access(text) from public;
grant execute on function public.waouh_require_module_access(text) to anon,authenticated,service_role;
do $guard$
declare f record; next_body text; definition text; key text;
begin
 for f in select p.oid,p.proname,p.prosrc,l.lanname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and p.proname in ('waouh_adjust_partner_stock','waouh_stock_list_sources','waouh_bi_store_source','waouh_presence_claim_memberships','waouh_presence_claim_memberships_v5','waouh_presence_create_site_v5','waouh_presence_dashboard_v5','waouh_presence_preview_qr_v5','waouh_presence_public_preview_v6','waouh_presence_record_qr_action','waouh_presence_record_qr_action_public_v6','waouh_presence_record_qr_action_v5','waouh_presence_set_member_status_v5','waouh_presence_update_site_v5','waouh_presence_upsert_member','waouh_presence_upsert_member_v5') loop
  if position('waouh_require_module_access' in f.prosrc)>0 then continue;end if;
  key=case when f.proname like 'waouh_presence_%' then 'presence' when f.proname like 'waouh_bi_%' then 'bi' else 'stock' end;
  if f.lanname='plpgsql' then
   next_body=regexp_replace(f.prosrc,'(?im)^([[:space:]]*begin)\M',E'\\1\n perform public.waouh_require_module_access('||quote_literal(key)||');');
   if next_body=f.prosrc then raise exception 'Cannot guard %',f.proname;end if;
  elsif f.lanname='sql' then next_body='select public.waouh_require_module_access('||quote_literal(key)||E');\n'||f.prosrc;
  else raise exception 'Unsupported module function language'; end if;
  definition=pg_get_functiondef(f.oid);execute replace(definition,f.prosrc,next_body);
 end loop;
end $guard$;
