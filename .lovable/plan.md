# Unifier Statuts et Annonces Chat

Objectif: quand un utilisateur publie un statut, le système doit le traiter exactement comme une annonce publiée par chat — même base de données, même recherche, mêmes notifications, même cycle de négociation (OUI/NON/contre-offre) et de deal, lié au numéro WhatsApp du publicateur.

## Stratégie

Promouvoir chaque statut en `waouh_articles` au moment de la publication (plutôt que d'ajouter une logique parallèle partout). Le statut reste pour l'affichage social 24h, mais il est adossé à un vrai `article_id` qui circule dans toute la machinerie existante.

## Étapes

### 1. Base de données
- Migration: rendre `waouh_statuses.article_id` indexé + non nullable à terme; ajouter `waouh_statuses.seller_waouh_user_id` (FK `waouh_users.id`) et `contact_whatsapp` pour mémoriser le lien.
- Aucun changement aux tables `waouh_articles`, `waouh_negotiations`, `waouh_deals`, `waouh_interests` — on réutilise tel quel.

### 2. Publication de statut (edge function unifiée)
- Remplacer l'insert client-side dans `src/hooks/useStatuses.ts` (`publishStatus`) par un appel à une nouvelle edge function `waouh-status-publish`.
- `waouh-status-publish` (nouveau, basé sur `waouh-sell-handler`):
  1. Résoudre `waouh_users` à partir de `auth.uid()` (créer la ligne si absente, récupérer `phone_number`).
  2. Réhéberger les médias (`rehostPhotos`).
  3. Pour `type='sell'`: appeler l'extraction IA (titre/prix/catégorie/ville) + INSERT `waouh_articles` avec `origin='status'`, `source_channel='status'`, `contact_whatsapp`, `photos = media_urls`, `expires_at = now()+7d`.
  4. INSERT `waouh_statuses` avec `article_id` = id retourné + `seller_waouh_user_id`.
  5. Fire-and-forget `waouh-notify-buyers` (matching acheteurs existants) comme pour une annonce chat normale.
- Pour `type='buy'` et `type='announce'`: même schéma mais via `waouh-buy-handler` (insert `waouh_buyer_profiles`) ou un INSERT plus léger d'annonce; les statuts non-vente n'entrent pas dans `waouh_articles`.

### 3. Recherche
- Aucun changement requis: les statuts `sell` étant promus en `waouh_articles`, ils sont déjà indexés par `waouh-webhook` (intent BUY) et `waouh-buy-handler`.
- Optionnel: ajouter `origin='status'` au payload de réponse pour affichage visuel.

### 4. Notification "📩 Nouvel acheteur intéressé" depuis un statut
- Modifier `src/components/waouh/statuses/StatusCard.tsx`:
  - Au clic sur la carte/statut (ou la photo), récupérer `status.article_id` (réel).
  - Appeler `supabase.functions.invoke('waouh-buyer-interest', { body: { article_id, source: 'status' } })` — ce qui:
    - INSERT `waouh_interests`
    - Déclenche `waouh-notify-dispatch` (`kind='new_buyer'`) → WhatsApp/push au vendeur
    - Crée le seed message côté acheteur (echo)
  - Ouvrir ensuite `WaouhMatchChatWindow` avec le vrai `article_id` (déjà fait via l'event `waouh:open-match-chat`).
- Le texte "📩 Nouvel acheteur intéressé / 📦 / 💰 / 📏 / 🏙️ / OUI/NON/contre-offre" est déjà généré par la pipeline d'annonces (waouh-webhook + waouh-notify-dispatch) — réutilisé tel quel grâce à l'`article_id`.

### 5. Galerie photos
- Dans `WaouhMatchChatWindow` et `StatusCard`: clic sur une photo → ouvrir un lightbox (composant simple) montrant toutes les `photos` de `waouh_articles` (déjà alignées avec `media_urls` du statut).

### 6. Négociation et deal
- Aucune modification: dès que l'acheteur répond OUI / NON / "Je propose X FCFA" dans le chat ouvert, `waouh-negotiation-router` trouve la `waouh_negotiations` row (créée à l'étape interest/CONFIRM) et applique la logique existante → `waouh_deals` → livraison.

### 7. Migration des statuts existants
- Script one-shot: pour chaque `waouh_statuses` actif avec `type='sell'` et `article_id IS NULL`, créer la ligne `waouh_articles` correspondante et stamper `article_id`. (Optionnel, à valider.)

## Sécurité / RLS
- Vérifier que `waouh-status-publish` utilise `service_role` côté serveur (l'utilisateur authentifié est validé via JWT en début de fonction).
- Les RLS existants sur `waouh_articles` (seller voit ses lignes, acheteurs voient `status=active`) restent applicables.

## Fichiers impactés

```text
NOUVEAU  supabase/functions/waouh-status-publish/index.ts
EDIT     src/hooks/useStatuses.ts                              (publishStatus → invoke)
EDIT     src/components/waouh/statuses/StatusCard.tsx          (interest call + lightbox)
EDIT     src/components/waouh/WaouhMatchChatWindow.tsx         (lightbox photos)
NOUVEAU  src/components/waouh/PhotoLightbox.tsx                (galerie)
MIGRATION                                                       (waouh_statuses.article_id index,
                                                                seller_waouh_user_id, contact_whatsapp)
```

## Validation

1. Publier un statut `type='sell'` → vérifier qu'une ligne `waouh_articles` est créée avec `origin='status'`, `contact_whatsapp` correct, `photos` peuplé.
2. Recherche WhatsApp d'un acheteur sur le mot-clé → le statut apparaît dans les résultats.
3. Clic sur le statut → `waouh_interests` créé, vendeur reçoit notification WhatsApp "📩 Nouvel acheteur intéressé".
4. Acheteur tape OUI → `waouh_negotiations.state='accepted'`, `waouh_deals` créé.
5. Acheteur tape "Je propose 200 FCFA" → contre-offre envoyée au vendeur.
6. Photos cliquables dans la fenêtre chat et le StatusCard.
