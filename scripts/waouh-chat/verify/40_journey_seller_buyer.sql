-- =============================================================================
-- BANC LOCAL UNIQUEMENT. Parcours : vendeur A publie, acheteur B cherche, trouve,
-- entre en contact, négocie, achète ; le vendeur est notifié et conclut la vente.
-- [RÉEL]   = code de production exécuté (fonctions SQL, triggers, migrations).
-- [SIMULÉ] = logique qui vit dans les fonctions Edge (TypeScript) : reproduite
--            ici par des écritures directes de mêmes colonnes ; non testée en tant que code.
-- =============================================================================
\set A '''20000000-0000-4000-8000-00000000000a'''
\set B '''20000000-0000-4000-8000-00000000000b'''
\set ART '''20000000-0000-4000-8000-0000000000a1'''
\set THR '''20000000-0000-4000-8000-0000000000f1'''
\set NEG '''20000000-0000-4000-8000-0000000000c1'''

-- J1 [SIMULÉ] Le vendeur A publie son article.
INSERT INTO waouh_users(id, web_session_id, phone_number, display_name, city, channel) VALUES
  (:A, 'sess-A', '22997000001', 'Vendeur A', 'Cotonou', 'web'),
  (:B, 'sess-B', '22996000002', 'Acheteur B', 'Cotonou', 'web');
INSERT INTO waouh_articles(id, seller_id, title, price, city, photos, status)
VALUES (:ART, :A, 'iPhone 12 128 Go', 250000, 'Cotonou', '["https://cdn.example/p1.jpg"]', 'active');
DO $$ BEGIN ASSERT (SELECT status FROM waouh_articles WHERE id = '20000000-0000-4000-8000-0000000000a1') = 'active', 'J1: article non actif';
  RAISE NOTICE 'PASS J1 [simulé] A publie : article actif'; END $$;

-- J2 [SIMULÉ] L'acheteur B cherche « iphone » et trouve l'article de A.
DO $$ DECLARE v_seller uuid; v_n int; BEGIN
  SELECT count(*), (array_agg(seller_id))[1] INTO v_n, v_seller FROM waouh_articles
   WHERE status = 'active' AND title ILIKE '%iphone%' AND seller_id <> '20000000-0000-4000-8000-00000000000b';
  ASSERT v_n = 1 AND v_seller = '20000000-0000-4000-8000-00000000000a', 'J2: recherche';
  RAISE NOTICE 'PASS J2 [simulé] B cherche et trouve l''article de A'; END $$;

-- J3 [SIMULÉ] B se dit intéressé : ouverture de la Deal Room (fil produit + négociation).
INSERT INTO waouh_chat_threads(id, thread_key, active_key, article_id, buyer_user_id, seller_user_id, status, source)
VALUES (:THR, 'product_meet:art1:B', 'active:art1:B', :ART, :B, :A, 'active', 'search');
INSERT INTO waouh_negotiations(id, article_id, buyer_user_id, seller_user_id, thread_id, state, last_actor)
VALUES (:NEG, :ART, :B, :A, :THR, 'proposed', 'buyer');
UPDATE waouh_chat_threads SET negotiation_id = :NEG, status = 'negotiating' WHERE id = :THR;
DO $$ BEGIN
  -- Une deuxième ouverture du même couple article × acheteur ne doit pas créer de doublon.
  BEGIN
    INSERT INTO waouh_chat_threads(thread_key, active_key, article_id, buyer_user_id, seller_user_id)
    VALUES ('product_meet:art1:B:bis', 'active:art1:B', '20000000-0000-4000-8000-0000000000a1',
            '20000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000a');
    RAISE EXCEPTION 'J3: doublon accepté';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  ASSERT (SELECT count(*) FROM waouh_chat_threads WHERE article_id = '20000000-0000-4000-8000-0000000000a1') = 1, 'J3: un seul fil';
  RAISE NOTICE 'PASS J3 [simulé] Deal Room ouverte, pas de doublon (clé active unique)'; END $$;

