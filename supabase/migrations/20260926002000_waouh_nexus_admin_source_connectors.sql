-- NEXUS source connector administration and unified discovery registry.
-- Idempotent production migration: expands the original SerpAPI/Apify-only
-- provider table while preserving existing credentials and usage counters.

alter table public.waouh_radar_api_configs
  drop constraint if exists waouh_radar_api_configs_provider_check;

alter table public.waouh_radar_api_configs
  add column if not exists source_key text,
  add column if not exists label text,
  add column if not exists auth_mode text not null default 'api_key',
  add column if not exists base_url text,
  add column if not exists docs_url text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_sync_status text,
  add column if not exists last_sync_message text;

alter table public.waouh_radar_api_configs
  add constraint waouh_radar_api_configs_provider_check
  check (provider in (
    'serpapi','apify','firecrawl','google_places',
    'facebook_business','instagram_business',
    'telegram_public','tiktok_connected',
    'whatsapp_groups','sms_rcs'
  ));

insert into public.waouh_radar_api_configs
  (provider, source_key, label, auth_mode, active, daily_quota)
values
  ('serpapi','serpapi','SerpAPI / Web public','api_key',false,1000),
  ('apify','apify','Apify / Web social public','api_key',false,500),
  ('firecrawl','firecrawl','Firecrawl / Sites Web','api_key',false,500),
  ('google_places','google_places','Google Places / Maps','api_key',false,500),
  ('facebook_business','facebook_business','Facebook Business / Pages','oauth_token',false,300),
  ('instagram_business','instagram_business','Instagram Business','oauth_token',false,300),
  ('telegram_public','telegram_public','Telegram public / Bot','bot_token',false,500),
  ('tiktok_connected','tiktok_connected','TikTok connecté','oauth_token',false,200),
  ('whatsapp_groups','whatsapp_groups','WhatsApp groupes autorisés','native',true,0),
  ('sms_rcs','sms_rcs','SMS / RCS WAOUH','native_settings',false,0)
on conflict (provider) do update
set source_key = excluded.source_key,
    label = excluded.label,
    auth_mode = excluded.auth_mode;

insert into public.waouh_discovery_sources
  (source_key,label,family,connector_mode,operational_state,
   supports_buy,supports_sell,supports_business,supports_contact,
   default_contactability,trust_weight,capabilities)
values
  ('firecrawl','Sites Web / Firecrawl','web','api','requires_config',
   true,true,true,true,'C0',0.65,
   '{"public_sites":true,"photos":true,"phone_extraction":true,"services":true}'::jsonb),
  ('web_social','Web social multi-source','social','hybrid','requires_config',
   true,true,true,true,'C0',0.62,
   '{"serpapi":true,"apify":true,"firecrawl":true,"public_only":true}'::jsonb),
  ('whatsapp_groups','WhatsApp groupes autorisés','messaging','native','requires_config',
   true,true,false,true,'C0',0.65,
   '{"allowlist_only":true,"webhook":true,"photos":true,"phone_from_sender":true}'::jsonb)
on conflict (source_key) do update
set label = excluded.label,
    family = excluded.family,
    connector_mode = excluded.connector_mode,
    supports_buy = excluded.supports_buy,
    supports_sell = excluded.supports_sell,
    supports_business = excluded.supports_business,
    supports_contact = excluded.supports_contact,
    default_contactability = excluded.default_contactability,
    trust_weight = excluded.trust_weight,
    capabilities = public.waouh_discovery_sources.capabilities || excluded.capabilities;

create index if not exists idx_waouh_radar_api_configs_source_key
  on public.waouh_radar_api_configs(source_key);
