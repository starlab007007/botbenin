## Diagnostic

À 00:17:25 dans `waouh_messages` :
- L'acheteur (`waouh_users 557f3453`, phone `273091318042723@lid`) a envoyé *"Je propose 200"* → négociation `c1da3c91` créée correctement avec `buyer_user_id=557f...`, `seller_user_id=3a400fa6` (le vendeur "🏪 Parfuns", phone `2290140299191`).
- Le vendeur a répondu *"Je propose 205"* depuis WhatsApp. WAHA a livré le message avec `from = 196705878298786@lid` (LID privacy mode du vendeur). 
- `waouh-channel-in` a créé une 3ᵉ ligne `waouh_users` (`930637cc`, phone = `196705878298786@lid`) car la résolution LID → phone a échoué (pas de `phone_e164` dans `waouh_lid_phone_map`).
- Cette nouvelle `user.id` ≠ `seller_user_id` (`3a400fa6`) de la négociation. Le lookup `or(buyer_user_id.eq.user.id, seller_user_id.eq.user.id)` ne trouve rien → `waouh-negotiation-router` répond **"Aucune négociation en cours"**.

Cas généralisé : dès qu'une partie a plusieurs `waouh_users` rows (App + WA, LID + phone, doublons), la contre-offre tombe à côté de la négociation.

## Correctif

### 1. `supabase/functions/_shared/waouh-identity.ts` (nouveau)

Helper partagé `resolveSiblingUserIds(sb, user)` qui renvoie l'ensemble des `waouh_users.id` qui appartiennent à la même personne que `user` :
- même `auth_user_id` (lien App)
- même `phone_number` exact
- LID ↔ phone via `waouh_lid_phone_map` (résoudre dans les 2 sens : si `user.phone_number` est `<lid>@lid`, chercher la phone canonique, puis tous les waouh_users avec ce phone ; et inversement)
- même `pushname` côté LID seulement si LID + phone partagent une mappage explicite

Retourne `string[]` incluant toujours `user.id`.

### 2. `supabase/functions/waouh-channel-in/index.ts`

- Après l'upsert utilisateur, appeler `resolveSiblingUserIds`.
- Le lookup négociation par `metaArticleId` reste en premier (inchangé).
- Le fallback `or(buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id})` devient :
  `or(buyer_user_id.in.(<ids>),seller_user_id.in.(<ids>))`.
- `negUserId` : si `metaRole` ne donne rien, choisir le sibling id qui correspond à `openNeg.buyer_user_id` ou `openNeg.seller_user_id` (priorité : `seller_user_id` si l'un des siblings = seller, sinon `buyer_user_id`). Transmettre cet id concret à `waouh-negotiation-router` pour que `isBuyer` reste correct.

### 3. `supabase/functions/waouh-negotiation-router/index.ts`

- Avant la requête `waouh_negotiations`, appeler le même helper `resolveSiblingUserIds` et utiliser `or(buyer_user_id.in.(<ids>),seller_user_id.in.(<ids>))`.
- `isBuyer` calculé contre la liste des siblings (`siblings.includes(neg.buyer_user_id)`), pas seulement `user.id`.

### 4. Verrou runtime

Mettre à jour `src/components/waouh/waouhChatSyncLock.ts` (v7) avec deux invariants :
- `channelInUsesSiblingIds` (channel-in contient `resolveSiblingUserIds` + `or` sur `.in.(`)
- `routerUsesSiblingIds` (negotiation-router contient `resolveSiblingUserIds`)

Et `.lovable/mem/features/whatsapp-end-to-end-flow.md` section v7.

### 5. Déploiement & test

Déployer `waouh-channel-in`, `waouh-negotiation-router`.
Re-jouer Scénario B en situation réelle : acheteur WA dit *intéressé*, vendeur App reçoit la notif, vendeur répond *Je propose X* (depuis App ou WA) → la contre-offre est routée vers le bon `waouh_negotiations.id` et propagée à l'acheteur (au lieu de "Aucune négociation en cours").

## Hors-scope (à signaler, non corrigé ici)

Fusion / dédoublonnage des `waouh_users` multi-rows pour la même personne (ré-pointage des FK `waouh_negotiations`, `waouh_messages`, etc.) — sujet plus large à traiter séparément.
