# WAOUH : fenêtres de chat épurées, puis messages, notifications et photos entre l'appli et WhatsApp

## Partie 1 : fenêtres de chat épurées (web + Flutter)

Objectif : chaque fenêtre s'ouvre claire et invite à écrire. Pas de vieil historique qui revient tout seul.

- **Chat principal (WaouhWebChat)** : à l'ouverture, on affiche seulement un message d'accueil et les actions rapides (Acheter, Vendre, Radar). L'ancien fil n'est plus rechargé depuis le cache local ni depuis le serveur. Un petit bouton discret « Voir l'historique » charge les anciens messages à la demande, par pages.
- **Fenêtres produit (WaouhMatchChatWindow)** : la fenêtre s'ouvre sur la fiche de l'article et l'interlocuteur, puis affiche seulement les 3 derniers messages échangés sur cet article, pour garder le fil de la négociation. Le reste se charge via « Voir plus ». Les messages techniques répétés (relances, doublons, accusés système) sont regroupés ou masqués.
- **Nouveau chat** : le bouton « Nouveau chat » vide l'écran immédiatement (correction de l'anomalie INT-001 de l'audit).
- **Allègement visuel** : plus d'espace, une zone de saisie bien visible, des bulles plus légères, des cartes produit compactes.
- **Flutter** : même règle dans `flutter_waouh_app/lib/live` (chat principal sans historique au démarrage, fenêtres de match limitées aux derniers messages, bouton historique).
- Le verrou d'isolation v13 (1 fenêtre = 1 article × 1 interlocuteur) et le correlation_id restent inchangés. Les tests d'invariants doivent tous rester verts.

## Partie 2 : messages, notifications et photos (appli ↔ WhatsApp)

1. **Diagnostic sur les données réelles** : lire les journaux de `waouh-channel-in-secure`, `waha-webhook`, `waouh-outbound-dispatch`, `waouh-notify-dispatch` et `waha-send-message`. Lire aussi les tables `waouh_messages`, `waouh_notifications`, `waouh_outbound_queue` et `waha_message_logs` sur les derniers jours. Mesurer :
   - les messages sortis de l'appli et jamais livrés sur WhatsApp ;
   - les messages WhatsApp reçus mais absents de l'appli ;
   - les photos perdues dans les deux sens (URL manquante, image WhatsApp non téléchargée dans le stockage) ;
   - les notifications non relayées et les doublons.
2. **Corrections ciblées** sur les causes trouvées. Pistes à confirmer pendant le diagnostic :
   - toute notification et tout message de match part automatiquement vers les deux canaux (appli et WhatsApp) via une file unique, avec relance limitée en cas d'échec ;
   - les photos reçues sur WhatsApp sont copiées dans le stockage WAOUH, puis affichées dans l'appli ;
   - les photos envoyées depuis l'appli partent sur WhatsApp en vraie image, pas en simple lien ;
   - une clé anti-doublon par message.
3. **Test de bout en bout**, avec des messages de test marqués puis supprimés : texte et photo dans le sens appli → WhatsApp, puis WhatsApp → appli. Notification de match envoyée vers les deux canaux. Vérification en base de chaque étape.
4. **Rapport** : causes trouvées, corrections, résultats des tests, points restants.

## Limites
- Je peux corriger le code Flutter, mais je ne peux pas le compiler ici : l'APK devra être généré chez vous.
- Les tests WhatsApp réels demandent une session WhatsApp connectée et un numéro de test.

## Détails techniques
- Web : suppression de l'hydratation `snapshot` et de l'auto-fetch `waouh-history` au montage, remplacés par un chargement à la demande. Dans `WaouhMatchChatWindow`, limite initiale à 3 messages côté `waouh-match-history` et pagination.
- Serveur : vérifier le fan-out dans `waouh-notify-dispatch` / `waouh-outbound-dispatch` (statuts de la file, retries bornés, `idempotency_key`), et le traitement des médias dans `waha-webhook` (téléchargement vers le bucket `waouh-uploads`).
