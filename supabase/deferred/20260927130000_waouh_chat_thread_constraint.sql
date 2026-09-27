-- =============================================================================
-- WAOUH Chat — Phase 6 (DIFFÉRÉE) : rendre le thread obligatoire en Deal Room
-- =============================================================================
-- ⚠️  Ce fichier est VOLONTAIREMENT hors de supabase/migrations : un
--     `supabase db push` ne l'appliquera jamais tout seul. À exécuter à la
--     main (SQL editor) quand les conditions ci-dessous sont réunies.
--
-- Correction du plan initial : on ne peut PAS rendre waouh_messages.thread_id
-- NOT NULL pour toute la table. La conversation principale avec l'assistant
-- (waouh_conversations), les signaux radar et la console opérateur écrivent
-- légitimement des messages sans thread produit. La règle correcte est :
--   « un message qui porte un deal ou une négociation doit porter son thread ».
-- La contrainte est posée NOT VALID : elle s'applique aux nouvelles lignes
-- uniquement ; l'historique ancien n'est ni modifié ni bloquant.
--
-- Pré-requis (vérifiés ci-dessous, sinon le script s'arrête sans rien faire) :
--   1. chat_writer_v2 activé (module + automatisation) ;
--   2. aucune écriture Deal Room sans thread depuis 48 h (aucun repli sur
--      l'ancien chemin) — sinon une écriture future échouerait.
--
-- Contrôle préalable (lecture seule) :
--   SELECT count(*) FROM public.waouh_messages
--   WHERE thread_id IS NULL
--     AND created_at > now() - interval '48 hours'
--     AND ((meta->>'deal_id') IS NOT NULL OR (meta->>'negotiation_id') IS NOT NULL);
--
-- Retour arrière : ALTER TABLE public.waouh_messages
--                    DROP CONSTRAINT IF EXISTS waouh_messages_dealroom_thread_ck;
-- =============================================================================

DO $$
DECLARE
  v_enabled boolean;
  v_automation boolean;
  v_violations integer;
BEGIN
  SELECT enabled, automation_enabled INTO v_enabled, v_automation
  FROM public.waouh_admin_module_controls WHERE module_key = 'chat_writer_v2';
  IF NOT FOUND OR v_enabled IS NOT TRUE OR v_automation IS NOT TRUE THEN
    RAISE EXCEPTION 'Phase 6 refusée : chat_writer_v2 doit être activé (module + automatisation) depuis au moins 48 h.';
  END IF;

  SELECT count(*) INTO v_violations
  FROM public.waouh_messages
  WHERE thread_id IS NULL
    AND created_at > now() - interval '48 hours'
    AND ((meta->>'deal_id') IS NOT NULL OR (meta->>'negotiation_id') IS NOT NULL);
  IF v_violations > 0 THEN
    RAISE EXCEPTION 'Phase 6 refusée : % message(s) Deal Room sans thread sur 48 h. Vérifier les replis de l''écrivain unique avant de contraindre.', v_violations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waouh_messages_dealroom_thread_ck'
  ) THEN
    ALTER TABLE public.waouh_messages
      ADD CONSTRAINT waouh_messages_dealroom_thread_ck
      CHECK (
        thread_id IS NOT NULL
        OR ((meta->>'deal_id') IS NULL AND (meta->>'negotiation_id') IS NULL)
      ) NOT VALID;
  END IF;

  RAISE NOTICE 'Phase 6 appliquée : contrainte waouh_messages_dealroom_thread_ck (NOT VALID) active pour les nouvelles lignes.';
END;
$$;
