# Runbook de déploiement en production — lot chat v3 (E1–E6, E10/E11, fenêtres chaudes, Nexus direct)

**Préparé, NON exécuté.** Projet de production : `mvynepqulhflxtyymtzs`. Projet de test déjà à jour : `ljzwqyzaovnandpyfpgc`.
Aucune migration SQL dans ce lot (les migrations 20260929065700/065715/130000 sont déjà en base ou hors périmètre : vérifier avec `list_migrations`, voir P2).

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
1. `waouh-notify-dispatch` (boutons `actions`, E1)
2. `waouh-negotiation-router`, `waouh-deal-ops` (éviction E10, `article_status`)
3. `waouh-match-history` (identité par le jeton, E5)
4. `waouh-commerce-action` (E2–E6, E10/E11, boutons chauds, Nexus direct)
5. `waouh-channel-in`, `waouh-webhook` (messages « vendu/réservé », `sellerNotified`)
6. Optionnel : `waouh-studio-e2e-v21465` à partir de `waouh-agentic-core/index.ts` (libellé « Proposer mon offre »).

Après chaque fonction : `curl` OPTIONS/POST vide → pas de 5xx, puis journaux (`get_logs`) pendant 2 minutes.

## 3. Interrupteurs (Command Center → `waouh_admin_module_controls`, fail-closed = enabled ET automation_enabled)
- Déjà actifs en prod d'après le test : `chat_writer_v2`, `chat_router_v2`, `chat_catalog_v3`, `commerce_action_v3`, `chat_interest_fastpath` — ne pas les toucher.
- **`nexus_direct_deal` : créer la ligne désactivée**, déployer, valider, puis activer (module + automatisation). Le couper rétablit la fiche de contact sans redéploiement.

## 4. Vérification après déploiement (compte de test, article de test)
1. `scripts/waouh-chat/test-project/scenarios-chat.mjs` et `scenarios-nexus.mjs` refusent volontairement tout projet autre que le test : **ne pas les pointer sur la production**.
   En production, faire à la main avec deux comptes de test : publier → intérêt → notification vendeur avec boutons → contre-offre → accord → paiement → livraison.
2. Vérifier : bouton « Accepter » présent chez le vendeur, message « article vendu » exact, historique vendeur avec `boutons`, pas de « contacter » dans les cartes.
3. Nexus (drapeau activé) : carte externe C1–C4 → Deal Room → « Envoyer mon offre » → vérifier la file `nexus.contact.send` et l'absence de numéro dans le fil.
4. Journaux sans hausse d'erreurs `technical_error`, `internal_call_failed`, 5xx.

## 5. Retour arrière
- Couper `nexus_direct_deal` (immédiat) puis, si besoin, `commerce_action_v3` (les clients reprennent `waouh-channel-in-secure`).
- Redéployer la version sauvegardée de la fonction fautive (inverse de l'ordre du §2). Aucune migration à annuler.
- Les articles `nexus_external` créés peuvent rester (inertes) ou être archivés : `update waouh_articles set status='paused' where origin='nexus_external'`.

## 6. Non traité par ce lot (à savoir avant de dire « terminé »)
E7 (`waouh-status-publish` : appels asynchrones sans suivi), E8 (`waouh-sell-handler` historique), E9 (`waouh-notify-dispatch` sans authentification d'appelant),
P2 (numérotation des migrations), 19 fonctions retranscrites à la main non comparées au déployé, SSRF `waouh-stock-ingest`, force brute PIN `waouh-presence-public-page`,
imports distants. WhatsApp réel et interface non exécutés.
