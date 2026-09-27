-- =============================================================================
-- WAOUH Chat — Phase 0/1 : thread canonique + écrivain unique
-- Plan validé le 27/09/2026 — voir docs/WAOUH_CHAT_THREAD_MIGRATION.md
-- =============================================================================
-- STRICTEMENT ADDITIF ET SÛR EN APPLICATION AUTOMATIQUE :
--   * aucune colonne existante modifiée ni supprimée, aucune ligne touchée ;
--   * la production possède déjà waouh_messages.thread_id et
--     waouh_chat_threads (ajoutés hors migration — cf. types générés) :
--     les CREATE/ADD ... IF NOT EXISTS ci-dessous y sont des no-op ;
--   * l'écrivain waouh_record_chat_message() n'est appelé que lorsque
--     l'interrupteur chat_writer_v2 est activé (OFF par défaut) ;
--   * thread_id reste NULLABLE : la conversation principale avec
--     l'assistant (waouh_conversations) n'a pas de thread produit.
-- =============================================================================

-- 1) waouh_chat_threads — filet défensif (no-op en production).
CREATE TABLE IF NOT EXISTS public.waouh_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key text NOT NULL,
  active_key text,
  thread_type text NOT NULL DEFAULT 'product_meet',
  article_id uuid,
  buyer_user_id uuid,
  seller_user_id uuid,
  owner_user_id uuid,
  search_request_id uuid,
  cycle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  negotiation_id uuid,
  deal_id uuid,
  transaction_id uuid,
  source text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.waouh_chat_threads ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS waouh_chat_threads_thread_key_key
  ON public.waouh_chat_threads(thread_key);
-- Une seule relation active acheteur×vendeur×article (attendu par
-- resolveProductThread et le auto-heal via ON CONFLICT (active_key)).
CREATE UNIQUE INDEX IF NOT EXISTS waouh_chat_threads_active_key_key
  ON public.waouh_chat_threads(active_key) WHERE active_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS waouh_chat_threads_article_idx
  ON public.waouh_chat_threads(article_id, status);
CREATE INDEX IF NOT EXISTS waouh_chat_threads_buyer_idx
  ON public.waouh_chat_threads(buyer_user_id);
CREATE INDEX IF NOT EXISTS waouh_chat_threads_seller_idx
  ON public.waouh_chat_threads(seller_user_id);

-- 2) waouh_messages.thread_id (no-op en production si déjà présente).
ALTER TABLE public.waouh_messages
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.waouh_chat_threads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS waouh_messages_thread_idx
  ON public.waouh_messages(thread_id, created_at);

-- 3) Interrupteurs pilotables depuis le Command Center admin (audités).
--    La table impose une liste fermée de clés : on la remplace par la même
--    liste + 2 clés. Le code lit ces clés en "fermé par défaut".
DO $$
BEGIN
  IF to_regclass('public.waouh_admin_module_controls') IS NOT NULL THEN
    ALTER TABLE public.waouh_admin_module_controls
      DROP CONSTRAINT IF EXISTS waouh_admin_module_controls_key_check;
    ALTER TABLE public.waouh_admin_module_controls
      ADD CONSTRAINT waouh_admin_module_controls_key_check CHECK (module_key IN (
        'nexus', 'avatar_commerce', 'chat_web', 'chat_whatsapp', 'muse_agents',
        'negotiation', 'deals', 'outbound',
        'chat_writer_v2', 'chat_reconcile'
      ));

    INSERT INTO public.waouh_admin_module_controls
      (module_key, label, description, enabled, automation_enabled, metadata)
    VALUES
      ('chat_writer_v2', 'Chat — écrivain unique (v2)',
       'Messages de négociation, deal et livraison écrits via waouh_record_chat_message (thread canonique). Automatisation désactivée = ancien chemin inchangé.',
       false, false, '{"plan":"WAOUH_CHAT_THREAD_MIGRATION","phase":2}'::jsonb),
      ('chat_reconcile', 'Chat — réconciliation automatique',
       'Détecte et répare les incohérences thread / négociation / deal. Automatisation désactivée = mode rapport seul, aucune écriture.',
       true, false, '{"plan":"WAOUH_CHAT_THREAD_MIGRATION","phase":5}'::jsonb)
    ON CONFLICT (module_key) DO NOTHING;
  END IF;
END;
$$;

