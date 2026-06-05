## Problème 1 — Doublon d'affichage des messages envoyés

**Diagnostic.** Dans `src/components/waouh/WaouhWebChat.tsx`, `sendCore()` ajoute immédiatement un message optimiste `temp-in-…` (ligne 376), puis attend la réponse de l'edge function `waouh-channel-in` pour le remplacer par l'ID réel. Pendant cette attente (souvent 1–3 s), Realtime délivre déjà l'INSERT persisté (`onInsert`, ligne 263). Le handler `onInsert` dédoublonne **uniquement par `id`** : il ne voit pas que le `temp-…` correspond au même message → les deux bulles coexistent jusqu'au retour de l'edge function. C'est ce que l'utilisateur voit comme « envoyé 2 fois avant que la réponse n'arrive ».

Les logs Supabase confirment **un seul** appel à `waouh-channel-in` par envoi → ce n'est pas un double POST, c'est un défaut de dédoublonnage côté UI.

**Correction.** Aligner `onInsert` sur la logique de `mergeMessages` : avant d'ajouter un message entrant `direction === "in"`, retirer tout `temp-in-*` ayant le même `text` (ou même premier attachment) émis < 30 s. Cela produit un remplacement atomique optimistic → persisted, sans bulle dupliquée.

## Problème 2 — Vérifier que « intéressé N » ne notifie que le bon vendeur

**État actuel.** Dans `supabase/functions/waouh-webhook/index.ts` (ligne 868+), `intent.CONFIRM` lit `nextContext.last_matches[idx-1]`, résout `vendorContacts` du `pick`, puis dispatch via `waouh-notify-dispatch` côté vendeur + push WhatsApp. Le dispatcher a déjà :
- un garde anti-self-notification (ligne ~165 de `waouh-notify-dispatch`),
- une `dedupe_key` journalière par (kind, article, recipient).

**Audit ciblé à faire.**
1. Confirmer que `last_matches` est bien stocké **par conversation** (clé `conv.id`) et non globalement — sinon « intéressé 1 » sur la conv A pourrait taper un article d'une conv B.
2. Vérifier qu'aucun broadcast à plusieurs vendeurs n'est déclenché lors d'un CONFIRM (seul le `pick` doit recevoir la notif). Le trigger SQL `trg_notify_buyers_on_catalog_item` (Sprint 1) doit rester **sortant vers les acheteurs en attente**, jamais déclenché par un CONFIRM acheteur.
3. Loger explicitement dans `waouh-channel-in` / `waouh-webhook` :
   - `pick.id`, `pick.seller_id`, `pick.source`
   - destinataires WhatsApp résolus
   - recipient_user_id côté `waouh_notifications`
   afin de pouvoir retracer un cas litigieux dans la table.

Si l'audit révèle un débordement (ex. `last_matches` partagé), ajouter un filtre par `conversation_id` et purger les anciens contextes.

## Détails techniques

**Fichier modifié : `src/components/waouh/WaouhWebChat.tsx`**

Remplacer le `onInsert` actuel par :

```ts
const onInsert = (payload: any) => {
  const m = payload.new as any;
  setMessages((prev) => {
    if (prev.find((x) => x.id === m.id)) return prev;
    // Retirer l'éventuel temp- correspondant (même direction/texte, < 30 s)
    const incomingTs = new Date(m.created_at).getTime();
    const filtered = prev.filter((p) => {
      if (!p.id.startsWith("temp-")) return true;
      if (p.direction !== m.direction) return true;
      const sameText = (p.text || "") === (m.text || "");
      const sameImg = !sameText
        && Array.isArray(p.attachments) && Array.isArray(m.attachments)
        && p.attachments[0]?.url === m.attachments[0]?.url;
      const close = Math.abs(new Date(p.created_at).getTime() - incomingTs) < 30000;
      return !(close && (sameText || sameImg));
    });
    return [...filtered, m];
  });
};
```

**Fichiers à instrumenter (audit notif) :**
- `supabase/functions/waouh-webhook/index.ts` (branche `CONFIRM`, ligne ~868) — ajouter `console.log("[interest-confirm]", { pick_id, seller_id, source, recipient_phones })`.
- `supabase/functions/waouh-notify-dispatch/index.ts` — déjà loggue self-block ; ajouter trace du `notifTargetUserId` final.

**Vérification post-déploiement :**
1. Envoyer un message dans la preview → vérifier qu'une seule bulle s'affiche avant la réponse.
2. Faire une recherche → cliquer « intéressé 1 » → requête SQL :
   ```sql
   select id, user_id, article_id, channel, payload->>'recipient'
   from waouh_notifications
   order by created_at desc limit 5;
   ```
   Confirmer un **unique** destinataire = `seller_id` de l'article #1.
3. Logs `waouh-webhook` : un seul `[interest-confirm]` avec le bon `pick_id`.

## Hors scope
- Aucun changement de schéma SQL ni de RLS.
- Aucun changement de l'UI mobile (`ChatScreen`) — le doublon n'y a pas été observé.