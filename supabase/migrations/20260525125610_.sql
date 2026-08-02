CREATE OR REPLACE FUNCTION public.waouh_user_pair_distance_km(p_user_a uuid, p_user_b uuid)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ST_Distance(
    (SELECT location FROM public.waouh_users WHERE id = p_user_a),
    (SELECT location FROM public.waouh_users WHERE id = p_user_b)
  ) / 1000.0;
$$;

CREATE OR REPLACE FUNCTION public.waouh_point_distance_km(p_user uuid, p_lat double precision, p_lng double precision)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ST_Distance(
    (SELECT location FROM public.waouh_users WHERE id = p_user),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) / 1000.0;
$$;

CREATE OR REPLACE FUNCTION public.waouh_article_distance_km(p_article uuid, p_lat double precision, p_lng double precision)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ST_Distance(
    (SELECT location FROM public.waouh_articles WHERE id = p_article),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) / 1000.0;
$$;;