-- 4) Même personne ? (identités multiples : App, web, WhatsApp, LID).
--    Version SQL volontairement prudente de resolveSiblingUserIds() :
--    même id, même auth_user_id, même session web, même LID, ou même
--    numéro béninois (ancien format 8 chiffres ≡ nouveau format 01 + 8).
CREATE OR REPLACE FUNCTION public.waouh_phone_identity_key(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR btrim(p_phone) = '' THEN NULL
    WHEN p_phone ~* '@lid$' THEN lower(p_phone)
    ELSE (
      SELECT CASE
        WHEN d ~ '^22901[0-9]{8}$' THEN 'bj:' || right(d, 8)
        WHEN d ~ '^229[0-9]{8}$'   THEN 'bj:' || right(d, 8)
        WHEN d ~ '^01[0-9]{8}$'    THEN 'bj:' || right(d, 8)
        WHEN d ~ '^[0-9]{8}$'      THEN 'bj:' || d
        WHEN length(d) >= 8        THEN 'intl:' || d
        ELSE NULL
      END
      FROM (SELECT regexp_replace(regexp_replace(p_phone, '@(c\.us|s\.whatsapp\.net)$', '', 'i'), '\D', '', 'g') AS d) x
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.waouh_same_person(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_a IS NULL OR p_b IS NULL THEN false
    WHEN p_a = p_b THEN true
    ELSE COALESCE((
      SELECT (a.auth_user_id IS NOT NULL AND a.auth_user_id = b.auth_user_id)
          OR (a.web_session_id IS NOT NULL AND a.web_session_id = b.web_session_id)
          OR (public.waouh_phone_identity_key(a.phone_number) IS NOT NULL
              AND public.waouh_phone_identity_key(a.phone_number) = public.waouh_phone_identity_key(b.phone_number))
      FROM public.waouh_users a, public.waouh_users b
      WHERE a.id = p_a AND b.id = p_b
    ), false)
  END;
$$;

-- 5) L'écrivain canonique unique.
--    Modes :
--      * p_sender_user_id renseigné (acheteur ou vendeur du thread, ou une
--        de ses identités) : ligne émetteur + miroir vers l'autre partie ;
--      * p_sender_user_id NULL (évènement système) : une ligne par
--        destinataire — p_recipient_user_id seul, sinon les deux parties.
--    Rôle, contrepartie, article, négociation, deal : TOUJOURS dérivés de
--    waouh_chat_threads, jamais des métadonnées de l'appelant.
--    p_enqueue_whatsapp=false : l'appelant garde sa propre livraison
--    (résolution de numéro existante — resolveRealPhoneE164, LID, etc.).
DROP FUNCTION IF EXISTS public.waouh_record_chat_message(
  uuid, uuid, text, text, text, jsonb, text, text, text, jsonb, text, boolean, jsonb
);
DROP FUNCTION IF EXISTS public.waouh_record_chat_message(
  uuid, uuid, text, text, text, jsonb, text, text, text, jsonb, text, boolean, jsonb, uuid, boolean, text
);

CREATE OR REPLACE FUNCTION public.waouh_record_chat_message(
  p_thread_id uuid,
  p_sender_user_id uuid DEFAULT NULL,
  p_direction text DEFAULT 'out',
  p_text text DEFAULT '',
  p_channel text DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_image_url text DEFAULT NULL,
  p_intent text DEFAULT NULL,
  p_template text DEFAULT NULL,
  p_actions jsonb DEFAULT '[]'::jsonb,
  p_correlation_id text DEFAULT NULL,
  p_mirror_to_other_party boolean DEFAULT true,
  p_payload_extra jsonb DEFAULT '{}'::jsonb,
  p_recipient_user_id uuid DEFAULT NULL,
  p_enqueue_whatsapp boolean DEFAULT true,
  p_dedupe_key text DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL,
  p_phone_number text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_thread public.waouh_chat_threads%ROWTYPE;
  v_sender public.waouh_users%ROWTYPE;
  v_recipient public.waouh_users%ROWTYPE;
  v_sender_role text;
  v_recipient_role text;
  v_counterpart uuid;
  v_meta jsonb;
  v_row_meta jsonb;
  v_msg_id uuid := NULL;
  v_row_id uuid;
  v_buyer_msg_id uuid := NULL;
  v_seller_msg_id uuid := NULL;
  v_recipient_msg_id uuid := NULL;
  v_queue_ids jsonb := '[]'::jsonb;
  v_queue_id uuid;
  v_targets jsonb := '[]'::jsonb;
  v_target jsonb;
  v_channel text;
  v_text text := COALESCE(NULLIF(p_text, ''), '(message)');
BEGIN
  IF p_thread_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'thread_id_required';
  END IF;
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_direction';
  END IF;

  SELECT * INTO v_thread FROM public.waouh_chat_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'thread_not_found';
  END IF;

  -- Rôle de l'émetteur : dérivé du thread (identités multiples acceptées).
  IF p_sender_user_id IS NULL THEN
    v_sender_role := 'system';
  ELSIF public.waouh_same_person(p_sender_user_id, v_thread.buyer_user_id) THEN
    v_sender_role := 'buyer';
  ELSIF public.waouh_same_person(p_sender_user_id, v_thread.seller_user_id) THEN
    v_sender_role := 'seller';
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'sender_not_in_thread';
  END IF;

  IF p_sender_user_id IS NOT NULL THEN
    SELECT * INTO v_sender FROM public.waouh_users WHERE id = p_sender_user_id;
  END IF;

  v_meta := jsonb_build_object(
    'thread_id', p_thread_id,
    'cycle_id', v_thread.cycle_id,
    'article_id', v_thread.article_id,
    'buyer_user_id', v_thread.buyer_user_id,
    'seller_user_id', v_thread.seller_user_id,
    'negotiation_id', v_thread.negotiation_id,
    'deal_id', v_thread.deal_id,
    'transaction_id', v_thread.transaction_id,
    'role', v_sender_role,
    'intent', p_intent,
    'template', p_template,
    'actions', COALESCE(p_actions, '[]'::jsonb),
    'correlation_id', p_correlation_id
  ) || COALESCE(p_payload_extra, '{}'::jsonb)
    -- Les clés d'identité canoniques et la signature ne sont jamais
    -- écrasables par l'appelant.
    || jsonb_build_object(
      'thread_id', p_thread_id,
      'article_id', v_thread.article_id,
      'buyer_user_id', v_thread.buyer_user_id,
      'seller_user_id', v_thread.seller_user_id,
      'writer', 'waouh_record_chat_message'
    );

  -- Ligne de l'émetteur.
  IF v_sender_role <> 'system' THEN
    v_counterpart := CASE WHEN v_sender_role = 'buyer' THEN v_thread.seller_user_id ELSE v_thread.buyer_user_id END;
    v_channel := COALESCE(p_channel, CASE
      WHEN v_sender.web_session_id IS NOT NULL THEN 'web'
      WHEN v_sender.auth_user_id IS NOT NULL THEN 'app'
      WHEN v_sender.phone_number IS NOT NULL THEN 'whatsapp'
      ELSE 'system' END);
    INSERT INTO public.waouh_messages(
      thread_id, conversation_id, user_id, web_session_id, phone_number,
      channel, direction, text, article_id, attachments, meta
    ) VALUES (
      p_thread_id, p_conversation_id, p_sender_user_id, v_sender.web_session_id, p_phone_number,
      v_channel, p_direction, v_text, v_thread.article_id, COALESCE(p_attachments, '[]'::jsonb),
      v_meta || jsonb_build_object('counterpart_user_id', v_counterpart, 'target_role', v_sender_role)
    )
    RETURNING id INTO v_msg_id;
    IF v_sender_role = 'buyer' THEN v_buyer_msg_id := v_msg_id; ELSE v_seller_msg_id := v_msg_id; END IF;

    IF p_mirror_to_other_party AND v_counterpart IS NOT NULL THEN
      v_targets := jsonb_build_array(jsonb_build_object(
        'user_id', v_counterpart,
        'role', CASE WHEN v_sender_role = 'buyer' THEN 'seller' ELSE 'buyer' END));
    END IF;
  ELSIF p_recipient_user_id IS NOT NULL THEN
    IF public.waouh_same_person(p_recipient_user_id, v_thread.buyer_user_id) THEN
      v_recipient_role := 'buyer';
    ELSIF public.waouh_same_person(p_recipient_user_id, v_thread.seller_user_id) THEN
      v_recipient_role := 'seller';
    ELSE
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'recipient_not_in_thread';
    END IF;
    v_targets := jsonb_build_array(jsonb_build_object('user_id', p_recipient_user_id, 'role', v_recipient_role));
  ELSE
    IF v_thread.buyer_user_id IS NOT NULL THEN
      v_targets := v_targets || jsonb_build_object('user_id', v_thread.buyer_user_id, 'role', 'buyer');
    END IF;
    IF v_thread.seller_user_id IS NOT NULL THEN
      v_targets := v_targets || jsonb_build_object('user_id', v_thread.seller_user_id, 'role', 'seller');
    END IF;
  END IF;

  -- Lignes destinataires (+ file WhatsApp si demandée).
  FOR v_target IN SELECT * FROM jsonb_array_elements(v_targets)
  LOOP
    SELECT * INTO v_recipient FROM public.waouh_users WHERE id = (v_target->>'user_id')::uuid;
    CONTINUE WHEN NOT FOUND;
    v_recipient_role := v_target->>'role';
    v_counterpart := CASE WHEN v_recipient_role = 'buyer' THEN v_thread.seller_user_id ELSE v_thread.buyer_user_id END;
    v_channel := CASE
      WHEN v_recipient.web_session_id IS NOT NULL THEN 'web'
      WHEN v_recipient.auth_user_id IS NOT NULL THEN 'app'
      WHEN v_recipient.phone_number IS NOT NULL THEN 'whatsapp'
      ELSE 'system' END;
    v_row_meta := v_meta || jsonb_build_object(
      'counterpart_user_id', v_counterpart,
      'target_role', v_recipient_role,
      'mirrored', v_sender_role <> 'system');

    INSERT INTO public.waouh_messages(
      thread_id, conversation_id, user_id, web_session_id, phone_number,
      channel, direction, text, article_id, attachments, meta
    ) VALUES (
      p_thread_id,
      CASE WHEN v_sender_role = 'system' AND p_recipient_user_id IS NOT NULL THEN p_conversation_id END,
      v_recipient.id, v_recipient.web_session_id,
      CASE WHEN v_sender_role = 'system' AND p_recipient_user_id IS NOT NULL THEN p_phone_number END,
      v_channel, 'out', v_text, v_thread.article_id, COALESCE(p_attachments, '[]'::jsonb), v_row_meta
    )
    RETURNING id INTO v_row_id;

    IF v_recipient_role = 'buyer' THEN v_buyer_msg_id := v_row_id; ELSE v_seller_msg_id := v_row_id; END IF;
    v_recipient_msg_id := v_row_id;

    IF p_enqueue_whatsapp AND v_recipient.phone_number IS NOT NULL THEN
      v_queue_id := public.waouh_enqueue_outbound_v2(
        p_to_phone := v_recipient.phone_number,
        p_to_user_id := v_recipient.id,
        p_template := COALESCE(p_template, p_intent, 'chat_message'),
        p_payload := v_row_meta || jsonb_build_object(
          'text', v_text, 'message_id', v_row_id, 'attachments', COALESCE(p_attachments, '[]'::jsonb)),
        p_web_session_id := v_recipient.web_session_id,
        p_image_url := p_image_url,
        p_channel := 'whatsapp',
        p_message_id := v_row_id,
        p_transaction_id := v_thread.transaction_id,
        -- Jamais NULL : clé de l'appelant suffixée du destinataire, sinon
        -- clé dérivée de la ligne créée.
        p_dedupe_key := CASE
          WHEN p_dedupe_key IS NOT NULL THEN p_dedupe_key || ':' || v_recipient.id::text
          ELSE 'chatmsg:' || p_thread_id::text || ':' || v_row_id::text END,
        p_event_type := p_intent
      );
      IF v_queue_id IS NOT NULL THEN
        v_queue_ids := v_queue_ids || to_jsonb(v_queue_id);
      END IF;
    END IF;
  END LOOP;

  UPDATE public.waouh_chat_threads SET last_message_at = now() WHERE id = p_thread_id;

  RETURN jsonb_build_object(
    'ok', true,
    'thread_id', p_thread_id,
    'sender_role', v_sender_role,
    'message_id', v_msg_id,
    'recipient_message_id', v_recipient_msg_id,
    'buyer_message_id', v_buyer_msg_id,
    'seller_message_id', v_seller_msg_id,
    'queue_ids', v_queue_ids
  );
END;
$$;

COMMENT ON FUNCTION public.waouh_record_chat_message IS
  'Écrivain canonique unique des messages de Deal Room (plan du 27/09/2026, '
  'docs/WAOUH_CHAT_THREAD_MIGRATION.md). Rôle et contrepartie dérivés de '
  'waouh_chat_threads, jamais des métadonnées de l''appelant.';

-- SECURITY DEFINER dans le schéma public : sans ces REVOKE, n'importe quel
-- visiteur (rôle anon, via PostgREST) pourrait écrire dans n'importe quel
-- thread ou sonder les identités. Seules les edge functions les appellent.
DO $$
DECLARE
  v_sig text;
BEGIN
  FOREACH v_sig IN ARRAY ARRAY[
    'public.waouh_record_chat_message(uuid, uuid, text, text, text, jsonb, text, text, text, jsonb, text, boolean, jsonb, uuid, boolean, text, uuid, text)',
    'public.waouh_same_person(uuid, uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_sig);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    END IF;
  END LOOP;
END;
$$;
