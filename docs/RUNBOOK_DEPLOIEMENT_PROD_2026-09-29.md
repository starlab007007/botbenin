# Runbook de déploiement en production — lot chat v3 (E1–E6, E10/E11, fenêtres chaudes, Nexus direct)

**Préparé, NON exécuté.** Projet de production : `mvynepqulhflxtyymtzs`. Projet de test déjà à jour : `ljzwqyzaovnandpyfpgc`.
**Trois migrations dans ce lot** (la troisième : `20260929160000_waouh_avatar_prefs.sql`, table des réglages de l'avatar, RLS par utilisateur ; définit aussi `waouh_schedule_avatar_briefing()`, sans rien planifier) : `20260929140000_waouh_presence_pin_attempts.sql` (table de limitation des essais de PIN, RLS sans politique, additive) et `20260929150000_waouh_nexus_followup_cron.sql` (définit seulement `waouh_schedule_nexus_followup()`, ne planifie rien). Les migrations 20260929065700/065715/131943 sont déjà en base (versions identiques, P2 résolu par renommage).

> **Attention — déploiement automatique** : le workflow `.github/workflows/deploy-waouh-chat-v2.yml` se déclenche au **push sur `prod`** (donc à la fusion de la PR) : il applique la migration PIN puis déploie les fonctions listées au §2 (sans toucher aux interrupteurs). Fusionner = déployer. Ne fusionner qu'après le §0 et la fenêtre choisie ; sinon utiliser `workflow_dispatch`.

## 0. Avant de commencer
1. Révoquer le jeton Supabase `sbp_…` et faire pivoter la clé Gemini partagés dans la conversation ; en créer de nouveaux pour ce déploiement.
2. Fenêtre de déploiement hors heures de pointe ; quelqu'un pour tester sur un article de test.
3. **Dérive** : pour chaque fonction ci-dessous, comparer le code déployé au dépôt (`get_edge_function`, lecture seule) avant d'écraser. `waouh-channel-in`,
   `waouh-webhook`, `waouh-notify-dispatch` ont été modifiés en prod le 29/09 (versions ci-dessous) ; toute différence hors de ce lot doit être arbitrée, pas écrasée.
4. CLI : `supabase/config.toml` du dépôt fait échouer la CLI 2.117 (`CliConfigParseError`). Déployer depuis un dossier temporaire avec un `config.toml` minimal
   (voir `docs/TEST_PROJECT_SUPABASE_E2E.md`), `--use-api`. Le workflow « Deploy WAOUH Chat v2 » n'est pas validé avec cette CLI.

## 1. Versions actuelles (retour arrière = redéployer la version précédente du code)
| Fonction | Version prod | verify_jwt |
|---|---|---|
| waouh-commerce-action | 8 | false |
| waouh-negotiation-router | 236 | false |
| waouh-deal-ops | 145 | false |
| waouh-notify-dispatch | 172 | false |
| waouh-match-history | 142 | false |
| waouh-channel-in | 250 | false |
| waouh-webhook | 259 | false |
| waouh-studio-e2e-v21465 (alias de waouh-agentic-core) | 61 | **true** |

Sauvegarder le code déployé de chacune (`get_edge_function`) dans un dossier daté avant tout déploiement : c'est le retour arrière.

## 2. Ordre de déploiement (dépendances d'abord)
Toutes avec `--use-api` ; `--no-verify-jwt` **sauf** `waouh-studio-e2e-v21465` (garder `verify_jwt = true`).
0. **Migration** `20260929140000` (avant toute fonction ; la protection PIN est inactive et journalisée tant qu'elle manque, le pointage reste disponible).
1. `waouh-notify-dispatch` (boutons `actions`, E1 ; **E9 : réservé à la clé service** — déployer avant/avec les appelants n'est pas nécessaire, ils l'envoient tous déjà)
2. `waouh-negotiation-router`, `waouh-deal-ops` (éviction E10, `article_status`)
3. `waouh-match-history` (identité par le jeton, E5)
4. `waouh-commerce-action` (E2–E6, E10/E11, boutons chauds, Nexus direct)
5. `waouh-channel-in`, `waouh-webhook` (messages « vendu/réservé », `sellerNotified`)
6. Durcissement E7–E9 : `waouh-status-publish`, `waouh-sell-handler`/`waouh-buy-handler`/`waouh-negotiate-handler` (retirés : HTTP 410), `waouh-presence-public-page` (PIN limité à 5 essais/matricule et 20/client sur 15 min → HTTP 429), `waouh-stock-ingest` (garde SSRF). Le workflow les déploie tous en `--no-verify-jwt` (déjà `verify_jwt=false` en prod).
7. Avatar : `waouh-nexus-followup` (suivi horaire, service seulement, inactif tant que `nexus_direct_deal` est coupé). Planification **manuelle** : créer les secrets Vault `waouh_nexus_followup_url` et `waouh_service_key`, puis `select public.waouh_schedule_nexus_followup();` (retourne `true`). Arrêt : `select cron.unschedule('waouh-nexus-followup-hourly');`.
8. Avatar guide : `waouh-avatar-briefing` (jeton utilisateur ; `tick` réservé au service). Points réguliers planifiés **manuellement** : secrets Vault `waouh_avatar_briefing_url` et `waouh_service_key`, puis `select public.waouh_schedule_avatar_briefing();`. Arrêt : `select cron.unschedule('waouh-avatar-briefing-hourly');`. L'accueil à l'ouverture fonctionne sans planification.
9. Optionnel : `waouh-studio-e2e-v21465` à partir de `waouh-agentic-core/index.ts` (libellé « Proposer mon offre »).

Après chaque fonction : `curl` OPTIONS/POST vide → pas de 5xx, puis journaux (`get_logs`) pendant 2 minutes.

## 3. Interrupteurs (Command Center → `waouh_admin_module_controls`, fail-closed = enabled ET automation_enabled)
- Déjà actifs en prod d'après le test : `chat_writer_v2`, `chat_router_v2`, `chat_catalog_v3`, `commerce_action_v3`, `chat_interest_fastpath` — ne pas les toucher.
- **`nexus_direct_deal` : créer la ligne désactivée**, déployer, valider, puis activer (module + automatisation). Le couper rétablit la fiche de contact sans redéploiement.

## 4. Vérification après déploiement (compte de test, article de test)
1. `scripts/waouh-chat/test-project/scenarios-chat.mjs` et `scenarios-nexus.mjs` refusent volontairement tout projet autre que le test : **ne pas les pointer sur la production**.
   En production, faire à la main avec deux comptes de test : publier → intérêt → notification vendeur avec boutons → contre-offre → accord → paiement → livraison.
2. Vérifier : bouton « Accepter » présent chez le vendeur, message « article vendu » exact, historique vendeur avec `boutons`, pas de « contacter » dans les cartes.
3. Nexus + avatar (drapeau activé) : carte C0 → Deal Room ouverte, bouton « Garder en veille » (aucun refus sec) ; carte C1–C4 avec contact → « Envoyer mon offre » → message « Offre transmise » puis « Synthèse de l'avatar » avec écart au prix ; relance visible après 24 h ; le double de test (`scripts/waouh-chat/test-project/stubs/`) ne doit JAMAIS être déployé en production. Ensuite : carte externe C1–C4 → Deal Room → « Envoyer mon offre » → vérifier la file `nexus.contact.send` et l'absence de numéro dans le fil.
4. Journaux sans hausse d'erreurs `technical_error`, `internal_call_failed`, 5xx.

## 5. Retour arrière
- Couper `nexus_direct_deal` (immédiat) puis, si besoin, `commerce_action_v3` (les clients reprennent `waouh-channel-in-secure`).
- Redéployer la version sauvegardée de la fonction fautive (inverse de l'ordre du §2). Aucune migration à annuler.
- Les articles `nexus_external` créés peuvent rester (inertes) ou être archivés : `update waouh_articles set status='paused' where origin='nexus_external'`.

Vérifications propres au durcissement (compte de test) : `notify-dispatch` avec clé anon ou jeton utilisateur → 401 ; publication → `buyers_notified` présent ; 6 échecs de PIN
consécutifs sur un matricule de test → 429 puis reprise après 15 min ; une URL Supabase `https://evil.com` dans une source de stock → refusée. Anciens gestionnaires : plus aucun appelant
(Flutter route désormais tout vers `waouh-channel-in`) ; surveiller les 410 dans les journaux.

## 6. Non traité (à savoir avant de dire « terminé »)
Comparaison code déployé / dépôt de **toutes** les fonctions : non faite ici (le jeton fourni n'a pas accès à la production ; seule `waouh-status-publish` a été relue via MCP, sans écart).
À faire à la main au §0.3. Épinglage des imports : fait pour la chaîne du chat (test de garde), pas pour les ~140 autres fonctions ni via un `deno.lock`.
WhatsApp réel, envoi Nexus réel et interface (Web/Flutter) non exécutés.
