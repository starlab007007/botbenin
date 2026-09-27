-- =============================================================================
-- BANC DE TEST LOCAL UNIQUEMENT — NE JAMAIS EXÉCUTER EN PRODUCTION.
-- Scénarios fonctionnels des migrations chat du 27/09/2026.
-- Chaque bloc lève une exception (ASSERT) en cas d'écart ; sinon NOTICE PASS.
-- =============================================================================
\set ON_ERROR_STOP 1

-- Jeu de données : 1 vendeur (web + WhatsApp), 1 acheteur (web) et son identité
-- WhatsApp (même numéro, ancien format 8 chiffres), 1 tiers.
INSERT INTO waouh_users(id, web_session_id, phone_number, display_name) VALUES
  ('00000000-0000-4000-8000-00000000000a', 'sess-seller', '2290197000001', 'Vendeur'),
  ('00000000-0000-4000-8000-00000000000b', 'sess-buyer', '2290191000001', 'Acheteur (web)'),
  ('00000000-0000-4000-8000-00000000000c', NULL, '22991000001', 'Acheteur (WhatsApp, ancien format)'),
  ('00000000-0000-4000-8000-00000000000d', 'sess-other', '2290195555555', 'Tiers');
INSERT INTO waouh_articles(id, seller_id, title, price, city) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Moto', 250000, 'Cotonou'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a', 'Frigo', 80000, 'Cotonou');
INSERT INTO waouh_chat_threads(id, thread_key, active_key, article_id, buyer_user_id, seller_user_id, status) VALUES
  ('00000000-0000-4000-8000-0000000000f1', 'k-moto-1', 'rel-moto', '00000000-0000-4000-8000-0000000000a1',
   '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', 'negotiating');

-- S0 — interrupteurs créés, contrainte élargie, anciennes clés toujours valides.
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM waouh_admin_module_controls WHERE module_key IN ('chat_writer_v2', 'chat_reconcile');
  ASSERT v_count = 2, 'S0: interrupteurs absents';
  ASSERT (SELECT NOT enabled AND NOT automation_enabled FROM waouh_admin_module_controls WHERE module_key = 'chat_writer_v2'), 'S0: chat_writer_v2 doit être OFF';
  ASSERT (SELECT enabled AND NOT automation_enabled FROM waouh_admin_module_controls WHERE module_key = 'chat_reconcile'), 'S0: chat_reconcile doit être en mode rapport';
  SELECT count(*) INTO v_count FROM waouh_admin_module_controls WHERE module_key IN ('nexus','avatar_commerce','chat_web','chat_whatsapp','muse_agents','negotiation','deals','outbound');
  ASSERT v_count = 8, 'S0: modules existants perdus';
  BEGIN
    INSERT INTO waouh_admin_module_controls(module_key, label) VALUES ('inconnu', 'x');
    RAISE EXCEPTION 'S0: clé inconnue acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS S0 interrupteurs + contrainte';
END $$;

-- S1 — l'acheteur écrit : ligne émetteur + miroir vendeur, métadonnées canoniques.
DO $$
DECLARE r jsonb; v_seller_row waouh_messages%ROWTYPE; v_q int;
BEGIN
  r := waouh_record_chat_message(
    p_thread_id := '00000000-0000-4000-8000-0000000000f1',
    p_sender_user_id := '00000000-0000-4000-8000-00000000000b',
    p_text := 'Toujours disponible ?', p_intent := 'chat');
  ASSERT r->>'sender_role' = 'buyer', 'S1: rôle';
  SELECT * INTO v_seller_row FROM waouh_messages WHERE id = (r->>'seller_message_id')::uuid;
  ASSERT v_seller_row.user_id = '00000000-0000-4000-8000-00000000000a', 'S1: miroir pas chez le vendeur';
  ASSERT v_seller_row.thread_id = '00000000-0000-4000-8000-0000000000f1', 'S1: thread_id colonne';
  ASSERT v_seller_row.article_id = '00000000-0000-4000-8000-0000000000a1', 'S1: article';
  ASSERT v_seller_row.meta->>'counterpart_user_id' = '00000000-0000-4000-8000-00000000000b', 'S1: contrepartie vendeur';
  ASSERT v_seller_row.meta->>'buyer_user_id' = '00000000-0000-4000-8000-00000000000b', 'S1: buyer_user_id canonique';
  ASSERT (SELECT meta->>'counterpart_user_id' FROM waouh_messages WHERE id = (r->>'buyer_message_id')::uuid) = '00000000-0000-4000-8000-00000000000a', 'S1: contrepartie acheteur';
  SELECT count(*) INTO v_q FROM waouh_outbound_queue WHERE to_user_id = '00000000-0000-4000-8000-00000000000a';
  ASSERT v_q = 1, 'S1: 1 entrée WhatsApp pour le vendeur';
  ASSERT (SELECT last_message_at IS NOT NULL FROM waouh_chat_threads WHERE id = '00000000-0000-4000-8000-0000000000f1'), 'S1: last_message_at';
  RAISE NOTICE 'PASS S1 acheteur -> vendeur';
