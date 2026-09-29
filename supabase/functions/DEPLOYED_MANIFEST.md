# Manifeste des fonctions déployées sans source dans `supabase/functions/`

Relevé du 29/09/2026 — projet `mvynepqulhflxtyymtzs`. Lecture seule : rien n'a été modifié en production.
## État du rapatriement (29/09/2026)
Sources ajoutées dans `supabase/functions/` à partir du code lu sur le projet (Supabase MCP, lecture seule) :
- **Copie exacte, extraite par programme (aucune retranscription)** : `waouh-studio-e2e-v21465`, `waouh-studio-user-api`,
  `waouh-apresbac-chat`. Les 8 fichiers `_shared/` embarqués dans leur bundle sont **identiques** à ceux du dépôt.
- **Retranscrites à la main** (la lecture ne pouvait pas être écrite directement) : `_shared/presence.ts`, `waouh-presence-*`
  (5 fonctions), `waouh-radar-nearby`, `waouh-stock-alert-send`, `waouh-stock-ingest`, `waouh-stock-query`,
  `waouh-diffusion-suggest`, `waouh-studio-pair-code-v21462`, `waha-agent-bridge`, `waha-session-mobile`,
  `setup-test-accounts`, et 4 fichiers d'une ligne. Chaque fichier a passé une vérification de syntaxe (esbuild),
  **mais aucune comparaison octet à octet n'a été possible** : à confirmer avec `scripts/supabase/pull-deployed-functions.sh`
  puis `diff -r .pulled-functions supabase/functions`. Les sommes SHA-256 des fichiers versionnés sont dans `DEPLOYED_SHA256.txt`.
- **Non ajoutées** : `chat-webhook` (= `waouh-native-simulator`, déjà dans le dépôt), `waouh-bots-backend-health-v1`
  (= `waouh-native-messaging-settings`, déjà dans le dépôt), et `a` : son bundle embarque une version de
  `_shared/agent-ai.ts` (`STUDIO_AI_VERSION` 21.4.6.24, ~20 Ko) **différente** de celle du dépôt (14 571 octets) ;
  la versionner telle quelle sans cette copie changerait son comportement au prochain déploiement.
- `verify_jwt = false` ajouté dans `supabase/config.toml` pour les 12 fonctions concernées (les fonctions à JWT actif gardent le défaut).
- **Ne pas déployer ces fichiers avant confirmation par diff.**

## Attention : le nom (slug) déployé n'est pas toujours le nom du code
| Slug déployé | v | JWT | Maj (UTC) | Contenu réel | Remarque |
|---|---|---|---|---|---|
| `chat-webhook` | 222 | non | 2026-09-24 | `waouh-native-simulator` | Présent dans le dépôt sous un autre nom (à confirmer par diff) |
| `waouh-bots-backend-health-v1` | 8 | oui | 2026-09-26 | `waouh-native-messaging-settings` | Idem |
| `waouh-chat-health` | 6 | non | 2026-09-24 | import distant de `waouh-tel-open-messages` | `import "https://raw.githubusercontent.com/starlab007007/botbenin/6bf9025…/supabase/functions/waouh-tel-open-messages/index.ts"` |
| `waouh-studio-pair-code-v2145` | 46 | non | 2026-09-24 | import distant de `waouh-tel-ingress` | Même mécanisme, même commit 6bf9025 |
| `setup-test-accounts` | 226 | oui | 2026-09-25 | logique « product intelligence » (analyse de prix d'un article) | Le nom ne correspond pas au code ; aucun secret vu |
| `a` | 17 | non | 2026-07-29 | Web Chat public d'agent IA (`/{slug}`, QR, bootstrap/chat) | Nom d'une lettre ; dépend de `_shared/agent-ai.ts` |
| `waouh-e2e-v3-relay` | 3 | non | 2026-09-28 | stub désactivé (répond 410 `e2e_relay_disabled`) | Candidat à suppression |

## Fonctions dont le slug correspond au code (source absente du dépôt)
| Slug | v | JWT | Maj (UTC) | Utilisée par |
|---|---|---|---|---|
| `waouh-radar-nearby` | 53 | oui | 2026-07-02 | Flutter |
| `waouh-presence-checkin` | 50 | oui | 2026-07-13 | Flutter, Web (partage `_shared/presence.ts`) |
| `waouh-presence-qr-create` | 54 | oui | 2026-07-19 | Flutter, Web |
| `waouh-presence-qr-preview` | 46 | oui | 2026-07-13 | Flutter, Web (partage `_shared/presence.ts`) |
| `waouh-presence-event-notify` | 48 | oui | 2026-07-13 | appelée par `waouh-presence-checkin` (partage `_shared/presence.ts`) |
| `waouh-presence-public-page` | 49 | non | 2026-07-19 | page publique de pointage |
| `waouh-stock-ingest` | 49 | non | 2026-07-30 | Flutter |
| `waouh-stock-query` | 54 | non | 2026-07-30 | Flutter |
| `waouh-stock-alert-send` | 47 | oui | 2026-07-06 | — |
| `waouh-diffusion-suggest` | 53 | non | 2026-08-01 | Flutter |
| `waouh-apresbac-chat` | 53 | non | 2026-07-20 | Flutter |
| `waouh-studio-user-api` | 58 | non | 2026-07-30 | Flutter |
| `waouh-studio-e2e-v21465` | 60 | oui | 2026-09-26 | Flutter (fonction volumineuse, > 200 Ko) |
| `waouh-studio-pair-code-v21462` | 74 | non | 2026-07-29 | Flutter |
| `waouh-studio-agent-webhook-v2146` | 44 | non | 2026-09-24 | contenu réel à identifier |
| `waha-agent-bridge` | 47 | non | 2026-07-03 | — |
| `waha-session-mobile` | 49 | oui | 2026-07-06 | — |

## Points d'attention relevés à la lecture (à traiter, non corrigés ici)
1. **Imports distants** (`raw.githubusercontent.com`, commit figé 6bf9025) dans deux fonctions : le déploiement
   dépend de la disponibilité de GitHub et du dépôt public. Préférer un import local.
2. **`waouh-stock-ingest`** (JWT désactivé, contrôle d'accès dans le code) se connecte à un hôte PostgreSQL
   et à une URL Supabase fournis par l'utilisateur : risque de requêtes vers des adresses internes (SSRF).
3. **`waouh-presence-public-page`** (JWT désactivé, public) vérifie matricule + PIN à 4 chiffres sans limitation
   de tentatives visible dans la fonction.
4. Les fonctions `waouh-presence-*` importent `https://esm.sh/@supabase/supabase-js@2.49.8` ; le reste du dépôt
   utilise `npm:@supabase/supabase-js@2` : versions et sources d'import hétérogènes.
