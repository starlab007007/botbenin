-- Enable Row Level Security on access_logs table
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: System administrators can view all access logs
CREATE POLICY "Admins can view all access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
  OR public.user_has_permission(auth.uid(), 'platform.logs'::text)
);

-- Create policy: Users can view their own access logs
CREATE POLICY "Users can view their own access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create policy: System can insert access logs (for logging purposes)
CREATE POLICY "System can insert access logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy: Only admins can update access logs (for corrections)
CREATE POLICY "Admins can update access logs"
ON public.access_logs
FOR UPDATE
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
);

-- Create policy: Only admins can delete access logs (for cleanup)
CREATE POLICY "Admins can delete access logs"
ON public.access_logs
FOR DELETE
TO authenticated
USING (
  public.user_has_permission(auth.uid(), 'platform.admin'::text)
);