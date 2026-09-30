-- Audit des sources (2026-09-30) : `waouh_external_listings` (annonces scrappées, avec numéros de téléphone de tiers) était lisible
-- par tout utilisateur connecté (`using (true)`). Aucun client Web/Flutter ne lit cette table : seules les fonctions Edge (clé service)
-- et les administrateurs (politique « Admins manage external listings », conservée) en ont besoin.
drop policy if exists "Authenticated users can view external listings" on public.waouh_external_listings;

-- Lignes de test « e2e_radar » encore actives : retirées du Signal Fabric (qui ignore le statut « ignored »).
update public.waouh_external_listings set status = 'ignored' where source = 'e2e_radar' and status = 'active';
