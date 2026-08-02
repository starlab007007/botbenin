-- Corriger la fonction auto_assign_bot_domain avec la syntaxe ANY correcte
CREATE OR REPLACE FUNCTION public.auto_assign_bot_domain()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    detected_domain_id uuid;
    general_domain_id uuid;
    keyword_text text;
BEGIN
    -- Try to detect domain based on bot name and context
    SELECT bd.id INTO detected_domain_id
    FROM public.bot_domains bd
    WHERE bd.name != 'general'
    AND (
        -- Vérifier si le nom contient un des mots-clés
        EXISTS (
            SELECT 1 FROM unnest(bd.keywords) AS keyword
            WHERE NEW.name ILIKE '%' || keyword || '%'
        )
        -- Vérifier si le contexte correspond à un mot-clé
        OR NEW.chat_context = ANY(bd.keywords)
        -- Vérifier si la description contient un des mots-clés
        OR EXISTS (
            SELECT 1 FROM unnest(bd.keywords) AS keyword
            WHERE NEW.description ILIKE '%' || keyword || '%'
        )
    )
    ORDER BY array_length(bd.keywords, 1) DESC
    LIMIT 1;
    
    -- If no specific domain detected, use general domain
    IF detected_domain_id IS NULL THEN
        SELECT bd.id INTO general_domain_id
        FROM public.bot_domains bd
        WHERE bd.name = 'general'
        LIMIT 1;
        
        detected_domain_id = general_domain_id;
    END IF;
    
    -- Create domain assignment if domain found
    IF detected_domain_id IS NOT NULL THEN
        INSERT INTO public.bot_domain_assignments (bot_id, domain_id, confidence_score, assigned_by)
        VALUES (NEW.id, detected_domain_id, 0.8, 'auto');
    END IF;
    
    RETURN NEW;
END;
$function$;;
