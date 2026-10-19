# Audit parité chat Web ⇄ Flutter + backend — 19/10/2026

## Fenêtres de chat
| Point | Web | Flutter | État |
|---|---|---|---|
| Chat principal à l'ouverture | vide + « Voir l'historique » | vide (messages depuis l'ouverture), pas de bouton | écart mineur |
| Deal Room : historique | 3 derniers + « Voir plus » | 3 derniers, pas de « Voir plus » | à faire |
| En-tête Deal Room | bande compacte + volet détail | bannière + puce bot 1 ligne | aligné |
| Frise 7 étapes | dans le volet détail | retirée du haut (corrigé ce jour) | aligné |
| Boutons d'action des messages guides | oui | non | à faire |
| Envoi, boutons serveur v3, clôture, correlation_id | — | — | aligné (tests de parité) |
| Isolation 1 fenêtre = 1 article × 1 interlocuteur | — | — | aligné |

## Backend (données réelles, 7–14 jours)
- 185 messages sur 7 jours ; 100 % des messages liés à un article ont un correlation_id (Web et Flutter).
- Messages Flutter (`flutter_native`) : 13/13 avec correlation_id.
- File WhatsApp : 18 messages en attente depuis le 11/10, 0 échec. Cause : la session WhatsApp « WaouhApp » est refusée par le serveur WAHA (erreur 401) → reconnexion nécessaire.
- Notifications : 40 envoyées en 7 jours, 1 seule ouverte.

## Tests
- Web : 244/244 tests du chat passent.
- Flutter : non compilé ici (APK à générer chez vous).
