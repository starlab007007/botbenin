-- Views must apply the caller's base-table RLS. Public certificate verification
-- remains available through quiz-verify-certificate, which validates one code.
ALTER VIEW public.quiz_certificate_public SET (security_invoker = true);
ALTER VIEW public.v_apresbac_kpis SET (security_invoker = true);
ALTER VIEW public.v_diffusion_audience SET (security_invoker = true);
ALTER VIEW public.v_diffusion_campaign_kpis SET (security_invoker = true);

-- Operational audiences and KPIs are not anonymous APIs.
REVOKE SELECT ON public.v_apresbac_kpis, public.v_diffusion_audience,
  public.v_diffusion_campaign_kpis FROM anon;
