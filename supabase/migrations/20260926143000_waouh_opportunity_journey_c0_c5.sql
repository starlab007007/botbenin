-- WAOUH Opportunity Journey C0-C5
-- Makes discovery -> contact -> negotiation -> agreement a persistent in-system journey.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype='c'
      AND conrelid IN (
        'public.waouh_discovery_sources'::regclass,
        'public.waouh_entity_contacts'::regclass,
        'public.waouh_external_commerce_signals'::regclass
      )
      AND pg_get_constraintdef(oid) ILIKE '%C0%'
      AND pg_get_constraintdef(oid) ILIKE '%C4%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.waouh_discovery_sources
  ADD CONSTRAINT waouh_discovery_sources_default_contactability_ck
  CHECK (default_contactability IN ('C0','C1','C2','C3','C4','C5'));

ALTER TABLE public.waouh_entity_contacts
  ADD CONSTRAINT waouh_entity_contacts_contactability_level_ck
  CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5'));

ALTER TABLE public.waouh_external_commerce_signals
  ADD CONSTRAINT waouh_external_signals_contactability_level_ck
  CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5'));

CREATE TABLE IF NOT EXISTS public.waouh_opportunity_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fabric_id text NOT NULL,
  mode text NOT NULL DEFAULT 'buy' CHECK (mode IN ('buy','sell','ask')),
  stage text NOT NULL DEFAULT 'discovered' CHECK (stage IN (
    'discovered','enriching','contact_ready','contacting','waiting_reply',
    'negotiating','agreed','executing','completed','cancelled'
  )),
  contactability_level text NOT NULL DEFAULT 'C0'
    CHECK (contactability_level IN ('C0','C1','C2','C3','C4','C5')),
  progress smallint NOT NULL DEFAULT 10 CHECK (progress BETWEEN 0 AND 100),
  source_key text,
  source_url text,
  subject text,
  city text,
  article_id uuid REFERENCES public.waouh_articles(id) ON DELETE SET NULL,
  thread_id uuid REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL,
  negotiation_id uuid REFERENCES public.waouh_negotiations(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.waouh_deals(id) ON DELETE SET NULL,
  contact_channel text,
  masked_contact jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(masked_contact)='object'),
  last_action text,
  next_action text,
  last_message text,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(timeline)='array'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_owner_idx
  ON public.waouh_opportunity_journeys(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_fabric_idx
  ON public.waouh_opportunity_journeys(fabric_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS waouh_opportunity_journeys_active_uq
  ON public.waouh_opportunity_journeys(owner_id, fabric_id)
  WHERE stage NOT IN ('completed','cancelled');

ALTER TABLE public.waouh_opportunity_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journey_owner_select" ON public.waouh_opportunity_journeys;
CREATE POLICY "journey_owner_select" ON public.waouh_opportunity_journeys
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "journey_owner_insert" ON public.waouh_opportunity_journeys;
CREATE POLICY "journey_owner_insert" ON public.waouh_opportunity_journeys
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "journey_owner_update" ON public.waouh_opportunity_journeys;
CREATE POLICY "journey_owner_update" ON public.waouh_opportunity_journeys
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.waouh_append_opportunity_journey_event(
  p_journey_id uuid,
  p_stage text,
  p_contactability_level text DEFAULT NULL,
  p_progress smallint DEFAULT NULL,
  p_last_action text DEFAULT NULL,
  p_next_action text DEFAULT NULL,
  p_last_message text DEFAULT NULL,
  p_event jsonb DEFAULT '{}'::jsonb
) RETURNS public.waouh_opportunity_journeys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_row public.waouh_opportunity_journeys%ROWTYPE;
BEGIN
  UPDATE public.waouh_opportunity_journeys
  SET stage = COALESCE(p_stage, stage),
      contactability_level = COALESCE(p_contactability_level, contactability_level),
      progress = COALESCE(p_progress, progress),
      last_action = COALESCE(p_last_action, last_action),
      next_action = COALESCE(p_next_action, next_action),
      last_message = COALESCE(p_last_message, last_message),
      timeline = timeline || jsonb_build_array(
        jsonb_build_object(
          'at', now(),
          'stage', COALESCE(p_stage, stage),
          'contactability_level', COALESCE(p_contactability_level, contactability_level),
          'action', p_last_action,
          'message', p_last_message
        ) || COALESCE(p_event, '{}'::jsonb)
      ),
      last_activity_at = now(),
      updated_at = now(),
      completed_at = CASE WHEN p_stage='completed' THEN now() ELSE completed_at END
  WHERE id = p_journey_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

COMMENT ON TABLE public.waouh_opportunity_journeys IS
  'Persistent user-facing journey from NEXUS discovery through contact, negotiation, agreement, execution and completion.';
