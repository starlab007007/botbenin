-- WAOUH Avatar Opportunity Journey C0-C5
-- Makes discovery -> contact -> negotiation -> deal progression persistent and observable.

ALTER TABLE public.waouh_discovery_sources
  DROP CONSTRAINT IF EXISTS waouh_discovery_sources_default_contactability_check;
ALTER TABLE public.waouh_discovery_sources
  ADD CONSTRAINT waouh_discovery_sources_default_contactability_check
  CHECK (default_contactability IN ('C0','C1','C2','C3','C4','C5'));

ALTER TABLE public.waouh_entity_contacts
  DROP CONSTRAINT IF EXISTS waouh_entity_contacts_contactability_level_check;
ALTER TABLE public.waouh_entity_contacts
  ADD CONSTRAINT waouh_entity_contacts_contactability_level_check
  CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5'));

ALTER TABLE public.waouh_external_commerce_signals
  DROP CONSTRAINT IF EXISTS waouh_external_commerce_signals_contactability_level_check;
ALTER TABLE public.waouh_external_commerce_signals
  ADD CONSTRAINT waouh_external_commerce_signals_contactability_level_check
  CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5'));

CREATE TABLE IF NOT EXISTS public.waouh_opportunity_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fabric_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('buy','sell','ask')),
  title text NOT NULL,
  source_key text,
  source_url text,
  actor_name text,
  city text,
  article_id uuid REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  target_waouh_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  entity_id uuid REFERENCES public.waouh_commerce_entities(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.waouh_entity_contacts(id) ON DELETE SET NULL,
  contactability_level text NOT NULL DEFAULT 'C0'
    CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5')),
  state text NOT NULL DEFAULT 'discovered'
    CHECK (state IN (
      'discovered','enriching','contact_ready','contacting','waiting_response',
      'ready_to_negotiate','negotiating','agreed','executing','completed','cancelled','blocked'
    )),
  contact_channel text,
  contact_last4 text,
  thread_id uuid REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL,
  negotiation_id uuid REFERENCES public.waouh_negotiations(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.waouh_deals(id) ON DELETE SET NULL,
  proposed_amount numeric CHECK (proposed_amount IS NULL OR proposed_amount >= 0),
  next_action text,
  avatar_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  last_contact_at timestamptz,
  last_response_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,fabric_id,mode)
);

CREATE TABLE IF NOT EXISTS public.waouh_opportunity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.waouh_opportunity_journeys(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  contactability_level text CHECK (
    contactability_level IS NULL OR contactability_level IN ('C0','C1','C2','C3','C4','C5')
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_owner_idx
  ON public.waouh_opportunity_journeys(owner_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_state_idx
  ON public.waouh_opportunity_journeys(state,updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_contact_idx
  ON public.waouh_opportunity_journeys(contact_id,state);
CREATE INDEX IF NOT EXISTS waouh_opportunity_events_journey_idx
  ON public.waouh_opportunity_events(journey_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.waouh_opportunity_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS waouh_opportunity_journeys_updated ON public.waouh_opportunity_journeys;
CREATE TRIGGER waouh_opportunity_journeys_updated
BEFORE UPDATE ON public.waouh_opportunity_journeys
FOR EACH ROW EXECUTE FUNCTION public.waouh_opportunity_touch_updated_at();

ALTER TABLE public.waouh_opportunity_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_opportunity_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.waouh_opportunity_journeys, public.waouh_opportunity_events
FROM anon, authenticated;
GRANT ALL ON public.waouh_opportunity_journeys, public.waouh_opportunity_events
TO service_role;

COMMENT ON TABLE public.waouh_opportunity_journeys IS
  'Persistent Avatar-led opportunity lifecycle from discovery/contactability C0-C5 through Deal Room and completion.';
COMMENT ON TABLE public.waouh_opportunity_events IS
  'Append-only visible progress ledger for Avatar opportunity journeys.';
