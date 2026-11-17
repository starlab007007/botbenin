-- Preserve the location and country actually stated by the listing.
create or replace function public.waouh_collection_publish_catalog(p_job uuid,p_token uuid,p_hash text,p_row jsonb)
returns text language plpgsql set search_path to public
as $$
declare
  job waouh_collection_jobs;
  origin waouh_radar_sources;
  registry waouh_discovery_sources;
  row_key text;
  previous_hash text;
  existing_id uuid;
  photos text[];
  previous timestamptz := now();
  expires timestamptz;
  expected_key text;
  observed jsonb;
  url text := p_row->>'source_url';
begin
  select * into job from waouh_collection_jobs
  where id=p_job and lease_token=p_token and status='running' and lease_until>previous
    and expires_at>previous and handler in ('site','apify') and owner_id is null and not inline
  for update;
  if not found then raise exception 'collection_lease_invalid'; end if;
  select s.* into origin from waouh_collection_targets t join waouh_radar_sources s on s.id=t.radar_source_id
  where t.id=job.target_id and t.enabled and s.active and s.config->>'automation_authorized'='true'
    and nullif(btrim(s.config->>'attribution'),'') is not null;
  if not found then raise exception 'source_permission_missing'; end if;
  if job.handler='apify' and origin.type='fb_group' then
    expected_key:='waouh_facebook_collection';
    if url !~ '^https://www\.facebook\.com/groups/[^/?#]+/(posts|permalink)/[^/?#]+/?$' then
      raise exception 'unverified_facebook_url';
    end if;
  elsif job.handler='site' and origin.type='site' then
    if origin.config->>'collection_format'='directory' then
      expected_key:='benin_open_places';
      if url !~ '^https://www\.openstreetmap\.org/(node|way|relation)/[0-9]+$' or
         p_row->>'intent' is distinct from 'ANNOUNCE' or
         p_row->'evidence'->>'listing_license' is distinct from 'ODbL-1.0' then
        raise exception 'unverified_directory_row';
      end if;
    else
      expected_key:='waouh_commercial_web';
      if url !~ '^https://[^/?#]+/' or split_part(url,'/',3)<>split_part(origin.identifier,'/',3) then
        raise exception 'unverified_commercial_url';
      end if;
    end if;
  else
    raise exception 'unsupported_collection_scope';
  end if;
  select * into strict registry from waouh_discovery_sources where source_key=expected_key;
  if jsonb_typeof(p_row->'evidence') is distinct from 'object' or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or url is null or length(url)>1800 or
    p_row->>'source_external_id' is distinct from url or
    coalesce(p_row->>'intent','') not in ('SELL','BUY','ANNOUNCE','RFQ') or
    length(coalesce(p_row->>'product_name','')) not between 5 and 280 then
    raise exception 'invalid_commercial_record';
  end if;
  expires := previous + case
    when expected_key='benin_open_places' then interval '14 days'
    when p_row->>'intent' in ('BUY','RFQ') then interval '4 days'
    else interval '3 days' end;
  row_key := 'catalog:'||expected_key||':'||url;
  perform pg_advisory_xact_lock(hashtextextended(row_key,0));
  select o.content_hash into previous_hash from waouh_collection_observations o where o.identity_key=row_key;
  select s.id into existing_id from waouh_external_commerce_signals s
  where s.source_key=expected_key and s.source_external_id=url;

  photos := '{}'::text[];
  if origin.config->>'media_reuse_authorized'='true' and jsonb_typeof(p_row->'evidence'->'photos')='array' then
    photos := array(select v
      from jsonb_array_elements_text(p_row->'evidence'->'photos') as entry(v)
      where v ~ '^https://[a-zA-Z0-9.-]+/' and length(v)<1800 and
        ((origin.type<>'fb_group' and (split_part(v,'/',3)=split_part(url,'/',3) or
          coalesce(origin.config->'media_hosts','[]'::jsonb) ? split_part(v,'/',3))) or
          (origin.type='fb_group' and split_part(v,'/',3) ~ '^[a-zA-Z0-9.-]+\.(fbcdn\.net|fbsbx\.com)$'))
      limit 4);
  end if;
  if previous_hash=p_hash and existing_id is not null and exists (
    select 1 from waouh_external_commerce_signals where id=existing_id
    and photo_urls is not distinct from photos
    and evidence->>'source_attribution' is not distinct from origin.config->>'attribution'
  ) then
    update waouh_collection_observations o set last_checked_at=previous,job_id=p_job where o.identity_key=row_key;
    update waouh_external_commerce_signals set observed_at=previous,expires_at=expires where id=existing_id;
    return 'unchanged';
  end if;

  observed := waouh_collection_ingest_commerce(p_job,p_token,
    jsonb_build_object(
      'source_id',registry.id,'source_key',expected_key,'source_external_id',url,'source_url',url,
      'intent',p_row->>'intent','actor_type',p_row->>'actor_type','contactability_level','C0',
      'contact_consent_basis','unknown','product_name',p_row->>'product_name','category',p_row->>'category',
      'brand',p_row->>'brand','model',p_row->>'model','city',p_row->>'city','country_code',case when p_row->>'country_code' in ('BJ','CI') then p_row->>'country_code' else 'BJ' end,
      'currency','XOF','price_min',p_row->'price_min','price_max',p_row->'price_max','raw_text',p_row->>'raw_text',
      'confidence',0.8,'trust_score',case when expected_key='benin_open_places' then 73 else 65 end,
      'observed_at',previous,'expires_at',expires,
      'evidence',((p_row->'evidence')-'photos'-'photo_attribution')||
        jsonb_build_object('availability_confirmed',false,'source_attribution',origin.config->>'attribution')||
        case when cardinality(photos)>0 then jsonb_build_object('photos',photos,'photo_attribution',origin.config->>'attribution') else '{}'::jsonb end
    )
  );
  update waouh_external_commerce_signals set primary_photo_url=photos[1],photo_urls=photos
  where id=(observed->>'id')::uuid;
  insert into waouh_collection_observations as o(identity_key,record_kind,record_id,content_hash,job_id)
  values (row_key,'commerce',(observed->>'id')::uuid,p_hash,p_job)
  on conflict on constraint waouh_collection_observations_pkey do update
  set content_hash=excluded.content_hash,last_checked_at=previous,job_id=excluded.job_id;
  return case when existing_id is null then 'inserted' else 'updated' end;
