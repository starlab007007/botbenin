-- WAOUH NEXUS Global Discovery — Signal Fabric, entity/contact graph and source registry.
-- This layer normalizes commercial intent from internal, partner, public, shared and field sources.
-- Automated outreach remains controlled by contactability/consent; discovery is not consent.

create extension if not exists pg_trgm;

create table if not exists public.waouh_discovery_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  label text not null,
  family text not null check (family in (
    'internal','partner','web','maps','social','messaging','directory','field','b2b','telephony','catalog','other'
  )),
  connector_mode text not null check (connector_mode in (
    'native','api','oauth','share','public_feed','partner','manual','hybrid'
  )),
  operational_state text not null default 'requires_config' check (operational_state in (
    'live','requires_config','ingest_only','planned','disabled'
  )),
  supports_buy boolean not null default true,
  supports_sell boolean not null default true,
  supports_business boolean not null default false,
  supports_contact boolean not null default false,
  default_contactability text not null default 'C0' check (default_contactability in ('C0','C1','C2','C3','C4')),
  trust_weight numeric not null default 0.60 check (trust_weight between 0 and 1),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities)='object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.waouh_discovery_sources
(source_key,label,family,connector_mode,operational_state,supports_buy,supports_sell,supports_business,supports_contact,default_contactability,trust_weight,capabilities)
values
('waouh_app','WAOUH App / Chat','internal','native','live',true,true,false,true,'C2',0.90,'{"text":true,"photo":true,"voice":true}'::jsonb),
('partner','Partenaires WAOUH','partner','partner','live',true,true,true,true,'C4',0.95,'{"catalog":true,"stock":true,"agent_to_agent":true}'::jsonb),
('whatsapp','WhatsApp WAOUH','messaging','native','live',true,true,false,true,'C2',0.90,'{"text":true,"photo":true,"audio":true,"forward":true}'::jsonb),
('share_to_waouh','Partager vers WAOUH','social','share','live',true,true,true,true,'C0',0.70,'{"text":true,"url":true,"screenshot":true,"photo":true}'::jsonb),
('radar_ia','Radar IA','web','hybrid','live',true,true,true,true,'C0',0.65,'{"serpapi":true,"apify":true,"public_web":true}'::jsonb),
('serpapi','Web public / SerpAPI','web','api','requires_config',true,true,true,true,'C1',0.70,'{"google_search":true,"web":true}'::jsonb),
('apify','Web social public / Apify','social','api','requires_config',true,true,true,true,'C0',0.60,'{"public_pages":true,"public_feeds":true}'::jsonb),
('google_places','Google Places / Maps','maps','api','requires_config',false,true,true,true,'C1',0.85,'{"business_search":true,"phone":true,"website":true,"maps":true}'::jsonb),
('facebook_business','Facebook Business','social','hybrid','ingest_only',true,true,true,true,'C1',0.70,'{"share":true,"oauth_ready":true,"business_pages":true}'::jsonb),
('instagram_business','Instagram Business','social','hybrid','ingest_only',true,true,true,true,'C1',0.70,'{"share":true,"oauth_ready":true}'::jsonb),
('tiktok_connected','TikTok connecté','social','oauth','ingest_only',true,true,true,false,'C0',0.65,'{"share":true,"oauth_ready":true,"video":true}'::jsonb),
('telegram_public','Telegram public','social','public_feed','ingest_only',true,true,true,true,'C1',0.70,'{"public_channels":true,"share":true}'::jsonb),
('benin_directory','Annuaires entreprises Bénin','directory','hybrid','ingest_only',false,true,true,true,'C1',0.90,'{"business_registry":true,"public_business":true}'::jsonb),
('b2b_rfq','Demandes B2B / RFQ','b2b','hybrid','ingest_only',true,false,true,true,'C1',0.85,'{"rfq":true,"tender":true,"procurement":true}'::jsonb),
('scout','WAOUH Scouts / terrain','field','share','live',true,true,true,true,'C1',0.80,'{"price":true,"photo":true,"gps":true,"availability":true}'::jsonb),
('barcode','GTIN / code-barres','catalog','native','live',false,true,true,false,'C0',0.95,'{"gtin":true,"product_identity":true}'::jsonb),
('voice','WAOUH Voice','telephony','native','live',true,true,false,true,'C2',0.85,'{"speech_to_intent":true}'::jsonb),
('sms_rcs','SMS / RCS WAOUH','telephony','api','requires_config',true,true,false,true,'C3',0.90,'{"sms":true,"rcs":true,"opt_in_required":true}'::jsonb),
('ussd','USSD Commerce','telephony','api','planned',true,true,false,true,'C3',0.85,'{"low_bandwidth":true}'::jsonb),
('qr','QR Commerce','field','native','ingest_only',true,true,true,true,'C2',0.85,'{"physical_to_digital":true}'::jsonb)
on conflict (source_key) do update set
  label=excluded.label,
  family=excluded.family,
  connector_mode=excluded.connector_mode,
  supports_buy=excluded.supports_buy,
  supports_sell=excluded.supports_sell,
  supports_business=excluded.supports_business,
  supports_contact=excluded.supports_contact,
  default_contactability=excluded.default_contactability,
  trust_weight=excluded.trust_weight,
  capabilities=excluded.capabilities;

