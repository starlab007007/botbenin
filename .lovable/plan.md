# Diagnostic — pourquoi "📩 Nouvel acheteur intéressé" n'ouvre pas une nouvelle fenêtre

## Test / lecture du flux

1. Le webhook `waouh-buyer-interest` propage bien `counterpart_user_id` (= buyer_user_id) à `waouh-notify-dispatch` (vérifié).
2. `waouh-notify-dispatch` insère une notification `new_buyer` avec `payload.counterpart_user_id` distinct par acheteur, et un `dedupe_key` qui inclut le counterpart (lock v12) → 2 acheteurs ⇒ 2 lignes en base. OK côté backend.
3. Côté UI, le contrat v12 (`matchKey`) impose côté vendeur : `art_<id>_seller_<counterpart>` → **une fenêtre par (article, acheteur)**.
4. `useWaouhMatchChats.openMatchFromDetail` respecte ce contrat (ligne 319 : `matchKey(articleId, role, counterpartForKey)`).
5. `notificationActions.openNotificationTarget` et `WaouhNotificationsBell` passent bien `counterpart_user_id` dans le `detail` de l'évènement `waouh:open-match-chat`. OK.

## Bug identifié — `src/components/waouh/WaouhMatchChatList.tsx`

Trois appels à `matchKey` y **oublient** le 3ᵉ argument `counterpart_user_id` :

- ligne 137 (agrégation des notifications) : `const ck = matchKey(articleId, role)`
- ligne 199 (stub fallback messages) : `matchKey(articleId, info.role)`
- lignes 343-345 (canonical pour le buffer pending-open + dédupe)

Conséquence : toutes les notifications "Nouvel acheteur intéressé" du même article sont fusionnées dans **une seule ligne** de la liste (clé `art_<id>_seller_any`). La dernière notification gagne (lignes 140-156), donc seules les méta du dernier acheteur sont affichées ; les acheteurs précédents disparaissent visuellement et il devient impossible d'ouvrir une fenêtre par acheteur depuis la liste. De plus, le buffer `waouh_pending_open` (ligne 344) déduplique sur la clé sans counterpart, ce qui collapse plusieurs intents de clic en un seul.

Il n'y a pas d'auto-ouverture sur réception (intentionnel : `useWaouhMatchNotifications` ligne 403). L'ouverture passe forcément par la liste ou la cloche — donc le bug de clé bloque tout le scénario seller multi-acheteurs.

Le flux **interne** de la nouvelle `WaouhMatchChatWindow` est correct de bout en bout (filtre realtime counterpart, `waouh-match-history` filtré server-side par `counterpartUserId`, lock v12). Aucune modification à apporter à `WaouhMatchChatWindow.tsx`.

## Correction proposée

Modifier uniquement `src/components/waouh/WaouhMatchChatList.tsx` :

1. **Ligne 137** — calculer la clé en passant le counterpart pour les rôles seller :
   ```ts
   const cp = n.payload?.counterpart_user_id ?? n.payload?.buyer_user_id ?? null;
   const ck = matchKey(articleId, role, role === "seller" ? cp : null);
   ```
   Conserver l'agrégation par clé (donc une ligne par couple (article, buyer) côté seller, comportement v12).

2. **Ligne 199** — stub fallback : extraire le counterpart depuis `m.meta.counterpart_user_id ?? m.user_id` (pour le rôle seller) et l'inclure dans `matchKey`.

3. **Lignes 343-345** — utiliser `matchKey(item.article_id, item.role, item.role === "seller" ? item.counterpart_user_id : null)` pour le filtrage du buffer pending-open, afin que chaque intent par acheteur reste distinct.

4. **Affichage** — ajouter (s'il n'existe pas déjà) une sous-ligne avec un identifiant lisible de l'acheteur (téléphone court ou `buyer_profile_id` tronqué) sur les items `role === "seller"`, pour que le vendeur distingue visuellement 2 acheteurs sur la même annonce.

5. **Realtime list** — vérifier que le listener Supabase qui recharge la liste sur INSERT `waouh_notifications` n'utilise pas non plus une clé tronquée (à corriger si présent dans le même fichier).

## Vérification

- Ajouter au lock test (`waouh-chat-sync-flow.lock.test.ts`) un invariant `matchChatListCounterpartKey` qui interdit dans `WaouhMatchChatList.tsx` les patterns `matchKey(.*, role)` / `matchKey(.*, "seller")` sans 3ᵉ argument.
- Lancer `bunx vitest run src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` (78/78 attendus + 1 nouvel invariant).
- Reproduction manuelle : 2 acheteurs envoient `OUI` sur la même annonce → 2 cartes distinctes dans la liste vendeur → clic sur chacune → 2 `WaouhMatchChatWindow` ouvertes en parallèle, chacune avec son historique filtré sur son counterpart.

## Fichiers touchés

- `src/components/waouh/WaouhMatchChatList.tsx` (~10 lignes)
- `src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` (nouvel invariant)
- `.lovable/mem/features/waouh-chat-sync-flow-locked-v12.md` (note v12.1 sur le fix liste)

Aucun changement côté edge functions, schéma BDD, ou `WaouhMatchChatWindow.tsx`.
