-- =============================================================================
-- BANC DE TEST LOCAL UNIQUEMENT — NE JAMAIS EXÉCUTER EN PRODUCTION.
-- Phase 6 (différée) : garde-fous puis contrainte.
-- Appelé par run-sql-tests.sh qui exécute le fichier différé entre les étapes.
-- =============================================================================
\set ON_ERROR_STOP 1

-- P6-1 : interrupteur coupé => le fichier différé doit refuser (vérifié par le script).
-- P6-2 : interrupteur actif + violation récente => refus (vérifié par le script).
-- P6-3 : après application, la règle vaut pour les nouvelles lignes seulement.
DO $$
DECLARE v_ok boolean := false;
BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waouh_messages_dealroom_thread_ck'), 'P6: contrainte absente';
  -- Message Deal Room sans thread : refusé.
  BEGIN
    INSERT INTO waouh_messages(user_id, direction, text, meta)
    VALUES ('10000000-0000-4000-8000-00000000000b', 'out', 'deal sans thread', '{"deal_id":"10000000-0000-4000-8000-0000000000d3"}');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'P6: message Deal Room sans thread accepté';
  -- Conversation assistant, et clés présentes mais nulles (pushSyncedEvent) : acceptés.
  INSERT INTO waouh_messages(user_id, direction, text, meta)
  VALUES ('10000000-0000-4000-8000-00000000000b', 'out', 'assistant', '{"intent":"SEARCH"}'),
         ('10000000-0000-4000-8000-00000000000b', 'out', 'clés nulles', '{"deal_id":null,"negotiation_id":null}');
  RAISE NOTICE 'PASS P6 contrainte ciblée sur la Deal Room';
END $$;