create table if not exists public.waouh_commerce_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null default 'unknown' check (entity_type in (
    'person','business','organization','broker','announcer','scout','unknown'
  )),
  primary_name text,
  canonical_key text,
  country_code text not null default 'BJ',
  city text,
  verification_state text not null default 'unverified' check (verification_state in (
    'unverified','source_verified','waouh_verified','partner_verified','rejected'
  )),
  trust_score numeric not null default 50 check (trust_score between 0 and 100),
  source_keys text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists waouh_commerce_entities_name_trgm_idx
  on public.waouh_commerce_entities using gin (lower(coalesce(primary_name,'')) gin_trgm_ops);
create index if not exists waouh_commerce_entities_key_idx
  on public.waouh_commerce_entities(canonical_key) where canonical_key is not null;

create table if not exists public.waouh_entity_contacts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.waouh_commerce_entities(id) on delete cascade,
  channel text not null check (channel in (
    'phone','whatsapp','email','website','facebook','instagram','tiktok','telegram','google_maps','other'
  )),
  value_encrypted text,
  value_hash text,
  value_last4 text,
  public_value text,
  source_key text not null,
  is_public_business boolean not null default false,
  consent_state text not null default 'unknown' check (consent_state in (
    'unknown','public_business','initiated','opt_in','partner_contract','revoked'
  )),
  contactability_level text not null default 'C0' check (contactability_level in ('C0','C1','C2','C3','C4')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists waouh_entity_contacts_hash_uq
  on public.waouh_entity_contacts(entity_id,channel,value_hash)
  where value_hash is not null;
create index if not exists waouh_entity_contacts_entity_idx
  on public.waouh_entity_contacts(entity_id,contactability_level);

create table if not exists public.waouh_external_commerce_signals (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  source_id uuid references public.waouh_discovery_sources(id) on delete set null,
  source_key text not null,
  source_external_id text,
  source_url text,
  intent text not null default 'UNKNOWN' check (intent in ('BUY','SELL','ANNOUNCE','RFQ','UNKNOWN')),
  actor_type text not null default 'unknown' check (actor_type in (
    'buyer','seller','announcer','business','broker','scout','unknown'
  )),
  entity_id uuid references public.waouh_commerce_entities(id) on delete set null,
  actor_name text,
  actor_handle text,
  contactability_level text not null default 'C0' check (contactability_level in ('C0','C1','C2','C3','C4')),
  contact_consent_basis text not null default 'unknown' check (contact_consent_basis in (
    'unknown','public_business','initiated','opt_in','partner_contract','shared_by_user'
  )),
  product_name text,
  canonical_key text,
  category text,
  brand text,
  model text,
  condition text,
  quantity numeric check (quantity is null or quantity >= 0),
  unit text,
  price_min numeric check (price_min is null or price_min >= 0),
  price_max numeric check (price_max is null or price_max >= 0),
  currency text not null default 'XOF' check (currency='XOF'),
  city text,
  country_code text not null default 'BJ',
  latitude numeric,
  longitude numeric,
  availability text check (availability is null or availability in ('available','low_stock','out_of_stock','unknown')),
  raw_text text,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  ai_extraction jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_extraction)='object'),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  trust_score numeric not null default 50 check (trust_score between 0 and 100),
  status text not null default 'active' check (status in ('active','expired','ignored','converted','rejected')),
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists waouh_external_commerce_signal_external_uq
  on public.waouh_external_commerce_signals(source_key,source_external_id)
  where source_external_id is not null;
