-- Function to get intelligent suggestions for a bot
CREATE OR REPLACE FUNCTION public.get_intelligent_suggestions(p_bot_id uuid, p_limit integer DEFAULT 4)
RETURNS TABLE(
    suggestion_id uuid,
    title text,
    description text,
    action_prompt text,
    icon_name text,
    category text,
    domain_name text,
    confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get suggestions based on bot's assigned domains
    RETURN QUERY
    SELECT 
        ds.id as suggestion_id,
        ds.title,
        ds.description,
        ds.action_prompt,
        ds.icon_name,
        ds.category,
        bd.name as domain_name,
        bda.confidence_score
    FROM public.domain_suggestions ds
    JOIN public.bot_domain_assignments bda ON ds.domain_id = bda.domain_id
    JOIN public.bot_domains bd ON bda.domain_id = bd.id
    WHERE bda.bot_id = p_bot_id
        AND ds.is_active = true
    ORDER BY ds.priority DESC, bda.confidence_score DESC
    LIMIT p_limit;
    
    -- If no domain-specific suggestions found, return general suggestions
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            ds.id as suggestion_id,
            ds.title,
            ds.description,
            ds.action_prompt,
            ds.icon_name,
            ds.category,
            bd.name as domain_name,
            1.0::numeric as confidence_score
        FROM public.domain_suggestions ds
        JOIN public.bot_domains bd ON ds.domain_id = bd.id
        WHERE bd.name = 'general'
            AND ds.is_active = true
        ORDER BY ds.priority DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- Function to automatically assign domain to new bots
CREATE OR REPLACE FUNCTION public.auto_assign_bot_domain()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    detected_domain_id uuid;
    general_domain_id uuid;
BEGIN
    -- Try to detect domain based on bot name and context
    SELECT bd.id INTO detected_domain_id
    FROM public.bot_domains bd
    WHERE (
        NEW.name ILIKE '%' || ANY(bd.keywords) || '%' 
        OR NEW.chat_context = ANY(bd.keywords)
        OR NEW.description ILIKE '%' || ANY(bd.keywords) || '%'
    )
    AND bd.name != 'general'
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
$$;

-- Create trigger for auto domain assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_bot_domain ON public.bots;
CREATE TRIGGER trigger_auto_assign_bot_domain
    AFTER INSERT ON public.bots
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_bot_domain();

-- Create table for suggestion metrics if not exists
CREATE TABLE IF NOT EXISTS public.suggestion_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    suggestion_id uuid NOT NULL REFERENCES public.domain_suggestions(id) ON DELETE CASCADE,
    bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    clicked_count integer NOT NULL DEFAULT 0,
    last_clicked timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(suggestion_id, bot_id)
);

-- Enable RLS on suggestion metrics
ALTER TABLE public.suggestion_metrics ENABLE ROW LEVEL SECURITY;

-- Allow bot owners to manage their suggestion metrics
CREATE POLICY "Bot owners can manage suggestion metrics" ON public.suggestion_metrics
FOR ALL USING (
    bot_id IN (
        SELECT b.id FROM public.bots b
        JOIN public.bot_owners bo ON b.owner_id = bo.id
        WHERE bo.user_id = auth.uid()
    )
);;
