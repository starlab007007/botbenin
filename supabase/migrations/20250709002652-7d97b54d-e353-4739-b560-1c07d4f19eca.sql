-- Création du système de domaines intelligents pour les suggestions de bots (méthode additive)

-- Table des domaines de bots
CREATE TABLE public.bot_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  context_indicators JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des suggestions intelligentes par domaine
CREATE TABLE public.domain_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.bot_domains(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_prompt TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Conditions pour afficher la suggestion
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table d'association bots-domaines (un bot peut avoir plusieurs domaines)
CREATE TABLE public.bot_domain_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES public.bot_domains(id) ON DELETE CASCADE,
  confidence_score NUMERIC(3,2) DEFAULT 1.0, -- Score de confiance de l'association
  assigned_by TEXT DEFAULT 'auto', -- 'auto', 'manual', 'ai'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bot_id, domain_id)
);

-- Table des métriques de suggestions (pour l'optimisation)
CREATE TABLE public.suggestion_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.domain_suggestions(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  clicked_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,4) DEFAULT 0,
  last_clicked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(suggestion_id, bot_id)
);

-- Insertion des domaines de base
INSERT INTO public.bot_domains (name, description, keywords, context_indicators) VALUES
('restaurant', 'Restaurants et services de restauration', 
 ARRAY['restaurant', 'cuisine', 'gastronomie', 'repas', 'menu', 'réservation', 'table'],
 '{"patterns": ["restaurant", "cuisine", "menu", "réserver"], "contexts": ["services_locaux", "restaurant"]}'::jsonb),

('services_locaux', 'Services et commerces de proximité',
 ARRAY['service', 'commerce', 'local', 'proximité', 'magasin', 'boutique'],
 '{"patterns": ["service", "local", "commerce", "proximité"], "contexts": ["services_locaux", "citoyen"]}'::jsonb),

('business', 'Business et développement commercial',
 ARRAY['business', 'entreprise', 'lead', 'vente', 'commercial', 'crm'],
 '{"patterns": ["business", "lead", "vente", "crm"], "contexts": ["business"]}'::jsonb),

('marketing', 'Marketing et communication',
 ARRAY['marketing', 'campagne', 'publicité', 'communication', 'promotion'],
 '{"patterns": ["marketing", "campagne", "promotion"], "contexts": ["marketing"]}'::jsonb),

('gestion', 'Gestion et administration',
 ARRAY['gestion', 'administration', 'rh', 'projet', 'workflow'],
 '{"patterns": ["gestion", "admin", "projet", "workflow"], "contexts": ["gestion"]}'::jsonb),

('citoyen', 'Services citoyens et aide publique',
 ARRAY['citoyen', 'service public', 'administration', 'aide', 'juridique'],
 '{"patterns": ["citoyen", "public", "aide", "droit"], "contexts": ["citoyen"]}'::jsonb);

-- Insertion des suggestions pour le domaine restaurant
INSERT INTO public.domain_suggestions (domain_id, title, description, action_prompt, icon_name, category, priority) 
SELECT bd.id, 'Réserver une table', 'Trouvez et réservez une table rapidement', 'Je cherche une table pour 4 personnes ce soir', 'Calendar', 'Réservation', 1
FROM public.bot_domains bd WHERE bd.name = 'restaurant';

INSERT INTO public.domain_suggestions (domain_id, title, description, action_prompt, icon_name, category, priority)
SELECT bd.id, 'Recommandations culinaires', 'Découvrez des plats selon vos goûts', 'Recommandez-moi un plat français traditionnel', 'Utensils', 'Cuisine', 2
FROM public.bot_domains bd WHERE bd.name = 'restaurant';

INSERT INTO public.domain_suggestions (domain_id, title, description, action_prompt, icon_name, category, priority)
SELECT bd.id, 'Événement spécial', 'Organisez votre événement parfait', 'Je cherche un restaurant pour un anniversaire de mariage', 'Users', 'Événement', 3
FROM public.bot_domains bd WHERE bd.name = 'restaurant';

-- Insertion des suggestions pour les services locaux
INSERT INTO public.domain_suggestions (domain_id, title, description, action_prompt, icon_name, category, priority)
SELECT bd.id, 'Trouver un service', 'Localisez les services près de chez vous', 'Je cherche un plombier disponible en urgence', 'MapPin', 'Service', 1
FROM public.bot_domains bd WHERE bd.name = 'services_locaux';

INSERT INTO public.domain_suggestions (domain_id, title, description, action_prompt, icon_name, category, priority)
SELECT bd.id, 'Commerces de proximité', 'Découvrez les magasins autour de vous', 'Où puis-je acheter des produits bio près de chez moi ?', 'ShoppingBag', 'Commerce', 2
FROM public.bot_domains bd WHERE bd.name = 'services_locaux';

-- Fonction pour détecter automatiquement le domaine d'un bot
CREATE OR REPLACE FUNCTION public.detect_bot_domain(p_bot_id UUID)
RETURNS TABLE(domain_id UUID, confidence_score NUMERIC) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bot_data RECORD;
  domain_record RECORD;
  score NUMERIC;
  keyword TEXT;
