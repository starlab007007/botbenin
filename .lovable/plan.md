# Plan

## Diagnostic

### Bug 1 — La fenêtre acheteur affiche la notif "📩 Nouvel acheteur intéressé"

`WaouhMatchChatWindow.tsx` ligne 569 rend `seedNotif?.text` pour tout le monde **sauf** le vendeur (`match.kind !== "seller"`). Côté acheteur, le `seed_text` injecté (depuis `useWaouhInbox` / `WaouhMatchChatList`) reprend le texte de la notification publiée — y compris la version "📩 Nouvel acheteur intéressé" — alors que l'acheteur ne doit voir que sa propre bulle "✅ Demande envoyée au vendeur" (qui arrive en realtime comme `reply` de son action).

### Bug 2 — La contre-offre de l'acheteur n'arrive pas dans la fenêtre vendeur

Dans `waouh-webhook/index.ts`, `pushToOther` (lignes 437-452) n'insère une ligne `waouh_messages` que si **les deux** conditions sont remplies : `webSession && target.id`. De plus, l'insert ne renseigne que `meta.article_id`, jamais la colonne `article_id`.

Conséquences :
- Si le vendeur n'a pas (ou plus) de `web_session_id` actif → aucune insertion DB → fenêtre vendeur ne reçoit jamais le message (ni realtime, ni reload).
- Même avec une session, le filtre realtime (ligne 305) et `fetchArticlePage` (ligne 152) doivent retomber sur `meta->>article_id`, ce qui est fragile (le sous-canal realtime peut transmettre `meta` sans la clé attendue selon le payload). L'insert principal de l'annonce écrit bien `article_id` en colonne, d'où l'asymétrie avec les contre-offres.

## Modifications

### 1. `src/components/waouh/WaouhMatchChatWindow.tsx` (ligne 569)

Masquer la bulle `seedNotif.text` **dans les deux camps** — le bandeau jaune (header) reste la seule synthèse pinned ; chaque partie ne voit ensuite que ses propres bulles et les messages reçus en realtime.

```tsx
{/* Suppression complète de la bulle "seedNotif.text".
    Le bandeau jaune ci-dessus suffit, et chaque partie ne voit plus
    que ses propres bulles + les notifications qui lui sont adressées. */}
```

Effet :
- Acheteur : la fenêtre affiche uniquement le bandeau jaune + `✅ Demande envoyée au vendeur` (sa propre bulle realtime). La notif "📩 Nouvel acheteur intéressé" disparaît.
- Vendeur : inchangé (déjà masqué pour `match.kind === "seller"`).

### 2. `supabase/functions/waouh-webhook/index.ts` — `pushToOther` (lignes 437-452)

a) **Toujours insérer** dans `waouh_messages` dès que `target.id` est connu, indépendamment de `webSession`. Cela permet à la fenêtre vendeur (ouverte plus tard, ou rechargée) de retrouver la contre-offre via `fetchArticlePage`.

b) **Renseigner la colonne `article_id`** quand `directMeta.article_id` est présent, pour que le filtre realtime (`m.article_id === match.article_id`) matche directement sans dépendre de `meta->>article_id`.

```ts
const articleIdCol = (opts.directMeta as any)?.article_id ?? null;
let insertedMsgId: string | null = null;
if (target.id) {
  try {
    const { data: msg } = await sb.from("waouh_messages").insert({
      user_id: target.id,
      channel: webSession ? "web" : "system",
      direction: "out",
      text: opts.directText,
      web_session_id: webSession,
      article_id: articleIdCol,
      attachments: opts.directAtts ?? [],
      meta: { ...(opts.directMeta ?? {}), transaction_id: opts.transaction_id ?? opts.directMeta?.transaction_id ?? null, source: opts.source ?? "chat" },
    }).select("id").maybeSingle();
    insertedMsgId = msg?.id ?? null;
  } catch (e) { console.warn("[pushToOther] msg", e); }
}
```

Le canal realtime côté vendeur filtre sur `user_id=eq.<seller_uid>` (ligne 333) — l'insert ci-dessus déclenchera donc le handler, qui matchera `m.article_id === match.article_id` et ajoutera le message à la fenêtre.

## Hors scope

- Aucune modification du `WAOUH chat principal`, des notifications WhatsApp, du composer, ni de la logique de négociation.
- Aucune migration SQL.

## Validation

1. Acheteur dit `intéressé 1` → fenêtre acheteur : bandeau jaune + uniquement `✅ Demande envoyée au vendeur`. Le texte "📩 Nouvel acheteur intéressé" n'apparaît plus.
2. Acheteur écrit `Je propose 180 FCFA` → fenêtre vendeur : nouvelle bulle `💬 Nouvelle offre de l'acheteur ... 180 FCFA` apparaît en realtime ; identique à la bulle du chat principal vendeur.
3. Vendeur répond `OUI` → les deux fenêtres affichent `🎉 Accord conclu`.