create index if not exists waouh_external_commerce_signal_intent_idx
  on public.waouh_external_commerce_signals(intent,status,observed_at desc);
create index if not exists waouh_external_commerce_signal_product_trgm_idx
  on public.waouh_external_commerce_signals using gin (
    lower(coalesce(product_name,'') || ' ' || coalesce(raw_text,'')) gin_trgm_ops
  );
create index if not exists waouh_external_commerce_signal_entity_idx
  on public.waouh_external_commerce_signals(entity_id,observed_at desc);

create table if not exists public.waouh_signal_entity_links (
  signal_id uuid not null references public.waouh_external_commerce_signals(id) on delete cascade,
  entity_id uuid not null references public.waouh_commerce_entities(id) on delete cascade,
  role text not null check (role in ('buyer','seller','announcer','business','broker','observer')),
  confidence numeric not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (signal_id,entity_id,role)
);

create or replace function public.waouh_global_discovery_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists waouh_discovery_sources_updated on public.waouh_discovery_sources;
create trigger waouh_discovery_sources_updated before update on public.waouh_discovery_sources
for each row execute function public.waouh_global_discovery_updated_at();
drop trigger if exists waouh_commerce_entities_updated on public.waouh_commerce_entities;
create trigger waouh_commerce_entities_updated before update on public.waouh_commerce_entities
for each row execute function public.waouh_global_discovery_updated_at();
drop trigger if exists waouh_entity_contacts_updated on public.waouh_entity_contacts;
create trigger waouh_entity_contacts_updated before update on public.waouh_entity_contacts
for each row execute function public.waouh_global_discovery_updated_at();
drop trigger if exists waouh_external_commerce_signals_updated on public.waouh_external_commerce_signals;
create trigger waouh_external_commerce_signals_updated before update on public.waouh_external_commerce_signals
for each row execute function public.waouh_global_discovery_updated_at();

-- Canonical read model. Existing WAOUH sources remain authoritative; new external signals extend them.
create or replace view public.waouh_signal_fabric as
select
  'article:' || a.id::text as fabric_id,
  a.id::text as source_record_id,
  coalesce(nullif(a.source_channel,''),nullif(a.origin,''),'waouh_app')::text as source_key,
  'SELL'::text as intent,
  case when a.partner_id is not null then 'business' else 'seller' end::text as actor_type,
  a.title::text as subject,
  a.description::text as raw_text,
  a.category::text as category,
  a.brand::text as brand,
  a.model::text as model,
  a.condition::text as condition,
  a.price::numeric as price_min,
  a.price::numeric as price_max,
  coalesce(a.currency,'XOF')::text as currency,
  a.city::text as city,
  a.ai_canonical_key::text as canonical_key,
  case
    when a.source_channel='partner' then 'C4'
    when a.source_channel in ('waouh_app','whatsapp') then 'C2'
    else 'C0'
  end::text as contactability_level,
  greatest(0,least(100,coalesce(a.ai_quality_score,case when a.status='active' then 70 else 40 end)))::numeric as trust_score,
  coalesce(a.last_verified_at,a.updated_at,a.created_at)::timestamptz as observed_at,
  null::text as source_url,
  jsonb_build_object('article_id',a.id,'seller_id',a.seller_id,'partner_id',a.partner_id,'photos',to_jsonb(coalesce(a.photos,'{}'::text[]))) as evidence
