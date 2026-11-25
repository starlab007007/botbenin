create table public.waouh_collection_platforms(
 platform_key text primary key,
 hostname text not null unique check(hostname ~ '^[a-z0-9.-]+$'),
 label text not null,
 access_state text not null default 'review' check(access_state in('review','authorized','paused','unverified','partner_only')),
 rights_reference text not null default '',
 attribution text not null default '',
 media_authorized boolean not null default false,
 media_hosts text[] not null default '{}',
 engine_key text not null default 'cheerio' references public.waouh_collection_engines(engine_key),
 transport text not null default 'direct' check(transport in('direct','apify','serpapi')),
 adapter_key text not null default 'none' check(adapter_key in('none','classifieds','coinafrique','goafrica','schema_org','rss_atom')),
 discovery_minutes integer not null default 360 check(discovery_minutes between 30 and 10080),
 recheck_minutes integer not null default 1440 check(recheck_minutes between 60 and 43200),
 daily_page_limit integer not null default 100 check(daily_page_limit between 1 and 1000),
 updated_at timestamptz not null default now()
);
create table public.waouh_collection_entries(
 entry_no integer primary key,
 platform_key text not null references public.waouh_collection_platforms(platform_key),
 label text not null,
 url text not null check(url ~ '^https://'),
 alias_of integer references public.waouh_collection_entries(entry_no),
 audit_note text not null default '',
 target_id uuid references public.waouh_collection_targets(id),
 test_status text check(test_status in('passed','failed')),
 test_at timestamptz,
 test_config_hash text,
 test_report jsonb
);
create index waouh_collection_entries_platform_idx on public.waouh_collection_entries(platform_key);
create index waouh_collection_entries_target_idx on public.waouh_collection_entries(target_id);
create table public.waouh_collection_documents(
 id uuid primary key default gen_random_uuid(),
 target_id uuid not null references public.waouh_collection_targets(id),
 url text not null check(url ~ '^https://' and length(url)<=1800),
 kind text not null check(kind in('index','detail')),
 state text not null default 'pending' check(state in('pending','active','missing','removed','quarantine','unreachable')),
 etag text,last_modified text,content_hash text,
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 last_checked_at timestamptz,
 next_due_at timestamptz not null default now(),
 missing_count integer not null default 0,
 last_error text,
 record_id uuid,
 unique(target_id,url)
);
create index waouh_collection_documents_due_idx on public.waouh_collection_documents(target_id,next_due_at,last_checked_at) where state<>'removed';
create index waouh_collection_documents_record_idx on public.waouh_collection_documents(record_id);
create table public.waouh_collection_document_versions(
 id bigint generated always as identity primary key,
 document_id uuid not null references public.waouh_collection_documents(id),
 content_hash text not null,
 facts jsonb not null,
 created_at timestamptz not null default now()
);
create index waouh_collection_document_versions_doc_idx on public.waouh_collection_document_versions(document_id,created_at desc);
create table public.waouh_collection_page_usage(
 hostname text not null,day date not null default current_date,pages integer not null default 0,
 primary key(hostname,day)
);
do $private$ declare name text;begin
 foreach name in array array['waouh_collection_platforms','waouh_collection_entries','waouh_collection_documents','waouh_collection_document_versions','waouh_collection_page_usage'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from public,anon,authenticated',name);
  execute format('grant select,insert,update,delete on public.%I to service_role',name);
 end loop;
end;$private$;
grant usage,select on sequence public.waouh_collection_document_versions_id_seq to service_role;

create or replace function public.waouh_collection_reserve_page(p_host text,p_limit integer)
returns boolean language plpgsql set search_path='' as $$
declare used integer;
begin
 if p_limit not between 1 and 1000 then raise exception 'invalid_page_limit';end if;
 insert into public.waouh_collection_page_usage(hostname,day,pages) values(p_host,current_date,1)
 on conflict(hostname,day) do update set pages=public.waouh_collection_page_usage.pages+1
 where public.waouh_collection_page_usage.pages<p_limit returning pages into used;
 return used is not null;
end;$$;

-- Connection is transactional, reuses an existing source, and requires a recent matching dry test.
create or replace function public.waouh_collection_connect_entry(p_entry integer,p_hash text)
returns uuid language plpgsql set search_path='' as $$
declare e public.waouh_collection_entries;p public.waouh_collection_platforms;s uuid;t uuid;
begin
 select * into strict e from public.waouh_collection_entries where entry_no=p_entry for update;
 select * into strict p from public.waouh_collection_platforms where platform_key=e.platform_key for share;
 if e.alias_of is not null or p.access_state<>'authorized' or length(btrim(p.rights_reference))<5 or length(btrim(p.attribution))<5 or
  p.adapter_key='none' or e.test_status is distinct from 'passed' or e.test_at<now()-interval '24 hours' or e.test_config_hash is distinct from p_hash then
  raise exception 'source_not_ready';end if;
 perform pg_advisory_xact_lock(hashtextextended(e.url,0));
 select id into s from public.waouh_radar_sources where type='site' and identifier=e.url order by created_at limit 1;
 if s is null then
  insert into public.waouh_radar_sources(type,identifier,label,active,scan_freq_min,config)
  values('site',e.url,e.label,true,p.discovery_minutes,'{}'::jsonb) returning id into s;
 end if;
 update public.waouh_radar_sources set active=true,scan_freq_min=p.discovery_minutes,config=coalesce(config,'{}'::jsonb)||
  jsonb_build_object('collection_format',p.adapter_key,'collection_transport',p.transport,'automation_authorized',true,
   'authorization_reference',p.rights_reference,'media_reuse_authorized',p.media_authorized,'media_hosts',to_jsonb(p.media_hosts),
   'attribution',p.attribution,'country_scope','BJ','canonical_url',e.url,'platform_key',p.platform_key,'managed_catalog',p.adapter_key in('classifieds','coinafrique','schema_org'),
   'discovery_minutes',p.discovery_minutes,'recheck_minutes',p.recheck_minutes,'daily_page_limit',p.daily_page_limit,'collection_status','pending') where id=s;
 insert into public.waouh_collection_targets(provider,handler,radar_source_id,label,enabled,interval_minutes,adaptive,engine_key,url)
 values(case when p.transport='direct' then 'public_feed' else p.transport end,'site',s,e.label,true,p.discovery_minutes,false,p.engine_key,e.url)
 on conflict(radar_source_id) do update set provider=excluded.provider,enabled=true,interval_minutes=excluded.interval_minutes,adaptive=false,engine_key=excluded.engine_key,url=excluded.url
 returning id into t;
 update public.waouh_collection_entries set target_id=t where entry_no=p_entry;
 return t;
end;$$;
revoke all on function public.waouh_collection_reserve_page(text,integer),public.waouh_collection_connect_entry(integer,text) from public,anon,authenticated;
grant execute on function public.waouh_collection_reserve_page(text,integer),public.waouh_collection_connect_entry(integer,text) to service_role;

create or replace function public.waouh_collection_safe_time(value text)
returns timestamptz language plpgsql immutable set search_path='' as $$
begin
 if value ~ '^\d{4}-\d{2}-\d{2}$' then return (value||'T23:59:59+01:00')::timestamptz;end if;
 if value ~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then return value::timestamptz;end if;
 return null;
exception when others then return null;end;$$;

create or replace function public.waouh_collection_touch_document(p_document uuid)
returns boolean language plpgsql set search_path='' as $$
declare d public.waouh_collection_documents; minutes integer;
begin
 select * into strict d from public.waouh_collection_documents where id=p_document for update;
 select coalesce((s.config->>'recheck_minutes')::integer,1440) into minutes from public.waouh_collection_targets t
  join public.waouh_radar_sources s on s.id=t.radar_source_id where t.id=d.target_id and t.enabled and s.active;
 if minutes is null then return false;end if;
 update public.waouh_collection_documents set state='active',last_checked_at=now(),last_seen_at=now(),last_error=null,missing_count=0,
  next_due_at=now()+make_interval(mins=>minutes) where id=p_document;
 update public.waouh_external_commerce_signals set
  evidence=evidence||jsonb_build_object('last_checked_at',now(),'first_seen_at',coalesce(evidence->>'first_seen_at',created_at::text)),
  observed_at=coalesce(public.waouh_collection_safe_time(evidence->>'published_at'),created_at),
  expires_at=least(now()+interval '3 days',coalesce(public.waouh_collection_safe_time(evidence->>'deadline'),now()+interval '3 days'))
 where id=d.record_id and status='active';
 return true;
end;$$;

create or replace function public.waouh_collection_commit_document(p_document uuid,p_hash text,p_etag text,p_last_modified text,p_facts jsonb)
returns boolean language plpgsql set search_path='' as $$
declare d public.waouh_collection_documents;signal uuid;
begin
 if p_hash !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_facts)<>'object' then raise exception 'invalid_document_version';end if;
 select * into strict d from public.waouh_collection_documents where id=p_document for update;
 select id into signal from public.waouh_external_commerce_signals where source_url=d.url and source_key='waouh_commercial_web' limit 1;
 if signal is null then raise exception 'listing_publication_missing';end if;
 if d.content_hash is distinct from p_hash then
  insert into public.waouh_collection_document_versions(document_id,content_hash,facts)
  values(p_document,p_hash,jsonb_build_object('title',p_facts->'title','price_min',p_facts->'price_min','price_max',p_facts->'price_max','evidence',p_facts->'evidence'));
 end if;
 update public.waouh_collection_documents set record_id=signal,content_hash=p_hash,etag=left(p_etag,300),last_modified=left(p_last_modified,100) where id=p_document;
 return public.waouh_collection_touch_document(p_document);
