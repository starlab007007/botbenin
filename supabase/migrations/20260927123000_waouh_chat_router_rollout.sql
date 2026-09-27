-- WAOUH Chat v2 — rollout fin du routeur canonique.
-- Migration additive : ne modifie aucun message, thread, deal ou négociation.
DO $$
BEGIN
  IF to_regclass('public.waouh_admin_module_controls') IS NOT NULL THEN
    ALTER TABLE public.waouh_admin_module_controls
      DROP CONSTRAINT IF EXISTS waouh_admin_module_controls_key_check;
    ALTER TABLE public.waouh_admin_module_controls
      ADD CONSTRAINT waouh_admin_module_controls_key_check CHECK (module_key IN (
        'nexus', 'avatar_commerce', 'chat_web', 'chat_whatsapp', 'muse_agents',
        'negotiation', 'deals', 'outbound',
        'chat_writer_v2', 'chat_router_v2', 'chat_reconcile'
      ));

    INSERT INTO public.waouh_admin_module_controls
      (module_key, label, description, enabled, automation_enabled, metadata)
    VALUES (
      'chat_router_v2',
      'Chat — routeur de négociation unique (v2)',
      'Délègue OUI/NON/contre-offres au routeur canonique. Séparé de l’écrivain pour un rollback indépendant.',
      false,
      false,
      '{"plan":"WAOUH_CHAT_THREAD_MIGRATION","phase":3}'::jsonb
    )
    ON CONFLICT (module_key) DO NOTHING;
  END IF;
END;
$$;
