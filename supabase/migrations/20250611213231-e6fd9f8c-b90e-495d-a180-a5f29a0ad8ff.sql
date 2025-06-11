
-- Activer RLS sur la table bot_owners si ce n'est pas déjà fait
ALTER TABLE public.bot_owners ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de créer leur propre bot_owner
CREATE POLICY "Users can create their own bot_owner" 
  ON public.bot_owners 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Politique pour permettre aux utilisateurs de voir leur propre bot_owner
CREATE POLICY "Users can view their own bot_owner" 
  ON public.bot_owners 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Politique pour permettre aux utilisateurs de modifier leur propre bot_owner
CREATE POLICY "Users can update their own bot_owner" 
  ON public.bot_owners 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Politique pour permettre aux utilisateurs de supprimer leur propre bot_owner
CREATE POLICY "Users can delete their own bot_owner" 
  ON public.bot_owners 
  FOR DELETE 
  USING (user_id = auth.uid());
