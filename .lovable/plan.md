## Objectif

Garantir que dans **tout message** (recherche, annonce, accord, notification), le contact affiché et destinataire soit le **vrai numéro WhatsApp / téléphone** de la personne — peu importe la source d'origine. Un seul resolver, appliqué partout.

## Les 4 sources à couvrir

| # | Source | Table / champ | Cas d'usage |
|---|--------|---------------|------------|
| 1 | **Radar IA** (scraping web, groupes WhatsApp, Facebook, Marketplace) | `waouh_external_listings.seller_phone` (+ enrichissement IA depuis description) | Annonces externes captées par le radar |
| 2 | **Partenaire** (entreprise enregistrée avant publication produits) | `waouh_partner_businesses.whatsapp` et `.telephone` (liée à `seller_id` via `waouh_articles`) | Vendeurs partenaires bot.bj |
| 3 | **Chat WhatsApp direct** (annonceur/acheteur depuis son propre WhatsApp) | `waouh_users.phone_number` (E.164) ou résolution `waouh_lid_phone_map` si LID | Utilisateurs natifs WhatsApp |
| 4 | **Web bot.bj** (acheteurs/vendeurs connectés) | `waouh_users.auth_user_id` → `auth.users.phone` ; fallback `profiles.phone` | Utilisateurs web authentifiés |

## Architecture proposée

### 1. Resolver unique enrichi : `resolveRealPhoneE164(sb, user, opts?)`

Étendre la fonction existante dans `_shared/waouh-format.ts` pour parcourir les sources dans cet **ordre de priorité** :

```text
1. user.phone_number (si E.164 valide, non-@lid)
2. waouh_lid_phone_map (si @lid)
3. auth.users.phone (si auth_user_id)              [NEW: source web]
4. profiles.phone (via auth_user_id)               [NEW: fallback web]
5. waouh_partner_businesses (via opts.article_id → seller_id) [NEW: source partenaire]
6. waouh_external_listings.seller_phone (via opts.article_id → origin_signal_id) [NEW: source radar]
```

Renvoie `""` si rien — l'appelant affiche alors un fallback "communiquez via WAOUH".

### 2. Signature étendue

```ts
resolveRealPhoneE164(sb, user, {
  article_id?: string,        // pour remonter partenaire ou radar
  fallback_to_partner?: bool, // default true
  fallback_to_radar?: bool,   // default true
})
```

### 3. Points d'appel à mettre à jour

- `waouh-negotiation-router/index.ts` (déjà branché) → passer `article_id` aux 2 appels resolver.
- `waouh-radar-process/index.ts` → quand on notifie un vendeur scrappé, utiliser le resolver avec `article_id` pour récupérer le seller_phone depuis `external_listings`.
- `waouh-channel-in/index.ts` → idem pour enrichir `waouh_users` stub des leads radar (déjà via `ensureWaouhVendorStub`, mais sans seller_phone radar).
- `waouh-webhook/index.ts` (recherche acheteur) → quand on envoie le contact d'un vendeur trouvé, passer par le resolver.

### 4. Job de back-fill (one-shot SQL migration)

Mettre à jour `waouh_users.phone_number` en remontant depuis :
- `waouh_partner_businesses.whatsapp/telephone` (si stub user lié)
- `waouh_external_listings.seller_phone` (pour stubs créés depuis radar)

Cela évite que les anciens accords affichent encore des `@lid` ou numéros vides.

### 5. Centralisation outbound

Dans `waouh-outbound-dispatch/index.ts`, avant tout envoi WhatsApp :
- Si `to_phone` est un `@lid`, le résoudre via le mapping.
- Si introuvable, basculer le message vers le chat web (`channel = "web"`) et logger l'incident dans `waouh_lid_sync_runs` pour relance sync contacts.

## Fichiers modifiés

- `supabase/functions/_shared/waouh-format.ts` (resolver enrichi)
- `supabase/functions/waouh-negotiation-router/index.ts`
- `supabase/functions/waouh-radar-process/index.ts`
- `supabase/functions/waouh-channel-in/index.ts`
- `supabase/functions/waouh-webhook/index.ts`
- `supabase/functions/waouh-outbound-dispatch/index.ts`
- 1 migration SQL : back-fill `waouh_users.phone_number` depuis partenaires + radar.

## Résultat attendu

- Plus jamais de `@lid` ou de "Contact privé" dans les messages "Accord conclu" / "Accord enregistré".
- Les acheteurs/vendeurs reçoivent toujours le **vrai** numéro de l'autre partie + lien `wa.me/`.
- Les notifications partent vers le **bon canal** (WhatsApp si numéro résolu, sinon chat web bot.bj).
- Un seul point de vérité (`resolveRealPhoneE164`) — pas de duplication.

Aucun changement UI requis. Prêt à passer en build après validation.