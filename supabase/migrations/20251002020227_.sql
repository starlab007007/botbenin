-- Enable Row Level Security on role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can view role permissions
CREATE POLICY "Admins can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
  OR public.user_has_permission(auth.uid(), 'users.edit'::text)
);

-- Create policy: Only admins can insert role permissions
CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
);

-- Create policy: Only admins can update role permissions
CREATE POLICY "Admins can update role permissions"
ON public.role_permissions
FOR UPDATE
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
);

-- Create policy: Only admins can delete role permissions
CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
);;
