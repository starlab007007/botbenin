# Diagnostic — messages de vente & notifications manquantes

## Ce que j'ai constaté en lisant le code + la base

1. **Le SELL est traité 100 % dans `waouh-webhook`** (intent SELL, lignes ~470–540). Il crée bien la ligne `waouh_articles` et renvoie le texte `✅ Annonce publiée`. Ce texte est ensuite persisté dans `waouh_messages` par `waouh-channel-in` et — sur WhatsApp — renvoyé via WAHA. C'est pour ça que **WhatsApp reçoit bien** la confirmation : c'est le même message d'IA, dans le même canal.

2. **Sur l'app (chat web/mobile), la confirmation EST persistée** dans `waouh_messages` (vérifié en base : ex. id `1cca86cd…` "✅ Annonce publiée" à 21:24). Donc si l'utilisateur ne la voit pas, c'est purement un problème d'affichage/realtime, pas de backend.

3. **Aucune `waouh_notifications` n'est créée pour la publication**. La fonction `waouh-webhook` ne fait JAMAIS appel à `waouh-notify-dispatch` ni à `waouh-notify-buyers`. Conséquence directe :
   - La cloche 🔔 (`WaouhNotificationsBell`) reste vide après une publication.
   - Aucun acheteur correspondant n'est notifié quand une annonce est publiée via le chat (le matching tourne uniquement quand `waouh-sell-handler` est appelé, ce qui n'arrive pas pour les ventes faites depuis le chat web ou WhatsApp).
   - Le vendeur ne reçoit pas non plus de "nouvel acheteur intéressé" tant que personne n'invoque `notify-buyers`.

4. **Les messages "Je vends …" peu détaillés** retombent sur `🤔 Je n'ai pas tous les détails` parce que le seuil `confidence < 0.5 || !price` est strict (cf. ligne 476). En base on voit "Je vends tira à 3000" → rejet. C'est le même code des deux côtés, mais ça donne l'impression que "l'app passe moins bien" car en WhatsApp on enchaîne plus naturellement.

5. Le hook `useWaouhMatchNotifications` ne connaît que `match` / `match_buyer` / `match_seller` ; il ignore `sale_published` et `new_buyer` même quand ils existent.

## Plan de correction

### A. Backend — `supabase/functions/waouh-webhook/index.ts`
Dans la branche `intent.intent === "SELL"`, après l'insert de l'article et avant le `return` :
1. **Fire-and-forget `waouh-notify-dispatch`** avec `{ kind: 'sale_published', article_id: art.id, recipient: 'seller' }` pour créer une notif in-app avec photos.
2. **Fire-and-forget `waouh-notify-buyers`** avec `{ article_id: art.id }` pour lancer le matching et notifier les acheteurs intéressés.
3. Si on est sur le canal `web` et qu'on connaît un `phone_number` du vendeur (ou inversement sur WhatsApp avec un `auth_user_id`), ajouter `contact_whatsapp` / `partner_id` lors de l'insert pour que `resolveContact` puisse aussi router la confirmation sur l'autre canal.
4. **Assouplir la tolérance IA** : accepter dès `confidence >= 0.3` et tenter de récupérer un prix depuis la regex `/(\d[\d\s]{2,})\s*(?:FCFA|CFA|XOF|F)?/i` du texte brut si l'IA n'a pas extrait `price`. Ne renvoyer `🤔 Je n'ai pas tous les détails` que si on n'a vraiment ni titre ni prix.

### B. Backend — `supabase/functions/waouh-notify-dispatch/index.ts`
- Pour `sale_published`, si on a à la fois un `phone` vendeur ET un `waouh_user.auth_user_id`, créer **deux** notifications : une in-app + un message WhatsApp (déjà géré par `resolveContact` côté `whatsapp`, mais on veut systématiquement insérer la ligne `waouh_notifications` pour la cloche, même quand on envoie aussi sur WhatsApp). Le code actuel le fait déjà — vérifier que `notifTargetUserId` n'est jamais nul pour SELL (fallback sur `article.seller_id`).

### C. Frontend — `src/hooks/useWaouhMatchNotifications.ts`
- Ajouter `sale_published` et `new_buyer` aux templates connus avec leurs titres ("✅ Annonce publiée", "🛒 Nouvel acheteur intéressé") et icônes, pour qu'ils apparaissent dans la cloche avec les photos `photos[]`.
- S'assurer que le polling DB initial filtre `notification_type in ('match','sale_published','new_buyer','radar_match')`.

### D. Frontend — affichage chat (sécurité)
- Vérifier que `WaouhWebChat.loadHistory` est bien rappelé après `sendCore` (déjà fait en ligne 247). Rien d'autre à changer.

## Test

1. Depuis l'app (`/app/chat/waouh`), envoyer `Je vends iPhone 13 256Go à 250000 FCFA` avec 2 photos.
   - ✅ Bulle "Annonce publiée" affichée avec les photos.
   - ✅ Une `waouh_notifications` `sale_published` apparaît, cloche +1, mêmes photos.
   - ✅ Si un `waouh_buyer_profiles` matche, on voit aussi une `match` côté acheteur.
2. Depuis WhatsApp, envoyer `Je vends Samsung A14 80000` + 1 photo.
   - ✅ Confirmation WhatsApp inchangée.
   - ✅ Si le compte WhatsApp est lié à un `auth_user_id`, la cloche in-app reçoit aussi `sale_published`.
3. Envoyer un message vague `Je vends truc 3000`.
   - ✅ Article créé (prix=3000, titre=truc) au lieu du message d'erreur.
4. Vérifier les logs `waouh-webhook` + `waouh-notify-dispatch` : pas d'erreur, photos rehostées, `delivery_status = delivered` quand WhatsApp.

## Risque

Aucun changement de schéma — tout est déjà en place (migration du 28/05 a ajouté `photos[]`, `channel`, `delivery_status`). Les changements sont additifs côté edge functions et purement UI côté hook.
