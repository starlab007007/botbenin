# Activer le scénario B (et tous les flux WAOUH) directement depuis l'App

## Diagnostic

Le scénario B en condition WhatsApp fonctionne grâce aux verrous v6/v7/v8 (sibling resolver + fallback queue→identité). Mais quand le **vendeur App** (ou l'acheteur App côté C) tente une contre-offre / acceptation depuis l'interface in-app (`WaouhMatchChatWindow`), le message est envoyé à `waouh-channel-in` avec :

```ts
// src/components/waouh/WaouhMatchChatWindow.tsx — ligne 436
authUserId: null,
```

Conséquences en cascade :

1. `waouh-channel-in` (lignes 336-351) crée/réutilise un `waouh_users` indexé seulement par `web_session_id` — **sans** `auth_user_id`.
2. La négociation existante (créée par le webhook ou par `WaouhWebChat` qui passe `user?.id`) référence un `seller_user_id` **lié au compte App** (`auth_user_id` présent).
3. `resolveSiblingUserIds` (v7) ne retrouve pas le lien : pas d'`auth_user_id`, pas de `phone_number`, pas de LID. Il retourne uniquement l'id web isolé.
4. La lookup négo `siblingOrFilter(...)` échoue → router répond "🤔 Aucune négociation en cours" et le chat App reste muet.

À titre de comparaison, `WaouhWebChat.tsx` (chat racine) passe correctement `authUserId: user?.id` ligne 423 — c'est pour ça que les premières propositions marchent, mais pas les suivantes via la fenêtre match.

## Plan

### 1. Frontend (changement minimal, 1 ligne effective)

`src/components/waouh/WaouhMatchChatWindow.tsx` — méthode `send()` (~ligne 430)

- Remplacer `authUserId: null` par `authUserId: authUserId ?? null` (le prop est déjà reçu et utilisé pour `fetchHistory`).

Aucun autre changement nécessaire : `waouh-channel-in` détecte déjà (lignes 347-348) qu'une ligne web sans `auth_user_id` doit être enrichie quand `authUserId` arrive, et `resolveSiblingUserIds` exploite ensuite tous les `waouh_users.id` partageant le même `auth_user_id`.

### 2. Verrou runtime

`src/components/waouh/waouhChatSyncLock.ts` — bump **v8 → v9** et ajouter dans le bloc `chatWindow.mustContain` :

```
"authUserId: authUserId ?? null,"
```
(remplace l'invariant existant `authUserId: authUserId ?? null` qui ne couvrait que `fetchHistory` ; on dédouble en `mustContainAll` n'est pas supporté, donc on ajoute un nouvel invariant `chatWindowSendUsesAuthUserId` pointant sur le contexte `supabase.functions.invoke("waouh-channel-in"` + `authUserId: authUserId ?? null` dans la même section `send`).

Mettre à jour le test `waouh-chat-sync-flow.lock.test.ts` (`expect(... version).toBe("v9")`).

### 3. Mémoire

Ajouter une section v9 à `.lovable/mem/features/whatsapp-end-to-end-flow.md` :
- Bug : flux B/C in-app silencieux car `authUserId` non transmis dans le send de la fenêtre match.
- Fix : propagation systématique de `authUserId` dans tous les appels à `waouh-channel-in`.
- Règle invariante : **toute invocation client de `waouh-channel-in` doit transmettre `authUserId` quand l'utilisateur est authentifié**.

### 4. Vérification

1. Exécuter `bunx vitest run src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` (doit rester vert avec v9 + nouvel invariant).
2. Tester manuellement (preview) : ouvrir scénario B depuis l'App, envoyer une contre-offre vendeur → le routeur doit la traiter et la mirrorer côté acheteur WA, sans "Aucune négociation en cours".
3. Vérifier `waouh-negotiation-router` logs : la négo doit être trouvée via siblings App.

## Risque / portée

- Changement purement frontend, 1 ligne fonctionnelle + invariants/mémoire.
- Aucun edge function redeploy, aucune migration DB.
- Backwards-compatible : `authUserId` reste `null` quand l'utilisateur n'est pas authentifié (mobile non logué) — comportement actuel préservé.