END $$;

-- S2 — l'acheteur écrit depuis son identité WhatsApp (autre ligne waouh_users,
-- numéro ancien format) : reconnu comme acheteur, pas rejeté.
DO $$
DECLARE r jsonb;
BEGIN
  r := waouh_record_chat_message(
    p_thread_id := '00000000-0000-4000-8000-0000000000f1',
    p_sender_user_id := '00000000-0000-4000-8000-00000000000c',
    p_text := 'Je propose 200000', p_enqueue_whatsapp := false);
  ASSERT r->>'sender_role' = 'buyer', 'S2: identité WhatsApp non reconnue comme acheteur';
  ASSERT (SELECT user_id FROM waouh_messages WHERE id = (r->>'message_id')::uuid) = '00000000-0000-4000-8000-00000000000c', 'S2: la ligne émetteur garde l''identité réelle';
  RAISE NOTICE 'PASS S2 identités multiples';
END $$;

-- S3 — évènement système pour UNE partie (identité sœur) : 1 ligne, bons rôles.
DO $$
DECLARE r jsonb; v_row waouh_messages%ROWTYPE; v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM waouh_messages;
  r := waouh_record_chat_message(
    p_thread_id := '00000000-0000-4000-8000-0000000000f1',
    p_recipient_user_id := '00000000-0000-4000-8000-00000000000c',
    p_text := 'Votre offre est transmise', p_enqueue_whatsapp := false,
    p_conversation_id := NULL, p_phone_number := '22991000001');
  ASSERT (SELECT count(*) FROM waouh_messages) = v_n + 1, 'S3: une seule ligne attendue';
  SELECT * INTO v_row FROM waouh_messages WHERE id = (r->>'recipient_message_id')::uuid;
  ASSERT v_row.user_id = '00000000-0000-4000-8000-00000000000c', 'S3: destinataire';
  ASSERT v_row.meta->>'target_role' = 'buyer', 'S3: target_role';
  ASSERT v_row.meta->>'counterpart_user_id' = '00000000-0000-4000-8000-00000000000a', 'S3: contrepartie = vendeur';
  ASSERT v_row.phone_number = '22991000001', 'S3: phone_number';
  RAISE NOTICE 'PASS S3 système -> une partie';
END $$;

-- S4 — évènement système aux deux parties : 2 lignes, 2 clés de file distinctes non nulles.
DO $$
DECLARE r jsonb; v_keys int; v_null int;
BEGIN
  r := waouh_record_chat_message(p_thread_id := '00000000-0000-4000-8000-0000000000f1', p_text := 'Livreur assigné', p_intent := 'assigned');
  ASSERT r->>'buyer_message_id' IS NOT NULL AND r->>'seller_message_id' IS NOT NULL, 'S4: deux lignes';
  SELECT count(DISTINCT dedupe_key), count(*) FILTER (WHERE dedupe_key IS NULL) INTO v_keys, v_null
  FROM waouh_outbound_queue WHERE event_type = 'assigned';
  ASSERT v_keys = 2 AND v_null = 0, 'S4: clés de file';
  RAISE NOTICE 'PASS S4 système -> deux parties';
END $$;

