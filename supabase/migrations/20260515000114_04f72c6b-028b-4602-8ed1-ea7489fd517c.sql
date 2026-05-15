
-- ============== Outbound queue ==============
CREATE TABLE IF NOT EXISTS public.waouh_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone text,
  to_user_id uuid,
  channel text NOT NULL DEFAULT 'whatsapp',
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbound_status ON public.waouh_outbound_queue(status, created_at);
ALTER TABLE public.waouh_outbound_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_outbound" ON public.waouh_outbound_queue;
CREATE POLICY "admin_all_outbound" ON public.waouh_outbound_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============== Negotiations ==============
CREATE TABLE IF NOT EXISTS public.waouh_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.waouh_radar_matches(id) ON DELETE SET NULL,
  article_id uuid REFERENCES public.waouh_articles(id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  seller_user_id uuid REFERENCES public.waouh_users(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'proposed',
  last_offer_price numeric,
  last_actor text,
  transaction_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_neg_state ON public.waouh_negotiations(state);
CREATE INDEX IF NOT EXISTS idx_neg_buyer ON public.waouh_negotiations(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_neg_seller ON public.waouh_negotiations(seller_user_id);
ALTER TABLE public.waouh_negotiations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_neg" ON public.waouh_negotiations;
CREATE POLICY "admin_all_neg" ON public.waouh_negotiations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "participants_view_neg" ON public.waouh_negotiations;
CREATE POLICY "participants_view_neg" ON public.waouh_negotiations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.waouh_users u
                 WHERE u.id IN (buyer_user_id, seller_user_id) AND u.auth_user_id = auth.uid()));

-- ============== Pipeline events ==============
CREATE TABLE IF NOT EXISTS public.waouh_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid,
  step text NOT NULL,
  status text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipe_signal ON public.waouh_pipeline_events(signal_id);
ALTER TABLE public.waouh_pipeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_pipe" ON public.waouh_pipeline_events;
CREATE POLICY "admin_view_pipe" ON public.waouh_pipeline_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anti-doublon promotion
CREATE UNIQUE INDEX IF NOT EXISTS uniq_articles_origin_signal
  ON public.waouh_articles(origin_signal_id) WHERE origin_signal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_buyers_origin_signal
  ON public.waouh_buyer_profiles(origin_signal_id) WHERE origin_signal_id IS NOT NULL;

-- ============== Helper : enqueue outbound ==============
CREATE OR REPLACE FUNCTION public.waouh_enqueue_outbound(
  p_to_phone text, p_to_user_id uuid, p_template text, p_payload jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_to_phone IS NULL AND p_to_user_id IS NULL THEN RETURN NULL; END IF;
  -- rate-limit : pas plus d'1 message identique au même phone dans les 30s
  IF p_to_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM waouh_outbound_queue
    WHERE to_phone = p_to_phone AND template = p_template
      AND created_at > now() - interval '30 seconds'
  ) THEN RETURN NULL; END IF;
  INSERT INTO waouh_outbound_queue(to_phone, to_user_id, template, payload)
  VALUES (p_to_phone, p_to_user_id, p_template, COALESCE(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ============== Trigger : auto-promote signal ==============
CREATE OR REPLACE FUNCTION public.trg_radar_signal_autopromote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF NEW.status <> 'extracted' THEN RETURN NEW; END IF;
  -- qualité minimale
  IF NEW.intent NOT IN ('SELL','BUY') THEN RETURN NEW; END IF;
  IF NEW.intent = 'SELL' AND NEW.category IS NULL AND (NEW.product->>'title') IS NULL THEN RETURN NEW; END IF;

  BEGIN
    v_result := public.waouh_promote_signal(NEW.id);
    INSERT INTO waouh_pipeline_events(signal_id, step, status, details)
      VALUES (NEW.id, 'autopromote', 'ok', v_result);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO waouh_pipeline_events(signal_id, step, status, details)
      VALUES (NEW.id, 'autopromote', 'error', jsonb_build_object('err', SQLERRM));
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_radar_signal_autopromote ON public.waouh_radar_signals;
CREATE TRIGGER trg_radar_signal_autopromote
  AFTER INSERT OR UPDATE OF status ON public.waouh_radar_signals
  FOR EACH ROW WHEN (NEW.status = 'extracted')
  EXECUTE FUNCTION public.trg_radar_signal_autopromote();

-- ============== Trigger : auto-match après promotion ==============
CREATE OR REPLACE FUNCTION public.trg_radar_signal_automatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF NEW.status <> 'promoted' THEN RETURN NEW; END IF;
  BEGIN
    v_result := public.waouh_match_signal(NEW.id);
    INSERT INTO waouh_pipeline_events(signal_id, step, status, details)
      VALUES (NEW.id, 'automatch', 'ok', v_result);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO waouh_pipeline_events(signal_id, step, status, details)
      VALUES (NEW.id, 'automatch', 'error', jsonb_build_object('err', SQLERRM));
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_radar_signal_automatch ON public.waouh_radar_signals;
CREATE TRIGGER trg_radar_signal_automatch
  AFTER UPDATE OF status ON public.waouh_radar_signals
  FOR EACH ROW WHEN (NEW.status = 'promoted' AND OLD.status IS DISTINCT FROM 'promoted')
  EXECUTE FUNCTION public.trg_radar_signal_automatch();

-- ============== Trigger : auto-notify après match ==============
CREATE OR REPLACE FUNCTION public.trg_radar_match_autonotify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signal record; v_buyer record; v_seller_phone text; v_buyer_phone text;
  v_article record;
BEGIN
  SELECT * INTO v_signal FROM waouh_radar_signals WHERE id = NEW.signal_id;
  IF v_signal IS NULL THEN RETURN NEW; END IF;

  -- in-app
  IF NEW.target_user_id IS NOT NULL THEN
    INSERT INTO waouh_notifications(user_id, article_id, notification_type)
    VALUES (NEW.target_user_id, v_signal.promoted_article_id, 'radar_match');
  END IF;

  -- WhatsApp acheteur
  IF NEW.target_user_id IS NOT NULL THEN
    SELECT phone_number INTO v_buyer_phone FROM waouh_users WHERE id = NEW.target_user_id;
    PERFORM waouh_enqueue_outbound(v_buyer_phone, NEW.target_user_id, 'match_buyer',
      jsonb_build_object(
        'signal_id', v_signal.id,
        'article_id', v_signal.promoted_article_id,
        'title', COALESCE(v_signal.product->>'title', v_signal.category),
        'price', v_signal.price,
        'city', v_signal.city,
        'match_id', NEW.id
      ));
  END IF;

  -- WhatsApp vendeur (si signal SELL avec contact)
  IF v_signal.intent = 'SELL' AND v_signal.contact_phone IS NOT NULL THEN
    PERFORM waouh_enqueue_outbound(v_signal.contact_phone, v_signal.waouh_user_id, 'match_seller',
      jsonb_build_object(
        'signal_id', v_signal.id,
        'article_id', v_signal.promoted_article_id,
        'category', v_signal.category,
        'buyer_user_id', NEW.target_user_id,
        'match_id', NEW.id
      ));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_radar_match_autonotify ON public.waouh_radar_matches;
CREATE TRIGGER trg_radar_match_autonotify
  AFTER INSERT ON public.waouh_radar_matches
  FOR EACH ROW EXECUTE FUNCTION public.trg_radar_match_autonotify();

-- ============== updated_at trigger ==============
CREATE OR REPLACE FUNCTION public.waouh_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_outbound_uat ON public.waouh_outbound_queue;
CREATE TRIGGER trg_outbound_uat BEFORE UPDATE ON public.waouh_outbound_queue
  FOR EACH ROW EXECUTE FUNCTION public.waouh_set_updated_at();
DROP TRIGGER IF EXISTS trg_neg_uat ON public.waouh_negotiations;
CREATE TRIGGER trg_neg_uat BEFORE UPDATE ON public.waouh_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.waouh_set_updated_at();
