## Diagnostic

Root cause principal du bug rapporté (capture APK) : la porte d'entrée de publication SELL dans `waouh-webhook` exige `confidence >= 0.3` retourné par Gemini. Pour des produits locaux/de niche (« Mixa », « Kpakpato », marques peu connues), l'IA renvoie souvent une confidence basse même quand le message est parfaitement structuré (titre + prix + ville présents). Résultat : le bot répond « 🤔 Je n'ai pas tous les détails » et rien n'est publié → toute recherche postérieure (« je cherche mixa ») renvoie logiquement « aucune annonce trouvée ».

Le moteur de recherche BUY, lui, est fonctionnel : `expandKeywordVariants` couvre déjà accents/pluriels et le tokenizer de secours attrape « mixa ». Il ne reçoit simplement jamais d'article car la publication échoue en amont.

## Plan de correction

1. **Assouplir la porte SELL dans `supabase/functions/waouh-webhook/index.ts` (lignes ~730-735)**
   - Supprimer le seuil `confidence >= 0.3` (peu fiable).
   - Publier dès qu'on a `inferredPrice` (extrait par l'IA ou par la regex `\d{2,}(?:[ .]\d{3})*\s*(fcfa|cfa|xof|f)?`) **et** un titre exploitable (`product.title` ou `fallbackTitle`).
   - Message d'erreur ciblé selon ce qui manque (prix absent vs. produit absent) au lieu du message générique.

2. **Redéployer `waouh-webhook`** immédiatement pour appliquer le fix en prod.

3. **Test E2E de bout en bout** dans l'APK / WaouhWebChat :
   - Envoyer `Je vends: Mixa, Prix 200 FCFA Ville: Abomey-Calavi Quartier: Kpota` → doit répondre `✅ Annonce publiée`.
   - Envoyer `je cherche mixa` depuis un autre compte / session → doit lister l'annonce.
   - Vérifier les logs `waouh-webhook` (intent=SELL puis intent=BUY, kws=["mixa"], match trouvé).

4. **Aucun autre changement fonctionnel** : la logique de recherche, radar, négociation, dispatch reste intacte. Seule la porte d'acceptation SELL est modifiée.

## Détail technique du patch

```ts
// waouh-webhook/index.ts (~L730)
const fallbackTitle = String(text || "")
  .replace(/^\s*je\s+vends?\s*:?\s*/i, "")
  .split(/[,\n]/)[0]?.trim().slice(0, 60) || "Annonce";
const resolvedTitle = (product.title && String(product.title).trim()) || fallbackTitle;
const accepted = !!inferredPrice && !!resolvedTitle;
if (!accepted) {
  reply = !inferredPrice
    ? "🤔 Il me manque le prix. Ex : *Je vends iPhone 12 à 120000 FCFA*."
    : "🤔 Je n'ai pas compris le produit. Précisez son nom.";
} else {
  // ...insertion inchangée dans waouh_articles avec resolvedTitle
}
```

Le reste de la branche SELL (insertion `waouh_articles`, `waouh-notify-buyers`, dispatch Radar) est déjà en place et fonctionnel — il suffit de laisser passer les cas légitimes.

Passe en mode build pour que j'applique et redéploie.