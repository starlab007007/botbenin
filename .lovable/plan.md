## Objectif

Nettoyer définitivement les messages WAOUH (WhatsApp + web chat) : supprimer toute mention de paiement/escrow/carte WAOUH, retirer les listes numérotées « 1./2./3. » et soigner la mise en forme + l'affichage des photos dans le web chat.

## 1. Supprimer toutes les listes « 1./2./3. » sur WhatsApp

Aujourd'hui, le fallback de `sendWahaButtons` (`supabase/functions/waouh-outbound-dispatch/index.ts`) ré-écrit `1. label\n2. label\n3. label` quand l'envoi de boutons natifs échoue. C'est ce qui produit les listes visibles sur les captures 3, 4 et 5.

Action :
- Dans `sendWahaButtons`, supprimer entièrement le fallback texte « 1. … 2. … 3. … » (lignes ~110-117). Si l'envoi de boutons natifs échoue, on retombe simplement sur `sendWahaText` / `sendWahaImage` avec le texte brut, sans ajouter de liste numérotée.
- Dans `defaultActionsForTemplate`, vider les cas `match_seller`, `negotiation_open` et `match_buyer` (retourner `[]`) pour ne plus jamais joindre de boutons d'action « Accepter / Contre-offre / Refuser » ni « Oui, mettre en contact / Non merci ». Ces actions ne seront plus proposées : le parcours est désormais 100 % conversationnel (OUI / NON / Je propose X).
- Supprimer le cas `payment_card` / `payment_link` (plus utilisés).

## 2. Réécrire les 4 messages-clés (web + WhatsApp)

Tous les textes proviennent de `supabase/functions/waouh-webhook/index.ts` et `supabase/functions/waouh-negotiation-router/index.ts`. Le web chat les ré-affiche tels quels via ReactMarkdown.

### a) « Nouvel acheteur intéressé » (capture 4) — `waouh-webhook/index.ts` ligne ~779
Remplacer par :
```
━━━━━━━━━━━━━━━━━━
📩 *Nouvel acheteur intéressé*
━━━━━━━━━━━━━━━━━━

📦 *{title}*
💰 *Prix demandé* : {fmt(askPrice)}
📏 *à {distKm} km de vous*
🏙️ *Acheteur* : {city}

Répondez *OUI* pour accepter, *NON* pour refuser, ou écrivez *Je propose {prix} FCFA*.

━━━━━━━━━━━━━━━━━━
_✨ WAOUH — Achetez · Vendez · Négociez en confiance_
```
→ Plus de bloc « 1./2./3. ».

### b) « Nouvelle offre acheteur » / « Contre-offre vendeur » (capture 5) — `waouh-webhook/index.ts` ligne ~850
Identique : retirer la liste à puces, garder uniquement la phrase de réponse OUI / NON / Je propose.

### c) « Accord enregistré » / « Le vendeur a accepté » (captures 1 & 2) — `waouh-negotiation-router/index.ts` branche `intent.kind === "yes"`

Réécrire intégralement la synthèse. Plus aucune mention de paiement, escrow, carte WAOUH, Mobile Money, MTN/Moov.

Message envoyé à l'acheteur :
```
━━━━━━━━━━━━━━━━━━
🎉 *Le vendeur a accepté !*
━━━━━━━━━━━━━━━━━━

📦 *{title}*
💰 *Prix final* : {fmt(amount)}

📇 *Contact vendeur*
👤 {seller.display_name}
📞 {seller.phone}
🟢 WhatsApp : {seller.phone}
🏙️ {seller.city} — {quartier si dispo}
📏 *à {distKm} km de vous*

Félicitations 🎊 Vous pouvez maintenant convenir directement de la livraison avec le vendeur.

━━━━━━━━━━━━━━━━━━
_✨ WAOUH — Merci de votre confiance_
```

Message envoyé au vendeur (symétrique) :
```
━━━━━━━━━━━━━━━━━━
🎉 *Accord conclu — Acheteur confirmé*
━━━━━━━━━━━━━━━━━━

📦 *{title}*
💰 *Prix final* : {fmt(amount)}

📇 *Contact acheteur*
👤 {buyer.display_name}
📞 {buyer.phone}
🟢 WhatsApp : {buyer.phone}
🏙️ {buyer.city}
📏 *à {distKm} km de vous*

Félicitations 🎊 Convenez librement de la livraison avec l'acheteur.

━━━━━━━━━━━━━━━━━━
_✨ WAOUH — Merci de votre confiance_
```