end;
$$;


create or replace function public.waouh_collection_publish_listing(
  p_job uuid,p_token uuid,p_hash text,p_row jsonb,p_contacts jsonb default '[]'::jsonb
) returns text language plpgsql set search_path to public
as $$
declare
  outcome text;
  signal waouh_external_commerce_signals;
  entity uuid;
  canonical text;
  contact jsonb;
  business boolean := coalesce((p_row->>'is_public_business')::boolean,false);
begin
  if jsonb_typeof(p_contacts) is distinct from 'array' or jsonb_array_length(p_contacts)>12 then
    raise exception 'invalid_listing_contacts';
  end if;
  outcome := waouh_collection_publish_catalog(p_job,p_token,p_hash,p_row);
  select s.* into strict signal from waouh_external_commerce_signals s
  join waouh_collection_jobs j on j.id=p_job
  where s.source_external_id=p_row->>'source_url' and s.source_key=
    case when j.handler='apify' then 'waouh_facebook_collection'
      when p_row->'evidence'->>'listing_license'='ODbL-1.0' then 'benin_open_places'
      else 'waouh_commercial_web' end;
  canonical := 'listing:'||signal.source_key||':'||md5(signal.source_url);
  entity := signal.entity_id;
  if entity is null then
    select e.id into entity from waouh_commerce_entities e where e.canonical_key=canonical limit 1;
  end if;
  if entity is null then
    insert into waouh_commerce_entities(entity_type,primary_name,canonical_key,country_code,city,verification_state,trust_score,source_keys,metadata)
    values(case when business then 'business' else 'announcer' end,
      left(coalesce(nullif(p_row->>'actor_name',''),p_row->>'product_name'),120),canonical,signal.country_code,signal.city,
      'source_verified',65,array[signal.source_key],jsonb_build_object('source_url',signal.source_url)) returning id into entity;
  else
    update waouh_commerce_entities set last_seen_at=now(),country_code=signal.country_code,city=signal.city where id=entity;
  end if;
  for contact in select value from jsonb_array_elements(p_contacts) loop
    if coalesce(contact->>'channel','') not in ('phone','whatsapp','website','facebook') or
      coalesce(contact->>'value_hash','') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_listing_contact'; end if;
    if contact->>'channel' in ('phone','whatsapp') then
      if coalesce(contact->>'value_encrypted','') !~ '^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$' or
         coalesce(contact->>'value_last4','') !~ '^[0-9]{4}$' or contact->>'public_value' is not null then
        raise exception 'listing_phone_must_be_private';
      end if;
    elsif contact->>'public_value' is distinct from signal.source_url or contact->>'value_encrypted' is not null then
      raise exception 'listing_contact_scope_invalid';
    end if;
    insert into waouh_entity_contacts as c(entity_id,channel,value_encrypted,value_hash,value_last4,public_value,
      source_key,is_public_business,consent_state,contactability_level,verification_status,metrics)
    values(entity,contact->>'channel',contact->>'value_encrypted',contact->>'value_hash',contact->>'value_last4',
      contact->>'public_value',signal.source_key,business,case when business then 'public_business' else 'unknown' end,
      'C1','observed',jsonb_build_object('source_url',signal.source_url,'published_contact',true,'collected_at',now()))
    on conflict(entity_id,channel,value_hash) where value_hash is not null do update
    set value_encrypted=excluded.value_encrypted,public_value=excluded.public_value,updated_at=now(),
      metrics=c.metrics||excluded.metrics;
    -- Consent, revocation, reachability and verified status are never overwritten by a crawl.
  end loop;
  update waouh_external_commerce_signals set entity_id=entity,
    actor_name=coalesce(nullif(p_row->>'actor_name',''),actor_name),
    contactability_level=coalesce((select max(c.contactability_level) from waouh_entity_contacts c
      where c.entity_id=entity and c.consent_state<>'revoked' and c.verification_status<>'revoked'),'C0'),
    evidence=evidence||jsonb_build_object('contact_enriched_at',now(),'contact_collection','source_listing'),
    contact_consent_basis=case when business then 'public_business' else contact_consent_basis end
  where id=signal.id;
  return outcome;
end;
$$;
revoke execute on function public.waouh_collection_publish_listing(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_collection_publish_listing(uuid,uuid,text,jsonb,jsonb) to service_role;
