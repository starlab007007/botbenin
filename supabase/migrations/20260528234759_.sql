ALTER TABLE public.waouh_notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS waouh_notifications_dedupe_key_uidx
  ON public.waouh_notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS waouh_messages_meta_article_idx
  ON public.waouh_messages ((meta->>'article_id'));;
