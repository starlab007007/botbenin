-- WAOUH Chat — Parcours unifié v3 : interrupteurs (Lot 1 + Lot 2).
-- Migration additive : ne modifie aucun message, fil, négociation ou deal.
--
--   chat_interest_fastpath  ACTIVÉ   Lot 1 — un message qui porte un article
--                                    ouvre la Deal Room (fil + négociation)
--                                    et renvoie thread_id / negotiation_id.
--                                    Le couper rétablit l'ancien comportement.
--   chat_catalog_v3         COUPÉ    Lot 2 — textes courts et boutons du
--                                    catalogue unifié (Web, Flutter, WhatsApp).
--   commerce_action_v3      COUPÉ    Lot 2 — point d'entrée waouh-commerce-action.
--
-- Lecture fermée par défaut côté fonctions (ligne absente => ancien chemin).
DO $$
BEGIN
  IF to_regclass('public.waouh_admin_module_controls') IS NOT NULL THEN
    ALTER TABLE public.waouh_admin_module_controls
      DROP CONSTRAINT IF EXISTS waouh_admin_module_controls_key_check;
    ALTER TABLE public.waouh_admin_module_controls
      ADD CONSTRAINT waouh_admin_module_controls_key_check CHECK (module_key IN (
        'nexus', 'avatar_commerce', 'chat_web', 'chat_whatsapp', 'muse_agents',
        'negotiation', 'deals', 'outbound',
        'chat_writer_v2', 'chat_router_v2', 'chat_reconcile',
        'chat_interest_fastpath', 'chat_catalog_v3', 'commerce_action_v3'
      ));

    INSERT INTO public.waouh_admin_module_controls
      (module_key, label, description, enabled, automation_enabled, metadata)
    VALUES
      (
        'chat_interest_fastpath',
        'Chat — ouverture directe de la Deal Room (v3)',
        'Un message portant un article ouvre le fil et la négociation et renvoie leurs identifiants. Couper = ancien comportement.',
        true,
        true,
        '{"plan":"WAOUH_CHAT_PARCOURS_V3","lot":1}'::jsonb
      ),
      (
        'chat_catalog_v3',
        'Chat — catalogue de messages unifié (v3)',
        'Textes courts (titre + une ligne) et 3 boutons au plus, identiques sur Web, Flutter et WhatsApp.',
        false,
        false,
        '{"plan":"WAOUH_CHAT_PARCOURS_V3","lot":2}'::jsonb
      ),
      (
        'commerce_action_v3',
        'Commerce — point d''entrée unique des actions (v3)',
        'waouh-commerce-action : contrat d''action v3, idempotence, texte libre strict, suggestions prédictives.',
        false,
        false,
        '{"plan":"WAOUH_CHAT_PARCOURS_V3","lot":2}'::jsonb
      )
    ON CONFLICT (module_key) DO NOTHING;
  END IF;
END;
$$;
