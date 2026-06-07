# Plan — Isolation stricte des messages dans WaouhMatchChatWindow

## Contexte

Le flux WAOUH chat sync est verrouillé (mem://features/waouh-chat-sync-flow). Les corrections déjà déployées garantissent que :
- `waouh-webhook` (branche NEGOTIATE) et `waouh-negotiation-router` écrivent `article_id` en colonne et insèrent toujours dans `waouh_messages` dès que `target.id` est connu.
- Tous les `directMeta` (`negotiation_open`, `deal_created`, `negotiation_closed`) portent `article_id`.

**Reste un seul bug** : la fenêtre affiche encore des messages destinés à l'autre partie parce que `fetchArticlePage` filtre uniquement par `article_id`, sans scoper au visualisateur. Les lignes `waouh_messages` des deux parties partagent le même `article_id`.

## Symptômes

- **Vendeur** : voit `✅ Demande envoyée au vendeur` (qui appartient à l'acheteur).
- **Acheteur** : voit `📩 Nouvel acheteur intéressé` et `✅ Annonce publiée` (qui appartiennent au vendeur).

## Correction (1 seul fichier)

### `src/components/waouh/WaouhMatchChatWindow.tsx` — `fetchArticlePage`

Ajouter un second filtre `.or()` chaîné pour ne charger que les lignes appartenant au visualisateur (sa `web_session_id` ou son `user_id` waouh) :

```ts
let q = supabase.from("waouh_messages")
  .select("id,direction,text,created_at,attachments,meta,article_id")
  .or(`article_id.eq.${match.article_id},meta->>article_id.eq.${match.article_id}`)
  .order("created_at", { ascending: false })
  .limit(limit);

const viewerOrs: string[] = [];
if (sessionId) viewerOrs.push(`web_session_id.eq.${sessionId}`);
if (waouhIds.length) viewerOrs.push(`user_id.in.(${waouhIds.join(",")})`);
if (viewerOrs.length) q = q.or(viewerOrs.join(","));

if (before) q = q.lt("created_at", before);
```

Les deux `.or()` chaînés produisent `(filtre article) AND (filtre visualisateur)` — exactement le scope voulu.

Le canal realtime est déjà scopé par `web_session_id` / `user_id`, donc aucune modification realtime n'est nécessaire.

## Résultat attendu

- Vendeur : voit `✅ Annonce publiée`, `📩 Nouvel acheteur intéressé`, contre-offre acheteur, `🎉 Vente conclue`.
- Acheteur : voit `✅ Demande envoyée au vendeur`, ses propres contre-offres, `🎉 Vente conclue`.
- Plus aucune fuite cross-party.

## Hors scope

- Pas de changement edge functions (déjà corrigées et verrouillées).
- Pas de changement du chat principal, du composer, du bandeau jaune, ni du realtime.
- Pas de migration SQL.

## Préservation du verrou

L'invariant runtime (`waouhChatSyncLock.ts`) et le test `waouh-chat-sync-flow.lock.test.ts` restent inchangés : on ne touche ni au filtre realtime existant (`m?.article_id !== match.article_id && m?.meta?.article_id !== match.article_id`), ni à la suppression de la bulle `seedNotif.text`, ni au passage `authUserId`.

## Validation

1. Vendeur publie → fenêtre vendeur affiche `✅ Annonce publiée`, fenêtre acheteur vide.
2. Acheteur dit `intéressé 1` → fenêtre acheteur : `✅ Demande envoyée au vendeur` uniquement ; fenêtre vendeur : ajoute `📩 Nouvel acheteur intéressé` (pas de `✅ Demande envoyée`).
3. Acheteur `je propose 180` → fenêtre vendeur reçoit la contre-offre en realtime.
4. Vendeur `OUI` → les deux fenêtres affichent `🎉 Vente conclue`.
