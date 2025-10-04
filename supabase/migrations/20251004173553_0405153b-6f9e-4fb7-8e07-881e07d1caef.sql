-- Politique RLS pour permettre aux visiteurs anonymes de créer des bot_users
-- pour les bots publics (comme le bot d'assistance)

-- Politique INSERT : Permettre à tout le monde de créer un bot_user pour un bot public
CREATE POLICY "Allow anonymous bot_user creation for public bots"
ON public.bot_users
FOR INSERT
WITH CHECK (
  -- Vérifier que le bot existe et qu'il est actif/public
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = bot_users.bot_id
    AND is_active = true
  )
);

-- Politique SELECT : Permettre de lire les bot_users pour les bots actifs
CREATE POLICY "Allow reading bot_users for active bots"
ON public.bot_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = bot_users.bot_id
    AND is_active = true
  )
);

-- Politique UPDATE : Permettre la mise à jour de l'activité pour tous
CREATE POLICY "Allow updating bot_user activity"
ON public.bot_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = bot_users.bot_id
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = bot_users.bot_id
    AND is_active = true
  )
);

-- Politique similaire pour anonymous_visitor_sessions
CREATE POLICY "Allow anonymous session creation for public bots"
ON public.anonymous_visitor_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = anonymous_visitor_sessions.bot_id
    AND is_active = true
  )
);

CREATE POLICY "Allow reading anonymous sessions for active bots"
ON public.anonymous_visitor_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = anonymous_visitor_sessions.bot_id
    AND is_active = true
  )
);

CREATE POLICY "Allow updating anonymous session activity"
ON public.anonymous_visitor_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = anonymous_visitor_sessions.bot_id
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = anonymous_visitor_sessions.bot_id
    AND is_active = true
  )
);

-- Politique pour chat_messages : permettre aux visiteurs anonymes d'insérer des messages
CREATE POLICY "Allow message creation for public bots"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = chat_messages.bot_id
    AND is_active = true
  )
);

CREATE POLICY "Allow reading messages for active bots"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE id = chat_messages.bot_id
    AND is_active = true
  )
);