end;$$;

create or replace function public.waouh_collection_expire_stale()
returns integer language plpgsql set search_path='' as $$
declare changed integer;
begin
 update public.waouh_external_commerce_signals set status='expired' where status='active' and expires_at<=now();
 get diagnostics changed=row_count;return changed;
end;$$;
revoke all on function public.waouh_collection_safe_time(text),public.waouh_collection_touch_document(uuid),
 public.waouh_collection_commit_document(uuid,text,text,text,jsonb),public.waouh_collection_expire_stale() from public,anon,authenticated;
grant execute on function public.waouh_collection_safe_time(text),public.waouh_collection_touch_document(uuid),
 public.waouh_collection_commit_document(uuid,text,text,text,jsonb),public.waouh_collection_expire_stale() to service_role;

create or replace function public.waouh_collection_pause_entry(p_entry integer)
returns boolean language plpgsql set search_path='' as $$
declare source uuid;
begin
 select t.radar_source_id into source from public.waouh_collection_entries e join public.waouh_collection_targets t on t.id=e.target_id where e.entry_no=p_entry;
 if source is null then raise exception 'invalid_catalog_target';end if;
 update public.waouh_radar_sources set active=false where id=source;
 update public.waouh_collection_targets set enabled=false where radar_source_id=source;
 return true;
