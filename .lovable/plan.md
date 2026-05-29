## Diagnostic

Capture 2 (liste sous la carte WAOUH) affiche bien les notifications côté acheteur ("🎯 Annonce trouvée"), mais jamais "📩 Nouvel acheteur intéressé" côté vendeur.

Cause: `WaouhMatchChatList` lit `waouh_notifications` (types `match` / `match_buyer` / `match_seller` / `new_buyer` / `radar_match`), triée `sent_at DESC`, et `WaouhMatchChatWindow` épingle déjà la photo + `payload.text` du dernier `waouh_notifications` de l'annonce.

- Le flow acheteur (`waouh-radar-process`) insère bien `waouh_notifications(notification_type='radar_match', payload.text=…, photos=[…])` → fonctionne.
- Le flow vendeur "intéressé N" dans `waouh-webhook/index.ts` (≈ ligne 841) appelle uniquement `pushToOther(...)` qui écrit `waouh_messages` + enqueue WhatsApp/web, **sans jamais insérer dans `waouh_notifications`**. → la carte "📩 Nouvel acheteur intéressé" n'apparaît jamais dans la liste, donc impossible de l'ouvrir en tête.

Le texte riche `sellerText` (en‑tête WAOUH, prix, distance, ville, OUI/NON/Je propose, pied) et `firstPhoto` sont déjà construits localement — il suffit de les persister comme notification.

## Correctif (1 endroit, backend uniquement)

**`supabase/functions/waouh-webhook/index.ts`** — juste après le bloc `pushToOther({ … event_type: "seller_new_interest" })` (≈ ligne 859), insérer une ligne `waouh_notifications` côté vendeur, identique en forme à ce que produit `waouh-radar-process` pour l'acheteur :

```ts
try {
  // Résoudre la session web du vendeur pour que le client puisse pull sans auth
  let sellerWebSession: string | null = null;
  if (seller?.id) {
    const { data: su } = await sb
      .from("waouh_users")
      .select("web_session_id")
      .eq("id", seller.id)
      .maybeSingle();
    sellerWebSession = su?.web_session_id ?? null;
  }
  const photosArr = Array.isArray(pick.photos) ? pick.photos.filter(Boolean) : (firstPhoto ? [firstPhoto] : []);
  const dayBucket = new Date().toISOString().slice(0, 10);
  await sb.from("waouh_notifications").insert({
    user_id: seller?.id ?? null,
    web_session_id: sellerWebSession,
    article_id: pick.id,
    notification_type: "new_buyer",
    photos: photosArr,
    dedupe_key: `new_buyer:${pick.id}:${seller?.id ?? "anon"}:${user!.id}:${dayBucket}`,
    payload: {
      text: sellerText,                       // texte riche WAOUH affiché tel quel
      recipient: "seller",
      title: pick.title,
      price: askPrice,
      city: pick.city ?? null,
      photos: photosArr,
      buyer_user_id: user!.id,
      counterpart_user_id: user!.id,          // utilisé par formatMatchLabel
      negotiation_id: neg?.id ?? null,
      contact: { channel: "whatsapp", whatsapp: vendorPhoneForPush },
    },
    channel: vendorPhoneForPush ? "whatsapp" : "waouh_app",
    delivered_at: new Date().toISOString(),
    delivery_status: "delivered",
  });
} catch (e) {
  if ((e as any)?.code !== "23505") console.error("[interest] notif insert error", e);
}
```

## Effet attendu

- À chaque "intéressé N" envoyé par un acheteur, le vendeur reçoit une ligne `waouh_notifications` `new_buyer` avec `payload.text = sellerText` et `photos = [firstPhoto, …]`.
- La realtime `WaouhMatchChatList` (déjà abonnée à `waouh_notifications` filtrée `web_session_id` / `user_id`) ajoute l'entrée et la trie automatiquement en **première position** (badge "Dernier" déjà géré), sous la carte WAOUH (capture 2), avec la vignette de l'annonce et le libellé "🛒 Acheteur intéressé par votre annonce · prix · ville".
- Au clic, `WaouhMatchChatWindow` épingle déjà la photo + titre, puis affiche **exactement** `seedNotif.text` (capture 1) dans une bulle `whitespace-pre-wrap font-mono` — aucun changement front nécessaire.
- Aucun double envoi WhatsApp : `pushToOther` reste seul à enqueuer côté WhatsApp/web ; on n'ajoute qu'une ligne d'inbox.

## Fichiers modifiés

- `supabase/functions/waouh-webhook/index.ts` (un seul `insert` ajouté dans le bloc INTERESTED après `pushToOther`).

Aucun changement de migration, ni de schéma, ni de front.
