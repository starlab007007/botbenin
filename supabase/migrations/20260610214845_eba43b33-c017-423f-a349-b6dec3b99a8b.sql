
-- Admin RPC to list all deals with enriched data, bypassing RLS edge cases.
CREATE OR REPLACE FUNCTION public.admin_list_waouh_deals(p_limit int DEFAULT 200)
RETURNS TABLE (
  id uuid,
  status text,
  payment_status text,
  payment_method text,
  amount numeric,
  negotiation_id uuid,
  article_id uuid,
  article_title text,
  buyer_user_id uuid,
  buyer_name text,
  buyer_phone text,
  buyer_city text,
  seller_user_id uuid,
  seller_name text,
  seller_phone text,
  seller_city text,
  courier_user_id uuid,
  courier_name text,
  courier_phone text,
  eta_minutes int,
  eta_at timestamptz,
  pickup_address text,
  dropoff_address text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.status::text,
    d.payment_status::text,
    d.payment_method::text,
    d.amount,
    d.negotiation_id,
    d.article_id,
    a.title AS article_title,
    d.buyer_user_id,
    COALESCE(bu.display_name, bp.full_name) AS buyer_name,
    COALESCE(bu.phone_number, bp.phone) AS buyer_phone,
    bu.city AS buyer_city,
    d.seller_user_id,
    COALESCE(su.display_name, sp.full_name) AS seller_name,
    COALESCE(su.phone_number, sp.phone) AS seller_phone,
    su.city AS seller_city,
    d.courier_user_id,
    d.courier_name,
    d.courier_phone,
    d.eta_minutes,
    d.eta_at,
    d.pickup_address,
    d.dropoff_address,
    d.created_at,
    d.updated_at
  FROM public.waouh_deals d
  LEFT JOIN public.waouh_articles a ON a.id = d.article_id
  LEFT JOIN public.waouh_users bu ON bu.id = d.buyer_user_id
  LEFT JOIN public.profiles bp ON bp.id = bu.auth_user_id
  LEFT JOIN public.waouh_users su ON su.id = d.seller_user_id
  LEFT JOIN public.profiles sp ON sp.id = su.auth_user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY d.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_waouh_deals(int) TO authenticated;
