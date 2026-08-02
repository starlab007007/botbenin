-- Ajouter des policies admin pour knowledge_bases
-- Les admins peuvent voir, modifier et supprimer toutes les bases de connaissance

-- Policy SELECT pour les admins
CREATE POLICY "knowledge_bases_select_admin"
ON public.knowledge_bases
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR 
  has_role(auth.uid(), 'admin'::text)
);

-- Supprimer l'ancienne policy SELECT qui sera remplacée
DROP POLICY IF EXISTS "knowledge_bases_select_own" ON public.knowledge_bases;

-- Policy UPDATE pour les admins
CREATE POLICY "knowledge_bases_update_admin"
ON public.knowledge_bases
FOR UPDATE
USING (
  (user_id = auth.uid()) 
  OR 
  has_role(auth.uid(), 'admin'::text)
);

-- Supprimer l'ancienne policy UPDATE
DROP POLICY IF EXISTS "knowledge_bases_update_own" ON public.knowledge_bases;

-- Policy DELETE pour les admins
CREATE POLICY "knowledge_bases_delete_admin"
ON public.knowledge_bases
FOR DELETE
USING (
  (user_id = auth.uid()) 
  OR 
  has_role(auth.uid(), 'admin'::text)
);

-- Supprimer l'ancienne policy DELETE
DROP POLICY IF EXISTS "knowledge_bases_delete_own" ON public.knowledge_bases;;
