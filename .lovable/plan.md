
## Objectif
Éliminer tous les doublons et fragments manquants du parcours bout-en-bout sur WhatsApp (vendeur ↔ acheteur), aligner la mise en forme des annonces (photos, prix réel marché, géoloc, note IA), garantir l'envoi automatique de chaque notification, et professionnaliser les cartes de paiement dans le web chat.

## A. Module unique de composition (source de vérité)

Centraliser dans `supabase/functions/_shared/waouh-format.ts` les fonctions :
- `paymentCard(amount, txId)` : carte paiement texte **sans** la phrase « Appuyez sur Payer ou envoyez : payer 0165653468 » ni la liste 1/2/3. Juste : montant, escrow, statut, référence.
- `paymentInstructions(amount, txId)` : variante uniquement utilisée à l'étape **PAY** (paiement prêt) avec les vraies instructions Mobile Money MTN/Moov (sans la phrase legacy `payer 0165653468`).
- `marketNote(price, min, max, title, city)` : appelle Gemini pour produire **une seule phrase** analytique IA (ex : « Le prix proposé est ~10% sous la médiane Cotonou — bonne affaire »).
- `sellerActions(articleId)` / `buyerActions(matches)` / `paymentActions(txId)` : sets de boutons unifiés.

Bénéfice : suppression des duplications de strings dans `waouh-webhook`, `waouh-negotiation-router`, `waouh-outbound-dispatch`.

## B. Corrections WhatsApp — Vendeur

Fichiers : `waouh-webhook/index.ts`, `waouh-channel-in/index.ts`, `waouh-outbound-dispatch/index.ts`.

1. **Annonce publiée (SELL)**
   - Garder l'envoi des 2 photos (déjà OK côté DB ; corriger `waouh-channel-in` pour envoyer les deux en album/légende au lieu d'une seule via `firstImage`).
   - Récupérer un vrai prix marché : appeler `waouh-price-compare` (ou Gemini avec contexte ville/catégorie) au lieu du fallback ±20%. Stocker `market_price_min/max` et afficher la fourchette réelle.
   - Ajouter **localisation** dans le message (ville + quartier reverse-geocodé via `waouh-geocode`).
   - Ajouter **une phrase IA analytique** (`marketNote`).
   - **Supprimer** le bloc « 🔎 Références comparatives » (`sourceLines`).
   - **Supprimer** le second message « Répondez avec le numéro de votre choix : 1.Booster 2.Modifier 3.Pause ». Les boutons interactifs Booster/Modifier/Pause restent envoyés via `sendButtons` mais **le fallback texte numéroté ne doit plus partir si les boutons natifs ont réussi**. Forcer un seul `sendWahaButtons` réussi → pas de fallback texte.

