-- Phase 1.1 : Tables principales pour le module IA Créateur Admin (corrigé)

-- Table des limites par plan d'abonnement
CREATE TABLE IF NOT EXISTS ia_creator_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  monthly_images integer NOT NULL DEFAULT 0,
  monthly_flyers integer NOT NULL DEFAULT 0,
  monthly_videos integer NOT NULL DEFAULT 0,
  storage_gb numeric NOT NULL DEFAULT 1.0,
  is_unlimited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de tracking de l'utilisation mensuelle par utilisateur
CREATE TABLE IF NOT EXISTS ia_creator_user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_month text NOT NULL,
  images_created integer DEFAULT 0,
  flyers_created integer DEFAULT 0,
  videos_created integer DEFAULT 0,
  storage_used_mb numeric DEFAULT 0,
  last_reset_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year_month)
);

-- Table de modération des créations
CREATE TABLE IF NOT EXISTS ia_creator_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id uuid REFERENCES visual_creations(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderation_notes text,
  auto_flagged boolean DEFAULT false,
  flagged_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index (seulement ceux qui n'existent pas)
CREATE INDEX IF NOT EXISTS idx_ia_usage_user_month ON ia_creator_user_usage(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_ia_moderation_status ON ia_creator_moderation(status);
CREATE INDEX IF NOT EXISTS idx_visual_creations_user ON visual_creations(user_id);

-- Vue agrégée pour les statistiques
CREATE OR REPLACE VIEW ia_creator_admin_stats AS
SELECT 
  COUNT(DISTINCT vc.id) as total_creations,
  COUNT(DISTINCT vc.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '24 hours' THEN vc.user_id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '7 days' THEN vc.user_id END) as active_users_7d,
  COUNT(CASE WHEN vc.metadata->>'type' = 'image' THEN 1 END) as total_images,
  COUNT(CASE WHEN vc.metadata->>'type' = 'flyer' THEN 1 END) as total_flyers,
  COUNT(CASE WHEN vc.metadata->>'type' = 'video' THEN 1 END) as total_videos,
  COUNT(CASE WHEN vc.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as creations_this_month,
  COALESCE(SUM((vc.metadata->>'file_size_mb')::numeric), 0) as total_storage_used_gb,
  COUNT(CASE WHEN m.status = 'pending' THEN 1 END) as pending_moderation,
  COUNT(CASE WHEN m.status = 'flagged' THEN 1 END) as flagged_creations
FROM visual_creations vc
LEFT JOIN ia_creator_moderation m ON vc.id = m.creation_id;

-- Fonction pour vérifier les limites
CREATE OR REPLACE FUNCTION check_ia_creator_limit(
  p_user_id uuid,
  p_creation_type text
) RETURNS jsonb AS $$
DECLARE
  v_user_plan text;
  v_limit_record record;
  v_usage_record record;
  v_current_month text := to_char(NOW(), 'YYYY-MM');
  v_result jsonb;
BEGIN
  SELECT bo.subscription_plan INTO v_user_plan
  FROM bot_owners bo
  WHERE bo.user_id = p_user_id;
  
  IF v_user_plan IS NULL THEN
    v_user_plan := 'free';
  END IF;
  
  SELECT * INTO v_limit_record
  FROM ia_creator_usage_limits
  WHERE plan_name = v_user_plan;
  
  IF v_limit_record.is_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'unlimited', true,
      'remaining', -1
    );
  END IF;
  
  SELECT * INTO v_usage_record
  FROM ia_creator_user_usage
  WHERE user_id = p_user_id AND year_month = v_current_month;
  
  IF v_usage_record IS NULL THEN
    INSERT INTO ia_creator_user_usage (user_id, year_month)
    VALUES (p_user_id, v_current_month)
    RETURNING * INTO v_usage_record;
  END IF;
  
  CASE p_creation_type
    WHEN 'image' THEN
      v_result := jsonb_build_object(
        'allowed', v_usage_record.images_created < v_limit_record.monthly_images,
        'unlimited', false,
        'used', v_usage_record.images_created,
        'limit', v_limit_record.monthly_images,
        'remaining', v_limit_record.monthly_images - v_usage_record.images_created
      );
    WHEN 'flyer' THEN
      v_result := jsonb_build_object(
        'allowed', v_usage_record.flyers_created < v_limit_record.monthly_flyers,
        'unlimited', false,
        'used', v_usage_record.flyers_created,
        'limit', v_limit_record.monthly_flyers,
        'remaining', v_limit_record.monthly_flyers - v_usage_record.flyers_created
      );
    WHEN 'video' THEN
      v_result := jsonb_build_object(
        'allowed', v_usage_record.videos_created < v_limit_record.monthly_videos,
        'unlimited', false,
        'used', v_usage_record.videos_created,
        'limit', v_limit_record.monthly_videos,
        'remaining', v_limit_record.monthly_videos - v_usage_record.videos_created
      );
  END CASE;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour incrémenter l'utilisation
CREATE OR REPLACE FUNCTION increment_ia_creator_usage(
  p_user_id uuid,
  p_creation_type text,
  p_file_size_mb numeric DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_current_month text := to_char(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO ia_creator_user_usage (user_id, year_month, images_created, flyers_created, videos_created, storage_used_mb)
  VALUES (
    p_user_id, 
    v_current_month,
    CASE WHEN p_creation_type = 'image' THEN 1 ELSE 0 END,
    CASE WHEN p_creation_type = 'flyer' THEN 1 ELSE 0 END,
    CASE WHEN p_creation_type = 'video' THEN 1 ELSE 0 END,
    p_file_size_mb
  )
  ON CONFLICT (user_id, year_month) DO UPDATE SET
    images_created = ia_creator_user_usage.images_created + CASE WHEN p_creation_type = 'image' THEN 1 ELSE 0 END,
    flyers_created = ia_creator_user_usage.flyers_created + CASE WHEN p_creation_type = 'flyer' THEN 1 ELSE 0 END,
    videos_created = ia_creator_user_usage.videos_created + CASE WHEN p_creation_type = 'video' THEN 1 ELSE 0 END,
    storage_used_mb = ia_creator_user_usage.storage_used_mb + p_file_size_mb,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Données initiales pour les limites par plan
INSERT INTO ia_creator_usage_limits (plan_name, monthly_images, monthly_flyers, monthly_videos, storage_gb, is_unlimited) VALUES
('free', 2, 2, 2, 0.5, false),
('starter', 10, 5, 3, 2.0, false),
('business', 25, 15, 10, 5.0, false),
('marketing', 50, 30, 20, 10.0, false),
('service_client', 30, 20, 15, 7.0, false),
('ia_createur', 0, 0, 0, 100.0, true),
('enterprise', 100, 75, 50, 50.0, false)
ON CONFLICT (plan_name) DO NOTHING;

-- Politiques RLS
ALTER TABLE ia_creator_usage_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage usage limits" ON ia_creator_usage_limits;
CREATE POLICY "Admins can manage usage limits"
ON ia_creator_usage_limits FOR ALL
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view limits" ON ia_creator_usage_limits;
CREATE POLICY "Users can view limits"
ON ia_creator_usage_limits FOR SELECT
USING (true);

ALTER TABLE ia_creator_user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own usage" ON ia_creator_user_usage;
CREATE POLICY "Users can view their own usage"
ON ia_creator_user_usage FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert usage" ON ia_creator_user_usage;
CREATE POLICY "System can insert usage"
ON ia_creator_user_usage FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update usage records" ON ia_creator_user_usage;
CREATE POLICY "System can update usage records"
ON ia_creator_user_usage FOR UPDATE
USING (true);

ALTER TABLE ia_creator_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage moderation" ON ia_creator_moderation;
CREATE POLICY "Admins can manage moderation"
ON ia_creator_moderation FOR ALL
USING (has_role(auth.uid(), 'admin'));