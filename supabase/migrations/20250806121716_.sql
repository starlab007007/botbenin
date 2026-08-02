-- Supprimer la contrainte de clé étrangère problématique
ALTER TABLE public.prospect_databases 
DROP CONSTRAINT IF EXISTS prospect_databases_user_id_fkey;

-- Créer un index pour optimiser les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_prospect_databases_user_id 
ON public.prospect_databases(user_id);

-- Activer RLS sur la table si ce n'est pas déjà fait
ALTER TABLE public.prospect_databases ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS pour sécuriser l'accès
DROP POLICY IF EXISTS "Users can manage their own prospect databases" ON public.prospect_databases;
CREATE POLICY "Users can manage their own prospect databases" 
ON public.prospect_databases 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Créer la fonction de mise à jour du timestamp si elle n'existe pas
DROP TRIGGER IF EXISTS update_prospect_databases_updated_at ON public.prospect_databases;
CREATE TRIGGER update_prospect_databases_updated_at
BEFORE UPDATE ON public.prospect_databases
FOR EACH ROW
EXECUTE FUNCTION public.update_prospect_databases_updated_at();;
