
## Diagnostic — Scénario B (Vendeur App + Acheteur WA)

### Bug 1 — "📩 Nouvel acheteur intéressé" reçu 2 fois côté vendeur

Trace dans `waouh_outbound_queue` (run 23:14:55) : 7 messages `match_seller` envoyés pour la **même** négociation, dont **2 vers des numéros WhatsApp distincts** du même vendeur :
- `2290165653468`
- `22940299191`

Origine dans `waouh-webhook/index.ts` :
1. `resolveVendorContacts` (l. 43-94) collecte **tous** les numéros disponibles (`vendeur_whatsapp`, `vendeur_phone`, `contact_phone`, `vendeur_mobile_money`, `business.whatsapp`, `business.telephone`, `business.mobile_money_number`, `partner.whatsapp`, `partner.telephone`, `partner.mobile_money_number`) et les renvoie tous dans `phones[]` — c'était intentionnel ("On enverra la notif à CHAQUE numéro distinct").
2. `phonesToPush = [sellerCanon, ...vendorContacts.phones]` (l. 968) — sellerCanon vient de `waouh_users.phone_number`, qui dans le cas B est **différent** du `vendeur_whatsapp` saisi sur le catalogue/business.
3. La boucle `for (const extraPhone of phonesToPush.slice(1))` (l. 995-1012) ré-enqueue le même texte sur chaque numéro additionnel sans aucune corrélation à l'identité réelle du vendeur.

→ Un vendeur App qui a, en plus, un partner/business attaché (cas zara du test) reçoit **N notifications** au lieu d'une. Et dans B pur (Vendeur App sans business), si l'utilisateur a saisi son numéro à la fois dans `auth.users.phone` et dans `waouh_users.phone_number` + un `contact_whatsapp` sur l'article, on retombe sur le même problème.

Le dedupe key `match:${neg.id}:${pickSource}` ne joue pas car la queue dédupe par `dedupe_key` **et** par destinataire — donc 2 phones différents = 2 entrées admises.

### Bug 2 — "🤔 Aucune négociation en cours" quand l'acheteur propose un prix

Cause principale : dans `waouh-webhook` ligne 1069-1078, le lookup `NEGOTIATE` filtre uniquement par `user.id` et par `state in (proposed,countered)`, **sans aucun filtre `article_id`**.

Mais en scénario B, le pick d'article est issu de `waouh_unified_catalog` (partner). Le `pick.id` passé à `waouh_negotiations.article_id` est donc **un id de catalog**, pas un id `waouh_articles`. Conséquences :
- soit l'INSERT (l. 958) tombe en violation FK et la négo n'existe pas (→ "Aucune négociation"),
- soit elle est insérée avec un `article_id` qui pointe vers un row supprimé/incohérent, et la promotion catalog→article ultérieure (faite par `waouh-notify-dispatch`) crée un **nouveau** `waouh_articles.id` sans relier la négo existante.

Dans les deux cas, à l'offre suivante, soit aucune négo n'est trouvée, soit on en trouve une mais elle n'est plus rattachable à l'article promu — d'où la réponse "Aucune négociation".

Le scénario A fonctionne car le pick vient directement de `waouh_articles` (id valide). Idem pour A3 (radar) car la promotion est faite **avant** l'INSERT négo (l. 102-145 dans `promoteRadarSeller`).

### Bug 2 bis — Effet de bord côté vendeur App

Même quand la négo est créée correctement, le seller_user_id est `pick.seller_id`. Pour un catalog partner non promu, `pick.seller_id` n'existe pas → `seller_user_id = null` → quand le vendeur App répondra ensuite OUI/NON depuis l'app, le router ne pourra pas retrouver la négo via `seller_user_id.eq.<App user>`.

---

## Plan de correction

### 1. Promotion catalog→article AVANT l'insertion de la négociation (corrige Bug 2 & 2 bis)

Dans `supabase/functions/waouh-webhook/index.ts`, dans le bloc `intent.intent === "BUY_INTEREST"` (autour des lignes 920-965, juste après `pick` est résolu, avant `await sb.from("waouh_negotiations").insert(...)`) :