2. **Notification « Nouvel acheteur intéressé »** (`pushToOther` dans `waouh-webhook` branche `CONFIRM`)
   - **Retirer** `paymentCard(...)` du `directText` envoyé au vendeur.
   - **Retirer** `actions: paymentActions` du payload outbound de cette notification (laisser uniquement boutons type « Accepter / Refuser / Contre-offrer »).
   - Vérifier que `waouh-outbound-dispatch` est bien déclenché (le fire-and-forget existe en fin de webhook ; corriger si la table `waouh_outbound_queue` ne reçoit pas l'item parce que `to_phone` est null pour un vendeur web — fallback : si le vendeur est uniquement web, message direct uniquement + bell ; si phone présent, WhatsApp).

3. **Notification de contre-offre acheteur → vendeur** (branche `NEGOTIATE`)
   - Vérifier que `pushToOther` est appelé ET que l'item est traité par dispatch. Symptôme actuel : le dispatch peut sauter avec « no phone » si `to_phone` est null. Patch : forcer l'enqueue WhatsApp dès que le vendeur a `phone_number`.
   - Garantir que `waouh-outbound-dispatch` est rappelé en fire-and-forget après l'update négociation (déjà fait dans webhook, à ajouter dans `waouh-negotiation-router`).

4. **Notification « Accord enregistré »** (`waouh-negotiation-router`, branche `yes`)
   - **Garder** `paymentCard` mais via la nouvelle version (sans phrase legacy ni 1.Payer/2.MTN/3.Moov dans le corps).
   - Boutons interactifs uniquement : `[Payer maintenant (url), MTN, Moov]` — pas de doublon texte.

5. **Notification « Paiement prêt »** (branche `PAY`)
   - Utiliser `paymentInstructions` : vrais textes MTN/Moov, sans la phrase legacy.
   - Boutons WAHA: `Payer (url)`, `MTN`, `Moov`. Pas de second message numéroté.

6. **Après paiement réussi**
   - Dans `waouh-payment` (callback Qosic webhook actuel) : déclencher `pushToOther` x2 :
     - Vers acheteur → contact + géoloc réelle du vendeur (numéro WhatsApp + lien Google Maps `https://maps.google.com/?q={lat},{lng}`).
     - Vers vendeur → contact + géoloc réelle de l'acheteur.
   - Marquer transaction `status: paid` et envoyer un récap unique (template `order_recap`) avec boutons « ✅ J'ai reçu » / « 📞 Appeler ».

7. **Anti-doublon outbound**
   - Lorsque `actions.length > 0` ET WAHA `sendButtons` réussi, **ne plus envoyer le fallback texte/sendText**. Ajouter un guard explicite dans `sendWahaButtons` (déjà partiellement présent, mais le 1er fallback envoie quand même le texte legacy — supprimer cette branche si le premier `r.ok`).
   - Dans `waouh-channel-in`, ne plus persister `(image)` séparément si l'image est déjà en attachment du message principal.

## C. Corrections WhatsApp — Acheteur

1. **Annonces trouvées (BUY)**
   - Limiter explicitement à **top 5** (déjà `.limit(5)` côté Supabase, mais l'affichage radar peut dépasser — forcer max 5 cumulés).
   - Afficher **toutes les photos** par produit (envoyer un album WAHA `sendImage` séquentiel par match, OU le 1er en header + texte listant `📸 N photos`). Privilégier l'envoi compact via la liste interactive WAHA (`sendList` avec sections) si présent, sinon image carousel.
   - Prix marché réel + 1-2 phrases IA (`marketNote`).
   - Géoloc réelle (ville + reverse geocode rapide).
   - Boutons : `Intéressé 1`, `Intéressé 2`, … `Intéressé N` (jusqu'à 3 boutons WAHA, le reste en texte tap-to-reply).
   - **Supprimer** le 2e message « Répondez avec le numéro de votre choix » (même règle qu'en B.1 — pas de fallback texte si boutons OK).

2. **Demande envoyée au vendeur après « intéressé X »**
   - Reformuler le message interne vers vendeur : « *Je propose {prix_demande_acheteur} FCFA* » au lieu de la chaîne hard-codée « 250 000 ».
   - **Supprimer** `paymentCard(...)` du `directText` côté vendeur.
   - **Supprimer** la phrase « Appuyez sur Payer ou envoyez … ».
   - **Supprimer** le second message « 1.Payer 2.Négocier ».
   - Boutons vendeur : `Accepter`, `Refuser`, `Contre-offre`.

3. **Contre-offre vendeur → acheteur**
   - Garantir réception via outbound queue + dispatch (cf B.3).

4. **Accord accepté → acheteur**
   - `paymentCard` + boutons `Payer maintenant (url)`, `MTN`, `Moov`. Pas de phrase legacy. Pas de 2e message numéroté.

5. **Paiement prêt → acheteur**
   - `paymentInstructions` propres, boutons interactifs uniquement.

6. **Post-paiement**
   - Envoi contact + géoloc vendeur à l'acheteur (cf B.6).

## D. Web chat — cartes paiement interactives

Fichier : `src/components/waouh/WaouhWebChat.tsx` + `WaouhTransactionCard.tsx`.

- Détecter dans `m.meta.actions` les actions retournées par l'edge. Rendre **sous chaque bulle assistant** une rangée de boutons cliquables (shadcn `Button` variant `secondary`) qui rejouent l'action :
  - bouton `pay` → ouvre `WaouhPaymentDialog`.
  - bouton `negotiate` → pré-remplit l'input avec « Je propose  FCFA pour … ».
  - bouton `accept`/`refuse` → envoie le mot-clé correspondant.
  - bouton `interest:N` → envoie « intéressé N ».
- `WaouhTransactionCard` : ajouter mise en forme premium :
  - en-tête dégradé cyan→bleu (token existant),
  - lignes structurées (Montant, Commission, Escrow, Référence),
  - CTA `💳 Payer maintenant` proéminent (`bg-gradient-to-r from-emerald-500 to-teal-500`),
  - boutons secondaires `MTN` / `Moov` (présélection opérateur).
- Sur le web, **ne plus afficher** la phrase texte « Appuyez sur Payer … » — masquée via regex côté rendu (supprime aussi tout suffixe `👉 Appuyez sur *Payer*...`).
- Empêcher l'affichage en double de la même `WaouhTransactionCard` (dédupliquer par `transaction_id` sur la dernière occurrence uniquement).

## E. Idempotence & cohérence outbound

- Ajouter unicité logique : `(to_user_id, template, transaction_id)` sur les 60 dernières secondes → si déjà `sent`, skip. Implémentable côté `waouh_enqueue_outbound_v2` (RPC) ou check dans `pushToOther`.
- Confirmer que `waouh-outbound-dispatch` est rappelé à chaque mutation (webhook, negotiation-router, payment-handler).
- `waouh-channel-in` : si `sendWahaButtons` réussit, ne pas chaîner `sendText`.

## F. Critères d'acceptation (test bout-en-bout)

Vendeur (numéro A) :
1. « Je vends iPhone 14 256Go à 450000 » + 2 photos → annonce publiée avec **2 photos**, prix marché réel, **1 phrase IA**, ville+géoloc, boutons Booster/Modifier/Pause (un seul message).
2. Reçoit auto « Nouvel acheteur intéressé » **sans** carte paiement, **sans** message d'actions rapides.
3. Envoie « Je propose 400000 » → acheteur reçoit la contre-offre.
4. Tape « OUI » à la contre-offre acheteur → reçoit « Accord enregistré » **avec** carte paiement propre (sans phrase legacy ni liste 1/2/3).
5. Après paiement acheteur → reçoit contact + Google Maps acheteur.

Acheteur (numéro B) :
1. « Je cherche iPhone à Cotonou » → top 5 annonces avec toutes photos, prix marché réel, géoloc, boutons « Intéressé 1/2/3 » (un seul message).
2. Tape « intéressé 1 » → vendeur reçoit « Je propose 450 000 FCFA » (vrai montant), pas de carte paiement, pas de second message.
3. Reçoit auto contre-offre vendeur.
4. Tape « OUI » → reçoit « Accord enregistré » + carte paiement + boutons Payer/MTN/Moov (un seul message).
5. Paie → reçoit contact + Google Maps vendeur.

Web chat :
- La phrase « Appuyez sur *Payer* … » n'apparaît plus.
- Sous chaque message d'accord/paiement : carte transaction premium + bouton `💳 Payer maintenant` cliquable.
- Plus de doublon de bulles ou de cartes.

## G. Fichiers impactés

- **Nouveau** : `supabase/functions/_shared/waouh-format.ts`
- `supabase/functions/waouh-webhook/index.ts`
- `supabase/functions/waouh-negotiation-router/index.ts`
- `supabase/functions/waouh-channel-in/index.ts`
- `supabase/functions/waouh-outbound-dispatch/index.ts`
- `supabase/functions/waouh-payment/index.ts` (envoi contact+géoloc post-paiement)
- `src/components/waouh/WaouhWebChat.tsx` (rendu boutons actions + nettoyage texte legacy)
- `src/components/waouh/WaouhTransactionCard.tsx` (UI premium + CTA Payer)

Aucune migration DB nécessaire (les tables `waouh_processed_events`, `waouh_outbound_queue`, `waouh_transactions` existent déjà).
