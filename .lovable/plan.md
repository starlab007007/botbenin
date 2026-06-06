# Fix : "intéressé N" interprété comme nouvelle recherche

## Diagnostic confirmé via logs

Trace réelle de la conversation `35fb557e…` :

```
08:03:58  IN  "Je cherche briquet"     → BUY (1 résultat : BRIQUET)
08:04:20  IN  "Interressé 1"           → BUY (Top 5 partenaires !)
```

La regex actuelle dans `supabase/functions/waouh-webhook/index.ts` (ligne 280-282) :

```ts
const numMatch     = lower.match(/(?:n[°o]?\s*|#)(\d+)/i)
                  || lower.match(/(?:int[ée]ress[ée]|interesse|choix|article)\s*(\d+)/i);
const interestedKw = /(int[ée]ress[ée]|je veux|je prends|d'accord|ok\b|oui\b|acheter|contacte|contact)/i.test(lower);
```

Le motif `int[ée]ress[ée]` n'accepte **qu'un seul `r`** et **un seul `s`**. Donc :
- ❌ "Interressé" (double r — faute fréquente)
- ❌ "interesé" (un seul s)
- ❌ "interressee"

…tombent dans le fallback IA, qui retourne `BUY` et relance une recherche avec le texte brut → une autre liste de produits s'affiche.

Le flux côté notification est, lui, déjà correct : quand `CONFIRM` se déclenche, `last_matches[article_index-1]` cible bien le bon produit et seul son vendeur est notifié (anti self-notification + dedupe par `new_buyer:article:seller:buyer:jour`).

## Correctifs

### 1. Regex tolérante aux variantes

Dans `supabase/functions/waouh-webhook/index.ts`, remplacer le bloc de détection (≈ lignes 280-282) par :

```ts
// Tolérant : intéressé / interesse / interressé / interesé / interrese …
const INTEREST_RE = /\bint[eé]r{1,2}[eé]ss?[eé]?[se]?\b/i;
const interestedKw = INTEREST_RE.test(lower)
  || /\b(je\s+veux|je\s+prends|d'accord|ok\b|oui\b|acheter|contacte|contact)\b/i.test(lower);

// Numéro associé : #1, n°1, intéressé 1, choix 1, article 1, ou nombre seul après mot d'intérêt
const numFromMarker   = lower.match(/(?:n[°o]\s*|#)(\d{1,2})/i);
const numFromInterest = INTEREST_RE.test(lower)
  ? lower.match(/\b(\d{1,2})\b/)
  : null;
const numFromChoice   = lower.match(/(?:choix|article)\s*(\d{1,2})/i);
const numMatch = numFromMarker || numFromInterest || numFromChoice;
```

Et l'attribution d'intent (ligne 310-311) :

```ts
if (numMatch && interestedKw) {
  intent = { intent: "CONFIRM", article_index: parseInt(numMatch[1], 10) };
} else if (INTEREST_RE.test(lower)) {
  // "intéressé" seul, sans numéro → on prend le 1er
  intent = { intent: "CONFIRM", article_index: 1 };
}
```

(Le `literalInterest` actuel — `intéressé n°x` — n'est plus utile, supprimé.)

### 2. Garde-fou : nombre seul comme confirmation contextuelle

Quand le dernier `last_intent` enregistré est `BUY` et que `last_matches` n'est pas vide, accepter un simple `"1"`, `"2"`… comme `CONFIRM` (juste après la liste de résultats). À ajouter juste après le bloc précédent, avant le fallback IA :

```ts
if (!intent.intent) {
  const digitsOnly = lower.trim().match(/^(\d{1,2})$/);
  const prevBuy = (conv?.last_intent === "BUY")
    && Array.isArray((conv?.context as any)?.last_matches)
    && (conv?.context as any).last_matches.length > 0;
  if (digitsOnly && prevBuy) {
    intent = { intent: "CONFIRM", article_index: parseInt(digitsOnly[1], 10) };
  }
}
```

Remarque : `conv` est aujourd'hui chargé *après* la détection d'intent ; il faut donc déplacer le `select` de `waouh_conversations` (≈ ligne 324) **avant** ce bloc, ou faire une seconde évaluation après son chargement. Choix retenu : remonter le chargement de la conversation juste après l'upsert utilisateur.

### 3. Audit notifications (vérification, pas de changement)

Confirmer (via log temporaire dans la branche CONFIRM) que pour `"intéressé 2"` on a bien :
- `pick.id === last_matches[1].id`
- `vendorContacts.phone` ciblé = vendeur du produit 2 uniquement
- `waouh_notifications` insert avec `recipient='seller'` et `user_id = pick.seller_id`

Si la trace est propre, aucune correction supplémentaire. Sinon on adressera dans un sprint dédié.

## Fichier touché

- `supabase/functions/waouh-webhook/index.ts` — détection d'intent CONFIRM (tolérance typo + nombre seul contextuel)

## Validation

1. Tester via le chat web :
   - `Je cherche briquet` → liste
   - `Interressé 1` (double r) → ✅ doit afficher "Demande envoyée au vendeur" pour BRIQUET
   - `1` seul → ✅ même comportement
   - `intéressé 2` → produit 2 uniquement
2. Vérifier `waouh_notifications` : une seule ligne `new_buyer` pour le `seller_id` du produit choisi.
