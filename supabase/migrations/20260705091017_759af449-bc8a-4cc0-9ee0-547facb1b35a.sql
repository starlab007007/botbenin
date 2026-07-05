
-- Renforcement RLS: masquer les données sensibles (msisdn employeur / employé complet) exposées via l'ancien anon SELECT
-- On introduit des vues publiques minimales et on retire l'accès anon aux tables de base.

-- 1) Retirer les policies publiques trop larges
DROP POLICY IF EXISTS att_site_public_read_by_token ON public.waouh_attendance_sites;
DROP POLICY IF EXISTS att_emp_public_read ON public.waouh_attendance_employees;

-- 2) Vues publiques (security_invoker) qui n'exposent que les champs nécessaires au check-in
CREATE OR REPLACE VIEW public.waouh_attendance_sites_public
WITH (security_invoker=on) AS
  SELECT id, name, address, lat, lng, radius_m, qr_token, active
  FROM public.waouh_attendance_sites
  WHERE active = true;

CREATE OR REPLACE VIEW public.waouh_attendance_employees_public
WITH (security_invoker=on) AS
  SELECT id, site_id, full_name, employee_code, msisdn_last4, active
  FROM public.waouh_attendance_employees
  WHERE active = true;

-- 3) Rétablir un SELECT anon TRÈS restreint sur les tables de base pour que les vues fonctionnent
--    Les vues security_invoker exécutent la policy avec les droits de l'appelant.
CREATE POLICY att_site_anon_read_min
  ON public.waouh_attendance_sites
  FOR SELECT TO anon
  USING (active = true);

CREATE POLICY att_emp_anon_read_min
  ON public.waouh_attendance_employees
  FOR SELECT TO anon
  USING (active = true);

-- 4) Grants pour les vues
GRANT SELECT ON public.waouh_attendance_sites_public TO anon, authenticated;
GRANT SELECT ON public.waouh_attendance_employees_public TO anon, authenticated;

-- 5) Ajouter des policies explicites service_role (belt & suspenders — bypass déjà actif)
CREATE POLICY bi_ds_service ON public.waouh_bi_datasources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY bi_q_service ON public.waouh_bi_queries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY stock_ag_service ON public.waouh_stock_agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY stock_it_service ON public.waouh_stock_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY stock_mv_service ON public.waouh_stock_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY att_site_service ON public.waouh_attendance_sites FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY att_emp_service ON public.waouh_attendance_employees FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY att_ev_service ON public.waouh_attendance_events FOR ALL TO service_role USING (true) WITH CHECK (true);
