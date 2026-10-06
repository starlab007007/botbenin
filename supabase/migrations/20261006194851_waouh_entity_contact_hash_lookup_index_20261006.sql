-- Optimize canonical phone deduplication across all commerce entities.
CREATE INDEX IF NOT EXISTS waouh_entity_contacts_value_hash_idx
  ON public.waouh_entity_contacts(value_hash)
  WHERE value_hash IS NOT NULL;
