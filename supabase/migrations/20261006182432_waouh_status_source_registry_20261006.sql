-- Register WAOUH status/publication events as a first-class Signal Fabric source.
insert into public.waouh_discovery_sources
(source_key,label,family,connector_mode,operational_state,
 supports_buy,supports_sell,supports_business,supports_contact,
 default_contactability,trust_weight,capabilities,metadata)
values
('status','Statuts WAOUH / Publications','internal','native','live',
 false,true,false,true,'C2',0.90,
 '{"status":true,"photo":true,"whatsapp":true,"notification":true}'::jsonb,
 '{"origin":"waouh-status-publish"}'::jsonb)
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
  metadata=coalesce(public.waouh_discovery_sources.metadata,'{}'::jsonb) || excluded.metadata,
  updated_at=now();
