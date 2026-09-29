-- Interrupteur `nexus_direct_deal` : résultats Nexus externes → Deal Room directe.
-- La contrainte des clés de waouh_admin_module_controls ne connaissait pas cette clé (l'insertion était refusée en production).
-- Migration additive. La ligne est créée COUPÉE : sans elle activée (module + automatisation), les clients gardent la fiche de contact.
-- Lecture fermée par défaut côté fonctions (ligne absente ou coupée => fonctionnalité inerte).
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
        'chat_interest_fastpath', 'chat_catalog_v3', 'commerce_action_v3',
        'nexus_direct_deal'
      ));

    INSERT INTO public.waouh_admin_module_controls
      (module_key, label, description, enabled, automation_enabled, metadata)
    VALUES
      (
        'nexus_direct_deal',
        'Nexus — Deal Room directe (offres externes)',
        'Un résultat Nexus sans article ouvre directement la Deal Room de l''acheteur ; l''envoi de l''offre au tiers reste un tap, sous la politique de contact C0–C5. Couper = fiche de contact.',
        false,
        false,
        '{"plan":"NEXUS_DEAL_ROOM_DIRECTE"}'::jsonb
      )
    ON CONFLICT (module_key) DO NOTHING;
  END IF;
END;
$$;