-- J4 [RÉEL] Premier message de B au vendeur : miroir chez A + notification WhatsApp en file.
DO $$ DECLARE r jsonb; v_row waouh_messages%ROWTYPE; v_q int; BEGIN
  r := waouh_record_chat_message(
    p_thread_id := '20000000-0000-4000-8000-0000000000f1',
    p_sender_user_id := '20000000-0000-4000-8000-00000000000b',
    p_text := 'Bonjour, je suis intéressé par votre iPhone 12.', p_intent := 'interested',
    p_correlation_id := 'corr_20000000_buyer_20000000');
  ASSERT r->>'sender_role' = 'buyer', 'J4: rôle';
  SELECT * INTO v_row FROM waouh_messages WHERE id = (r->>'seller_message_id')::uuid;
  ASSERT v_row.user_id = '20000000-0000-4000-8000-00000000000a', 'J4: le vendeur ne reçoit pas le message';
  ASSERT v_row.thread_id = '20000000-0000-4000-8000-0000000000f1' AND v_row.article_id = '20000000-0000-4000-8000-0000000000a1', 'J4: portée';
  ASSERT v_row.meta->>'buyer_user_id' = '20000000-0000-4000-8000-00000000000b', 'J4: acheteur canonique';
  SELECT count(*) INTO v_q FROM waouh_outbound_queue WHERE to_user_id = '20000000-0000-4000-8000-00000000000a';
  ASSERT v_q = 1, 'J4: notification vendeur absente de la file';
  RAISE NOTICE 'PASS J4 [réel] B -> A : message miroir + 1 notification en file pour le vendeur'; END $$;

-- J5 [RÉEL] A répond : miroir chez B + notification acheteur ; le fil reste isolé (1 article × 1 couple).
DO $$ DECLARE r jsonb; v_q int; BEGIN
  r := waouh_record_chat_message(
    p_thread_id := '20000000-0000-4000-8000-0000000000f1',
    p_sender_user_id := '20000000-0000-4000-8000-00000000000a',
    p_text := 'Bonjour, oui il est disponible. Proposez votre prix.', p_intent := 'chat');
  ASSERT r->>'sender_role' = 'seller', 'J5: rôle vendeur';
  SELECT count(*) INTO v_q FROM waouh_outbound_queue WHERE to_user_id = '20000000-0000-4000-8000-00000000000b';
  ASSERT v_q = 1, 'J5: notification acheteur absente';
  ASSERT (SELECT count(DISTINCT thread_id) FROM waouh_messages WHERE article_id = '20000000-0000-4000-8000-0000000000a1') = 1, 'J5: fuite entre fils';
  RAISE NOTICE 'PASS J5 [réel] A répond : notification acheteur, fil unique'; END $$;

-- J6 [SIMULÉ] Négociation : B propose 200 000, A contre-propose 230 000.
UPDATE waouh_negotiations SET state = 'proposed',  last_offer_price = 200000, last_actor = 'buyer'  WHERE id = :NEG;
UPDATE waouh_negotiations SET state = 'countered', last_offer_price = 230000, last_actor = 'seller' WHERE id = :NEG;

-- J7 [RÉEL] B accepte la contre-offre : deal + transaction créés atomiquement.
DO $$ DECLARE r jsonb; v_deal waouh_deals%ROWTYPE; v_tx waouh_transactions%ROWTYPE; v_thr waouh_chat_threads%ROWTYPE; BEGIN
  r := waouh_accept_negotiation_atomic(
    '20000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-00000000000b', 'buyer', 0.05, 'corr_journey');
  RAISE NOTICE 'accept -> %', r;
  SELECT * INTO v_deal FROM waouh_deals WHERE negotiation_id = '20000000-0000-4000-8000-0000000000c1';
  ASSERT v_deal.id IS NOT NULL AND v_deal.amount = 230000, 'J7: deal ou montant';
  ASSERT v_deal.buyer_user_id = '20000000-0000-4000-8000-00000000000b' AND v_deal.seller_user_id = '20000000-0000-4000-8000-00000000000a', 'J7: parties du deal';
  ASSERT v_deal.commission_amount = 11500, 'J7: commission 5 % = 11 500';
  SELECT * INTO v_tx FROM waouh_transactions WHERE thread_id = '20000000-0000-4000-8000-0000000000f1';
  ASSERT v_tx.id IS NOT NULL AND v_tx.negotiated_price = 230000, 'J7: transaction';
  SELECT * INTO v_thr FROM waouh_chat_threads WHERE id = '20000000-0000-4000-8000-0000000000f1';
  ASSERT v_thr.deal_id = v_deal.id, 'J7: le fil doit pointer le deal';
  ASSERT (SELECT state FROM waouh_negotiations WHERE id = '20000000-0000-4000-8000-0000000000c1') = 'accepted', 'J7: négociation acceptée';
  -- Rejouer l'acceptation ne doit ni dupliquer le deal ni la transaction (idempotence).
  PERFORM waouh_accept_negotiation_atomic('20000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000f1',
    '20000000-0000-4000-8000-00000000000b', 'buyer', 0.05, 'corr_journey');
  ASSERT (SELECT count(*) FROM waouh_deals WHERE negotiation_id = '20000000-0000-4000-8000-0000000000c1') = 1, 'J7: doublon de deal';
  ASSERT (SELECT count(*) FROM waouh_transactions WHERE thread_id = '20000000-0000-4000-8000-0000000000f1') = 1, 'J7: doublon de transaction';
  RAISE NOTICE 'PASS J7 [réel] accord atomique : deal 230 000 FCFA, commission 11 500, idempotent'; END $$;

