-- Politiques RLS pour la table access_logs
-- Note: Supprimer d'abord si elles existent déjà pour éviter les conflits

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "System can insert access logs" ON access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON access_logs;
DROP POLICY IF EXISTS "Users can view their own access logs" ON access_logs;

-- Créer les nouvelles politiques
CREATE POLICY "System can insert access logs"
ON access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all access logs"
ON access_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  )
);

CREATE POLICY "Users can view their own access logs"
ON access_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());