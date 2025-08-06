-- Corriger la contrainte de clé étrangère pour la table prospects
-- D'abord, vérifier et supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_user_id_fkey;

-- Créer une nouvelle contrainte de clé étrangère qui référence auth.users
-- Ceci permet d'utiliser directement l'ID utilisateur de Supabase Auth
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Assurer que la politique RLS est correcte pour permettre aux utilisateurs 
-- d'accéder uniquement à leurs propres prospects
DROP POLICY IF EXISTS "Users can manage their own prospects" ON public.prospects;

CREATE POLICY "Users can manage their own prospects" 
ON public.prospects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);