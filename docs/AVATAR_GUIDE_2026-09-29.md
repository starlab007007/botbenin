# L'avatar guide : accueil, points réguliers, réglages (Web + Flutter) — 2026-09-29

## Ce que fait l'avatar
- **À chaque ouverture du chat** (si l'utilisateur le souhaite) : un message de bienvenue et le point du moment, en **2 à 3 phrases courtes**.
  Premier accueil = présentation de ce qu'il sait faire ; retour après 6 h = « Bonjour/Bonsoir <prénom>, content de vous retrouver » ; ouverture rapprochée = simple point.
  Au plus un accueil par 30 minutes (rechargements, plusieurs onglets).
- **« Faire le point »** à la demande, à tout moment, même accueil coupé.
- **Points réguliers** (l'utilisateur choisit) : jamais, toutes les heures, toutes les 4 heures, chaque jour, chaque semaine ; **heures calmes** réglables (21 h → 7 h par défaut, heure du Bénin).
  Un point régulier n'est envoyé que s'il y a du nouveau ou une action possible : pas de message vide répété.
- **Contenu d'un point** : ce que l'avatar fait (offres transmises, en attente, commandes), ses **veilles**, ses **contacts** (relance possible ?), ses **prochaines étapes**, jusqu'à 3 boutons
  (Relancer le vendeur · Envoyer mon offre · Répondre aux offres · Suivre ma commande · Régler mes points · Chercher un produit · Vendre un article) et une ligne **« Je peux aussi : … »** (aide qui tourne chaque jour).
- **Jamais d'envoi à un tiers** : le guide écrit dans le chat de l'utilisateur ; relancer ou envoyer reste un tap (action serveur habituelle, politique C0–C5 intacte). Test de garde dans le dépôt.

## Réglages (identiques Web et Flutter)
Barre « Votre avatar » au-dessus du chat : état (« Prochain point dans 3 h »), **Faire le point**, et réglages : accueil à l'ouverture (interrupteur), fréquence des points, heures calmes.
Enregistrement immédiat, annulé avec message si le serveur refuse. Valeurs invalides ignorées (les réglages précédents sont conservés).

## Architecture
| Couche | Web | Flutter | Serveur |
|---|---|---|---|
| Composition (pure, testée) | – | – | `_shared/waouh-avatar-briefing.ts` (cadence, heures calmes, phrases, sections, boutons, empreinte d'activité) |
| Données | `src/lib/waouh/avatarGuide.ts` | `live_avatar_guide.dart` (service + modèles) | `_shared/waouh-avatar-briefing-core.ts` (activité de l'utilisateur, livraison, tick) |
| Point d'entrée | – | – | `waouh-avatar-briefing` : `get_prefs`, `set_prefs`, `open`, `now` (jeton requis) ; `tick` (clé service) |
| UI | `WaouhAvatarBriefingCard`, `WaouhAvatarGuideBar` (dans `WaouhWebChat`) | `LiveAvatarBriefingCard`, `LiveAvatarGuideBar` (dans `LiveMainChatScreen` et `LiveMessageBubble`) | – |
| Stockage | – | – | migration `20260929160000` : `waouh_avatar_prefs` (RLS : chacun sa ligne ; `last_*` non modifiables par le client) |

Le point est **écrit comme un message** du chat (`meta.intent = avatar_briefing`) : il apparaît dans l'historique (Web `waouh-history`, Flutter flux temps réel) et se rend en carte premium ; les anciens points se replient sur une ligne.
L'identité vient du jeton (jamais d'un identifiant du corps). Les points contiennent uniquement l'activité de l'utilisateur, sans montant ni coordonnée.

## Bogues trouvés en testant
1. Flutter : `ExpansionTile` dans un `Container` décoré → assertion Flutter (fond et effets invisibles). Corrigé (`Material`).
2. `set_prefs` : une heure invalide (99) faisait revenir la valeur aux défauts au lieu de conserver la précédente. Corrigé (`mergePrefs`, pur et testé).

## Vérifications
- Deno 290 tests (composition, cadence, heures calmes, tick, isolation des erreurs, sécurité), Vitest 238, Flutter (voir CHANGELOG).
- Projet de test, vraie fonction : `scenarios-guide.mjs` **14/14** (refus sans jeton, tick réservé au service, réglages, isolation entre utilisateurs, champs de suivi non modifiables, point 2–3 phrases,
  reflet de l'activité réelle, message présent dans l'historique, pas de doublon < 30 min, accueil coupé, point manuel). L'historique Web (`waouh-history`) renvoie bien les points.

## Limites (honnêtes)
- **Le tick planifié n'a pas tourné en réel** (clé service absente) : logique couverte par 6 tests sur base simulée. Planification à faire par un administrateur : secrets Vault `waouh_avatar_briefing_url` et `waouh_service_key`, puis `select public.waouh_schedule_avatar_briefing();`.
- **Invités (Web sans compte)** : pas de réglages ni de point (identité par jeton) ; l'écran vide reste l'invitation habituelle.
- **Notifications hors application** : les points régulier sont des messages du chat ; aucune notification push/WhatsApp n'est envoyée (choix : pas de sollicitation hors de l'app sans accord explicite).
- Interface non exécutée visuellement (tests de rendu Web et Flutter, dont un bogue d'assertion attrapé côté Flutter). Animations : orbe pulsée, sections repliables ; pas de plein écran « immersif » au-delà.
- Langue : français uniquement. Heure de référence : Bénin (UTC+1).
