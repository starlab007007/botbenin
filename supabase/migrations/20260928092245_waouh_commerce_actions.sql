-- WAOUH — Parcours unifié v3 (Lot 2) : journal d'idempotence des actions.
-- Chaque action envoyée à waouh-commerce-action porte une clé `idem` générée
-- par le client. Un renvoi (réseau lent, double tap, reprise hors ligne)
-- rejoue la réponse enregistrée au lieu d'exécuter l'action deux fois.
-- Table additive, accessible au seul service role (RLS sans politique).
CREATE TABLE IF NOT EXISTS public.waouh_commerce_actions (
  idem           text PRIMARY KEY CHECK (length(idem) BETWEEN 8 AND 120),
  actor_user_id  uuid,
  action         text NOT NULL,
  thread_id      uuid,
  status         text NOT NULL DEFAULT 'processing'
                 CHECK (status IN ('processing', 'done', 'failed')),
  response       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waouh_commerce_actions IS
  'Idempotence de waouh-commerce-action (parcours v3). Purge conseillée après 30 jours.';

CREATE INDEX IF NOT EXISTS waouh_commerce_actions_created_idx
  ON public.waouh_commerce_actions (created_at);
CREATE INDEX IF NOT EXISTS waouh_commerce_actions_thread_idx
  ON public.waouh_commerce_actions (thread_id) WHERE thread_id IS NOT NULL;

ALTER TABLE public.waouh_commerce_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waouh_commerce_actions FROM anon, authenticated;
