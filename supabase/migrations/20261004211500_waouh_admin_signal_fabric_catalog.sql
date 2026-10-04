-- WAOUH Admin — Signal Fabric comme read-model canonique du Catalogue unifié.
-- Additif : aucune mutation des sources métier. Les RPC sont lecture seule et réservées aux administrateurs.
-- Objectif : exposer à l'admin toutes les familles réellement collectées (WAOUH, Partner, WhatsApp,
-- Radar, NEXUS/external, Apify, SerpAPI, réseaux sociaux, etc.) sans ouvrir directement la vue service-role.

create or replace function public.waouh_admin_signal_fabric_search(
  p_q text default null,
  p_city text default null,
  p_family text default null,
  p_source text default null,
  p_intent text default null,
  p_contactability text default null,
  p_operational_state text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  fabric_id text,
  source_record_id text,
  source_key text,
  source_label text,
  source_family text,
  operational_state text,
  intent text,
  actor_type text,
  subject text,
  raw_text text,
  category text,
  brand text,
  model text,
  condition text,
  price_min numeric,
  price_max numeric,
  currency text,
  city text,
  contactability_level text,
  trust_score numeric,
  observed_at timestamptz,
  source_url text,
  evidence jsonb,
  photo_url text,
  has_photo boolean,
  has_price boolean,
  has_contact boolean,
  quality_tier text,
  completeness integer,
  nexus_managed boolean,
  catalog_id text,
  verified boolean,
  is_catalog_mutable boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  with enriched as (
    select
      f.*,
      coalesce(
        ds.label,
        case f.source_key
          when 'status' then 'Statuts WAOUH'
          when 'chat' then 'Chat WAOUH'
          when 'radar' then 'Radar IA'
          else initcap(replace(f.source_key, '_', ' '))
        end
      )::text as resolved_label,
      coalesce(
        ds.family,
        case
          when f.source_key in ('waouh_app','chat','status') then 'internal'
          when f.source_key in ('whatsapp','whatsapp_groups') then 'messaging'
          when f.source_key = 'partner' then 'partner'
          when f.source_key in ('radar','radar_ia','firecrawl','serpapi','rss_public') then 'web'
          when f.source_key in ('facebook_business','facebook_public','instagram_business','instagram_public',
                                'linkedin_public','tiktok_connected','tiktok_public','web_social','x_public',
                                'youtube_public','share_to_waouh','apify') then 'social'
          when f.source_key = 'google_places' then 'maps'
          when f.source_key in ('scout','qr') then 'field'
          when f.source_key in ('sms_rcs','ussd','voice') then 'telephony'
          else 'external'
        end
      )::text as resolved_family,
      coalesce(ds.operational_state, 'live')::text as resolved_state,
      (
        (case
          when jsonb_typeof(f.evidence->'photos') = 'array'
          then jsonb_array_length(f.evidence->'photos') > 0
          else false
        end)
        or nullif(f.evidence->>'image_url','') is not null
        or nullif(f.evidence->>'photo','') is not null
        or nullif(f.evidence->>'thumbnail','') is not null
        or nullif(f.evidence->>'primary_photo_url','') is not null
      ) as q_has_photo,
      (coalesce(f.price_min,0) > 0 or coalesce(f.price_max,0) > 0) as q_has_price,
      (
        upper(coalesce(f.contactability_level,'C0')) in ('C1','C2','C3','C4','C5')
        or lower(coalesce(f.evidence->>'has_contact','false')) = 'true'
        or lower(coalesce(f.evidence->>'has_whatsapp','false')) = 'true'
        or nullif(f.evidence->>'contact_last4','') is not null
      ) as q_has_contact
    from public.waouh_signal_fabric f
    left join public.waouh_discovery_sources ds on ds.source_key = f.source_key
  ),
  scored as (
    select
      e.*,
      case
        when upper(coalesce(e.intent,'')) in ('BUY','RFQ') then true
        else e.q_has_photo
      end as effective_has_photo
    from enriched e
  ),
  final as (
    select
      s.*,
      (
        (case when s.effective_has_photo then 1 else 0 end) +
        (case when s.q_has_price then 1 else 0 end) +
        (case when s.q_has_contact then 1 else 0 end)
      )::integer as present_count
    from scored s
  )
  select
    x.fabric_id,
    x.source_record_id,
    x.source_key,
    x.resolved_label,
    x.resolved_family,
    x.resolved_state,
    x.intent,
    x.actor_type,
    x.subject,
    x.raw_text,
    x.category,
    x.brand,
    x.model,
    x.condition,
    x.price_min,
    x.price_max,
    x.currency,
    x.city,
    x.contactability_level,
    x.trust_score,
    x.observed_at,
    x.source_url,
    x.evidence,
    coalesce(
      nullif(x.evidence->>'primary_photo_url',''),
      nullif(x.evidence->>'image_url',''),
      nullif(x.evidence->>'photo',''),
      nullif(x.evidence->>'thumbnail',''),
      case
        when jsonb_typeof(x.evidence->'photos') = 'array' then
          case when jsonb_array_length(x.evidence->'photos') > 0 then x.evidence->'photos'->>0 else null end
        else null
      end
    )::text as photo_url,
    x.effective_has_photo,
    x.q_has_price,
    x.q_has_contact,
    case x.present_count when 3 then 'A' when 2 then 'B' when 1 then 'C' else 'D' end::text,
    round((x.present_count::numeric / 3) * 100)::integer,
    (x.fabric_id like 'external:%')::boolean,
    nullif(x.evidence->>'catalog_id','')::text,
    (lower(coalesce(x.evidence->>'verified','false')) = 'true')::boolean,
    (x.fabric_id like 'catalog:%' and nullif(x.evidence->>'catalog_id','') is not null)::boolean
  from final x
  where
    (nullif(trim(coalesce(p_q,'')), '') is null
      or concat_ws(' ',x.subject,x.raw_text,x.category,x.brand,x.model,x.city,x.resolved_label,x.source_key)
           ilike '%' || trim(p_q) || '%')
    and (nullif(trim(coalesce(p_city,'')), '') is null or x.city ilike '%' || trim(p_city) || '%')
    and (nullif(trim(coalesce(p_family,'')), '') is null or x.resolved_family = p_family)
    and (nullif(trim(coalesce(p_source,'')), '') is null or x.source_key = p_source)
    and (nullif(trim(coalesce(p_intent,'')), '') is null or upper(x.intent) = upper(p_intent))
    and (
      nullif(trim(coalesce(p_contactability,'')), '') is null
      or (p_contactability = 'contactable' and x.q_has_contact)
      or (p_contactability <> 'contactable' and upper(x.contactability_level) = upper(p_contactability))
    )
    and (nullif(trim(coalesce(p_operational_state,'')), '') is null or x.resolved_state = p_operational_state)
  order by
    case when x.present_count = 0 then 1 else 0 end asc,
    x.present_count desc,
    x.trust_score desc nulls last,
    x.observed_at desc nulls last
  limit greatest(1, least(coalesce(p_limit,200),500))
  offset greatest(0, coalesce(p_offset,0));
end;
$$;

revoke all on function public.waouh_admin_signal_fabric_search(text,text,text,text,text,text,text,integer,integer) from public, anon;
grant execute on function public.waouh_admin_signal_fabric_search(text,text,text,text,text,text,text,integer,integer) to authenticated, service_role;

create or replace function public.waouh_admin_signal_fabric_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  out_json jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  with enriched as (
    select
      f.fabric_id,
      f.source_key,
      f.intent,
      f.contactability_level,
      f.evidence,
      coalesce(
        ds.family,
        case
          when f.source_key in ('waouh_app','chat','status') then 'internal'
          when f.source_key in ('whatsapp','whatsapp_groups') then 'messaging'
          when f.source_key = 'partner' then 'partner'
          when f.source_key in ('radar','radar_ia','firecrawl','serpapi','rss_public') then 'web'
          when f.source_key in ('facebook_business','facebook_public','instagram_business','instagram_public',
                                'linkedin_public','tiktok_connected','tiktok_public','web_social','x_public',
                                'youtube_public','share_to_waouh','apify') then 'social'
          when f.source_key = 'google_places' then 'maps'
          when f.source_key in ('scout','qr') then 'field'
          when f.source_key in ('sms_rcs','ussd','voice') then 'telephony'
          else 'external'
        end
      )::text as family,
      (
        upper(coalesce(f.contactability_level,'C0')) in ('C1','C2','C3','C4','C5')
        or lower(coalesce(f.evidence->>'has_contact','false')) = 'true'
        or lower(coalesce(f.evidence->>'has_whatsapp','false')) = 'true'
        or nullif(f.evidence->>'contact_last4','') is not null
      ) as contactable
    from public.waouh_signal_fabric f
    left join public.waouh_discovery_sources ds on ds.source_key=f.source_key
  )
  select jsonb_build_object(
    'total', count(*),
    'internal', count(*) filter (where family='internal'),
    'partner', count(*) filter (where source_key='partner'),
    'whatsapp', count(*) filter (where source_key in ('whatsapp','whatsapp_groups')),
    'radar', count(*) filter (where source_key in ('radar','radar_ia')),
    'nexus_external', count(*) filter (where fabric_id like 'external:%'),
    'contactable', count(*) filter (where contactable),
    'buy', count(*) filter (where upper(intent) in ('BUY','RFQ')),
    'sell', count(*) filter (where upper(intent) in ('SELL','ANNOUNCE')),
    'sources_with_data', count(distinct source_key),
    'configured_sources', (select count(*) from public.waouh_discovery_sources),
    'source_counts', coalesce((
      select jsonb_object_agg(source_key,n order by n desc)
      from (select source_key,count(*) n from enriched group by source_key) q
    ), '{}'::jsonb),
    'family_counts', coalesce((
      select jsonb_object_agg(family,n order by n desc)
      from (select family,count(*) n from enriched group by family) q
    ), '{}'::jsonb)
  )
  into out_json
  from enriched;

  return coalesce(out_json, '{}'::jsonb);
end;
$$;

revoke all on function public.waouh_admin_signal_fabric_stats() from public, anon;
grant execute on function public.waouh_admin_signal_fabric_stats() to authenticated, service_role;

comment on function public.waouh_admin_signal_fabric_search(text,text,text,text,text,text,text,integer,integer) is
  'Admin-only read model for the unified WAOUH Signal Fabric. No raw contact secret is exposed.';
comment on function public.waouh_admin_signal_fabric_stats() is
  'Admin-only aggregate statistics for WAOUH Signal Fabric.';
