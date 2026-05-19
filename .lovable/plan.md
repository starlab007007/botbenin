## Objectifs

Nettoyer 4 messages WhatsApp WAOUH (supprimer les listes de boutons fallback / actions inutiles, ajuster les textes) et corriger l'absence de notification vendeur quand l'acheteur dit "intéressé X".

## 1. `✅ Annonce publiée` — supprimer le bloc `1. 🚀 Booster / 2. ✏️ Modifier / 3. ⏸️ Pause`

Fichier : `supabase/functions/waouh-webhook/index.ts` (branche `SELL`, lignes ~320-324).

- Remplacer `returnedActions = [seller_boost, seller_edit, seller_pause]` par `returnedActions = []`.
- Conséquence : plus aucun bouton ni texte numéroté fallback sous le message de confirmation publication.

## 2. `🎯 Top N annonces trouvées` — supprimer les boutons `Choisir n°X` + énumérer le hint

Fichier : `supabase/functions/waouh-webhook/index.ts` (branche `BUY`, lignes ~435-437).

- Supprimer `returnedActions = matchesTop.slice(0,3).map(...)` (mettre `returnedActions = []`).
- Remplacer la phrase :  
  `💡 Pour contacter un vendeur, répondez : *intéressé 1*, *intéressé 2*, … ou proposez un prix.`  
  par une liste dynamique construite à partir de `totalShown` :  
  ```ts
  const interestList = Array.from({length: totalShown}, (_, i) => `intéressé ${i+1}`).join(", ");
  // → "💡 Pour contacter un vendeur, répondez : intéressé 1, intéressé 2, intéressé 3."
  ```

## 3. `✅ Demande envoyée au vendeur` — supprimer bouton Négocier + reformuler

Fichier : `supabase/functions/waouh-webhook/index.ts` (branche `CONFIRM`, lignes ~549-552).

- Supprimer `returnedActions = [{counter:…, "💬 Négocier"}]` → `returnedActions = []`.
- Remplacer la dernière phrase par :  
  `Le vendeur reçoit votre intérêt. Pour proposer un prix différent, écrivez (Exemple : Je propose 450 FCFA).`  
  (texte exemple fixe, plus de prix dynamique pour ce hint).

## 4. Notification vendeur `📩 Nouvel acheteur intéressé` non envoyée

Investigation :  
- Le push vendeur est bien fait dans `waouh-webhook` (lignes ~525-547) via `pushToOther` → `waouh_enqueue_outbound_v2` + fire-and-forget `waouh-outbound-dispatch` (ligne 692).  
- Causes probables :  
  (a) Le bouton WhatsApp `intéressé 1` est intercepté par `waouh-channel-in` puis routé vers `waouh-negotiation-router` parce qu'une négo `proposed/countered` existe déjà — mais le garde `shouldStayInCore` (channel-in ligne 289) attrape bien le mot `intéressé`+digit, donc OK.  
  (b) `nextContext.last_matches` est vide quand le webhook reçoit l'événement bouton (conversation perdue) → branche "Je n'ai plus la liste" → aucun push.

Corrections :  
- Dans `waouh-webhook` (`CONFIRM` branch) : si `last_matches` est vide mais qu'un `current_article_id` ou une `waouh_negotiations` ouverte existe pour cet utilisateur, retomber sur la dernière annonce/négo ouverte et continuer le flux (notification vendeur incluse).  
- Logger explicitement `[interest-push] enqueue ok/ko` autour de l'appel `pushToOther` et autour du `fetch` `waouh-outbound-dispatch` pour confirmer l'envoi en logs Supabase.  
- Vérifier le `dedupe_key` `neg:<id>:new_interest:<seller>` : s'assurer qu'il est `null` (ou ré-utilisable) lors d'un re-test pour ne pas être absorbé par la déduplication.

## 5. `✅ Accord enregistré` — remplacer le bloc `1. 💳 Payer maintenant / 2. MTN / 3. Moov`

Fichier : `supabase/functions/waouh-negotiation-router/index.ts` (lignes 12-16, 134, 136-138, 145).

- Supprimer `paymentActions(...)` (et son utilisation `actions: isBuyer ? paymentActions(txId) : []`) → passer `actions: []` côté acheteur.
- Remplacer le bloc actions par un texte ajouté au message acheteur (et au texte poussé au vendeur quand pertinent) :  
  ```
  Payer maintenant : envoyez « MTN » et votre numéro (ex : MTN 0197000000)
  ou « Moov » et votre numéro (ex : Moov 0195000000),
  puis validez la notification reçue sur votre téléphone.
  ```
- Ajouter cette consigne au `reply` acheteur après `paymentCard(amount, txId)` ainsi qu'au `txt` ciblé acheteur dans `pushToOther`.

## Détails techniques

```text
waouh-webhook/index.ts
  ├─ SELL : returnedActions=[]  (supprime boutons publication)
  ├─ BUY  : returnedActions=[]  + hint = "intéressé 1, …, intéressé N" dynamique
  └─ CONFIRM :
       ├─ fallback si last_matches vide → réutiliser current_article_id / négo ouverte
       ├─ returnedActions=[]
       ├─ reply final reformulé "(Exemple : Je propose 450 FCFA)"
       └─ logs autour de pushToOther + dispatch

waouh-negotiation-router/index.ts
  └─ branche intent.kind === "yes" :
       ├─ supprime paymentActions du response acheteur + push vendeur
       └─ ajoute texte instruction MTN/Moov au reply et au push
```

Aucun changement de schéma DB. Aucune modification d'autres edge functions. Les `paymentActions` dans `_shared/waouh-format.ts` restent (non utilisés ici) — pas de cleanup automatique nécessaire.

## Vérification

1. Publier une annonce via WhatsApp → confirmer une seule bulle, sans `1./2./3.` final.  
2. `Je cherche …` avec 3 résultats → vérifier hint `intéressé 1, intéressé 2, intéressé 3.` et pas de boutons "Choisir n°X".  
3. Répondre `intéressé 2` → vérifier (a) acheteur reçoit message reformulé avec exemple 450 FCFA, (b) vendeur reçoit `📩 Nouvel acheteur intéressé` (logs `waouh-outbound-dispatch`).  
4. Côté vendeur, accepter → vérifier message "✅ Accord enregistré" se termine par les instructions MTN/Moov en texte (sans liste numérotée).