-- J8 [SIMULÉ] Paiement, livraison et vente finalisée (logique waouh-deal-ops côté Edge).
UPDATE waouh_deals SET status = 'awaiting_payment' WHERE negotiation_id = :NEG;
UPDATE waouh_deals SET status = 'completed', commission_status = 'paid' WHERE negotiation_id = :NEG;
UPDATE waouh_transactions SET status = 'completed', escrow_status = 'released', payment_method = 'mobile_money' WHERE thread_id = :THR;
UPDATE waouh_articles SET status = 'sold', updated_at = now() WHERE id = :ART;
UPDATE waouh_chat_threads SET status = 'concluded', closed_at = now() WHERE id = :THR;
DO $$ BEGIN
  ASSERT (SELECT status FROM waouh_articles WHERE id = '20000000-0000-4000-8000-0000000000a1') = 'sold', 'J8: article vendu';
  -- Règle de clôture des clients (Web CLOSED_STATUSES = Flutter liveIsClosedArticleStatus).
  ASSERT (SELECT status IN ('sold','closed','finalized','completed','vendu') FROM waouh_articles WHERE id = '20000000-0000-4000-8000-0000000000a1'), 'J8: statut non reconnu comme clos';
  RAISE NOTICE 'PASS J8 [simulé] paiement, livraison, vente : article vendu -> conversation clôturée côté clients'; END $$;

-- J9 [RÉEL] Garde-fou du 29/09 : un message sans thread_id est rattaché au fil canonique.
DO $$ DECLARE v_m waouh_messages%ROWTYPE; v_id uuid; BEGIN
  -- a) via negotiation_id en métadonnées
  INSERT INTO waouh_messages(user_id, direction, text, article_id, meta)
  VALUES ('20000000-0000-4000-8000-00000000000b', 'in', 'merci pour la livraison',
          '20000000-0000-4000-8000-0000000000a1', '{"negotiation_id":"20000000-0000-4000-8000-0000000000c1"}') RETURNING id INTO v_id;
  SELECT * INTO v_m FROM waouh_messages WHERE id = v_id;
  ASSERT v_m.thread_id = '20000000-0000-4000-8000-0000000000f1', 'J9a: thread non résolu par la négociation';
  ASSERT v_m.meta->>'thread_resolved_by' = 'db_guard_v3', 'J9a: marque du garde-fou absente';
  -- b) ambigu : deux fils actifs pour le même article × acheteur => jamais de devinette
  INSERT INTO waouh_articles(id, seller_id, title, price, status) VALUES ('20000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', 'Casque', 30000, 'active');
  INSERT INTO waouh_chat_threads(thread_key, active_key, article_id, buyer_user_id, seller_user_id, status) VALUES
    ('t-a2-1', NULL, '20000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000a', 'active'),
    ('t-a2-2', NULL, '20000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000a', 'active');
  INSERT INTO waouh_messages(user_id, direction, text, article_id, meta)
  VALUES ('20000000-0000-4000-8000-00000000000b', 'in', 'ambigu', '20000000-0000-4000-8000-0000000000a2', '{}') RETURNING id INTO v_id;
  SELECT * INTO v_m FROM waouh_messages WHERE id = v_id;
  ASSERT v_m.thread_id IS NULL AND v_m.meta->>'thread_resolution' = 'unresolved', 'J9b: doit rester non résolu';
  RAISE NOTICE 'PASS J9 [réel] garde-fou thread : résolution par négociation, refus de deviner si ambigu'; END $$;

-- J10 [RÉEL] Contrôle d'intégrité (réconciliation, mode rapport) : aucune divergence sur le parcours.
DO $$ DECLARE r jsonb; BEGIN
  r := waouh_reconcile_chat_integrity('report');
  RAISE NOTICE 'rapport: %', r;
  ASSERT (r->>'r2_open_negotiations_linkable')::int = 0, 'J10: négociation ouverte sans fil';
  ASSERT (r->>'r3_deals_thread_repairable')::int = 0, 'J10: deal sans fil';
  ASSERT (r->>'r4_threads_missing_deal_link')::int = 0, 'J10: fil sans lien deal';
  ASSERT (r->>'r6_accepted_without_deal_7d')::int = 0, 'J10: accord sans deal';
  ASSERT (r->>'r5_threads_stale_status')::int = 0, 'J10: statut de fil périmé';
  RAISE NOTICE 'PASS J10 [réel] réconciliation : aucune divergence après le parcours complet'; END $$;
