-- Account-scoped defaults; existing ownership policies remain in force.
alter table public.waouh_avatar_prefs
  add column if not exists autonomy_settings jsonb;
alter table public.waouh_avatar_prefs
  add constraint waouh_avatar_autonomy_object check (autonomy_settings is null or (jsonb_typeof(autonomy_settings) = 'object' and octet_length(autonomy_settings::text) <= 12000));
grant update (autonomy_settings) on public.waouh_avatar_prefs to authenticated;
