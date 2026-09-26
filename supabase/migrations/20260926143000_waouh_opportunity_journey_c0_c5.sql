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


-- Compatibility with the earlier Avatar Journey schema already present on
-- some environments. The application contract uses stage/progress/timeline,
-- while the legacy contract used state/title/avatar_message.
ALTER TABLE public.waouh_opportunity_journeys
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS progress smallint,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS masked_contact jsonb,
  ADD COLUMN IF NOT EXISTS last_action text,
  ADD COLUMN IF NOT EXISTS last_message text,
  ADD COLUMN IF NOT EXISTS timeline jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

UPDATE public.waouh_opportunity_journeys
SET stage = COALESCE(stage, CASE state
      WHEN 'waiting_response' THEN 'waiting_reply'
      WHEN 'ready_to_negotiate' THEN 'negotiating'
      WHEN 'blocked' THEN 'enriching'
      ELSE COALESCE(state,'discovered')
    END),
    progress = COALESCE(progress, CASE COALESCE(state,'discovered')
      WHEN 'discovered' THEN 10 WHEN 'enriching' THEN 22
      WHEN 'contact_ready' THEN 35 WHEN 'contacting' THEN 45
      WHEN 'waiting_response' THEN 55 WHEN 'ready_to_negotiate' THEN 65
      WHEN 'negotiating' THEN 72 WHEN 'agreed' THEN 82
      WHEN 'executing' THEN 92 WHEN 'completed' THEN 100
      WHEN 'cancelled' THEN 100 ELSE 15 END),
    subject = COALESCE(subject,title),
    masked_contact = COALESCE(masked_contact,
      jsonb_build_object(
        'phones', CASE WHEN contact_last4 IS NOT NULL
          THEN jsonb_build_array(jsonb_build_object(
            'last4',contact_last4,'channel',COALESCE(contact_channel,'phone')))
          ELSE '[]'::jsonb END,
        'channels', CASE WHEN contact_channel IS NOT NULL
          THEN jsonb_build_array(contact_channel) ELSE '[]'::jsonb END
      )),
    last_message = COALESCE(last_message,avatar_message),
    timeline = COALESCE(timeline,'[]'::jsonb),
    started_at = COALESCE(started_at,created_at,now()),
    last_activity_at = COALESCE(last_activity_at,updated_at,now());

ALTER TABLE public.waouh_opportunity_journeys
  ALTER COLUMN stage SET DEFAULT 'discovered',
  ALTER COLUMN progress SET DEFAULT 10,
  ALTER COLUMN masked_contact SET DEFAULT '{}'::jsonb,
  ALTER COLUMN timeline SET DEFAULT '[]'::jsonb,
  ALTER COLUMN started_at SET DEFAULT now(),
  ALTER COLUMN last_activity_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.waouh_sync_opportunity_journey_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.stage := COALESCE(NEW.stage, CASE NEW.state
      WHEN 'waiting_response' THEN 'waiting_reply'
      WHEN 'ready_to_negotiate' THEN 'negotiating'
      WHEN 'blocked' THEN 'enriching'
      ELSE COALESCE(NEW.state,'discovered') END);
    NEW.state := COALESCE(NEW.state, CASE NEW.stage
      WHEN 'waiting_reply' THEN 'waiting_response'
      ELSE NEW.stage END);
  ELSE
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      NEW.state := CASE NEW.stage
        WHEN 'waiting_reply' THEN 'waiting_response'
        ELSE NEW.stage END;
    ELSIF NEW.state IS DISTINCT FROM OLD.state THEN
      NEW.stage := CASE NEW.state
        WHEN 'waiting_response' THEN 'waiting_reply'
        WHEN 'ready_to_negotiate' THEN 'negotiating'
        WHEN 'blocked' THEN 'enriching'
        ELSE NEW.state END;
    END IF;
  END IF;

  IF TG_OP='INSERT'
     OR NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.state IS DISTINCT FROM OLD.state THEN
    NEW.progress := CASE NEW.stage
      WHEN 'discovered' THEN 10 WHEN 'enriching' THEN 22
      WHEN 'contact_ready' THEN 35 WHEN 'contacting' THEN 45
      WHEN 'waiting_reply' THEN 55 WHEN 'negotiating' THEN 72
      WHEN 'agreed' THEN 82 WHEN 'executing' THEN 92
      WHEN 'completed' THEN 100 WHEN 'cancelled' THEN 100 ELSE 15 END;
  ELSE
    NEW.progress := COALESCE(NEW.progress,10);
  END IF;
  NEW.title := COALESCE(NEW.title,NEW.subject,'Opportunité WAOUH');
  NEW.subject := COALESCE(NEW.subject,NEW.title);
  NEW.avatar_message := COALESCE(NEW.avatar_message,NEW.last_message);
  NEW.last_message := COALESCE(NEW.last_message,NEW.avatar_message);
  NEW.masked_contact := COALESCE(NEW.masked_contact,'{}'::jsonb);
  NEW.timeline := COALESCE(NEW.timeline,'[]'::jsonb);
  NEW.started_at := COALESCE(NEW.started_at,NEW.created_at,now());
  NEW.last_activity_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waouh_opportunity_journey_contract_sync
ON public.waouh_opportunity_journeys;
CREATE TRIGGER waouh_opportunity_journey_contract_sync
BEFORE INSERT OR UPDATE ON public.waouh_opportunity_journeys
FOR EACH ROW EXECUTE FUNCTION public.waouh_sync_opportunity_journey_contract();

CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_owner_idx
  ON public.waouh_opportunity_journeys(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_fabric_idx
  ON public.waouh_opportunity_journeys(fabric_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS waouh_opportunity_journeys_active_idx
  ON public.waouh_opportunity_journeys(owner_id, fabric_id, updated_at DESC)
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
      state = CASE COALESCE(p_stage, stage)
        WHEN 'waiting_reply' THEN 'waiting_response'
        ELSE COALESCE(p_stage, stage)
      END,
      contactability_level = COALESCE(p_contactability_level, contactability_level),
      progress = COALESCE(p_progress, progress),
      last_action = COALESCE(p_last_action, last_action),
      next_action = COALESCE(p_next_action, next_action),
      last_message = COALESCE(p_last_message, last_message),
      avatar_message = COALESCE(p_last_message, avatar_message),
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
