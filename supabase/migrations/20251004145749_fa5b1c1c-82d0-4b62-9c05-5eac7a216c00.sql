-- Créer la table pour le catalogue de produits
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  currency TEXT DEFAULT 'XOF',
  category TEXT,
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb, -- Max 3 images
  characteristics JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies pour les propriétaires
CREATE POLICY "Owners can view their products"
  ON public.products FOR SELECT
  USING (owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can insert products"
  ON public.products FOR INSERT
  WITH CHECK (owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can update their products"
  ON public.products FOR UPDATE
  USING (owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their products"
  ON public.products FOR DELETE
  USING (owner_id IN (
    SELECT id FROM public.bot_owners WHERE user_id = auth.uid()
  ));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Index pour les recherches
CREATE INDEX idx_products_owner_id ON public.products(owner_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);