
CREATE TABLE IF NOT EXISTS public.waouh_radar_auto_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_default_for_new_contacts BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00',
  timezone TEXT NOT NULL DEFAULT 'Africa/Porto-Novo',
  max_per_contact_per_day INTEGER NOT NULL DEFAULT 1,
  max_total_per_day INTEGER NOT NULL DEFAULT 200,
  pause_until TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.waouh_radar_auto_settings TO authenticated;
GRANT ALL ON public.waouh_radar_auto_settings TO service_role;

ALTER TABLE public.waouh_radar_auto_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read radar auto settings"
  ON public.waouh_radar_auto_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert radar auto settings"
  ON public.waouh_radar_auto_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update radar auto settings"
  ON public.waouh_radar_auto_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.waouh_radar_auto_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
