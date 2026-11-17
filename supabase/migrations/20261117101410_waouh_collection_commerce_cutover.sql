create or replace function public.waouh_collection_claim_targeted(p_handlers text[])
returns jsonb language plpgsql set search_path to public
as $$
declare job_id uuid;
begin
  select j.id into job_id
  from waouh_collection_jobs j
  join waouh_collection_targets t on t.id=j.target_id and t.enabled
  join waouh_collection_policies p on p.provider=j.provider and not p.paused
  where j.handler=any(p_handlers) and j.handler in ('feed','site','apify')
    and not j.inline and (p.cooldown_until is null or p.cooldown_until<=now())
    and ((j.status='queued' and j.not_before<=now()) or (j.status='running' and j.lease_until<=now()))
  order by j.priority desc,j.created_at,j.id
  for update of j skip locked limit 1;
  if job_id is null then return null; end if;
  return waouh_collection_claim(job_id);
end;
$$;

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
        (split_part(v,'/',3)=split_part(url,'/',3) or
          coalesce(origin.config->'media_hosts','[]'::jsonb) ? split_part(v,'/',3))
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
      'brand',p_row->>'brand','model',p_row->>'model','city',p_row->>'city','country_code','BJ',
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

revoke execute on function public.waouh_collection_claim_targeted(text[]) from public,anon,authenticated;
revoke execute on function public.waouh_collection_publish_catalog(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.waouh_collection_claim_targeted(text[]) to service_role;
grant execute on function public.waouh_collection_publish_catalog(uuid,uuid,text,jsonb) to service_role;

insert into public.waouh_discovery_sources
 (source_key,label,family,connector_mode,operational_state,supports_buy,supports_sell,supports_business,
  supports_contact,default_contactability,trust_weight,metadata)
values
 ('waouh_facebook_collection','Annonces issues de groupes autorisés','social','api','requires_config',true,true,true,false,'C0',.65,'{}'),
 ('waouh_commercial_web','Catalogues commerciaux autorisés','web','public_feed','requires_config',true,true,true,false,'C0',.65,'{}'),
 ('benin_open_places','© OpenStreetMap contributors · ODbL','directory','public_feed','live',false,false,true,false,'C0',.73,
  '{"license":"ODbL-1.0","license_url":"https://www.openstreetmap.org/copyright"}')
on conflict(source_key) do nothing;

insert into public.waouh_radar_sources(type,identifier,label,active,scan_freq_min,config)
select 'site','https://bot.bj/waouh-annuaire-pilote.json','Annuaire ouvert du Bénin',false,1440,
 '{"automation_authorized":true,"attribution":"© OpenStreetMap contributors · ODbL","collection_format":"directory"}'
where not exists(select 1 from public.waouh_radar_sources where identifier='https://bot.bj/waouh-annuaire-pilote.json');
