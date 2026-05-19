
-- Permissions par partenaire
CREATE TYPE public.waouh_partner_permission AS ENUM (
  'can_add_business','can_edit_business','can_delete_business',
  'can_add_product','can_edit_product','can_delete_product',
  'can_record_sale','can_request_payout','can_invite_subagent'
);

CREATE TABLE public.waouh_partner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE CASCADE,
  permission public.waouh_partner_permission NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, permission)
);
CREATE INDEX idx_wpp_partner ON public.waouh_partner_permissions(partner_id);

ALTER TABLE public.waouh_partner_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner read own permissions" ON public.waouh_partner_permissions FOR SELECT
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin manage permissions" ON public.waouh_partner_permissions FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.has_partner_permission(_user_id UUID, _perm public.waouh_partner_permission)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waouh_partner_permissions pp
    JOIN public.waouh_partners p ON p.id = pp.partner_id
    WHERE p.user_id = _user_id AND pp.permission = _perm AND p.statut = 'active'
  )
$$;

-- Audit log
CREATE TABLE public.waouh_partner_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wpal_partner ON public.waouh_partner_audit_log(partner_id, created_at DESC);

ALTER TABLE public.waouh_partner_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner read own audit" ON public.waouh_partner_audit_log FOR SELECT
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin write audit" ON public.waouh_partner_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Activité temps réel
CREATE TYPE public.waouh_partner_activity_type AS ENUM (
  'business_created','business_updated','business_deleted',
  'product_created','product_updated','product_deleted',
  'sale_recorded','sale_confirmed','sale_paid','sale_cancelled',
  'payout_requested','payout_paid',
  'status_changed','permission_granted','permission_revoked','kyc_verified'
);

CREATE TABLE public.waouh_partner_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.waouh_partner_businesses(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.waouh_partner_products(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.waouh_partner_sales(id) ON DELETE SET NULL,
  event_type public.waouh_partner_activity_type NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wpa_partner ON public.waouh_partner_activity(partner_id, created_at DESC);
CREATE INDEX idx_wpa_type ON public.waouh_partner_activity(event_type, created_at DESC);

ALTER TABLE public.waouh_partner_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner read own activity" ON public.waouh_partner_activity FOR SELECT
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin read all activity" ON public.waouh_partner_activity FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Triggers d'activité
CREATE OR REPLACE FUNCTION public.log_partner_business_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, event_type, actor_id, title, metadata)
    VALUES (NEW.partner_id, NEW.id, 'business_created', auth.uid(), NEW.nom_entreprise, jsonb_build_object('ville', NEW.ville, 'categorie', NEW.categorie));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, event_type, actor_id, title, metadata)
    VALUES (NEW.partner_id, NEW.id, 'business_updated', auth.uid(), NEW.nom_entreprise, jsonb_build_object('statut', NEW.statut));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, event_type, actor_id, title)
    VALUES (OLD.partner_id, 'business_deleted', auth.uid(), OLD.nom_entreprise);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_activity_business AFTER INSERT OR UPDATE OR DELETE ON public.waouh_partner_businesses
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_business_activity();

CREATE OR REPLACE FUNCTION public.log_partner_product_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, product_id, event_type, actor_id, title, metadata)
    VALUES (NEW.partner_id, NEW.business_id, NEW.id, 'product_created', auth.uid(), NEW.nom, jsonb_build_object('prix_min', NEW.prix_min, 'stock', NEW.stock_estime));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, product_id, event_type, actor_id, title, metadata)
    VALUES (NEW.partner_id, NEW.business_id, NEW.id, 'product_updated', auth.uid(), NEW.nom, jsonb_build_object('stock', NEW.stock_estime, 'disponible', NEW.disponible));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, event_type, actor_id, title)
    VALUES (OLD.partner_id, OLD.business_id, 'product_deleted', auth.uid(), OLD.nom);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_activity_product AFTER INSERT OR UPDATE OR DELETE ON public.waouh_partner_products
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_product_activity();

CREATE OR REPLACE FUNCTION public.log_partner_sale_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE evt public.waouh_partner_activity_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.waouh_partner_activity (partner_id, business_id, product_id, sale_id, event_type, actor_id, title, metadata)
    VALUES (NEW.partner_id, NEW.business_id, NEW.product_id, NEW.id, 'sale_recorded', auth.uid(),
      'Vente ' || NEW.montant_vente::text || ' FCFA',
      jsonb_build_object('montant', NEW.montant_vente, 'commission', NEW.commission_partner, 'source', NEW.source));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.statut <> OLD.statut THEN
    evt := CASE NEW.statut
      WHEN 'confirmed' THEN 'sale_confirmed'::public.waouh_partner_activity_type
      WHEN 'paid' THEN 'sale_paid'::public.waouh_partner_activity_type
      WHEN 'cancelled' THEN 'sale_cancelled'::public.waouh_partner_activity_type
      ELSE NULL END;
    IF evt IS NOT NULL THEN
      INSERT INTO public.waouh_partner_activity (partner_id, business_id, product_id, sale_id, event_type, actor_id, title, metadata)
      VALUES (NEW.partner_id, NEW.business_id, NEW.product_id, NEW.id, evt, auth.uid(),
        'Vente ' || NEW.statut, jsonb_build_object('montant', NEW.montant_vente));
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;
CREATE TRIGGER trg_activity_sale AFTER INSERT OR UPDATE ON public.waouh_partner_sales
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_sale_activity();

-- Vues de stats
CREATE OR REPLACE VIEW public.waouh_partner_stats_v AS
SELECT
  p.id AS partner_id,
  p.code_partenaire,
  p.nom,
  p.statut,
  p.niveau,
  (SELECT COUNT(*) FROM public.waouh_partner_businesses b WHERE b.partner_id = p.id) AS nb_businesses,
  (SELECT COUNT(*) FROM public.waouh_partner_products pr WHERE pr.partner_id = p.id) AS nb_products,
  (SELECT COALESCE(SUM(s.montant_vente),0) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id AND s.date_vente >= now() - interval '24 hours') AS ca_24h,
  (SELECT COALESCE(SUM(s.montant_vente),0) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id AND s.date_vente >= now() - interval '7 days') AS ca_7j,
  (SELECT COALESCE(SUM(s.montant_vente),0) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id AND s.date_vente >= now() - interval '30 days') AS ca_30j,
  (SELECT COALESCE(SUM(s.commission_partner),0) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id) AS commission_totale,
  (SELECT COALESCE(SUM(s.commission_partner),0) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id AND s.statut IN ('pending','confirmed')) AS commission_en_attente,
  (SELECT COUNT(*) FROM public.waouh_partner_sales s WHERE s.partner_id = p.id AND s.date_vente >= now() - interval '30 days') AS nb_ventes_30j,
  (SELECT MAX(a.created_at) FROM public.waouh_partner_activity a WHERE a.partner_id = p.id) AS derniere_activite
FROM public.waouh_partners p;

GRANT SELECT ON public.waouh_partner_stats_v TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_partner_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_partner_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_partner_businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waouh_partner_products;
ALTER TABLE public.waouh_partner_sales REPLICA IDENTITY FULL;
ALTER TABLE public.waouh_partner_activity REPLICA IDENTITY FULL;
