
-- Fonction de synchronisation automatique : à placer sur `anonymous_visitor_sessions`
CREATE OR REPLACE FUNCTION public.sync_anonymous_session_to_enhanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  chat_session_id uuid;
BEGIN
  -- Ne synchroniser que pour les sessions de type public
  IF NEW.entry_point IN ('direct', 'shortened_link', 'public_url', 'social_share') THEN
    -- Vérifiez si une session avec ce token existe dans enhanced_chat_sessions
    SELECT ecs.id INTO chat_session_id 
    FROM public.enhanced_chat_sessions ecs 
    WHERE ecs.session_token = NEW.session_token;
    IF chat_session_id IS NULL THEN
      INSERT INTO public.enhanced_chat_sessions (
        bot_id, 
        session_token, 
        started_at,
        last_activity,
        is_active,
        entry_point,
        user_agent,
        referrer_url
      ) VALUES (
        NEW.bot_id,
        NEW.session_token,
        NEW.started_at,
        NEW.last_activity,
        NEW.is_active,
        NEW.entry_point,
        NULL, -- pas de user_agent disponible côté anonyme par défaut
        NEW.referrer_url
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attacher le trigger à la table anonymous_visitor_sessions pour chaque INSERT
DROP TRIGGER IF EXISTS trg_sync_anon_session_to_enhanced ON public.anonymous_visitor_sessions;
CREATE TRIGGER trg_sync_anon_session_to_enhanced
AFTER INSERT ON public.anonymous_visitor_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_anonymous_session_to_enhanced();