Adapter `contactExchangeText` dans `_shared/waouh-format.ts` pour inclure quartier/adresse si présents dans `users.location` (champ JSON) en plus de la ville.

### d) Texte « match_buyer » initial — `waouh-webhook/index.ts` ligne ~523
Retirer la mention « (paiement sécurisé escrow) ». Texte cible :
```
🎯 WAOUH a trouvé pour vous : *{title}* à {prix} ({ville}, à {distKm} km).
Répondez *OUI* pour être mis en relation avec le vendeur.
```

### e) Texte radar vendeur (ligne ~700 + `waouh-radar-process`)
Retirer toute mention « paiement sécurisé escrow / 0 fraude ». Garder : « Répondez OUI pour recevoir les acheteurs et négocier en direct via WAOUH. »

## 3. Nettoyer les helpers legacy de paiement

Dans `supabase/functions/_shared/waouh-format.ts` :
- Supprimer `paymentCard`, `paymentInstructions`, `paymentActions` (plus utilisés une fois 1./2. retirés).
- Garder `stripLegacyPaymentText` et l'appliquer dans `waouh-outbound-dispatch` juste avant l'envoi, pour purger toute trace de carte de paiement qui subsisterait dans la file `waouh_outbound_queue` déjà créée.

## 4. Web chat — photos et mise en forme

Dans `src/components/waouh/WaouhWebChat.tsx` :
- Les attachements sont déjà rendus, mais ils ne s'affichent pas car le webhook insère le message texte avant que `replyAttachments` ne soit propagé sur l'enregistrement `waouh_messages`. Vérifier la branche d'écriture du message « out » dans `waouh-webhook/index.ts` (insert `waouh_messages` final) et y inclure `attachments: replyAttachments` quand non vide (notamment pour les blocs de résultats de recherche et le bloc « Demande envoyée au vendeur »).
- Améliorer la mise en forme Markdown dans `WaouhWebChat.tsx` :
  - `hr` → trait dégradé `bg-gradient-to-r from-transparent via-primary/40 to-transparent`
  - `strong` → `text-foreground font-semibold`
  - `h1`/`h2`/`h3` → titres stylés (taille, weight, color)
  - `ul` → puces vertes (•) avec espacement
  - `em` → couleur muted italique (utilisé par le footer WAOUH)
  - Ajouter le rendu des emojis localisation/contact avec un fond pill discret via un composant `p` custom détectant les lignes commençant par `📞`, `🟢`, `🏙️`, `📏`.
- Pour les résultats de recherche multi-produits, chaque produit est séparé par `━━━━━━━━`. S'assurer que le `ReactMarkdown` reçoit bien `remark-gfm` (vérifier import) pour que les séparateurs s'affichent en `<hr>`.

## 5. Vérifications finales

- Tester un parcours complet en preview : recherche → intéressé 1 → contre-offre → OUI → réception des coordonnées sur les 2 sessions web.
- Vérifier dans les logs `waouh-outbound-dispatch` qu'aucun message sortant ne contient « 1. », « Carte de paiement », « escrow » ou « MTN / Moov ».
- Vérifier sur le web chat que la photo du produit s'affiche dans la bulle « Demande envoyée au vendeur ».

## Détails techniques

- Fichiers modifiés :
  - `supabase/functions/waouh-outbound-dispatch/index.ts` (suppression fallback + actions par défaut)
  - `supabase/functions/waouh-webhook/index.ts` (textes a, b, d, e + insert attachments)
  - `supabase/functions/waouh-negotiation-router/index.ts` (texte c)
  - `supabase/functions/waouh-radar-process/index.ts` (texte e)
  - `supabase/functions/_shared/waouh-format.ts` (cleanup helpers + `contactExchangeText` enrichi)
  - `src/components/waouh/WaouhWebChat.tsx` (markdown components + remark-gfm)
- Aucune migration SQL nécessaire.
- Aucune nouvelle dépendance.