- Si `pick` provient de `waouh_unified_catalog` (détectable via la table d'origine ou un flag posé par la search), appeler `promoteCatalogToArticle(sb, pick.id)` pour obtenir le vrai `article_id` et l'éventuel `seller_id` du partner.
- Remplacer `article_id: pick.id` par `article_id: promoted_article_id` dans l'insert négo.
- Mettre à jour `pick = { ...pick, id: promoted_article_id, seller_id: promoted_seller_id ?? pick.seller_id }` pour que les blocs suivants (notif vendeur, pushToOther) utilisent le bon id.
- Garde-fou : si la promotion échoue, renvoyer un reply explicite (`"Cet article ne peut pas être négocié pour l'instant"`) au lieu de créer une négo orpheline.

### 2. Dédup intelligent côté vendeur (corrige Bug 1)

Dans `supabase/functions/waouh-webhook/index.ts` `resolveVendorContacts` (l. 43-94) :

- Au lieu de retourner **tous** les numéros, regrouper par "identité destinataire" : si plusieurs `waouh_users` partagent le même `auth_user_id` (ou si plusieurs phones se résolvent au même `waouh_users.id`), ne garder qu'**un seul** numéro de notification (priorité : `whatsapp` business > seller phone > partner phone).
- Ajouter un mode strict `singleRecipient = true` quand le vendeur a un `seller_id` (cas C2C/App) : ne renvoyer qu'**un** numéro (le canonical du `waouh_users.phone_number` du seller).
- Conserver l'ancien comportement multi-numéros uniquement pour les vendeurs partner **sans** compte WAOUH attaché (vendeur invité pur).

Et dans le bloc d'envoi (l. 968-1012) :
- Avant `enqueue` sur chaque `extraPhone`, vérifier que `resolveWaouhUserByPhone(sb, extraPhone)` ne renvoie pas le même `waouh_users.id` déjà notifié → si oui, skip.
- Ajouter au `dedupe_key` la composante `seller_user_id` au lieu de seulement `neg.id` : `match:${neg.id}:${sellerUserId ?? "anon"}:${pickSource}` — pour bloquer les rebonds en cas d'appels concurrents.

### 3. Verrou runtime v6

Mettre à jour `src/components/waouh/waouhChatSyncLock.ts` (version `v6`) et `src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` avec 2 nouveaux invariants :
- `webhookPromotesCatalogBeforeNegotiation` : `waouh-webhook/index.ts` doit contenir `promoteCatalogToArticle` juste avant l'INSERT `waouh_negotiations` du flow BUY_INTEREST.
- `vendorContactsSingleRecipient` : `waouh-webhook/index.ts` `resolveVendorContacts` doit contenir le pattern de dédup par `waouh_users.id`.

### 4. Mémoire & docs

Mettre à jour `.lovable/mem/features/whatsapp-end-to-end-flow.md` → v6, section "Verrou idempotence vendeur partner/App" + section "Promotion catalog→négociation atomique".

### 5. Validation

- Test E2E réel scenario **B × (Chat, Partenaire, Radar)** : vérifier dans `waouh_outbound_queue` qu'il n'y a **qu'un seul** `match_seller` envoyé par négociation (sauf vendeurs invités multi-phones).
- Envoyer manuellement "intéressé 1" puis "je propose 400" depuis l'acheteur WA → l'acheteur doit recevoir `💬 Offre transmise`, le vendeur App doit recevoir le contre-offre dans `WaouhMatchChatWindow`.
- Vérifier que le test lock `waouh-chat-sync-flow.lock.test.ts` passe.

---

## Fichiers modifiés

- `supabase/functions/waouh-webhook/index.ts` — promotion catalog avant négo + dédup vendeur.
- `src/components/waouh/waouhChatSyncLock.ts` — invariants v6.
- `src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` — nouveaux checks.
- `.lovable/mem/features/whatsapp-end-to-end-flow.md` — v6.
