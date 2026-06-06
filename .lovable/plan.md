
## 1. Aperçu photo visible dans le composer de statut

Dans `src/components/waouh/statuses/StatusComposer.tsx` (étape "media") :

- La balise `<img>` actuelle ne s'affiche pas correctement (icône cassée + alt visible). Corriger l'aperçu :
  - Garantir un rendu carré stable : `aspect-square w-full` sur le conteneur, `<img loading="lazy" decoding="async" className="w-full h-full object-cover">`.
  - Vérifier que `URL.createObjectURL` est appelé sur un `File` image valide (filtre déjà présent) et que `URL.revokeObjectURL` n'est appelé qu'à la fermeture du dialog (ne pas révoquer pendant le rendu).
  - Ajouter un fond `bg-muted` pendant le chargement et masquer le texte alt (alt vide visuellement, `alt=""`).
- Ajouter un **lightbox** : cliquer sur une vignette ouvre un overlay plein écran (`fixed inset-0 z-[60] bg-black/90`) affichant l'image en grand avec bouton de fermeture. Géré par un petit state local `zoomedIndex: number | null`.

## 2. Bouton "Discutez avec l'acheteur / le vendeur" → WaouhMatchChatWindow

Dans `src/components/waouh/statuses/StatusCard.tsx`, remplacer `openChat` actuel (qui navigue simplement) par le même mécanisme que `WaouhMatchChatList.open()` :

- Construire un `detail` à partir du statut :
  - `article_id`: `status.article_id ?? status.id` (utiliser l'id du statut comme article virtuel si pas d'article lié)
  - `kind`: `status.type === "buy" ? "seller" : "buyer"` (si c'est une recherche, l'interlocuteur est vendeur ; sinon acheteur)
  - `title`, `price: status.price_fcfa`, `city: status.location`, `photo: status.media_url`
  - `counterpart_user_id`: `status.user_id`
  - `seed_text`: court message contextuel (ex: « Bonjour, je suis intéressé(e) par votre statut "{title}". »)
- Pousser ce `detail` dans `localStorage["waouh_pending_open"]` (même clé que la liste).
- `navigate("/app/chat/waouh")` puis `window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }))` après 50 ms.
- Résultat : `WaouhChatPage` ouvre une nouvelle `WaouhMatchChatWindow` (même flux validé que pour les notifications) — bout en bout identique.

## 3. Barre de recherche fonctionnelle (discussions + statuts)

Dans `src/app-mobile/screens/ChatListScreen.tsx` :

- L'état `q` filtre déjà `enriched` (convs IA). Étendre :
  - **Onglet "Discussions"** : passer `q` en prop à `WaouhMatchChatList` pour filtrer `items` par `title`, `city`, `seed_text`, `price`.
  - **Onglet "Statuts · 24h"** : passer `q` en prop à `StatusesPanel`.

Dans `WaouhMatchChatList.tsx` : ajouter prop `query?: string`, et appliquer un filtre côté rendu sur `fresh`/`archivedItems`.

Dans `StatusesPanel.tsx` et `useStatuses` : ajouter prop `query?: string` sur `StatusesPanel`, filtrer la liste `statuses` côté client (title / caption / location / waouh_code / price).

Le placeholder de l'`Input` devient `"Rechercher discussions, statuts…"`.

## Fichiers modifiés

- `src/components/waouh/statuses/StatusComposer.tsx` — aperçu fixe + lightbox
- `src/components/waouh/statuses/StatusCard.tsx` — bouton "Discutez" ouvre WaouhMatchChatWindow
- `src/app-mobile/screens/ChatListScreen.tsx` — propage `q` aux deux panneaux
- `src/components/waouh/WaouhMatchChatList.tsx` — prop `query`, filtre
- `src/components/waouh/statuses/StatusesPanel.tsx` — prop `query`, filtre

Aucune migration DB nécessaire (le bucket `waouh-statuses` reste à créer côté Storage selon le message précédent).
