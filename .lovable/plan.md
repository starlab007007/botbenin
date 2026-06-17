# Stabilisation de `WaouhMatchChatWindow` (historique & affichage)

Objectif : éliminer le spinner « Chargement… » qui reste collé, le clignotement de l'historique, et les pertes de messages Realtime au premier render.

## Modifications (frontend uniquement, aucun changement métier ni RLS)

### Fichier `src/components/waouh/WaouhMatchChatWindow.tsx`

1. **Fusionner les deux effets de chargement initial en un seul**, déclenché sur `[match.article_id, match.notification_id, match.seed_text, sessionId, authUserId, active]`. Garder un `requestIdleCallback` au premier passage uniquement ; pour les passages suivants (changement de `active`), faire un fetch direct.

2. **Remplacer la throttle temporelle (`lastFetchRef = Date.now()`) par un verrou in-flight** (`inFlightRef = boolean`). Tout chemin du `runInitialLoad` — y compris l'avortement — doit passer par un `finally { setInitialLoading(false); inFlightRef.current = false; }`. Plus de spinner collé.

3. **Distinguer chargement initial (`initialLoading`) et reconcile en arrière-plan**. Quand un cache existe (`getCached(match.key).length > 0`), ne jamais passer `initialLoading` à `true` lors d'un refetch — juste mettre à jour `syncedAt`/`dbMsgCount` en silence.

4. **Sortir `setCached` de l'updater React**. Le déplacer dans un `useEffect` dédié `useEffect(() => { setCached?.(match.key, messages); }, [messages, match.key])`. Élimine la double-écriture en StrictMode.

5. **Calculer `dbMsgCount` et `hasMore` sur le résultat fusionné**, pas sur `res.messages.length` brut :
   ```ts
   setMessages((prev) => {
     const next = mergeMsgs(prev, res.messages);
     setDbMsgCount(next.length);
     return next;
   });
   // hasMore : ne baisser à false que si la page réponse est < limit
   if (res.messages.length < PAGE_INITIAL) setHasMore(false);
   else setHasMore(res.hasMore);
   ```

6. **Stabiliser l'abonnement Realtime** : attendre que `waouhIds` soit résolu avant de monter le canal. Garde de sortie en début d'effet :
   ```ts
   if (!match.article_id) return;
   // Attendre la résolution de waouhIds (au moins un tick) pour éviter
   // de monter un canal "vide" puis le détruire dès que les ids arrivent.
   if (authUserId && waouhIds.length === 0) return;
   ```
   Le canal se monte alors une seule fois avec la liste complète de filtres `user_id`.

7. **Réinitialiser `restoredRef` et `prevLenRef`** sur changement de `match.key` :
   ```ts
   useEffect(() => {
     restoredRef.current = false;
     prevLenRef.current = 0;
   }, [match.key]);
   ```

8. **Toast discret en cas d'échec `fetchHistory`** (au lieu de `console.warn` muet) pour que l'utilisateur sache pourquoi l'historique est vide après un sync raté.

## Hors-périmètre

- Aucun changement à `useWaouhMatchChats.ts`, `waouhChatSyncLock.ts`, ni aux edge functions (`waouh-match-history`, `waouh-channel-in`, `waouh-notify-dispatch`).
- Le verrou v12 (sentinelle runtime + invariants tests) est respecté : matchKey, filtre counterpart, et la logique de propagation `counterpart_user_id` ne changent pas. Le test snapshot v1 reste vert.

## Validation

- Smoke test manuel : ouvrir un match, fermer/réouvrir → l'historique réapparaît instantanément depuis le cache, le badge « Sync · HH:MM · N msg » s'affiche après reconcile sans spinner intermédiaire.
- Vérifier qu'un message envoyé par le partenaire arrive bien dans la fenêtre **dès le premier rendu** (plus de gap Realtime).
- Lancer `bunx vitest run` pour confirmer que les invariants v12 / snapshot v1 restent verts.
