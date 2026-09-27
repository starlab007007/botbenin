-- WAOUH Chat — Parcours unifié v3 : activation progressive et retour arrière.
-- À exécuter dans l'éditeur SQL Supabase, UNE étape à la fois.
-- Effet en moins de 5 secondes (cache des interrupteurs côté fonctions).

-- ---------------------------------------------------------------------------
-- État
-- ---------------------------------------------------------------------------
SELECT module_key, enabled, automation_enabled, updated_at
FROM public.waouh_admin_module_controls
WHERE module_key IN ('chat_interest_fastpath', 'chat_catalog_v3', 'commerce_action_v3',
                     'chat_writer_v2', 'chat_router_v2')
ORDER BY module_key;

-- ---------------------------------------------------------------------------
-- Étape A (Lot 2) — textes courts + boutons du catalogue sur tous les canaux
-- ---------------------------------------------------------------------------
-- UPDATE public.waouh_admin_module_controls
--    SET enabled = true, automation_enabled = true, updated_at = now()
--  WHERE module_key = 'chat_catalog_v3';

-- ---------------------------------------------------------------------------
-- Étape B (Lot 2) — boutons Web/Flutter via waouh-commerce-action
-- (après 24 h sans anomalie sur l'étape A)
-- ---------------------------------------------------------------------------
-- UPDATE public.waouh_admin_module_controls
--    SET enabled = true, automation_enabled = true, updated_at = now()
--  WHERE module_key = 'commerce_action_v3';

-- ---------------------------------------------------------------------------
-- Retour arrière (chaque brique séparément)
-- ---------------------------------------------------------------------------
-- UPDATE public.waouh_admin_module_controls SET automation_enabled = false, updated_at = now()
--  WHERE module_key = 'commerce_action_v3';      -- clients : ancien chemin
-- UPDATE public.waouh_admin_module_controls SET automation_enabled = false, updated_at = now()
--  WHERE module_key = 'chat_catalog_v3';         -- textes historiques
-- UPDATE public.waouh_admin_module_controls SET automation_enabled = false, updated_at = now()
--  WHERE module_key = 'chat_interest_fastpath';  -- comportement d'avant le Lot 1

-- ---------------------------------------------------------------------------
-- Suivi (après activation)
-- ---------------------------------------------------------------------------
-- Réponses « Aucune négociation » depuis le déploiement (attendu : 0 avec article connu)
SELECT count(*) AS aucune_negociation, count(*) FILTER (WHERE article_id IS NOT NULL) AS avec_article
FROM public.waouh_messages
WHERE direction = 'out'
  AND created_at > now() - interval '24 hours'
  AND text ILIKE '%Aucune négociation en cours%';

-- Messages d'intérêt / d'offre sans fil (attendu : en baisse vers 0)
SELECT count(*) AS entrees_sans_fil
FROM public.waouh_messages
WHERE direction = 'in'
  AND created_at > now() - interval '24 hours'
  AND article_id IS NOT NULL
  AND thread_id IS NULL;

-- Actions v3 (idempotence) des dernières 24 h
SELECT action, status, count(*)
FROM public.waouh_commerce_actions
WHERE created_at > now() - interval '24 hours'
GROUP BY 1, 2 ORDER BY 1, 2;

-- Purge conseillée du journal d'idempotence (> 30 jours)
-- DELETE FROM public.waouh_commerce_actions WHERE created_at < now() - interval '30 days';