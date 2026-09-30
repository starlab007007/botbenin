-- Couche d'unification des sources : le Signal Fabric expose, dans `evidence`, les informations nécessaires à l'évaluation
-- de complétude (photo, prix, contact) de la même façon pour TOUTES les sources.
--  - articles      : evidence.has_contact  (numéro WhatsApp connu)
--  - catalogue     : evidence.has_contact  (téléphone / WhatsApp vendeur)
--  - signaux Nexus : evidence enrichie de photos, image_url, has_whatsapp, contact_last4 (colonnes déjà présentes sur le signal)
-- Additif : aucune colonne ajoutée ni retirée, même définition qu'avant pour le reste. Échoue (sans rien changer) si la vue a évolué.
do $$
declare
  d text;
  d0 text;
begin
  d0 := pg_get_viewdef('public.waouh_signal_fabric'::regclass);
  d := d0;

  d := replace(d,
    '''photos'', to_jsonb(COALESCE(a.photos, ''{}''::text[]))) AS evidence',
    '''photos'', to_jsonb(COALESCE(a.photos, ''{}''::text[])), ''has_contact'', (NULLIF(a.contact_whatsapp, ''''::text) IS NOT NULL)) AS evidence');
  if d = d0 then raise exception 'waouh_signal_fabric : branche articles introuvable'; end if;

  d0 := d;
  d := replace(d,
    '''verified'', c.verified) AS evidence',
    '''verified'', c.verified, ''has_contact'', (COALESCE(NULLIF(c.vendeur_whatsapp, ''''::text), NULLIF(c.vendeur_phone, ''''::text)) IS NOT NULL)) AS evidence');
  if d = d0 then raise exception 'waouh_signal_fabric : branche catalogue introuvable'; end if;

  d0 := d;
  d := regexp_replace(d,
    'x\.evidence(\s+FROM waouh_external_commerce_signals x)',
    '(COALESCE(x.evidence, ''{}''::jsonb) || jsonb_strip_nulls(jsonb_build_object(''photos'', to_jsonb(x.photo_urls), ''image_url'', x.primary_photo_url, ''has_whatsapp'', x.has_whatsapp, ''contact_last4'', COALESCE(x.contact_phone_last4, x.whatsapp_phone_last4)))) AS evidence\1');
  if d = d0 then raise exception 'waouh_signal_fabric : branche signaux externes introuvable'; end if;

  execute 'create or replace view public.waouh_signal_fabric as ' || d;
end
$$;