end;$$;
create or replace function public.waouh_collection_platform_changed()
returns trigger language plpgsql security definer set search_path='' as $$
declare entry record;requires_test boolean;
begin
 requires_test:=new.transport is distinct from old.transport or new.adapter_key is distinct from old.adapter_key or
  new.engine_key is distinct from old.engine_key or new.media_hosts is distinct from old.media_hosts or
  new.media_authorized is distinct from old.media_authorized or new.access_state<>'authorized';
 for entry in select t.id as target_id,s.id as source_id,s.config from public.waouh_collection_entries e
  join public.waouh_collection_targets t on t.id=e.target_id join public.waouh_radar_sources s on s.id=t.radar_source_id
  where e.platform_key=new.platform_key and e.alias_of is null loop
  if new.access_state='paused' then
   update public.waouh_radar_sources set active=false where id=entry.source_id;
   update public.waouh_collection_targets set enabled=false where id=entry.target_id;
  elsif entry.config->>'managed_catalog'='true' then
   update public.waouh_radar_sources set active=case when requires_test then false else active end,scan_freq_min=new.discovery_minutes,
    config=config||jsonb_build_object('discovery_minutes',new.discovery_minutes,'recheck_minutes',new.recheck_minutes,'daily_page_limit',new.daily_page_limit)
    where id=entry.source_id;
   update public.waouh_collection_targets set enabled=case when requires_test then false else enabled end,interval_minutes=new.discovery_minutes where id=entry.target_id;
  end if;
 end loop;
 return null;
end;$$;
create trigger waouh_collection_platform_changed after update on public.waouh_collection_platforms for each row execute function public.waouh_collection_platform_changed();
revoke all on function public.waouh_collection_pause_entry(integer),public.waouh_collection_platform_changed() from public,anon,authenticated;
grant execute on function public.waouh_collection_pause_entry(integer) to service_role;

insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.coinafrique.com','bj.coinafrique.com','CoinAfrique Bénin','review','coinafrique');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.afribaba.com','bj.afribaba.com','Afribaba Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.bambaad.com','bj.bambaad.com','BambaAd Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('niosso.com','niosso.com','Niosso Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('e-benin.bj','e-benin.bj','E-Bénin — Annonces','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.bazarafrique.com','bj.bazarafrique.com','BazarAfrique Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('banabaana.com','banabaana.com','Banabaana Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.obeynet.com','bj.obeynet.com','oBeynet Bénin','review','classifieds');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.classi4u.com','bj.classi4u.com','Classi4U Bénin','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.exenon.com','bj.exenon.com','Exenon Bénin','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('africaplace.com','africaplace.com','Africaplace','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('ahiyoyo.com','ahiyoyo.com','Ahiyoyo','review','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('aximin.com','aximin.com','Aximin','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('beninmarche.com','beninmarche.com','Bénin Marché','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('globenin.com','globenin.com','GlobeNin — Activités immobilières','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('goafricaonline.com','goafricaonline.com','Go Africa Online — Immobilier','review','goafrica');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('house.jumia.com.bj','house.jumia.com.bj','Jumia House Bénin — à confirmer','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('benin.meqasa.com','benin.meqasa.com','MeQasa Bénin — à confirmer','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('property24.bj','property24.bj','Property24 Bénin — à confirmer','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('immo24.bj','immo24.bj','Immo24 Bénin — à confirmer','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('cotonouimmo.com','cotonouimmo.com','Cotonou Immo','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('beninimmo.com','beninimmo.com','Bénin Immo','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bjemploi.com','bjemploi.com','BJemploi','review','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('emploi-benin.com','emploi-benin.com','Emploi Bénin — adresse à confirmer','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.jobneta.com','bj.jobneta.com','Jobneta Bénin','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('benin.jobartis.com','benin.jobartis.com','Jobartis Bénin','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('careerjet.ci','careerjet.ci','Careerjet — adresse fournie pour la Côte d’Ivoire','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('linkedin.com','linkedin.com','LinkedIn Jobs','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('bj.indeed.com','bj.indeed.com','Indeed Bénin — adresse à confirmer','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('glassdoor.com','glassdoor.com','Glassdoor','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('pagesjaunes.bj','pagesjaunes.bj','Pages Jaunes Bénin','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('beninannuaire.com','beninannuaire.com','Bénin Annuaire','unverified','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('google.com','google.com','Google Maps','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('facebook.com','facebook.com','Facebook Marketplace','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('business.whatsapp.com','business.whatsapp.com','WhatsApp Business','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('tiktok.com','tiktok.com','TikTok','partner_only','none');
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key) values('instagram.com','instagram.com','Instagram','partner_only','none');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(1,'bj.coinafrique.com','CoinAfrique Bénin','https://bj.coinafrique.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(2,'bj.afribaba.com','Afribaba Bénin','https://bj.afribaba.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(3,'bj.bambaad.com','BambaAd Bénin','https://bj.bambaad.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(4,'niosso.com','Niosso Bénin','https://niosso.com/bj',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(5,'e-benin.bj','E-Bénin — Annonces','https://e-benin.bj/annonces',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(6,'bj.bazarafrique.com','BazarAfrique Bénin','https://bj.bazarafrique.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(7,'banabaana.com','Banabaana Bénin','https://www.banabaana.com/pays-207-Benin',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(8,'bj.obeynet.com','oBeynet Bénin','https://bj.obeynet.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(9,'bj.classi4u.com','Classi4U Bénin','https://bj.classi4u.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(10,'bj.exenon.com','Exenon Bénin','https://bj.exenon.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(11,'africaplace.com','Africaplace','https://africaplace.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(12,'ahiyoyo.com','Ahiyoyo','https://www.ahiyoyo.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(13,'aximin.com','Aximin','https://aximin.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(14,'beninmarche.com','Bénin Marché','https://beninmarche.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(15,'bj.afribaba.com','« Leboncoin Afrique » dans votre liste','https://bj.afribaba.com/',2,'Doublon : utiliser la même cible.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(16,'globenin.com','GlobeNin — Activités immobilières','https://globenin.com/Benin/activites-immobilieres',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(17,'goafricaonline.com','Go Africa Online — Immobilier','https://www.goafricaonline.com/bj/immobilier',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(18,'house.jumia.com.bj','Jumia House Bénin — à confirmer','https://house.jumia.com.bj/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(19,'benin.meqasa.com','MeQasa Bénin — à confirmer','https://benin.meqasa.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(20,'property24.bj','Property24 Bénin — à confirmer','https://www.property24.bj/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(21,'immo24.bj','Immo24 Bénin — à confirmer','https://www.immo24.bj/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(22,'cotonouimmo.com','Cotonou Immo','https://www.cotonouimmo.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(23,'beninimmo.com','Bénin Immo','https://www.beninimmo.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(24,'bj.afribaba.com','Afribaba — Immobilier','https://bj.afribaba.com/immobilier/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(25,'bj.coinafrique.com','CoinAfrique — Immobilier','https://bj.coinafrique.com/categorie/immobilier',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(26,'bjemploi.com','BJemploi','https://www.bjemploi.com/accueil',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(27,'goafricaonline.com','Go Africa Online — Emploi','https://www.goafricaonline.com/bj/emploi',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(28,'emploi-benin.com','Emploi Bénin — adresse à confirmer','https://www.emploi-benin.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(29,'bj.jobneta.com','Jobneta Bénin','https://bj.jobneta.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(30,'benin.jobartis.com','Jobartis Bénin','https://benin.jobartis.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(31,'careerjet.ci','Careerjet — adresse fournie pour la Côte d’Ivoire','https://www.careerjet.ci/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(32,'linkedin.com','LinkedIn Jobs','https://www.linkedin.com/jobs/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(33,'bj.indeed.com','Indeed Bénin — adresse à confirmer','https://bj.indeed.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(34,'glassdoor.com','Glassdoor','https://www.glassdoor.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(35,'bj.afribaba.com','Afribaba — Emploi','https://bj.afribaba.com/emploi/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(36,'bj.coinafrique.com','CoinAfrique — Emplois','https://bj.coinafrique.com/categorie/emplois',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(37,'e-benin.bj','E-Bénin — Services et annonces','https://e-benin.bj/annonces',5,'Doublon : utiliser la même cible.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(38,'bj.coinafrique.com','CoinAfrique — Services','https://bj.coinafrique.com/categorie/services',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(39,'bj.afribaba.com','Afribaba — Services','https://bj.afribaba.com/services/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(40,'bj.bambaad.com','BambaAd — accès général','https://bj.bambaad.com/',3,'Doublon : utiliser la même cible.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(41,'niosso.com','Niosso — accès général','https://niosso.com/bj',4,'Doublon : utiliser la même cible.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(42,'pagesjaunes.bj','Pages Jaunes Bénin','https://www.pagesjaunes.bj/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(43,'beninannuaire.com','Bénin Annuaire','https://www.beninannuaire.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(44,'goafricaonline.com','Go Africa Online — Annuaire','https://www.goafricaonline.com/bj/annuaire',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(45,'google.com','Google Maps','https://www.google.com/maps',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(46,'facebook.com','Facebook Marketplace','https://www.facebook.com/marketplace/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(47,'facebook.com','Recherche de groupes « petites annonces Cotonou »','https://www.facebook.com/search/groups?q=petites+annonces+Cotonou',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(48,'business.whatsapp.com','WhatsApp Business','https://business.whatsapp.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(49,'tiktok.com','TikTok','https://www.tiktok.com/',null,'Conditions et extraction à vérifier avant activation.');
insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values(50,'instagram.com','Instagram','https://www.instagram.com/',null,'Conditions et extraction à vérifier avant activation.');
-- Link matching targets without changing their activation or historical permission settings.
update public.waouh_collection_entries e set target_id=t.id
from public.waouh_collection_targets t join public.waouh_radar_sources s on s.id=t.radar_source_id
where s.identifier=e.url and e.alias_of is null;

-- The requested provider route is recorded separately from publisher/media rights.
update public.waouh_collection_platforms set transport='apify',adapter_key=case when platform_key='bj.coinafrique.com' then 'coinafrique' else 'classifieds' end
where platform_key in('bj.coinafrique.com','bj.afribaba.com','bj.classi4u.com');
