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
      left(coalesce(nullif(p_row->>'actor_name',''),p_row->>'product_name'),120),canonical,'BJ',signal.city,
      'source_verified',65,array[signal.source_key],jsonb_build_object('source_url',signal.source_url)) returning id into entity;
  else
    update waouh_commerce_entities set last_seen_at=now() where id=entity;
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


-- Source-specific extraction is authoritative for these listings. The generic page
-- enricher must not attach a platform footer email or an unrelated recommended ad.
update waouh_external_commerce_signals set evidence=evidence||
  jsonb_build_object('contact_enriched_at',now(),'contact_collection','source_listing')
where source_key in ('waouh_commercial_web','waouh_facebook_collection');
update waouh_entity_contacts c set verification_status='revoked',contactability_level='C0',
  metrics=metrics||jsonb_build_object('excluded_reason','not_extracted_from_listing_contact_block')
where c.channel='email' and c.metrics='{}' and c.source_key in ('waouh_commercial_web','waouh_facebook_collection')
  and exists(select 1 from waouh_commerce_entities e where e.id=c.entity_id and e.canonical_key like 'listing:%');
-- A Facebook media-set URL is a page, never an image. Keep the actual CDN photos.
with cleaned as (
 select id,array(select url from unnest(photo_urls) as p(url)
   where split_part(url,'/',3) ~ '^[a-zA-Z0-9.-]+\.(fbcdn\.net|fbsbx\.com)$') as photos
 from waouh_external_commerce_signals where source_key='waouh_facebook_collection'
)
update waouh_external_commerce_signals s set photo_urls=c.photos,primary_photo_url=c.photos[1],
 evidence=(s.evidence-'photos')||case when cardinality(c.photos)>0 then jsonb_build_object('photos',c.photos) else '{}'::jsonb end
from cleaned c where s.id=c.id;
