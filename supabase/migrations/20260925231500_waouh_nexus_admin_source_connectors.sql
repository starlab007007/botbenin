-- WAOUH NEXUS — administration unifiée des connecteurs de découverte.
-- Secrets: table admin-only. Espaces privés: uniquement cibles explicitement autorisées.

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

create unique index if not exists waouh_radar_api_configs_source_key_uq
  on public.waouh_radar_api_configs(source_key) where source_key is not null;

update public.waouh_radar_api_configs
set source_key=coalesce(source_key,provider),
    label=coalesce(label,case provider
      when 'serpapi' then 'SerpAPI / Web public'
      when 'apify' then 'Apify / Web social public'
      else provider end),
    auth_mode=coalesce(nullif(auth_mode,''),'api_key')
where provider in ('serpapi','apify');

insert into public.waouh_radar_api_configs
(provider,source_key,label,auth_mode,active,daily_quota,extra_config,docs_url)
values
('google_places','google_places','Google Places / Maps','api_key',false,500,'{}'::jsonb,'https://developers.google.com/maps/documentation/places/web-service'),
('facebook_business','facebook_business','Facebook Business / Pages','oauth_token',false,300,'{"page_ids":[]}'::jsonb,'https://developers.facebook.com/docs/graph-api/'),
('instagram_business','instagram_business','Instagram Business','oauth_token',false,300,'{"account_ids":[]}'::jsonb,'https://developers.facebook.com/docs/instagram-platform/'),
('telegram_public','telegram_public','Telegram public / Bot','bot_token',false,500,'{"chat_ids":[]}'::jsonb,'https://core.telegram.org/bots/api'),
('tiktok_connected','tiktok_connected','TikTok connecté','oauth_token',false,200,'{}'::jsonb,'https://developers.tiktok.com/doc/display-api-overview/'),
('whatsapp_groups','whatsapp_groups','WhatsApp groupes autorisés','native',true,0,'{"source_type":"wa_group"}'::jsonb,null),
('sms_rcs','sms_rcs','SMS / RCS WAOUH','native_settings',false,0,'{}'::jsonb,null)
on conflict (provider) do update set
  source_key=excluded.source_key,label=excluded.label,auth_mode=excluded.auth_mode,
  docs_url=coalesce(public.waouh_radar_api_configs.docs_url,excluded.docs_url);

update public.waouh_radar_api_configs
set source_key=coalesce(source_key,provider),label=coalesce(label,provider)
where source_key is null or label is null;

alter table public.waouh_radar_sources
  drop constraint if exists waouh_radar_sources_type_check;
alter table public.waouh_radar_sources
  add constraint waouh_radar_sources_type_check check (type in (
    'site','web_search','rss','fb_marketplace','fb_page','fb_group',
    'instagram_business','tiktok','wa_group','telegram','telegram_channel',
    'google_places','directory','b2b_rfq','serpapi'
  ));

insert into public.waouh_discovery_sources
(source_key,label,family,connector_mode,operational_state,supports_buy,supports_sell,
 supports_business,supports_contact,default_contactability,trust_weight,capabilities,metadata)
values
('whatsapp_groups','WhatsApp groupes autorisés','messaging','hybrid','ingest_only',
 true,true,false,true,'C2',0.82,
 '{"text":true,"photo":true,"audio":true,"authorized_groups":true,"webhook":true}'::jsonb,
 '{"privacy":"allowlist_only"}'::jsonb),
('web_social','Web social public','social','hybrid','requires_config',
 true,true,true,true,'C0',0.62,
 '{"serpapi":true,"apify":true,"public_pages":true,"public_feeds":true}'::jsonb,
 '{"privacy":"public_only"}'::jsonb)
on conflict (source_key) do update set
 label=excluded.label,family=excluded.family,connector_mode=excluded.connector_mode,
 supports_buy=excluded.supports_buy,supports_sell=excluded.supports_sell,
 supports_business=excluded.supports_business,supports_contact=excluded.supports_contact,
 default_contactability=excluded.default_contactability,trust_weight=excluded.trust_weight,
 capabilities=excluded.capabilities,metadata=excluded.metadata;

update public.waouh_discovery_sources
set capabilities=capabilities || '{"photo":true,"contact_extraction":true,"phone_normalization_bj":true}'::jsonb
where source_key in (
 'serpapi','apify','google_places','facebook_business','instagram_business',
 'tiktok_connected','telegram_public','whatsapp','share_to_waouh','radar_ia',
 'sms_rcs','b2b_rfq','benin_directory'
);

comment on table public.waouh_radar_api_configs is
 'Admin-only NEXUS connector credentials/configuration. api_key is never returned to browser clients.';
