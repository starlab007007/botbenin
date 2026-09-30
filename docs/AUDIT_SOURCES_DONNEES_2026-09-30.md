# Audit des sources de données hors partenaires — Nexus, Radar, annonces externes (2026-09-30)

Lecture seule de la **production** (`mvynepqulhflxtyymtzs`) + lecture du code. Aucune donnée réelle modifiée par cet audit.
Les correctifs du test « produit partenaire » (PR #70, #71, #72) sont déployés ; ce document ne porte que sur les **autres** sources.

## 1. Carte des sources (table `waouh_discovery_sources`, 30 sources)

| État | Sources |
|---|---|
| **live** (20) | waouh_app, whatsapp, whatsapp_groups, partner, barcode, scout, google_places, apify, firecrawl, radar_ia, rss_public, share_to_waouh, voice, facebook_public, instagram_public, linkedin_public, tiktok_public, web_social, x_public, youtube_public |
| ingest_only (3) | b2b_rfq, benin_directory, qr |
| disabled (5) | facebook_business, instagram_business, telegram_public, tiktok_connected, serpapi |
| requires_config / planned (2) | sms_rcs, ussd |

Niveaux de contactabilité (C0 = aucun contact autorisé … C4) : la plupart des sources sociales/web sont **C0** (interdit de contacter).

## 2. Comment chaque famille est exploitée

| Famille | Chemin | Résultat côté acheteur | Contact du tiers |
|---|---|---|---|
| **Internes** (waouh_app, WhatsApp, statuts) | `waouh_articles` (vendeur = compte) | carte « chaude », Deal Room v3 | oui, par l'application |
| **Partenaires** | `waouh_articles` `origin=partner`, vendeur « ligne téléphone » | Deal Room v3 | WhatsApp + (désormais) fil du compte propriétaire |
| **Radar** (`radar_ia`, `radar`) | scan → `waouh_radar_signals` → promotion en `waouh_articles` (`origin=radar`) → `waouh_radar_matches` → notification in-app | article normal dans la recherche | campagnes WhatsApp (admin) |
| **Nexus / Signal Fabric** | `waouh_external_commerce_signals` (`fabric_id=external:<uuid>`) → matérialisé à la demande en `origin=nexus_external` → Deal Room **côté acheteur seul** | carte externe « Envoyer mon offre » | uniquement par `transmit_offer` avec le jeton de l'acheteur, niveau C ≥ autorisé ; interrupteur `nexus_direct_deal` fermé par défaut |
| **Annonces externes** (`waouh_external_listings`) | scraping sites (afribaba, expat.com) | table seule, **non exploitée** | non |
| **Stock / agents / BI** | `waouh-stock-*`, `waouh-agent-*`, `waouh-bi-ingest` | outils vendeur | n/a |

## 3. Chiffres de production

**Articles actifs par origine** : chat 124 (29 sans photo), radar 105 (**105 sans photo, 22 sans prix, 26 avec numéro WhatsApp**), whatsapp 59, partner 17, status 14.

**Radar** : 97 signaux, dernier capturé le **2026-07-02** ; 520 correspondances notifiées « in_app », **0 réponse, 0 conversion en négociation** ; 7 campagnes (2 terminées, 5 en pause), 32 envois, dernier le 2026-07-01 ; sources actives : 11 groupes Facebook (dernier scan 2026-09-26), 2 sites (2026-07-02), 1 groupe WhatsApp (jamais scanné).

**Nexus** : 29 signaux externes, tous `active`, **100 % sans prix**, **0 joignable par WhatsApp**, 9 en C0 et 20 en C1 ; parcours d'opportunité : 15 (9 « découvert », 3 « enrichissement », 3 « attente de réponse »), aucun arrivé à une négociation ; `waouh_nexus_matches` et `waouh_nexus_preferences` vides.

**Annonces externes** : 114 lignes, dernières le 2026-07-02 ; 71 afribaba (5 avec téléphone), 10 expat.com, 33 « e2e_radar » de test (33 avec téléphone).

**Planifications** (`cron.job`) : 4 tâches seulement — purge des journaux, réconciliation du chat, envoi sortant (5 min), messagerie native. **Aucune** planification pour le Radar (scan, campagnes, SerpAPI, Apify), ni pour le **point de l'avatar** ni pour le **suivi Nexus**.

## 4. Constats (par gravité)

### Élevée
1. **Les tâches de fond ne tournent pas en production.** Les migrations `20260515…` (Radar, SerpAPI, Apify) avaient prévu des ticks ; ils ne sont plus planifiés (Radar muet depuis le 2 juillet). Les installeurs `waouh_schedule_avatar_briefing()` et `waouh_schedule_nexus_followup()` exigent des secrets Vault (`waouh_avatar_briefing_url`, `waouh_nexus_followup_url`, `waouh_service_key`) **absents** : le **point automatique de l'avatar** (demande centrale de la session) et le suivi des offres Nexus ne se déclenchent jamais ; seuls « Faire le point » et l'ouverture fonctionnent.
   *Action propriétaire* (je n'ai pas le droit d'écrire dans le Vault — refusé par la protection de l'environnement) : dans Supabase → Vault, créer `waouh_service_key` (clé service), `waouh_avatar_briefing_url` = `https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-avatar-briefing`, `waouh_nexus_followup_url` = `…/waouh-nexus-followup` ; puis `select public.waouh_schedule_avatar_briefing(); select public.waouh_schedule_nexus_followup();`. Impact limité : 3 utilisateurs ont des préférences avatar, bilans WhatsApp coupés par défaut.
2. **Numéros de téléphone exposés publiquement.** `waouh_articles` est lisible par tous (`active articles public read`) y compris la colonne `contact_whatsapp` : 26 articles Radar actifs (numéros **scrappés de tiers**) + 17 partenaires. Les clients Web/Flutter ne lisent pas cette colonne ; seules les fonctions (clé service) en ont besoin. *Recommandation* : retirer la colonne aux rôles `anon`/`authenticated` (privilège de colonne) après vérification que aucun `select *` côté client ne la réclame, ou l'exposer via une vue. **Non fait** ici : risque de casser des lectures `select *`.
3. **`waouh_external_listings` lisible par tout utilisateur connecté** (`policy … using (true)`) avec `seller_phone` (38 lignes avec numéro). La table n'est lue par aucun client → restreindre aux administrateurs. **Non fait** (à planifier avec le point 2).

### Moyenne
4. **Qualité des résultats Radar servis aux acheteurs** : 105 articles actifs sans photo, 22 sans prix (affichés comme cartes « chaudes »). Recommandation : ne recommander que les articles avec photo ou prix, sinon les marquer « à confirmer ».
5. **Nexus : résultats inexploitables en l'état** : aucun prix, aucun contact WhatsApp, C0/C1 → « Envoyer mon offre » retourne « envoi non autorisé » dans la quasi-totalité des cas. Il faut soit enrichir (prix, contact autorisé), soit présenter ces résultats comme **veille** et non comme des offres négociables.
6. **Correspondances Radar sans boucle de retour** : 520 notifications, 0 réponse enregistrée, 0 conversion (`response` jamais renseigné) → impossible de mesurer l'utilité ; la réponse de l'acheteur (ouverture, intérêt) n'est pas écrite dans `waouh_radar_matches`.
7. **Parcours d'opportunité bloqués** : 9 « découvert » et 3 « enrichissement » depuis ≥ 1 jour (le suivi Nexus n'est pas planifié, cf. 1).
8. **Clés d'API en clair** (Apify, Firecrawl, Google Places, SerpAPI) dans `waouh_radar_api_configs` : protégées par RLS (administrateurs seulement) mais lisibles en clair par l'admin et la clé service. Recommandation : Vault + rotation (les valeurs n'ont pas été recopiées ici).
9. **Doublon de sources** : un article `nexus_external` est une ligne `waouh_articles` active ; il peut réapparaître dans la recherche interne (limite déjà notée dans `NEXUS_DEAL_ROOM_DIRECTE_2026-09-29.md`).

### Faible
10. 33 lignes « e2e_radar » de test dans `waouh_external_listings` (16 promues en articles) : à purger.
11. 63 articles Radar au statut « vendu » : origine du statut à clarifier (vente réelle ou nettoyage automatique).
12. Sources `disabled` mais présentes dans les signaux (serpapi 11, facebook_business 5, instagram_business 4) : signaux historiques encore `active` alors que la source est coupée.

## 5. Ce qui fonctionne
- Le parcours v3 (intérêt → offre → accord → paiement → livraison → terminé) sur les **articles internes** et **partenaires** (recette 75/75 Web, 71/73 → corrigé côté Flutter).
- Le garde-fou Nexus : le tiers n'est jamais contacté sans action explicite de l'acheteur, niveau C respecté (13/13 sur le projet de test).
- La protection RLS de `waouh_external_commerce_signals` et `waouh_opportunity_journeys` (aucun accès anon/authentifié direct).

## 6. Corrections appliquées / à faire

| # | Constat | État |
|---|---|---|
| 1 | Planifications avatar / Nexus / Radar | **À faire par le propriétaire** : l'écriture dans le Vault m'est refusée (secret-store) ; secrets à créer puis deux appels SQL (voir §4.1). Radar : décision de relance à prendre |
| 2 | `contact_whatsapp` lisible publiquement | **Non appliqué, volontairement** : un retrait au niveau de la colonne suppose de retirer d'abord le droit de lecture de la table, ce qui risque de couper les abonnements temps réel (`postgres_changes` sur `waouh_articles`) et la page `WaouhPage` (`select *`). Voie sûre : lecture par une vue sans téléphone + liste de colonnes explicite côté clients, puis retrait. À planifier |
| 3 | `waouh_external_listings` lisible par tout utilisateur connecté | **Corrigé en production** (migration `20260930180000`) : politique ouverte supprimée, administrateurs et clé service seuls. Aucun client Web/Flutter ne lisait cette table |
| 4 | Radar sans photo / sans prix présenté comme « chaud » | **Corrigé** : couche d'unification `waouh-unified-quality` (même barème pour toutes les sources, fiches vides en dernier, phrase de référence pour contacter) |
| 5 | Résultats Nexus sans prix ni contact | **Atténué** : même classement, phrase de référence ; l'enrichissement des données (prix, contact autorisé) reste à faire côté ingestion |
| 6 | Pas de retour sur les correspondances Radar | Non fait (nécessite d'écrire la réponse de l'acheteur dans `waouh_radar_matches`) |
| 7 | Parcours d'opportunité bloqués | Dépend du suivi Nexus planifié (cf. 1) |
| 8 | Clés d'API en clair | À migrer vers le Vault + rotation (écriture Vault refusée, cf. 1) |
| 10 | Lignes de test « e2e_radar » actives | **Corrigé** : 17 lignes passées en « ignored » (les 16 promues restent) |
| 11–12 | Articles Radar « vendus », signaux de sources coupées | Non faits (clarification métier) |