BEGIN
  -- Récupérer les données du bot
  SELECT b.name, b.description, b.chat_context, b.configuration
  INTO bot_data
  FROM public.bots b
  WHERE b.id = p_bot_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Analyser chaque domaine
  FOR domain_record IN 
    SELECT bd.id, bd.keywords, bd.context_indicators
    FROM public.bot_domains bd
    WHERE bd.name != 'general'
  LOOP
    score := 0;
    
    -- Vérification par mots-clés dans le nom et description
    FOREACH keyword IN ARRAY domain_record.keywords
    LOOP
      IF LOWER(COALESCE(bot_data.name, '')) LIKE '%' || keyword || '%' THEN
        score := score + 0.3;
      END IF;
      IF LOWER(COALESCE(bot_data.description, '')) LIKE '%' || keyword || '%' THEN
        score := score + 0.4;
      END IF;
    END LOOP;
    
    -- Vérification par contexte
    IF domain_record.context_indicators->>'contexts' IS NOT NULL THEN
      IF bot_data.chat_context = ANY(
        SELECT jsonb_array_elements_text(domain_record.context_indicators->'contexts')
      ) THEN
        score := score + 0.5;
      END IF;
    END IF;
    
    -- Retourner les domaines avec un score > 0.3
    IF score >= 0.3 THEN
      domain_id := domain_record.id;
      confidence_score := LEAST(score, 1.0);
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Fonction pour obtenir les suggestions intelligentes pour un bot
CREATE OR REPLACE FUNCTION public.get_intelligent_suggestions(p_bot_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE(
  suggestion_id UUID,
  title TEXT,
  description TEXT,
  action_prompt TEXT,
  icon_name TEXT,
  category TEXT,
  domain_name TEXT,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
  JOIN public.bot_domains bd ON ds.domain_id = bd.id
  JOIN public.bot_domain_assignments bda ON bd.id = bda.domain_id
  WHERE bda.bot_id = p_bot_id
    AND ds.is_active = true
  ORDER BY 
    bda.confidence_score DESC,
    ds.priority ASC,
    COALESCE((
      SELECT sm.conversion_rate 
      FROM public.suggestion_metrics sm 
      WHERE sm.suggestion_id = ds.id AND sm.bot_id = p_bot_id
    ), 0) DESC
  LIMIT p_limit;
END;
$$;

-- Trigger pour assigner automatiquement les domaines aux nouveaux bots
CREATE OR REPLACE FUNCTION public.auto_assign_bot_domains()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_match RECORD;
BEGIN
  -- Détecter et assigner les domaines automatiquement
  FOR domain_match IN 
    SELECT * FROM public.detect_bot_domain(NEW.id)
  LOOP
    INSERT INTO public.bot_domain_assignments (bot_id, domain_id, confidence_score, assigned_by)
    VALUES (NEW.id, domain_match.domain_id, domain_match.confidence_score, 'auto')
    ON CONFLICT (bot_id, domain_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER trigger_auto_assign_bot_domains
  AFTER INSERT ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_bot_domains();

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.bot_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_domain_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour bot_domains (lecture publique, écriture admin)
CREATE POLICY "Anyone can view bot domains" ON public.bot_domains FOR SELECT USING (true);
CREATE POLICY "Admins can manage bot domains" ON public.bot_domains 
  FOR ALL USING (user_has_permission(auth.uid(), 'platform.admin'));

-- Politiques RLS pour domain_suggestions (lecture publique, écriture admin)
CREATE POLICY "Anyone can view domain suggestions" ON public.domain_suggestions FOR SELECT USING (true);
CREATE POLICY "Admins can manage domain suggestions" ON public.domain_suggestions 
  FOR ALL USING (user_has_permission(auth.uid(), 'platform.admin'));

-- Politiques RLS pour bot_domain_assignments (propriétaires de bots)
CREATE POLICY "Bot owners can view their assignments" ON public.bot_domain_assignments 
  FOR SELECT USING (
    bot_id IN (
      SELECT b.id FROM public.bots b 
      JOIN public.bot_owners bo ON b.owner_id = bo.id 
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Bot owners can manage their assignments" ON public.bot_domain_assignments 
  FOR ALL USING (
    bot_id IN (
      SELECT b.id FROM public.bots b 
      JOIN public.bot_owners bo ON b.owner_id = bo.id 
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Auto assignment allowed" ON public.bot_domain_assignments
  FOR INSERT WITH CHECK (assigned_by = 'auto');

-- Politiques RLS pour suggestion_metrics (propriétaires de bots)
CREATE POLICY "Bot owners can view their metrics" ON public.suggestion_metrics 
  FOR SELECT USING (
    bot_id IN (
      SELECT b.id FROM public.bots b 
      JOIN public.bot_owners bo ON b.owner_id = bo.id 
      WHERE bo.user_id = auth.uid()
    )
  );

CREATE POLICY "System can update metrics" ON public.suggestion_metrics 
  FOR ALL USING (true);