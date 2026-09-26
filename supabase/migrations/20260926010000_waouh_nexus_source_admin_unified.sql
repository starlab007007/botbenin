-- NEXUS Source Center — unified admin source registry, contact/photo enrichment.
-- Public or explicitly authorized collection only. Private groups are never crawled by default.

alter table public.waouh_radar_sources
  drop constraint if exists waouh_radar_sources_type_check;

alter table public.waouh_radar_sources
  add constraint waouh_radar_sources_type_check check (type in (
    'site','web_search','web_social','rss','directory','b2b_rfq',
    'fb_marketplace','fb_page','fb_group','instagram_business',
    'tiktok','telegram','telegram_channel','wa_group',
    'google_places','serpapi','apify_actor',
    'linkedin_public','youtube_public','x_public'
  ));

alter table public.waouh_external_commerce_signals
  add column if not exists primary_photo_url text,
  add column if not exists photo_urls text[] not null default '{}'::text[],
  add column if not exists contact_phone_last4 text,
  add column if not exists whatsapp_phone_last4 text,
  add column if not exists has_whatsapp boolean not null default false,
  add column if not exists contact_summary jsonb not null default '{}'::jsonb;

create index if not exists waouh_external_commerce_signals_whatsapp_idx
  on public.waouh_external_commerce_signals(has_whatsapp, observed_at desc)
  where has_whatsapp=true;

insert into public.waouh_discovery_sources
(source_key,label,family,connector_mode,operational_state,supports_buy,supports_sell,supports_business,supports_contact,default_contactability,trust_weight,capabilities)
values
('facebook_public','Facebook public / groupes autorisés','social','hybrid','requires_config',true,true,true,true,'C0',0.62,'{"public_groups":true,"marketplace":true,"apify":true,"allowlist_required":true}'::jsonb),
('instagram_public','Instagram public / Web','social','hybrid','requires_config',true,true,true,true,'C0',0.60,'{"public_web":true,"serpapi":true,"apify":true}'::jsonb),
('tiktok_public','TikTok public / Web','social','hybrid','requires_config',true,true,true,true,'C0',0.58,'{"public_web":true,"serpapi":true,"apify":true}'::jsonb),
('web_social','Web social public','social','hybrid','live',true,true,true,true,'C0',0.58,'{"serpapi":true,"firecrawl":true,"apify":true}'::jsonb),
('rss_public','Flux RSS / Atom publics','web','public_feed','requires_config',true,true,true,true,'C0',0.65,'{"rss":true,"atom":true}'::jsonb),
('linkedin_public','LinkedIn public / Web','social','hybrid','requires_config',true,true,true,true,'C0',0.62,'{"public_web":true,"serpapi":true}'::jsonb),
('youtube_public','YouTube public','social','hybrid','requires_config',true,true,true,true,'C0',0.62,'{"public_web":true,"video":true}'::jsonb),
('x_public','X / Twitter public','social','hybrid','requires_config',true,true,true,true,'C0',0.58,'{"public_web":true}'::jsonb),
('whatsapp_groups','WhatsApp groupes autorisés','messaging','native','live',true,true,false,true,'C2',0.85,'{"allowlist_required":true,"text":true,"photo":true,"realtime":true}'::jsonb)
on conflict (source_key) do update set
  label=excluded.label,
  family=excluded.family,
  connector_mode=excluded.connector_mode,
  operational_state=excluded.operational_state,
  supports_buy=excluded.supports_buy,
  supports_sell=excluded.supports_sell,
  supports_business=excluded.supports_business,
  supports_contact=excluded.supports_contact,
  default_contactability=excluded.default_contactability,
  trust_weight=excluded.trust_weight,
  capabilities=excluded.capabilities,
  updated_at=now();

insert into public.waouh_radar_api_configs
(provider,source_key,label,auth_mode,active,daily_quota,extra_config)
values
('serpapi','serpapi','SerpAPI / Web public','api_key',false,100,'{}'::jsonb),
('apify','apify','Apify / Web social public','api_key',false,50,'{}'::jsonb),
('firecrawl','web_social','Firecrawl / Sites Web','api_key',false,500,'{}'::jsonb),
('google_places','google_places','Google Places / Maps','api_key',false,500,'{}'::jsonb),
('facebook_business','facebook_business','Facebook Business / Pages','oauth_token',false,300,'{"page_ids":[]}'::jsonb),
('instagram_business','instagram_business','Instagram Business','oauth_token',false,300,'{"account_ids":[]}'::jsonb),
('telegram_public','telegram_public','Telegram public / Bot','bot_token',false,500,'{"chat_ids":[]}'::jsonb),
('tiktok_connected','tiktok_connected','TikTok connecté','oauth_token',false,200,'{}'::jsonb),
('whatsapp_groups','whatsapp_groups','WhatsApp groupes autorisés','native',true,0,'{"source_type":"wa_group"}'::jsonb),
('sms_rcs','sms_rcs','SMS / RCS WAOUH','native_settings',false,0,'{}'::jsonb)
on conflict (provider) do nothing;

update public.waouh_discovery_sources s
set operational_state = case
  when c.active=true and (c.api_key is not null or c.auth_mode in ('native','native_settings','none','share'))
    then case
      when s.source_key in ('facebook_business','instagram_business','telegram_public','tiktok_connected','google_places','serpapi','apify')
        then 'live'
      else s.operational_state
    end
  else case
    when s.operational_state='live' and s.source_key in ('facebook_business','instagram_business','telegram_public','tiktok_connected','google_places','serpapi','apify')
      then 'requires_config'
    else s.operational_state
  end
end,
updated_at=now()
from public.waouh_radar_api_configs c
where c.source_key=s.source_key;


-- Existing installations originally stored Firecrawl with source_key=firecrawl.
-- The unified registry represents that connector under web_social.
update public.waouh_radar_api_configs
set source_key='web_social', label='Firecrawl / Sites Web'
where provider='firecrawl';

-- Reflect current admin enablement in the discovery registry.
update public.waouh_discovery_sources s
set operational_state = case
  when c.active=false then 'disabled'
  when c.api_key is not null and length(c.api_key)>0 then 'live'
  else 'requires_config'
end,
updated_at=now()
from public.waouh_radar_api_configs c
where c.source_key=s.source_key
  and c.provider not in ('whatsapp_groups','sms_rcs');


-- Composite public Web/social surfaces remain live when any configured public
-- collector can feed them.
with ready as (
  select
    bool_or(provider='serpapi' and active and api_key is not null and length(api_key)>0) as serp,
    bool_or(provider='apify' and active and api_key is not null and length(api_key)>0) as apify,
    bool_or(provider='firecrawl' and active and api_key is not null and length(api_key)>0) as firecrawl
  from public.waouh_radar_api_configs
)
update public.waouh_discovery_sources s
set operational_state = case
      when coalesce(r.serp,false) or coalesce(r.apify,false) or coalesce(r.firecrawl,false)
        then 'live'
      else 'requires_config'
    end,
    updated_at=now()
from ready r
where s.source_key in (
  'web_social','facebook_public','instagram_public','tiktok_public',
  'linkedin_public','youtube_public','x_public'
);

with ready as (
  select bool_or(provider='firecrawl' and active and api_key is not null and length(api_key)>0) as firecrawl
  from public.waouh_radar_api_configs
)
update public.waouh_discovery_sources s
set operational_state = case when coalesce(r.firecrawl,false) then 'live' else 'requires_config' end,
    updated_at=now()
from ready r
where s.source_key='rss_public';