from public.waouh_articles a
where a.status='active'
union all
select
  'buyer:' || b.id::text,
  b.id::text,
  coalesce(nullif(b.source_channel,''),nullif(b.origin,''),'waouh_app')::text,
  'BUY'::text,
  'buyer'::text,
  b.query_text::text,
  b.query_text::text,
  b.category::text,
  null::text,
  null::text,
  null::text,
  b.price_min::numeric,
  b.price_max::numeric,
  'XOF'::text,
  u.city::text,
  null::text,
  case
    when b.source_channel='partner' then 'C4'
    when b.source_channel in ('waouh_app','whatsapp') then 'C2'
    else 'C0'
  end::text,
  greatest(0,least(100,coalesce(b.ai_priority_score,65)))::numeric,
  b.created_at::timestamptz,
  null::text,
  jsonb_build_object('buyer_profile_id',b.id,'user_id',b.user_id,'keywords',coalesce(to_jsonb(b.keywords),'[]'::jsonb)) as evidence
from public.waouh_buyer_profiles b
left join public.waouh_users u on u.id=b.user_id
where b.is_active=true
union all
select
  'catalog:' || c.id::text,
  c.id::text,
  case c.source::text
    when 'partner' then 'partner'
    when 'radar' then 'radar_ia'
    else 'waouh_app'
  end::text,
  'SELL'::text,
  case when c.partner_id is not null or c.business_id is not null then 'business' else 'seller' end::text,
  c.titre::text,
  c.description::text,
  c.categorie::text,
  null::text,
  null::text,
  null::text,
  c.prix_min::numeric,
  c.prix_max::numeric,
  coalesce(c.devise,'XOF')::text,
  c.ville::text,
  c.gtin::text,
  case
    when c.source::text='partner' then 'C4'
    when c.source::text='chat' then 'C2'
    else 'C0'
  end::text,
  greatest(0,least(100,coalesce(c.qualite_score,case when c.verified then 85 else 60 end)))::numeric,
  coalesce(c.last_seen_at,c.updated_at,c.created_at)::timestamptz,
  null::text,
  jsonb_build_object(
    'catalog_id',c.id,
    'source',c.source::text,
    'partner_id',c.partner_id,
    'business_id',c.business_id,
    'seller_name',c.vendeur_nom,
    'gtin',c.gtin,
    'photos',to_jsonb(coalesce(c.photos,'{}'::text[])),
    'verified',c.verified
  ) as evidence
from public.waouh_unified_catalog c
where c.is_active=true
  and c.promoted_article_id is null
  and (c.expires_at is null or c.expires_at>now())
union all
select
  'legacy_external:' || e.id::text,
  e.id::text,
  'radar_ia'::text,
  'SELL'::text,
  'seller'::text,
  coalesce(e.title,e.description)::text,
  e.description::text,
  e.category::text,
  null::text,
  null::text,
  e.condition::text,
  e.price::numeric,
  e.price::numeric,
  coalesce(e.currency,'XOF')::text,
  e.city::text,
  null::text,
  'C0'::text,
  55::numeric,
  e.scraped_at::timestamptz,
  e.source_url::text,
  jsonb_build_object(
    'external_listing_id',e.id,
    'source',e.source,
    'seller_name',e.seller_name,
    'contact_last4',case when e.seller_phone is null then null else right(regexp_replace(e.seller_phone,'\D','','g'),4) end,
    'image_url',e.image_url
  ) as evidence
from public.waouh_external_listings e
where e.promoted_article_id is null
  and e.status not in ('ignored')
  and not exists (
    select 1 from public.waouh_radar_signals rr
    where rr.raw_url is not null and e.source_url is not null and rr.raw_url=e.source_url
  )
union all
select
  'radar:' || r.id::text,
  r.id::text,
  'radar_ia'::text,
  case when r.intent in ('BUY','SELL') then r.intent else 'ANNOUNCE' end::text,
  case when r.intent='BUY' then 'buyer' when r.intent='SELL' then 'seller' else 'announcer' end::text,
  coalesce(r.product->>'name',r.category,r.raw_text)::text,
  r.raw_text::text,
  r.category::text,
  r.product->>'brand',
  r.product->>'model',
  r.product->>'condition',
  r.price::numeric,
  r.price::numeric,
  'XOF'::text,
  r.city::text,
  null::text,
  case when p.opt_in=true then 'C3' else 'C0' end::text,
  greatest(0,least(100,coalesce(r.confidence,0.5)*100))::numeric,
  r.captured_at::timestamptz,
  r.raw_url::text,
  jsonb_build_object('radar_signal_id',r.id,'contact_last4',case when r.contact_phone is null then null else right(regexp_replace(r.contact_phone,'\D','','g'),4) end) as evidence
