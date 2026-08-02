-- Phase 4: Configuration des politiques RLS renforcées avec système de permissions

-- ============================================================================
-- 1. PROSPECTS - Sécurisation complète
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can create their own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can update their own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can delete their own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Admins can view all prospects" ON public.prospects;
DROP POLICY IF EXISTS "Admins can manage all prospects" ON public.prospects;

-- Nouvelles politiques basées sur permissions
CREATE POLICY "prospects_select_own" ON public.prospects
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'prospects.view.all')
  );

CREATE POLICY "prospects_insert_own" ON public.prospects
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'prospects.create')
  );

CREATE POLICY "prospects_update_own" ON public.prospects
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND user_has_permission(auth.uid(), 'prospects.edit.own'))
    OR user_has_permission(auth.uid(), 'prospects.edit.all')
  );

CREATE POLICY "prospects_delete_own" ON public.prospects
  FOR DELETE
  USING (
    (user_id = auth.uid() AND user_has_permission(auth.uid(), 'prospects.delete.own'))
    OR user_has_permission(auth.uid(), 'prospects.delete.all')
  );

-- ============================================================================
-- 2. PROSPECT_DATABASES - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own databases" ON public.prospect_databases;
DROP POLICY IF EXISTS "Users can create their own databases" ON public.prospect_databases;
DROP POLICY IF EXISTS "Users can update their own databases" ON public.prospect_databases;
DROP POLICY IF EXISTS "Users can delete their own databases" ON public.prospect_databases;

CREATE POLICY "prospect_databases_select_own" ON public.prospect_databases
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'prospects.databases.view.all')
  );

CREATE POLICY "prospect_databases_insert_own" ON public.prospect_databases
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'prospects.databases.create')
  );

CREATE POLICY "prospect_databases_update_own" ON public.prospect_databases
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'prospects.databases.edit.all')
  );

CREATE POLICY "prospect_databases_delete_own" ON public.prospect_databases
  FOR DELETE
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'prospects.databases.delete.all')
  );

-- ============================================================================
-- 3. CAMPAIGNS - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "campaigns_policy" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can modify their campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON public.campaigns;

CREATE POLICY "campaigns_select_own" ON public.campaigns
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'campaigns.view.all')
  );

CREATE POLICY "campaigns_insert_own" ON public.campaigns
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'campaigns.create')
  );

CREATE POLICY "campaigns_update_own" ON public.campaigns
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND user_has_permission(auth.uid(), 'campaigns.edit.own'))
    OR user_has_permission(auth.uid(), 'campaigns.edit.all')
  );

CREATE POLICY "campaigns_delete_own" ON public.campaigns
  FOR DELETE
  USING (
    (user_id = auth.uid() AND user_has_permission(auth.uid(), 'campaigns.delete.own'))
    OR user_has_permission(auth.uid(), 'campaigns.delete.all')
  );

-- ============================================================================
-- 4. SOCIAL_SHARING_CAMPAIGNS - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.social_sharing_campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.social_sharing_campaigns;

CREATE POLICY "social_campaigns_select_own" ON public.social_sharing_campaigns
  FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'campaigns.view.all')
  );

CREATE POLICY "social_campaigns_insert_own" ON public.social_sharing_campaigns
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'campaigns.create')
  );

CREATE POLICY "social_campaigns_update_own" ON public.social_sharing_campaigns
  FOR UPDATE
  USING (
    owner_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'campaigns.edit.all')
  );

CREATE POLICY "social_campaigns_delete_own" ON public.social_sharing_campaigns
  FOR DELETE
  USING (
    owner_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'campaigns.delete.all')
  );

-- ============================================================================
-- 5. WHATSAPP_ACCOUNTS - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can create their WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can update their WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Users can delete their WhatsApp accounts" ON public.whatsapp_accounts;

CREATE POLICY "whatsapp_accounts_select_own" ON public.whatsapp_accounts
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'whatsapp.view.all')
  );

CREATE POLICY "whatsapp_accounts_insert_own" ON public.whatsapp_accounts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'whatsapp.connect')
  );

CREATE POLICY "whatsapp_accounts_update_own" ON public.whatsapp_accounts
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'whatsapp.manage')
  );

CREATE POLICY "whatsapp_accounts_delete_own" ON public.whatsapp_accounts
  FOR DELETE
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'whatsapp.delete')
  );

-- ============================================================================
-- 6. LOCAL_BUSINESSES - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own local businesses" ON public.local_businesses;
DROP POLICY IF EXISTS "Users can create local businesses" ON public.local_businesses;
DROP POLICY IF EXISTS "Users can update their own local businesses" ON public.local_businesses;
DROP POLICY IF EXISTS "Users can delete their own local businesses" ON public.local_businesses;

CREATE POLICY "local_businesses_select_own" ON public.local_businesses
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'prospects.view.all')
  );

CREATE POLICY "local_businesses_insert_own" ON public.local_businesses
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'prospects.create')
  );

CREATE POLICY "local_businesses_update_own" ON public.local_businesses
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "local_businesses_delete_own" ON public.local_businesses
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- 7. SHORTENED_LINKS - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own shortened links" ON public.shortened_links;
DROP POLICY IF EXISTS "Bot owners can view their shortened links" ON public.shortened_links;
DROP POLICY IF EXISTS "Bot owners can create shortened links" ON public.shortened_links;
DROP POLICY IF EXISTS "Bot owners can update their shortened links" ON public.shortened_links;
DROP POLICY IF EXISTS "Bot owners can delete their shortened links" ON public.shortened_links;

CREATE POLICY "shortened_links_select_own" ON public.shortened_links
  FOR SELECT
  USING (
    owner_id IN (
      SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
    )
    OR user_has_permission(auth.uid(), 'bots.view.all')
  );

CREATE POLICY "shortened_links_insert_own" ON public.shortened_links
  FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
    )
    AND user_has_permission(auth.uid(), 'bots.share')
  );

CREATE POLICY "shortened_links_update_own" ON public.shortened_links
  FOR UPDATE
  USING (
    owner_id IN (
      SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shortened_links_delete_own" ON public.shortened_links
  FOR DELETE
  USING (
    owner_id IN (
      SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. USERS - Sécurisation avec permissions granulaires
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (
    id = auth.uid() 
    OR user_has_permission(auth.uid(), 'users.view')
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (
    id = auth.uid() 
    OR user_has_permission(auth.uid(), 'users.edit')
  );

-- ============================================================================
-- 9. USER_ROLES - Protection contre l'escalade de privilèges
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'users.roles.view')
  );

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'users.roles.assign')
  );

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE
  USING (
    user_has_permission(auth.uid(), 'users.roles.assign')
  );

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE
  USING (
    user_has_permission(auth.uid(), 'users.roles.assign')
  );

-- ============================================================================
-- 10. AUTOMATIONS - Sécurisation complète
-- ============================================================================

DROP POLICY IF EXISTS "automations_policy" ON public.automations;
DROP POLICY IF EXISTS "Users can manage their automations" ON public.automations;

CREATE POLICY "automations_select_own" ON public.automations
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_has_permission(auth.uid(), 'bots.view.all')
  );

CREATE POLICY "automations_insert_own" ON public.automations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_permission(auth.uid(), 'bots.create')
  );

CREATE POLICY "automations_update_own" ON public.automations
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "automations_delete_own" ON public.automations
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- 11. Fonction helper pour vérifier la propriété d'un prospect
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_prospect(p_prospect_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prospects p
    WHERE p.id = p_prospect_id
      AND p.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 12. Fonction helper pour vérifier la propriété d'une campagne
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND c.user_id = auth.uid()
  );
$$;;
