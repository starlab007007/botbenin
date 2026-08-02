
INSERT INTO public.roles (name, display_name, description)
VALUES ('partner', 'Partenaire Waouh', 'Partenaire terrain enrôlant des entreprises locales')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE public.waouh_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_partenaire TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  telephone TEXT, whatsapp TEXT, email TEXT,
  ville TEXT, pays TEXT DEFAULT 'BJ',
  mobile_money_number TEXT, mobile_money_operator TEXT,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','active','suspended','rejected')),
  kyc_doc_url TEXT, kyc_verified BOOLEAN DEFAULT false,
  niveau TEXT DEFAULT 'Bronze' CHECK (niveau IN ('Bronze','Argent','Or','Platine')),
  date_activation TIMESTAMPTZ, notes_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waouh_partners_user ON public.waouh_partners(user_id);
CREATE INDEX idx_waouh_partners_statut ON public.waouh_partners(statut);

CREATE OR REPLACE FUNCTION public.gen_waouh_partner_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE next_n INT;
BEGIN
  IF NEW.code_partenaire IS NULL OR NEW.code_partenaire = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code_partenaire,'\D','','g'),'')::int),0)+1 INTO next_n FROM public.waouh_partners;
    NEW.code_partenaire := 'WP-' || LPAD(next_n::text, 4, '0');
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_gen_partner_code BEFORE INSERT ON public.waouh_partners FOR EACH ROW EXECUTE FUNCTION public.gen_waouh_partner_code();
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.waouh_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.waouh_partner_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE CASCADE,
  nom_entreprise TEXT NOT NULL,
  categorie TEXT, sous_categorie TEXT, description TEXT,
  adresse_complete TEXT, ville TEXT, quartier TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, geohash TEXT,
  telephone TEXT, whatsapp TEXT,
  mobile_money_number TEXT, mobile_money_operator TEXT,
  email TEXT, site_web TEXT,
  horaires JSONB DEFAULT '{}'::jsonb,
  langues_parlees TEXT[] DEFAULT ARRAY[]::TEXT[],
  photo_principale TEXT, photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  note_qualite NUMERIC(2,1) CHECK (note_qualite BETWEEN 1 AND 5),
  verifie_admin BOOLEAN DEFAULT false,
  statut TEXT DEFAULT 'active' CHECK (statut IN ('active','pause','blacklisted')),
  gerant_nom TEXT, gerant_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pbiz_partner ON public.waouh_partner_businesses(partner_id);
CREATE INDEX idx_pbiz_ville ON public.waouh_partner_businesses(ville);
CREATE INDEX idx_pbiz_categorie ON public.waouh_partner_businesses(categorie);
CREATE INDEX idx_pbiz_tags ON public.waouh_partner_businesses USING GIN(tags);
CREATE INDEX idx_pbiz_geohash ON public.waouh_partner_businesses(geohash);
CREATE TRIGGER trg_pbiz_updated BEFORE UPDATE ON public.waouh_partner_businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.waouh_partner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.waouh_partner_businesses(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE CASCADE,
  nom TEXT NOT NULL, description TEXT, categorie TEXT,
  prix_min NUMERIC, prix_max NUMERIC, devise TEXT DEFAULT 'XOF',
  unite TEXT, disponible BOOLEAN DEFAULT true, stock_estime INTEGER,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[], tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  derniere_maj TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pprod_business ON public.waouh_partner_products(business_id);
CREATE INDEX idx_pprod_partner ON public.waouh_partner_products(partner_id);
CREATE INDEX idx_pprod_categorie ON public.waouh_partner_products(categorie);
CREATE INDEX idx_pprod_tags ON public.waouh_partner_products USING GIN(tags);
CREATE TRIGGER trg_pprod_updated BEFORE UPDATE ON public.waouh_partner_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.waouh_commission_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_plateforme_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  commission_partner_pct_sur_plateforme NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  bonus_volume JSONB DEFAULT '[]'::jsonb,
  seuil_payout_fcfa NUMERIC DEFAULT 5000,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.waouh_commission_settings (id) VALUES (1);

CREATE TABLE public.waouh_partner_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE RESTRICT,
  business_id UUID REFERENCES public.waouh_partner_businesses(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.waouh_partner_products(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.waouh_transactions(id) ON DELETE SET NULL,
  buyer_phone TEXT,
  montant_vente NUMERIC NOT NULL,
  commission_plateforme NUMERIC NOT NULL,
  commission_partner NUMERIC NOT NULL,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','confirmed','paid','cancelled')),
  source TEXT CHECK (source IN ('chat','manual','radar')),
  date_vente TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_paiement_commission TIMESTAMPTZ,
  payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_psales_partner ON public.waouh_partner_sales(partner_id);
CREATE INDEX idx_psales_statut ON public.waouh_partner_sales(statut);
CREATE INDEX idx_psales_transaction ON public.waouh_partner_sales(transaction_id);

CREATE TABLE public.waouh_partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.waouh_partners(id) ON DELETE RESTRICT,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  montant_total NUMERIC NOT NULL,
  nb_ventes INTEGER NOT NULL DEFAULT 0,
  mobile_money_ref TEXT,
  statut TEXT NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','processing','paid','failed')),
  paye_par UUID REFERENCES auth.users(id),
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX idx_ppayouts_partner ON public.waouh_partner_payouts(partner_id);

ALTER TABLE public.waouh_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_partner_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_partner_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_partner_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waouh_partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_waouh_partner_owner(_partner_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.waouh_partners WHERE id = _partner_id AND user_id = auth.uid())
$$;

CREATE POLICY "Partners view own profile" ON public.waouh_partners FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Users can apply as partner" ON public.waouh_partners FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Partner update own" ON public.waouh_partners FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete partners" ON public.waouh_partners FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Partner manage own businesses" ON public.waouh_partner_businesses FOR ALL
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read active businesses" ON public.waouh_partner_businesses FOR SELECT
  USING (statut = 'active');

CREATE POLICY "Partner manage own products" ON public.waouh_partner_products FOR ALL
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read available products" ON public.waouh_partner_products FOR SELECT
  USING (disponible = true);

CREATE POLICY "All auth read commission" ON public.waouh_commission_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin write commission" ON public.waouh_commission_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Partner read own sales" ON public.waouh_partner_sales FOR SELECT
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage sales" ON public.waouh_partner_sales FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Partner read own payouts" ON public.waouh_partner_payouts FOR SELECT
  USING (public.is_waouh_partner_owner(partner_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage payouts" ON public.waouh_partner_payouts FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
;
