# Rapport de durcissement — E7, E8, E9, P2 et constats d'audit (2026-09-29)

| Point | Avant | Après | Preuve |
|---|---|---|---|
| **E7** publication | `fetch(notify-buyers).catch(() => {})` : réponse `ok:true` même si aucun acheteur n'était notifié | appel attendu (4 s max), journalisé, issue renvoyée (`buyers_notified: {ok, status}`) ; la publication n'échoue pas | Deno (`waouh-hardening-test.ts`) ; test réel : `buyers_notified = {ok:false, status:404}` (notify-buyers absent du projet de test) au lieu d'un faux succès |
| **E8** anciens gestionnaires | `waouh-sell/buy/negotiate-handler` : dépendent de `LOVABLE_API_KEY` et de `waouh_users.phone` (colonne disparue) ; Flutter (`main.dart`) les appelait et retombait sur une insertion brute | 410 `handler_retired` (`use: waouh-channel-in`) ; Flutter route tout vers `waouh-channel-in` | Deno + `flutter test` |
| **E9** notify-dispatch | aucune authentification de l'appelant (envoi de notifications/WhatsApp à des tiers) | Bearer = clé service (comparaison à temps constant), sinon 401 `service_role_required` ; test statique : tous les appelants du dépôt envoient la clé service | Deno ; réel : clé anon, jeton utilisateur, sans jeton → 401 ; la notification vendeur (« Nouvel acheteur ») arrive toujours |
| **P2** migration | `20260929130000` (dépôt) vs `20260929131943` (base) | fichier renommé `20260929131943_…` ; références mises à jour | `list_migrations` de production relu |
| **Force brute PIN** (audit) | PIN à 4 chiffres, aucun plafond d'essais | 5 échecs / matricule et 20 / client (adresse hachée) sur 15 min → 429 ; succès = remise à zéro ; table `waouh_presence_pin_attempts` (RLS, service role) | Deno (cycle complet avec base simulée) ; migration appliquée sur le projet de test |
| **SSRF** (audit) `waouh-stock-ingest` | URL Supabase et hôte PostgreSQL saisis par l'utilisateur, clé API envoyée à n'importe quel hôte | Supabase : `https://<réf>.supabase.co` seulement, sans identifiants ni port, `redirect: error` ; PostgreSQL : hôte public, ports 5432/6543, résolution DNS publique (anti-rebinding) | Deno (`waouh-egress-guard-test.ts`) |
| **Imports distants** (audit) | `supabase-js@2` flottant dans 9 fichiers de la chaîne du chat | épinglé `2.49.8` (version déjà utilisée par les autres fonctions) ; test de garde | Deno |
| **Workflow de déploiement** | ne couvrait ni la migration PIN ni les fonctions durcies | chemins, portail de migration et liste de fonctions étendus ; la config CLI minimale (contournement du `CliConfigParseError`) y existait déjà | YAML validé |

## Vérifications globales
Deno 245 tests, Vitest 223, Flutter (voir ci-dessous), scénarios réels du projet de test : Nexus 13/13, durcissement 6/6.

## Limites (honnêtes)
- **Dérive déployé/dépôt** : non comparée fonction par fonction — le jeton fourni n'a pas accès à la production (403, normal). Seule `waouh-status-publish` a été relue par MCP : aucun écart hors de ces changements.
  Étape à faire au moment du déploiement (runbook §0.3).
- **PIN** : le test complet de la page publique (site + QR + membre au PIN haché) n'a pas été rejoué sur le projet de test ; la logique est couverte par tests unitaires et la table existe. La protection est **inactive et journalisée** tant que la migration manque (choix : la disponibilité du pointage prime).
- **Adresse du client** : issue de `x-forwarded-for` (posée par la plateforme) ; un attaquant qui change d'adresse est limité par matricule (5 essais / 15 min), pas par adresse.
- **Épinglage** limité à la chaîne du chat ; les ~140 autres fonctions et un `deno.lock` ne sont pas traités.
- WhatsApp réel, envoi Nexus réel, interface Web/Flutter non exécutés.
