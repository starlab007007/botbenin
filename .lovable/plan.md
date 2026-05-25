# Vérification end-to-end des chats Waouh + affichage images

## Résultat du diagnostic

J'ai inspecté la base, les buckets Storage, les edge functions et le front. Voici l'état réel.

### Ce qui fonctionne déjà
- **Buckets Storage**: `waouh-media` et `waouh-uploads` sont **publics** (lecture anonyme OK).
- **Table `waouh_messages`** a bien les colonnes `attachments` (jsonb), `text`, `direction`, `channel`, `web_session_id`, `phone_number`.
- **Front `WaouhWebChat.tsx`** lit `attachments` et rend `<img src={a.url}>` (l. 310-316).
- **Upload depuis le web** (annonces vendeur) → bucket `waouh-uploads` public → URLs `supabase.co/storage/v1/object/public/...` qui s'affichent correctement (vérifié dans la DB sur les messages du 25/05 00:08).
- **Ingestion WhatsApp** dans `waouh-channel-in/index.ts` (l. 60-90, 260-285): télécharge le média depuis WAHA, ré-upload dans `waouh-media`, stocke l'URL publique. OK.

### Problème confirmé: images cassées dans le « Top 5 annonces »
Le message « 🎯 Top 5 annonces trouvées » du 25/05 10:50 contient des `attachments` avec des URLs **non publiques**:
```
https://waha.bot.bj/api/files/WaouhApp/false_..._3A....jpeg
```
Ces URLs WAHA nécessitent un header `X-Api-Key`. Le navigateur du chat web ne peut **pas** les charger → images cassées dans le chat web (mais OK sur WhatsApp côté téléphone car WAHA fait l'envoi natif).

**Source du bug**: `supabase/functions/waouh-webhook/index.ts` lignes 624-627 et `waouh-radar-process/index.ts` ligne 231. Les photos des matches Radar/SerpAPI sont reprises **telles quelles** depuis `waouh_radar_matches.photos` (qui contient des URLs WAHA brutes) et placées dans `directAtts` → passées à `waouh-channel-in` → stockées dans `waouh_messages.attachments` sans ré-upload.

### Autres points à vérifier (non confirmés à ce stade)
- Vue admin conversations bot (`src/components/bot-conversation/components/MessageItem.tsx`) **n'affiche pas** les images des messages — seulement le texte via `SafeText`. À enrichir si attendu.
- WhatsApp diffusion admin (`useWhatsAppMessages.ts`) retourne `media_url` mais aucun composant UI ne le rend.
- Top 5 envoyé sur WhatsApp via `sendWahaImage`: si une URL Radar est cassée, fallback texte uniquement (déjà géré dans `waouh-channel-in` l. 160-162).

---

## Plan de correction (à exécuter en mode build après validation)

### Étape 1 — Normaliser les URLs d'images du Top 5 (bug principal)
Dans `supabase/functions/waouh-webhook/index.ts`, avant de pousser `directAtts` (vers l. 624-650):
- Filtrer chaque URL: si elle commence par `https://waha.bot.bj/` ou contient `/api/files/`, soit la **ré-uploader** dans `waouh-media` (réutiliser `uploadToBucket` logique de `waouh-channel-in`), soit la **retirer** du tableau d'attachments envoyés au chat web (la garder uniquement pour WhatsApp).
- Option simple et rapide: ne pas attacher les photos Radar/SerpAPI au message web s'il n'y a pas d'URL publique; garder seulement les photos d'articles officiels et partenaires (déjà publiques sur `waouh-uploads`).
- Option robuste: ajouter un helper `ensurePublicUrl(url)` partagé qui upload-or-passthrough.

### Étape 2 — Nettoyer les données existantes
Migration SQL one-shot pour vider les `attachments` non-publics dans les messages déjà en base (sinon les vieux Top 5 resteront cassés à l'affichage):
```sql
UPDATE public.waouh_messages
SET attachments = '[]'::jsonb
WHERE attachments::text LIKE '%waha.bot.bj%';
```

### Étape 3 — Tests end-to-end manuels à faire ensemble
1. Ouvrir `/waouh/chat` connecté.
2. Envoyer « Je vends : Test, Prix : 5000, Ville : Cotonou » + 2 photos → vérifier que les 2 photos s'affichent dans la bulle « Annonce publiée ».
3. Envoyer « J'achète une voiture à Cotonou » → vérifier que le « Top 5 » s'affiche **sans images cassées**.
4. Côté WhatsApp (téléphone), répéter le scénario achat → confirmer que les images arrivent bien sur WhatsApp.
5. Vérifier l'historique partenaire (`/partner`): activité, ventes, paiements visibles.

### Étape 4 (optionnel) — Affichage images dans la vue admin bot
Si tu veux voir les images aussi dans `MessageItem.tsx` (vue admin générique des bots), ajouter le rendu `<img>` quand `media_url` existe. Sinon on laisse.

---

## Fichiers concernés (par étape)

| Étape | Fichiers |
|---|---|
| 1. Fix Top 5 URLs | `supabase/functions/waouh-webhook/index.ts` (l. 595-650), éventuellement helper partagé dans `supabase/functions/_shared/` |
| 2. Nettoyage data | Migration SQL via outil `supabase--migration` |
| 3. Tests | Aucun fichier, manuel |
| 4. Admin bot images | `src/components/bot-conversation/components/MessageItem.tsx`, `src/components/conversation-manager/MessageView.tsx`, `src/hooks/useWhatsAppMessages.ts` consommateurs |

Aucun changement à `.github/`, `Dockerfile`, `docker-compose.yml`, `vite.config.ts`.

---

**Question avant build**: tu veux que je fasse **Étape 1 + 2** maintenant (le vrai correctif images Top 5), ou aussi **Étape 4** (afficher les images dans la vue admin) ?
