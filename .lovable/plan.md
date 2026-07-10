
# Plan — Audit messages / recherche / chat / notifications

## Objectif
S'assurer que la recherche WhatsApp ne renvoie QUE les produits correspondant au mot-clé (plus de faux positifs), que les messages entrants/sortants circulent correctement, et que les notifications ouvrent bien la bonne discussion.

## Diagnostic à mener (lecture seule)
1. **Recherche** — `supabase/functions/waouh-webhook/index.ts`, `waouh-buy-handler/index.ts`, `_shared/waouh-keywords.ts`
   - Vérifier `expandKeywordVariants` : stemming trop agressif (ex : "zara" → matche tout ce qui contient "zar"/"ara").
   - Vérifier la requête SQL : usage de `ilike '%kw%'` sans scoring → renvoie tous les produits contenant une sous-chaîne courte.
   - Confirmer que le filtre `source='partner'` retiré n'ouvre pas trop large (catalogue non-pertinent).
2. **Messages** — `waouh-channel-in`, `waouh-outbound-dispatch`, `_shared/waouh-sync.ts`
   - Logs récents (déjà vus : shutdown/boot normaux, pas d'erreur).
   - Vérifier idempotence + résolution LID (invariants v4/v7/v8 du lock).
3. **Chat App** — `WaouhWebChat`, `WaouhMatchChatWindow`, `useGlobalChatSync`
   - S'assurer que le fallback direct query fonctionne, que les fenêtres par (article, counterpart) restent isolées (invariant v12).
4. **Notifications** — `useNotifications`, composant cloche
   - Vérifier que le clic ouvre la conversation liée (article_id + counterpart) et marque `opened=true`.

## Corrections prévues
1. **Recherche plus précise** (`_shared/waouh-keywords.ts` + `waouh-webhook` + `waouh-buy-handler`)
   - Longueur minimale d'un token = 3 caractères ; conserver le mot entier pour tokens ≤ 4 (pas de stemming).
   - Ajouter un scoring : matcher `title` en priorité (poids 3), puis `description` (poids 1). Seuil minimal de score pour renvoyer un résultat.
   - Utiliser `websearch_to_tsquery` FR (ou `plainto_tsquery`) sur la colonne `search_vector` déjà indexée si disponible ; sinon `ilike` sur `title` d'abord, fallback `description`.
   - Filtre supplémentaire : au moins un token complet doit apparaître dans le titre OU la marque.
2. **Réponse vide claire** — si 0 résultat, message unique « Aucune annonce trouvée pour "X" » (déjà existant, vérifier qu'il ne se déclenche pas quand il y a des résultats non pertinents).
3. **Notifications → discussion**
   - Dans le handler de clic, router vers `/app/chat` en passant `article_id` + `counterpart_user_id` ; ouvrir directement la bonne `WaouhMatchChatWindow`.
   - Marquer `opened=true` via update ciblé.
4. **Tests E2E**
   - Rejouer via `supabase--curl_edge_functions` :
     - `je cherche zara` → doit retourner uniquement les articles Zara.
     - `je cherche mixa` → uniquement Mixa.
     - `je vends: Mixa, Prix 200 FCFA, Cotonou` → publication OK.
   - Vérifier arrivée de la notif côté vendeur + ouverture correcte de la fenêtre.

## Détails techniques
- Colonne `waouh_articles.search_vector` (tsvector) : vérifier existence via `supabase--read_query`. Si absente, ajouter migration `GENERATED ALWAYS AS (to_tsvector('french', title || ' ' || coalesce(description,''))) STORED` + index GIN.
- Garder les invariants `waouhChatSyncLock` v1→v12 intacts (pas de modification de `WaouhMatchChatWindow`, `notify-dispatch`, `negotiation-router` sur les champs verrouillés).
- Pas de changement de schéma RLS.

## Livrables
- Edge functions redéployées : `waouh-webhook`, `waouh-buy-handler`.
- 1 migration éventuelle (tsvector + index).
- 1 petit fix front sur le handler de notification si le routage est cassé.
- Rapport de test dans le message de clôture.
