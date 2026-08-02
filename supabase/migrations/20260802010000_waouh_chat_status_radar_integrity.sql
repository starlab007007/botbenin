BEGIN;

-- Une relation peut recommencer après clôture : l'intérêt est donc unique
-- dans un cycle/thread, et non plus pour toute la vie du couple article/acheteur.
ALTER TABLE IF EXISTS public.waouh_interests
  DROP CONSTRAINT IF EXISTS waouh_interests_dedupe;

CREATE UNIQUE INDEX IF NOT EXISTS waouh_interests_thread_dedupe_uidx
  ON public.waouh_interests(article_id, buyer_user_id, thread_id)
  WHERE buyer_user_id IS NOT NULL AND thread_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS waouh_interests_legacy_dedupe_uidx
  ON public.waouh_interests(article_id, buyer_user_id)
  WHERE buyer_user_id IS NOT NULL AND thread_id IS NULL;

CREATE INDEX IF NOT EXISTS waouh_messages_thread_page_idx
  ON public.waouh_messages(thread_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS waouh_notifications_viewer_thread_idx
  ON public.waouh_notifications(user_id, thread_id, sent_at DESC);

ALTER TABLE IF EXISTS public.waouh_statuses
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS waouh_statuses_idempotency_uidx
  ON public.waouh_statuses(idempotency_key)
  WHERE COALESCE(idempotency_key, '') <> '';

COMMIT;