from public.waouh_radar_signals r
left join public.waouh_radar_profiles p
  on p.contact_phone is not null and r.contact_phone is not null and p.contact_phone=r.contact_phone
where r.status not in ('ignored')
union all
select
  'scout:' || s.id::text,
  s.id::text,
  'scout'::text,
  'ANNOUNCE'::text,
  'scout'::text,
  s.title::text,
  s.note::text,
  s.category::text,
  null::text,
  null::text,
  null::text,
  s.observed_price::numeric,
  s.observed_price::numeric,
  s.currency::text,
  s.city::text,
  s.gtin::text,
  'C1'::text,
  case when s.trust_state='verified' then 85 when s.trust_state='rejected' then 10 else 55 end::numeric,
  s.observed_at::timestamptz,
  null::text,
  jsonb_build_object('scout_report_id',s.id,'place_name',s.place_name,'availability',s.availability,'gtin',s.gtin,'photos',s.photo_urls) as evidence
from public.waouh_scout_reports s
where s.trust_state<>'rejected'
union all
select
  'external:' || x.id::text,
  x.id::text,
  x.source_key::text,
  x.intent::text,
  x.actor_type::text,
  coalesce(x.product_name,x.raw_text)::text,
  x.raw_text::text,
  x.category::text,
  x.brand::text,
  x.model::text,
  x.condition::text,
  x.price_min::numeric,
  x.price_max::numeric,
  x.currency::text,
  x.city::text,
  x.canonical_key::text,
  x.contactability_level::text,
  x.trust_score::numeric,
  x.observed_at::timestamptz,
  x.source_url::text,
  x.evidence
from public.waouh_external_commerce_signals x
where x.status='active' and (x.expires_at is null or x.expires_at>now());

alter table public.waouh_discovery_sources enable row level security;
alter table public.waouh_commerce_entities enable row level security;
alter table public.waouh_entity_contacts enable row level security;
alter table public.waouh_external_commerce_signals enable row level security;
alter table public.waouh_signal_entity_links enable row level security;

revoke all on table
  public.waouh_discovery_sources,
  public.waouh_commerce_entities,
  public.waouh_entity_contacts,
  public.waouh_external_commerce_signals,
  public.waouh_signal_entity_links
from anon,authenticated;
revoke all on public.waouh_signal_fabric from anon,authenticated;

grant select on public.waouh_discovery_sources to authenticated;
grant all on table
  public.waouh_discovery_sources,
  public.waouh_commerce_entities,
  public.waouh_entity_contacts,
  public.waouh_external_commerce_signals,
  public.waouh_signal_entity_links
to service_role;
grant select on public.waouh_signal_fabric to service_role;

drop policy if exists "authenticated read discovery source registry" on public.waouh_discovery_sources;
create policy "authenticated read discovery source registry"
on public.waouh_discovery_sources for select to authenticated using (true);

comment on table public.waouh_discovery_sources is
  'WAOUH Global Discovery connector registry. operational_state is explicit; configured/live must never be inferred.';
comment on table public.waouh_external_commerce_signals is
  'Canonical external/shared BUY/SELL/ANNOUNCE/RFQ signals. Contact data is stored separately and encrypted by the trusted Edge layer.';
comment on table public.waouh_commerce_entities is
  'Resolved commercial actors (person/business/broker/announcer/scout) used to deduplicate identities across sources.';
comment on table public.waouh_entity_contacts is
  'Encrypted/safe contact graph with explicit C0-C4 contactability and consent basis.';
comment on view public.waouh_signal_fabric is
  'Service-role canonical union of WAOUH offers, buyer demand, Radar, Scouts and normalized external discovery signals.';