-- S5 — erreurs explicites.
DO $$
DECLARE v_err text;
BEGIN
  BEGIN PERFORM waouh_record_chat_message(p_thread_id := NULL, p_text := 'x');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; END;
  ASSERT v_err = 'thread_id_required', 'S5a ' || coalesce(v_err, 'aucune erreur');
  v_err := NULL;
  BEGIN PERFORM waouh_record_chat_message(p_thread_id := gen_random_uuid(), p_text := 'x');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; END;
  ASSERT v_err = 'thread_not_found', 'S5b ' || coalesce(v_err, 'aucune erreur');
  v_err := NULL;
  BEGIN PERFORM waouh_record_chat_message(p_thread_id := '00000000-0000-4000-8000-0000000000f1', p_sender_user_id := '00000000-0000-4000-8000-00000000000d', p_text := 'intrus');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; END;
  ASSERT v_err = 'sender_not_in_thread', 'S5c ' || coalesce(v_err, 'aucune erreur');
  v_err := NULL;
  BEGIN PERFORM waouh_record_chat_message(p_thread_id := '00000000-0000-4000-8000-0000000000f1', p_recipient_user_id := '00000000-0000-4000-8000-00000000000d', p_text := 'fuite');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; END;
  ASSERT v_err = 'recipient_not_in_thread', 'S5d ' || coalesce(v_err, 'aucune erreur');
  RAISE NOTICE 'PASS S5 erreurs explicites';
END $$;

-- S6 — l'appelant ne peut pas falsifier les clés d'identité via p_payload_extra.
DO $$
DECLARE r jsonb; v_meta jsonb;
BEGIN
  r := waouh_record_chat_message(
    p_thread_id := '00000000-0000-4000-8000-0000000000f1',
    p_recipient_user_id := '00000000-0000-4000-8000-00000000000a',
    p_text := 'x', p_enqueue_whatsapp := false,
    p_payload_extra := '{"thread_id":"11111111-1111-4111-8111-111111111111","buyer_user_id":"00000000-0000-4000-8000-00000000000d","article_id":"00000000-0000-4000-8000-0000000000a2","writer":"faux","deal_event":true}'::jsonb);
  SELECT meta INTO v_meta FROM waouh_messages WHERE id = (r->>'recipient_message_id')::uuid;
  ASSERT v_meta->>'thread_id' = '00000000-0000-4000-8000-0000000000f1', 'S6: thread falsifié';
  ASSERT v_meta->>'buyer_user_id' = '00000000-0000-4000-8000-00000000000b', 'S6: acheteur falsifié';
  ASSERT v_meta->>'article_id' = '00000000-0000-4000-8000-0000000000a1', 'S6: article falsifié';
  ASSERT v_meta->>'writer' = 'waouh_record_chat_message', 'S6: signature falsifiée';
  ASSERT v_meta->>'deal_event' = 'true', 'S6: les clés métier libres restent transmises';
  RAISE NOTICE 'PASS S6 métadonnées non falsifiables';
END $$;

-- S7 — p_enqueue_whatsapp=false : aucune entrée de file.
DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT count(*) INTO v_before FROM waouh_outbound_queue;
  PERFORM waouh_record_chat_message(p_thread_id := '00000000-0000-4000-8000-0000000000f1', p_text := 'sans whatsapp', p_enqueue_whatsapp := false);
  SELECT count(*) INTO v_after FROM waouh_outbound_queue;
  ASSERT v_before = v_after, 'S7: file modifiée';
  RAISE NOTICE 'PASS S7 livraison laissée à l''appelant';
END $$;

-- S8 — sécurité : anon / authenticated ne peuvent ni écrire, ni sonder, ni réconcilier.
DO $$
DECLARE v_fn text; v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH v_fn IN ARRAY ARRAY[
      'public.waouh_record_chat_message(uuid, uuid, text, text, text, jsonb, text, text, text, jsonb, text, boolean, jsonb, uuid, boolean, text, uuid, text)',
      'public.waouh_same_person(uuid, uuid)',
      'public.waouh_reconcile_chat_integrity(text, numeric)',
      'public.waouh_backfill_message_threads(integer, timestamptz)'
    ] LOOP
      ASSERT NOT has_function_privilege(v_role, v_fn, 'EXECUTE'), format('S8: %s peut exécuter %s', v_role, v_fn);
    END LOOP;
    ASSERT NOT has_table_privilege(v_role, 'public.waouh_messages_without_thread', 'SELECT'), format('S8: %s lit la vue', v_role);
  END LOOP;
  ASSERT has_function_privilege('service_role', 'public.waouh_record_chat_message(uuid, uuid, text, text, text, jsonb, text, text, text, jsonb, text, boolean, jsonb, uuid, boolean, text, uuid, text)', 'EXECUTE'), 'S8: service_role';
  RAISE NOTICE 'PASS S8 accès réservé au service';
END $$;
