
# Parcours négociation WAOUH — après "Intéressé N"

## Constat actuel

Aujourd'hui, dès que l'acheteur dit "intéressé 1" :
- ✅ Le vendeur reçoit la notification *"📩 Nouvel acheteur intéressé"* (WhatsApp + WaouhMatchChatWindow).
- ✅ Une `waouh_negotiations` est créée en `state=proposed`, `last_offer_price = askPrice`, `last_actor = "buyer"`.
- ⚠️ Mais le message envoyé à l'acheteur ne lui demande **rien explicitement** : il l'invite seulement à proposer un autre prix. Le vendeur est invité à *OUI / NON / contre-offre* alors que l'acheteur n'a encore rien confirmé.
- ⚠️ Le vendeur peut donc accepter un prix… que l'acheteur n'a pas encore validé. Le rôle des deux parties est ambigu.

L'utilisateur veut un parcours plus net : **l'acheteur décide d'abord** (accepter le prix affiché ou proposer son prix), **ensuite seulement** le vendeur entre en négociation.

## Parcours cible (expert vendeur-acheteur)

### Étape 0 — Découverte
Acheteur : `Je cherche briquet` → liste des résultats.

### Étape 1 — Manifestation d'intérêt
Acheteur : `intéressé 1`.
- ✅ Création `waouh_negotiations` (state `awaiting_buyer_decision`, last_actor = system).
- ✅ Notification vendeur **"📩 Nouvel acheteur intéressé"** envoyée UNE SEULE FOIS ici (WhatsApp + WaouhMatchChatWindow + inbox).
  - Texte vendeur : « Un acheteur de *Cotonou* s'intéresse à votre *BRIQUET* (5 000 FCFA). Il va vous indiquer s'il accepte ce prix ou s'il propose un autre montant. **Vous serez notifié dès qu'il aura répondu** — pas besoin d'agir pour l'instant. »
  - ⚠️ **Plus de boutons OUI/NON/contre-offre côté vendeur à cette étape.** Le vendeur attend.
- ✅ Réponse acheteur **"💬 Que souhaitez-vous faire ?"** :
  > 📦 BRIQUET — 5 000 FCFA
  >
  > 1️⃣ Répondez *OUI* pour accepter le prix du vendeur (5 000 FCFA).
  > 2️⃣ Ou proposez votre prix : *Je propose 4 000*.
  >
  > Le vendeur a été notifié et attend votre décision.

### Étape 2a — L'acheteur accepte le prix (OUI)
- Négo passe en `state=accepted`, `agreed_price=askPrice`.
- Vendeur reçoit **"🎉 Accord conclu"** : « L'acheteur accepte votre prix de 5 000 FCFA. Contactez-le pour organiser la remise. »
- Acheteur reçoit confirmation + coordonnées vendeur (selon politique actuelle).

### Étape 2b — L'acheteur propose un prix (`Je propose X`)
- Négo passe en `state=countered`, `last_offer_price=X`, `last_actor=buyer`.
- Vendeur reçoit **"💬 Offre de l'acheteur : 4 000 FCFA"** :
  > Acheteur propose *4 000 FCFA* (votre prix : 5 000 FCFA).
  > Répondez *OUI* pour accepter, *NON* pour refuser, ou *Je propose 4 500* pour contre-offrir.
- Acheteur reçoit : « Offre transmise. Vous serez notifié de la réponse du vendeur. »

### Étape 3 — Ping-pong de négociation (déjà OK)
La logique `NEGOTIATE` existante (lignes 1047-1082) gère bien le ping-pong une fois que les deux côtés se parlent. On ajoute uniquement :
- Compteur `rounds` dans `meta` pour stopper poliment au-delà de 6 allers-retours.
- Texte d'acceptation/refus standardisés (`OUI`/`NON` côté vendeur ET acheteur).

### Étape 4 — Accord ou rupture
- `OUI` du destinataire courant → `state=accepted`, notif "🎉 Accord conclu" aux deux côtés avec montant final + canal de contact.
- `NON` → `state=refused`, notif "❌ Négociation terminée" aux deux côtés.
- Inactivité 24 h → `state=expired`, notification douce.

