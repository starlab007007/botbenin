-- Ajouter une fonction pour récupérer un agent personnel par son ID (pour les liens partagés)
CREATE OR REPLACE FUNCTION public.get_personal_agent_by_id(agent_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  elevenlabs_agent_id text,
  widget_config jsonb,
  created_at timestamp with time zone,
  is_active boolean,
  description text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    b.id,
    b.name,
    b.elevenlabs_agent_id,
    b.widget_config,
    b.created_at,
    b.is_active,
    b.description
  FROM public.bots b
  WHERE b.id = agent_uuid 
    AND b.is_personal_agent = true
    AND b.is_active = true;
$function$;;
