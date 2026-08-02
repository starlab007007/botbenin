-- Créer la permission pour la configuration Google Sheets
INSERT INTO public.detailed_permissions (name, description, category, resource, action)
VALUES (
  'google_sheets.config.manage',
  'Accès à la configuration Google Sheets et aux diagnostics',
  'google_sheets',
  'configuration',
  'manage'
)
ON CONFLICT (name) DO NOTHING;

-- Attribuer cette permission au rôle admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  dp.id
FROM public.roles r
CROSS JOIN public.detailed_permissions dp
WHERE r.name = 'admin'
  AND dp.name = 'google_sheets.config.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;;
