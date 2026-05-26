## Objectif

Corriger 4 problèmes signalés sur l'APK mobile :

1. **Crash WAOUH chat** (parfois redirige vers WhatsApp)
2. **Icônes "+" entreprise & produit** : simple icône + bleue, sans fond
3. **Images produits non récupérées** dans le chat
4. **Notifications / messages non envoyés au bon compte + historique non chargé**

---

## 1. Crash module WAOUH

**Cause probable** : `WaouhChatScreen` charge `WaouhWebChat` qui importe à l'eager‑load `WaouhPaymentDialog`, `WaouhSellWizard`, `NativeSellSheet`, `WaouhAuthGate` + `react-markdown` + `remark-gfm`. Sur Android (Capacitor) un import lourd qui plante au mount tue tout l'écran. Le "redirige vers WhatsApp" provient probablement d'un `window.open("wa.me/...")` dans une action message ou dans `WaouhAuthGate` (auth OTP WhatsApp), déclenché par un effet au montage.

**Plan** :
- Encapsuler `<WaouhWebChat />` dans `<ErrorBoundary fallback={<MobileErrorFallback />}>` au sein de `WaouhChatScreen` pour empêcher le crash global.
- Lazy‑loader les sous‑composants lourds (`WaouhSellWizard`, `NativeSellSheet`, `WaouhPaymentDialog`, `WaouhAuthGate`) via `React.lazy` + `<Suspense>` afin que leur erreur d'init ne plante pas le chat.
- Remplacer dans `WaouhWebChat` tout `window.open("https://wa.me/…")` (boutons d'action) par une navigation interne `/app/chat/:id` quand on est dans Capacitor (`Capacitor.isNativePlatform()`), pour empêcher la sortie vers WhatsApp.
- Ajouter `console.error` + toast d'erreur sur le `catch` de `supabase.functions.invoke("waouh-channel-in")` pour diagnostiquer les futures pannes.

## 2. Icônes "+" — Mes entreprises & Produits

Capture utilisateur : capsule pleine bleue. Demande : un simple **+** bleu, **sans fond**.

**Plan** :
- `PartnerBusinessesNativeScreen.tsx` : remplacer le FAB capsule par un bouton circulaire transparent avec uniquement `<Plus className="h-10 w-10 text-[#2563eb]" strokeWidth={3} />` centré au bas (pas de bg, pas de shadow lourde, légère ombre subtile pour rester tactile).
- `PartnerProductsNativeScreen.tsx` : remplacer le FAB pill "+ Ajouter" par exactement le même bouton (icône `+` bleue sans fond), centré.

## 3. Images produits dans le chat WAOUH

Les bulles affichent bien `attachments[].url` (lignes 360‑372 `WaouhWebChat.tsx`). Mais quand l'IA renvoie des produits du catalogue partenaire, ils arrivent via `meta.products` (côté edge `waouh-channel-in`), pas dans `attachments`. Donc rien ne s'affiche.

**Plan** :
- Dans `WaouhWebChat.tsx`, ajouter le rendu d'une grille produits si `m.meta?.products` est un tableau : photo (1ère URL de `photos`), nom, prix, badge dispo, bouton "Voir" qui ouvre `meta.url` ou un sheet de détails.
- Fallback : si pas de `photos`, afficher icône `ImageOff` + nom seul.
- Côté edge `waouh-channel-in` : vérifier que la sélection produits inclut `photos`, `nom`, `prix_min`, `prix_max`, `business_id`, `id` (sans changer le contrat existant si déjà présent — sinon adapter la projection `select('id,nom,photos,prix_min,prix_max,unite,disponible,business_id')`).

## 4. Notifications, routing au bon compte, historique

**Constat** :
- `WaouhChatScreen` fait `PushNotifications.register()` puis appelle `register-device-token` — ok.
- `useGlobalChatSync` filtre `waouh_messages` par `user_id=eq.${user.id}`. Or `WaouhWebChat` envoie les messages avec `sessionId` + best‑effort `update user_id` après login → les messages restent souvent avec `user_id IS NULL`, donc le user ne reçoit jamais de notif.
- L'historique du chat WAOUH se charge avec `or(web_session_id.eq.X, user_id.eq.Y)` — fonctionne uniquement si l'edge function a bien stamped `user_id`.

**Plan** :
- Modifier l'edge `waouh-channel-in` pour stamper `user_id = authUserId` sur **toutes** les insertions `waouh_messages` ET sur la `waouh_conversations` correspondante, dès qu'`authUserId` est fourni.
- Au login (dans `WaouhWebChat` effect 110‑118) : étendre le backfill à `waouh_conversations` (`update user_id where web_session_id=… and user_id is null`) pour rattacher l'historique passé.
- `useGlobalChatSync` : ajouter en complément un second canal realtime filtré par `web_session_id=eq.${sessionId}` (lu depuis localStorage) pour intercepter aussi les messages anonymes du même appareil → notifs même avant que le backfill ne soit terminé.
- `ChatListScreen` : ajouter dans la requête les conversations rattachées par `web_session_id` (en plus de `user_id`) pour que l'historique apparaisse immédiatement après login.
- Ajouter push native : étendre `useGlobalChatSync` aux push remotes (Capacitor `PushNotifications.addListener("pushNotificationReceived")`) — déjà branché dans `WaouhChatScreen`, mais le listener "tap" doit naviguer vers la bonne conversation : router via `extra.route` (déjà présent pour LocalNotifications, à ajouter pour `pushNotificationActionPerformed`).

---

## Détails techniques (résumé fichiers touchés)

```text
src/app-mobile/screens/WaouhChatScreen.tsx           ErrorBoundary autour de WaouhWebChat, push tap → navigate
src/app-mobile/screens/partner/PartnerBusinessesNativeScreen.tsx   FAB icône + bleue sans fond
src/app-mobile/screens/partner/PartnerProductsNativeScreen.tsx     FAB icône + bleue sans fond
src/app-mobile/screens/ChatListScreen.tsx            inclure conv par web_session_id
src/app-mobile/hooks/useGlobalChatSync.ts            second canal web_session_id, push remote tap
src/components/waouh/WaouhWebChat.tsx                lazy sous-composants, rendu meta.products,
                                                     bloquer ouverture wa.me en natif,
                                                     backfill user_id sur conversations
supabase/functions/waouh-channel-in/index.ts         stamper user_id sur messages + conversation,
                                                     inclure photos dans projection produits
```

Aucun changement de schéma DB requis ; uniquement code applicatif + 1 edge function. Pas de migration.

## Validation

1. `MOBILE_BUILD=1 bunx vite build` doit passer.
2. Ouvrir `/app/chat/waouh` : pas de crash, plus de redirection wa.me.
3. Créer un produit avec photo → l'envoyer dans le chat → l'image s'affiche.
4. Connexion sur 2nd appareil → l'historique apparaît dans la liste des chats.
5. Recevoir un message entrant → toast in‑app + notif Android + compteur badge incrémenté.
