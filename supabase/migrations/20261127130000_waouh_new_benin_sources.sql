-- New Benin sources found during the 27 November 2026 audit.
-- They enter the catalogue "à valider": an administrator authorises each one from the sources screen.
-- The access reference below records what each site's public crawling rules allowed on that date.
insert into public.waouh_collection_platforms(platform_key,hostname,label,access_state,adapter_key,rights_reference,attribution) values
 ('emploisbenin.bj','emploisbenin.bj','Emplois Bénin','review','classifieds',
  'https://emploisbenin.bj/robots.txt — Allow: / (hors connexion, inscription, profil et interface technique), délai de 1 s demandé ; contrôle du 27 novembre 2026',
  'Emplois Bénin · référence et faits publics ; consulter l''offre originale'),
 ('gouv.bj','gouv.bj','Gouvernement du Bénin — Offres d''emploi','review','classifieds',
  'https://www.gouv.bj/robots.txt — aucune règle publiée (aucun chemin interdit) ; offres publiques de l''État ; contrôle du 27 novembre 2026',
  'Gouvernement du Bénin · référence et faits publics ; consulter l''avis original'),
 ('expat.com','expat.com','Expat.com Bénin — Immobilier','review','schema_org',
  'https://www.expat.com/robots.txt — rubriques immobilier et petites annonces non interdites (seuls comptes, messagerie et outils internes exclus) ; contrôle du 27 novembre 2026',
  'Expat.com · référence et faits publics ; consulter l''annonce originale'),
 ('beninhouse.com','beninhouse.com','Bénin House — Immobilier','review','classifieds',
  'https://beninhouse.com/robots.txt — Disallow vide, aucun chemin interdit ; contrôle du 27 novembre 2026',
  'Bénin House · référence et faits publics ; consulter l''annonce originale')
on conflict (platform_key) do nothing;

insert into public.waouh_collection_entries(entry_no,platform_key,label,url,alias_of,audit_note) values
 (51,'emploisbenin.bj','Emplois Bénin — Offres d''emploi','https://emploisbenin.bj/',null,'Ajoutée après le contrôle du 27 novembre 2026 : offres publiques consultables sans compte.'),
 (52,'gouv.bj','Gouvernement du Bénin — Offres d''emploi','https://www.gouv.bj/opportunites/offres-emploi/',null,'Ajoutée après le contrôle du 27 novembre 2026 : avis de recrutement publics de l''État.'),
 (53,'expat.com','Expat.com Bénin — Immobilier','https://www.expat.com/fr/immobilier/afrique/benin/',null,'Ajoutée après le contrôle du 27 novembre 2026 : annonces du Bénin uniquement, prix et dates publiés.'),
 (54,'beninhouse.com','Bénin House — Immobilier','https://beninhouse.com/',null,'Ajoutée après le contrôle du 27 novembre 2026 : biens à louer et à vendre publiés par l''agence.')
on conflict (entry_no) do nothing;

-- Addresses that did not load at all during the same audit stay listed, with the finding visible to the administrator.
update public.waouh_collection_entries
set audit_note='Adresse injoignable lors du contrôle du 27 novembre 2026 (aucune page ne se charge). À vérifier avant toute activation.'
where entry_no in (10,14,18,19,20,21,22,23,28,29,30,42,43) and target_id is null;

update public.waouh_collection_entries
set audit_note='Certificat de sécurité invalide lors du contrôle du 27 novembre 2026. Ne pas activer tant que le site n''est pas sécurisé.'
where entry_no=11 and target_id is null;