## Changements techniques

Fichier principal : `supabase/functions/waouh-webhook/index.ts`.

### 1. Étape CONFIRM (lignes 881-1045) — split en deux moments
- Garder la création de la négo et l'envoi de la notif vendeur "Nouvel acheteur intéressé", **mais** remplacer `sellerText` par la version *informative seulement* (pas d'action demandée), et ajouter `meta.stage = "awaiting_buyer_decision"` sur la négo.
- Remplacer `reply` acheteur (ligne 1043) par le menu **OUI / Je propose X**.
- Conserver `match_seller` mais pas de `actions` pour le vendeur à cette étape.

### 2. Nouveau handler `BUYER_DECISION`
Avant la détection NEGOTIATE générique :
- Si le `last_intent` de la conv est `CONFIRM` ET qu'il existe une négo `state in ('proposed','awaiting_buyer_decision')` où `buyer_user_id = user.id` ET `last_actor in ('buyer','system')` :
  - `OUI` / `oui` / `j'accepte` → passe la négo en `accepted` avec `agreed_price=last_offer_price`, notifie vendeur + acheteur ("🎉 Accord conclu").
  - `NON` / `non` → `refused`, notifie les deux.
  - `Je propose X` → bascule vers le handler NEGOTIATE existant (qui notifiera le vendeur avec les actions OUI/NON/contre).

### 3. Handler NEGOTIATE (lignes 1047-1082)
- Inchangé pour le ping-pong, mais :
  - Ajouter `meta.rounds = (meta.rounds||0)+1` et message poli si > 6.
  - Standardiser le texte côté destinataire selon que c'est *vendeur* ou *acheteur* qui reçoit (déjà partiellement fait via `isBuyer`).

### 4. Handler OUI/NON post-négociation
Réutiliser la même détection que BUYER_DECISION mais pour les deux rôles dès qu'il y a une négo en `countered` avec `last_actor` ≠ user courant. → `accepted` ou `refused`, notif "🎉 Accord conclu" / "❌ Négociation terminée" aux deux côtés.

### 5. Notifications (audit + ajustement)
- `new_buyer` (📩 Nouvel acheteur intéressé) : **émise uniquement à l'étape 1**, pas à chaque contre-offre. Dedupe déjà en place.
- Nouveaux templates de notification (côté WhatsApp + inbox WaouhMatchChatWindow) :
  - `buyer_offer` (vendeur reçoit l'offre acheteur)
  - `seller_counter` (acheteur reçoit la contre-offre)
  - `deal_accepted` (les deux côtés)
  - `deal_refused` (les deux côtés)
- Tous passent par `pushToOther` + insert `waouh_notifications` avec `dedupe_key` ciblé `(negotiation_id, stage, round, recipient)`.

### 6. WaouhMatchChatWindow (frontend)
Aucun changement structurel : la fenêtre lit déjà `waouh_notifications.payload.text`. Il suffit que les textes envoyés soient cohérents et que le `dedupe_key` empêche les doublons.

## Validation

1. Acheteur : `Je cherche briquet` → liste.
2. Acheteur : `intéressé 1` → reçoit menu *OUI / Je propose X*. Vendeur reçoit notif **info-only** (pas d'action).
3. Acheteur : `Je propose 4000` → vendeur reçoit *4 000 FCFA* avec actions OUI/NON/contre.
4. Vendeur : `Je propose 4500` → acheteur reçoit contre-offre.
5. Acheteur : `OUI` → les deux reçoivent "🎉 Accord conclu" à 4 500 FCFA.
6. Vérifier `waouh_notifications` : **une seule** ligne `new_buyer` par négociation, et les notifs suivantes bien typées.

## Fichier touché

- `supabase/functions/waouh-webhook/index.ts` (réécriture des blocs CONFIRM + NEGOTIATE + ajout BUYER_DECISION / OUI-NON).

Pas de migration SQL nécessaire : on réutilise `waouh_negotiations.state` + `meta` jsonb. Une migration optionnelle pourra ajouter la valeur enum `awaiting_buyer_decision` si l'état est typé strictement (à confirmer après lecture du schéma de `waouh_negotiations`).
