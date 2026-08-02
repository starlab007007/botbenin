ALTER TABLE public.waouh_messages ADD COLUMN IF NOT EXISTS article_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_waouh_messages_article_id ON public.waouh_messages(article_id) WHERE article_id IS NOT NULL;
UPDATE public.waouh_messages SET article_id = (meta->>'article_id')::uuid WHERE article_id IS NULL AND meta ? 'article_id' AND (meta->>'article_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';;
