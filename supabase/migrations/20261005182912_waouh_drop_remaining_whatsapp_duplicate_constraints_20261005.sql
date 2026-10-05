-- WAOUH remaining WhatsApp duplicate UNIQUE cleanup — 2026-10-05
-- Keeps the original PostgreSQL-generated *_key constraints and removes only
-- the later duplicate constraints added by an older migration.

ALTER TABLE public.whatsapp_accounts
  DROP CONSTRAINT IF EXISTS whatsapp_accounts_user_session_unique;

ALTER TABLE public.whatsapp_bot_links
  DROP CONSTRAINT IF EXISTS whatsapp_bot_links_unique;
