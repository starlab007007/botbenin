## Objectif

Dans chaque fenêtre `WaouhMatchChatWindow` (capture 1), supprimer le bloc "simple" actuel (capture 2 : "🛒 Nouvel acheteur intéressé par votre annonce ! / 📦 test007 / 💰 1 FCFA · Cotonou / Répondez CONTACT pour échanger.") et le remplacer par **exactement** le même message riche que WAOUH envoie sur WhatsApp (capture 3 : en‑tête `📩 Nouvel acheteur intéressé`, ligne `📦 *titre*`, `💰 *Prix demandé* : … FCFA`, `📏 à X m/km de vous`, `🏙️ Acheteur : ville`, instructions `OUI / NON / Je propose …`, pied `✨ WAOUH — Achetez · Vendez · Négociez en confiance`).

Même principe, en miroir, pour les notifications "🎯 Annonce trouvée" côté acheteur.

La règle doit être généralisée et automatique : toute nouvelle notification de type `new_buyer` ou `match` doit produire ce texte unifié pour les deux canaux (WhatsApp + carte in‑app) sans aucune divergence.

## Où ça se joue

- `supabase/functions/waouh-notify-dispatch/index.ts` — fonction `buildText(...)` qui génère aujourd'hui la version courte (`🛒 Nouvel acheteur intéressé par votre annonce ! …`). C'est ce texte qui est stocké dans `waouh_notifications.payload.text` puis affiché dans le chat.
- `supabase/functions/_shared/waouh-format.ts` — expose déjà `waouhHeader`, `waouhFooter`, `formatDistance`, `distanceKm` (utilisés par `waouh-webhook`).
- `supabase/functions/waouh-webhook/index.ts:838` — référence canonique du format riche vendeur ("📩 Nouvel acheteur intéressé"). À reprendre à l'identique.
- `src/components/waouh/WaouhMatchChatWindow.tsx` — déjà capable d'afficher `seedNotif.text` en `whitespace-pre-wrap` (rien à changer si le texte stocké est déjà le bon).

## Plan d'implémentation

1. **`waouh-format.ts` — nouveau helper partagé**
   Ajouter deux fonctions pures qui centralisent les templates exacts utilisés par `waouh-webhook` :
   - `buildSellerNewBuyerText({ article, buyerCity, distanceKmValue })` → bloc "📩 Nouvel acheteur intéressé" avec header/footer WAOUH, prix demandé formaté FR (`toLocaleString("fr-FR")` + ` FCFA`), distance via `formatDistance(distanceKm(...))`, ville acheteur, ligne `Répondez *OUI* pour accepter, *NON* pour refuser, ou écrivez *Je propose <prix*0.9>* pour contre-offrir.`
   - `buildBuyerMatchText({ article, buyerCity, distanceKmValue })` → bloc "🎯 Annonce trouvée" symétrique avec header/footer, prix, distance, ligne `Répondez *OUI* pour être mis en relation, *NON* pour ignorer, ou écrivez *Je propose XXX FCFA* pour négocier.`

   Ces helpers seront la **seule** source du wording.

2. **`waouh-notify-dispatch/index.ts` — utiliser les helpers**
   - Importer `buildSellerNewBuyerText`, `buildBuyerMatchText` depuis `../_shared/waouh-format.ts`.
   - Récupérer la ville acheteur (`buyerProfile?.city`) et calculer la distance via `distanceKm(article.lat, article.lng, buyerProfile?.lat, buyerProfile?.lng)` quand les coords existent (best‑effort, `null` sinon → pas de ligne distance).
   - Remplacer dans `buildText(...)` :
     - `kind === "new_buyer" && recipient === "seller"` → `buildSellerNewBuyerText(...)`.
     - `kind === "match" && recipient === "buyer"` → `buildBuyerMatchText(...)`.
   - Les autres branches (`sale_published`, fallback) restent inchangées.
   - Conserver `extra_text` comme override prioritaire (déjà géré).

3. **Aligner `waouh-webhook/index.ts`** (optionnel mais recommandé pour éviter la double source)
   - Remplacer la construction inline du `sellerText` ligne 838 par un appel à `buildSellerNewBuyerText(...)`. Idem si un endroit équivalent existe pour l'acheteur. Aucun changement fonctionnel, juste suppression du duplicat.

4. **Aucun changement front**
   `WaouhMatchChatWindow` lit déjà `payload.text` et l'affiche en `whitespace-pre-wrap` dans une bulle pinned. Dès que le dispatcher écrit le texte riche, le chat l'affiche tel quel — identique à WhatsApp.

## Critères d'acceptation

- Sous la carte verte WAOUH dans une fenêtre de match (vendeur), la 2ᵉ bulle est strictement le bloc :
  ```
  ━━━━━━━━━━━━━━━━━━
  📩 Nouvel acheteur intéressé
  ━━━━━━━━━━━━━━━━━━

  📦 *test007*
  💰 *Prix demandé* : 1 FCFA
  📏 *à 0 m de vous*           (seulement si distance dispo)
  🏙️ *Acheteur* : Cotonou

  Répondez *OUI* pour accepter, *NON* pour refuser, ou écrivez *Je propose 1 FCFA* pour contre-offrir.

  ━━━━━━━━━━━━━━━━━━
  _✨ WAOUH — Achetez · Vendez · Négociez en confiance_
  ```
- Côté acheteur, équivalent "🎯 Annonce trouvée".
- L'ancien texte court (`🛒 Nouvel acheteur intéressé par votre annonce ! … Répondez CONTACT pour échanger.`) n'apparaît plus nulle part (chat web, push, WhatsApp).
- Mécanisme générique : toute nouvelle insertion dans `waouh_notifications` faite via `waouh-notify-dispatch` utilise automatiquement le format unifié, sans patch côté UI.
- Pas de doublon : le `dedupe_key` actuel par `(kind, article, user, recipient, day)` reste inchangé.

## Détails techniques

- Les helpers vivent dans `_shared/waouh-format.ts` pour être consommés par toutes les edge functions (`waouh-notify-dispatch`, `waouh-webhook`, et toute future fonction).
- Le formatage prix utilise `Number(price).toLocaleString("fr-FR")` + ` FCFA` (cohérent avec `waouh-webhook`).
- La distance est optionnelle : si `distanceKm(...)` renvoie `null`, on omet la ligne `📏`.
- Le contre-prix par défaut côté vendeur reste `Math.round(askPrice * 0.9)` (parité avec `waouh-webhook:838`).
- Aucun changement de schéma DB ; on continue d'écrire `payload.text` (lu par le front).
