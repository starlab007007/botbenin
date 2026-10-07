-- Register the synchronized WAHA address book as an explicit admin data source.
INSERT INTO public.waouh_discovery_sources (
  source_key,label,family,connector_mode,operational_state,
  supports_buy,supports_sell,supports_business,supports_contact,
  default_contactability,trust_weight,capabilities,metadata,updated_at
) VALUES (
  'waha_directory',
  'WAHA · Annuaire synchronisé',
  'directory',
  'native',
  'live',
  false,false,false,true,
  'C0',
  0.80,
  '{"contacts":true,"whatsapp":true,"directory":true,"verification":"waha"}'::jsonb,
  '{"provider":"WAHA","admin_only":true,"directory_only":true,"send_policy":"qualify_before_contact"}'::jsonb,
  now()
)
ON CONFLICT (source_key) DO UPDATE SET
  label=EXCLUDED.label,
  family=EXCLUDED.family,
  connector_mode=EXCLUDED.connector_mode,
  operational_state=EXCLUDED.operational_state,
  supports_contact=EXCLUDED.supports_contact,
  default_contactability=EXCLUDED.default_contactability,
  trust_weight=EXCLUDED.trust_weight,
  capabilities=EXCLUDED.capabilities,
  metadata=COALESCE(public.waouh_discovery_sources.metadata,'{}'::jsonb) || EXCLUDED.metadata,
  updated_at=now();
