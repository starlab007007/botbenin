alter table public.waouh_commerce_events enable row level security;
revoke all on table public.waouh_commerce_events from anon, authenticated;
comment on table public.waouh_commerce_events is
'WAOUH V3 internal commerce event stream. Client roles denied; access is server-side only.';
