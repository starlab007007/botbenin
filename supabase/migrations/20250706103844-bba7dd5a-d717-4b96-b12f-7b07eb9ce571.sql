
-- Migration pour créer un système d'administration complet sans affecter les données existantes

-- 1. Créer les rôles s'ils n'existent pas déjà
INSERT INTO public.roles (id, name, description)
SELECT gen_random_uuid(), 'admin', 'Administrateur avec accès complet à la plateforme'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin');

INSERT INTO public.roles (id, name, description)
SELECT gen_random_uuid(), 'manager', 'Gestionnaire avec accès étendu'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'manager');

INSERT INTO public.roles (id, name, description)
SELECT gen_random_uuid(), 'user', 'Utilisateur standard'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'user');

INSERT INTO public.roles (id, name, description)
SELECT gen_random_uuid(), 'viewer', 'Observateur en lecture seule'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'viewer');

-- 2. Créer les permissions détaillées si elles n'existent pas
INSERT INTO public.detailed_permissions (name, category, action, resource, description)
VALUES 
  ('manage_users', 'users', 'manage', 'users', 'Gérer les utilisateurs de la plateforme'),
  ('view_analytics', 'analytics', 'view', 'analytics', 'Voir les analyses et statistiques'),
  ('manage_bots', 'bots', 'manage', 'bots', 'Gérer tous les bots de la plateforme'),
  ('manage_campaigns', 'campaigns', 'manage', 'campaigns', 'Gérer toutes les campagnes'),
  ('platform_admin', 'platform', 'admin', 'platform', 'Administration complète de la plateforme'),
  ('view_logs', 'platform', 'view', 'logs', 'Consulter les logs système'),
  ('manage_roles', 'users', 'manage', 'roles', 'Gérer les rôles et permissions'),
  ('system_config', 'platform', 'config', 'system', 'Configuration système')
ON CONFLICT (name) DO NOTHING;

-- 3. Associer toutes les permissions au rôle admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Créer l'utilisateur administrateur s'il n'existe pas
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Vérifier si l'utilisateur admin existe déjà
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@bot.bj';
    
    -- Si l'utilisateur n'existe pas, le créer
    IF admin_user_id IS NULL THEN
        -- Créer l'utilisateur dans auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            aud,
            role,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'admin@bot.bj',
            crypt('AdminBot2024!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            'authenticated',
            'authenticated',
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Admin Bot", "role": "admin"}',
            false,
            '',
            '',
            ''
        )
        RETURNING id INTO admin_user_id;
        
        -- Créer le profil utilisateur
        INSERT INTO public.user_profiles (user_id, full_name, role, preferences)
        VALUES (
            admin_user_id,
            'Administrateur Bot.Bj',
            'admin',
            '{"notifications": true, "language": "fr", "timezone": "UTC", "theme": "light"}'
        );
        
        -- Assigner le rôle admin
        INSERT INTO public.user_roles (user_id, role_id)
        SELECT admin_user_id, r.id
        FROM public.roles r
        WHERE r.name = 'admin';
        
        -- Créer l'entrée bot_owner avec limites étendues
        INSERT INTO public.bot_owners (user_id, subscription_plan, max_bots)
        VALUES (admin_user_id, 'enterprise', 999);
        
        RAISE NOTICE 'Compte administrateur créé avec succès: admin@bot.bj / AdminBot2024!';
    ELSE
        RAISE NOTICE 'Compte administrateur existe déjà: admin@bot.bj';
    END IF;
END $$;

-- 5. Créer une fonction pour vérifier les permissions admin si elle n'existe pas
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
    AND r.name = 'admin'
  );
$$;

-- 6. Créer des politiques RLS pour les administrateurs (seulement si elles n'existent pas)

-- Politique pour que les admins puissent voir tous les utilisateurs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Admins can view all users'
    ) THEN
        CREATE POLICY "Admins can view all users"
        ON public.users
        FOR SELECT
        USING (is_platform_admin() OR id = auth.uid());
    END IF;
END $$;

-- Politique pour que les admins puissent gérer tous les bots
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bots' AND policyname = 'Admins can manage all bots'
    ) THEN
        CREATE POLICY "Admins can manage all bots"
        ON public.bots
        FOR ALL
        USING (
            is_platform_admin() OR 
            owner_id IN (SELECT id FROM bot_owners WHERE user_id = auth.uid())
        );
    END IF;
END $$;

-- Politique pour que les admins puissent voir toutes les campagnes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'social_sharing_campaigns' AND policyname = 'Admins can view all campaigns'
    ) THEN
        CREATE POLICY "Admins can view all campaigns"
        ON public.social_sharing_campaigns
        FOR SELECT
        USING (is_platform_admin() OR owner_id = auth.uid());
    END IF;
END $$;

-- 7. Vérification finale et rapport
DO $$
DECLARE
    admin_count integer;
    role_count integer;
    permission_count integer;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM auth.users WHERE email = 'admin@bot.bj';
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT COUNT(*) INTO permission_count FROM public.detailed_permissions;
    
    RAISE NOTICE '=== RAPPORT DE MIGRATION ===';
    RAISE NOTICE 'Comptes administrateur: %', admin_count;
    RAISE NOTICE 'Rôles créés: %', role_count;
    RAISE NOTICE 'Permissions créées: %', permission_count;
    RAISE NOTICE '============================';
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'SUCCÈS: Le compte administrateur est prêt à être utilisé';
        RAISE NOTICE 'Email: admin@bot.bj';
        RAISE NOTICE 'Mot de passe: AdminBot2024!';
    ELSE
        RAISE NOTICE 'ERREUR: Échec de la création du compte administrateur';
    END IF;
END $$;
