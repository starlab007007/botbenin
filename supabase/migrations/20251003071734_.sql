-- Corriger la fonction get_user_permissions pour utiliser la table 'permissions' au lieu de 'detailed_permissions'
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
RETURNS TABLE(permission_name text, category text, source text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permissions via rôles
  SELECT p.name, 'role' as category, 'role:' || r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = user_uuid
  
  UNION
  
  -- Permissions directes (si la table user_permissions existe et a une structure compatible)
  SELECT p.name, 'direct' as category, 'direct'
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = user_uuid
    AND (up.expires_at IS NULL OR up.expires_at > now());
$$;;
