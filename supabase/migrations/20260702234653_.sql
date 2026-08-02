DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bot_users') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.bot_users;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_ticket_messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.support_ticket_messages;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_ai_agent_conversations') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_ai_agent_conversations;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_articles') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_articles;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_partner_activity') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_partner_activity;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_partner_businesses') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_partner_businesses;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_partner_products') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_partner_products;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_partner_sales') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_partner_sales;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waouh_transactions') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.waouh_transactions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_accounts') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_accounts;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_bot_links') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_bot_links;
  END IF;
END $$;;
