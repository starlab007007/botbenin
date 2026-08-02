
-- Supprimer la vue existante et la recréer correctement
DROP VIEW IF EXISTS user_stats;

-- Créer la vue user_stats avec la bonne structure
CREATE VIEW user_stats AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.phone,
  u.subscription_tier,
  u.created_at,
  u.last_login,
  u.is_active,
  COALESCE(r.name, 'user') as role_name,
  COALESCE(bot_count.total_bots, 0) as total_bots,
  COALESCE(msg_count.total_messages, 0) as total_messages,
  COALESCE(auto_count.total_automations, 0) as total_automations,
  COALESCE(notif_count.unread_notifications, 0) as unread_notifications
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN (
  SELECT bo.user_id, COUNT(b.id) as total_bots
  FROM bot_owners bo
  LEFT JOIN bots b ON bo.id = b.owner_id
  GROUP BY bo.user_id
) bot_count ON u.id = bot_count.user_id
LEFT JOIN (
  SELECT bo.user_id, COUNT(cm.id) as total_messages
  FROM bot_owners bo
  LEFT JOIN bots b ON bo.id = b.owner_id
  LEFT JOIN chat_messages cm ON b.id = cm.bot_id
  GROUP BY bo.user_id
) msg_count ON u.id = msg_count.user_id
LEFT JOIN (
  SELECT user_id, COUNT(id) as total_automations
  FROM automations
  GROUP BY user_id
) auto_count ON u.id = auto_count.user_id
LEFT JOIN (
  SELECT user_id, COUNT(id) as unread_notifications
  FROM notifications
  WHERE read = false
  GROUP BY user_id
) notif_count ON u.id = notif_count.user_id;

-- Créer une table pour marquer les comptes de démonstration
CREATE TABLE IF NOT EXISTS demo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_demo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Insérer les comptes de démonstration existants
INSERT INTO demo_accounts (user_id, is_demo) 
SELECT id, true FROM users 
WHERE email LIKE '%demo%' OR email LIKE '%test%' OR full_name LIKE '%Demo%' OR full_name LIKE '%Test%'
ON CONFLICT (user_id) DO NOTHING;

-- Créer une fonction pour vérifier si un utilisateur peut voir les données d'un autre utilisateur
CREATE OR REPLACE FUNCTION can_view_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() = target_user_id THEN true
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'manager')
      ) THEN true
      ELSE false
    END;
$$;

-- Créer une fonction pour masquer les données des comptes de démonstration
CREATE OR REPLACE FUNCTION hide_demo_account_data(user_id UUID, data_value TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM demo_accounts WHERE demo_accounts.user_id = hide_demo_account_data.user_id AND is_demo = true)
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur 
          JOIN roles r ON ur.role_id = r.id 
          WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
      THEN '[Données masquées]'
      ELSE data_value
    END;
$$;

-- Activer RLS sur toutes les tables principales (seulement si pas déjà activé)
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their own bots" ON bots;
DROP POLICY IF EXISTS "Users can create bots" ON bots;
DROP POLICY IF EXISTS "Users can update their own bots" ON bots;
DROP POLICY IF EXISTS "Users can delete their own bots" ON bots;
DROP POLICY IF EXISTS "Bot owners can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can manage their automations" ON automations;
DROP POLICY IF EXISTS "Users can manage their prospects" ON prospects;
DROP POLICY IF EXISTS "Users can manage their prospect databases" ON prospect_databases;
DROP POLICY IF EXISTS "Users can manage their marketing campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Users can manage their local businesses" ON local_businesses;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their activities" ON user_activities;

-- Créer les policies RLS pour les bots
CREATE POLICY "Users can view their own bots" ON bots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bot_owners WHERE bot_owners.id = bots.owner_id AND bot_owners.user_id = auth.uid())
  );

CREATE POLICY "Users can create bots" ON bots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bot_owners WHERE bot_owners.id = bots.owner_id AND bot_owners.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own bots" ON bots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bot_owners WHERE bot_owners.id = bots.owner_id AND bot_owners.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own bots" ON bots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM bot_owners WHERE bot_owners.id = bots.owner_id AND bot_owners.user_id = auth.uid())
  );

-- Policies pour les messages de chat
CREATE POLICY "Bot owners can view messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots b 
      JOIN bot_owners bo ON b.owner_id = bo.id 
      WHERE b.id = chat_messages.bot_id AND bo.user_id = auth.uid()
    )
  );

-- Policies pour les automations
CREATE POLICY "Users can manage their automations" ON automations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies pour les prospects
CREATE POLICY "Users can manage their prospects" ON prospects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their prospect databases" ON prospect_databases
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies pour les campagnes marketing
CREATE POLICY "Users can manage their marketing campaigns" ON marketing_campaigns
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies pour les entreprises locales
CREATE POLICY "Users can manage their local businesses" ON local_businesses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies pour les notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Policies pour les activités utilisateur
CREATE POLICY "Users can view their activities" ON user_activities
  FOR SELECT USING (user_id = auth.uid());

-- Policies pour les comptes de démonstration (admin seulement)
ALTER TABLE demo_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins can manage demo accounts" ON demo_accounts;
CREATE POLICY "Only admins can manage demo accounts" ON demo_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Insérer les données par défaut si elles n'existent pas
INSERT INTO roles (name, description) VALUES 
  ('admin', 'Administrateur système'),
  ('manager', 'Gestionnaire'),
  ('user', 'Utilisateur standard'),
  ('viewer', 'Observateur')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, action, resource, description) VALUES 
  ('read_all', 'read', 'all', 'Lecture complète'),
  ('write_all', 'write', 'all', 'Écriture complète'),
  ('delete_all', 'delete', 'all', 'Suppression complète'),
  ('manage_users', 'manage', 'users', 'Gestion des utilisateurs'),
  ('manage_roles', 'manage', 'roles', 'Gestion des rôles'),
  ('view_analytics', 'read', 'analytics', 'Voir les analyses'),
  ('manage_automations', 'manage', 'automations', 'Gestion des automatisations'),
  ('access_all_modules', 'access', 'modules', 'Accès à tous les modules'),
  ('manage_subscriptions', 'manage', 'subscriptions', 'Gestion des abonnements')
ON CONFLICT (name) DO NOTHING;

-- Créer les associations rôle-permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.name IN ('read_all', 'view_analytics', 'manage_automations')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name IN ('read_own', 'write_own')
ON CONFLICT DO NOTHING;
;
