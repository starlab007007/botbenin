
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE public.waouh_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  location GEOGRAPHY(POINT, 4326),
  city TEXT,
  country TEXT NOT NULL DEFAULT 'BJ',
  reputation NUMERIC(2,1) NOT NULL DEFAULT 5.0 CHECK (reputation >= 1 AND reputation <= 5),
  sales_count INTEGER NOT NULL DEFAULT 0,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  preferred_payment TEXT NOT NULL DEFAULT 'momo',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  auth_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_users_location ON public.waouh_users USING GIST(location);
CREATE INDEX idx_waouh_users_phone ON public.waouh_users(phone_number);

CREATE TABLE public.waouh_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.waouh_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('smartphone','ordinateur','vetement','vehicule','electromenager','meuble','autre')),
  brand TEXT,
  model TEXT,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('new','like_new','good','fair','poor')),
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  photos TEXT[] NOT NULL DEFAULT '{}',
  location GEOGRAPHY(POINT, 4326),
  city TEXT,
  address_description TEXT,
  radius_km INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reserved','sold','expired','paused')),
  market_price_min NUMERIC(12,2),
  market_price_max NUMERIC(12,2),
  views_count INTEGER NOT NULL DEFAULT 0,
  interests_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_articles_location ON public.waouh_articles USING GIST(location);
CREATE INDEX idx_waouh_articles_status ON public.waouh_articles(status);
CREATE INDEX idx_waouh_articles_category ON public.waouh_articles(category);
CREATE INDEX idx_waouh_articles_seller ON public.waouh_articles(seller_id);

CREATE TABLE public.waouh_buyer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.waouh_users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  category TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  price_min NUMERIC(12,2),
  price_max NUMERIC(12,2),
  min_condition TEXT,
  location GEOGRAPHY(POINT, 4326),
  radius_km INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified_article_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_buyer_profiles_location ON public.waouh_buyer_profiles USING GIST(location);
CREATE INDEX idx_waouh_buyer_profiles_active ON public.waouh_buyer_profiles(is_active);

CREATE TABLE public.waouh_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.waouh_articles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.waouh_users(id),
  buyer_id UUID NOT NULL REFERENCES public.waouh_users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  commission NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_ref TEXT,
  escrow_status TEXT NOT NULL DEFAULT 'pending' CHECK (escrow_status IN ('pending','held','released','refunded')),
  negotiated_price NUMERIC(12,2),
  meeting_location TEXT,
  meeting_time TIMESTAMPTZ,
  seller_confirmed BOOLEAN NOT NULL DEFAULT false,
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','payment_pending','paid','completed','disputed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_waouh_tx_status ON public.waouh_transactions(status);
CREATE INDEX idx_waouh_tx_seller ON public.waouh_transactions(seller_id);
CREATE INDEX idx_waouh_tx_buyer ON public.waouh_transactions(buyer_id);

CREATE TABLE public.waouh_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.waouh_users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  context JSONB NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_intent TEXT,
  current_article_id UUID,
  current_transaction_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_conv_phone ON public.waouh_conversations(phone_number);

CREATE TABLE public.waouh_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.waouh_users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.waouh_articles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_waouh_notif_user ON public.waouh_notifications(user_id);

CREATE TABLE public.waouh_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.waouh_transactions(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.waouh_users(id),
  ratee_id UUID NOT NULL REFERENCES public.waouh_users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.waouh_cache (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_cache_expires ON public.waouh_cache(expires_at);

CREATE TABLE public.waouh_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.waouh_settings (key, value) VALUES
  ('commercial', '{"commission_rate": 0.03, "expiry_days": 7, "default_radius_km": 30, "auto_expand_radius": true, "currency": "XOF"}'),
  ('ai', '{"model": "google/gemini-2.5-flash", "temperature": 0.7, "custom_instructions": ""}'),
  ('payments', '{"momo_enabled": true, "stripe_enabled": false, "escrow_release_hours": 24}'),
  ('notifications', '{"matching_frequency_minutes": 15, "anti_spam_minutes": 60}'),
  ('whatsapp', '{"webhook_url": "", "verified": false}');

CREATE OR REPLACE FUNCTION public.waouh_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_waouh_users_updated BEFORE UPDATE ON public.waouh_users
  FOR EACH ROW EXECUTE FUNCTION public.waouh_update_timestamp();
CREATE TRIGGER trg_waouh_articles_updated BEFORE UPDATE ON public.waouh_articles
  FOR EACH ROW EXECUTE FUNCTION public.waouh_update_timestamp();
CREATE TRIGGER trg_waouh_conv_updated BEFORE UPDATE ON public.waouh_conversations
  FOR EACH ROW EXECUTE FUNCTION public.waouh_update_timestamp();

CREATE OR REPLACE FUNCTION public.waouh_check_article_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count FROM public.waouh_articles
    WHERE seller_id = NEW.seller_id AND created_at > now() - interval '24 hours';
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 annonces par 24h atteinte';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_waouh_articles_rate_limit BEFORE INSERT ON public.waouh_articles
  FOR EACH ROW EXECUTE FUNCTION public.waouh_check_article_rate_limit();

ALTER TABLE public.waouh_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active articles public read" ON public.waouh_articles
  FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "admin read users" ON public.waouh_users
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admin read buyer_profiles" ON public.waouh_buyer_profiles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admin read transactions" ON public.waouh_transactions
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admin read conversations" ON public.waouh_conversations
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admin read notifications" ON public.waouh_notifications
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "ratings public read" ON public.waouh_ratings
  FOR SELECT USING (true);
CREATE POLICY "admin manage settings" ON public.waouh_settings
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "settings public read" ON public.waouh_settings
  FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_transactions;
