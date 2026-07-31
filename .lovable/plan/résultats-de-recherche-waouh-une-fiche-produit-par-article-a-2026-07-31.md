# Résultats de recherche WAOUH : une fiche produit par article, avec ses photos

## Constat (diagnostic)

Aujourd'hui, quand le moteur trouve 5 annonces :

- La réponse est un **bloc de texte unique** listant `1. Titre / prix / ville / 📸 2 photos`.
- Les photos sont renvoyées à part, dans un **tableau `attachments` à plat** (jusqu'à 12 images toutes annonces confondues), affiché en grille au-dessus du texte dans `WaouhWebChat`.
- Résultat : impossible de savoir visuellement quelle photo appartient à quelle annonce (le seul lien est un préfixe `*3.*` dans la légende), et l'article n'a pas de fiche cliquable.
- Le zoom plein écran existe déjà (`ChatImage` + `ChatImageLightbox`) mais la galerie porte sur **tout le message**, pas sur l'article.

## Objectif

Chaque article trouvé s'affiche comme une **fiche autonome** : titre, prix, ville/distance, source (partenaire vérifié / Radar IA / WAOUH), analyse marché, **son propre carrousel de photos**, zoom plein écran limité aux photos de cet article, et un bouton d'action direct.

## Ce qui sera construit

### 1. Moteur (`waouh-webhook`) — sortie structurée
- Construire, pour l'intention recherche, un tableau `results[]` aligné **exactement** sur l'ordre déjà utilisé par `last_matches` (partenaires → annonces WAOUH → Radar IA), donc `intéressé N` reste cohérent.
- Chaque entrée : `index`, `id`, `title`, `price` (ou fourchette), `city`/`quartier`, `distance_km`, `source`, `badge`, `market_line` (analyse prix déjà calculée), `photos[]` (toutes les URLs publiques, jusqu'à 6), `action` (`intéressé N`).
- Le texte de la réponse reste inchangé pour WhatsApp (canal texte) ; sur canal web les photos ne sont plus dupliquées en `attachments` quand `results` est présent.
- Étendre la même sortie aux réponses de suivi (mise en relation, article courant, promotion Radar) : fiche unique de l'article concerné → parcours visuellement continu jusqu'à la conclusion.

### 2. Nouveau composant `WaouhProductCard`
- Carrousel horizontal des photos de l'article (swipe mobile, flèches desktop), compteur `1/4`.
- Clic → `ChatImageLightbox` avec galerie **restreinte aux photos de cet article** (zoom pinch/molette, pan, prev/next déjà supportés).
- Placeholder propre quand l'annonce n'a pas de photo.
- Ligne prix mise en avant, badges ville/distance/source, ligne analyse marché repliée si longue.
- Bouton « Je suis intéressé » qui envoie `intéressé N` dans le fil.

### 3. Intégration dans les surfaces de chat
- `WaouhWebChat` : rendu de `meta.results` sous le texte ; persistance de `results` dans `meta` du message (colonne existante) pour que l'historique et le mode hors-ligne réaffichent les fiches.
- `WaouhMatchChatWindow` : fiche de l'article de la fenêtre en tête de conversation (rappel visuel du produit négocié).
- `WaouhChatScreen` mobile : même composant, largeur pleine, carrousel tactile.

### 4. Réponses plus « smart » tout au long du parcours
- Suggestions contextuelles sous les fiches : `Affiner`, `Moins cher`, `Plus proche`, en plus de `intéressé N`.
- Message vide amélioré (aucun résultat) : reformulation proposée par le moteur au lieu du bloc générique.

## Détails techniques

- Le `correlation_id` existant est propagé dans chaque fiche pour garder la traçabilité notification → fenêtre → message.
- `results` est ajouté en plus des champs actuels (`reply`, `attachments`, `actions`, `article_id`, …) : aucune régression pour WhatsApp ni pour `waouh-channel-in`.
- Chargement d'image : `loading="lazy"`, `decoding="async"`, ratio fixe pour éviter le décalage de mise en page.
- Les 87 tests d'invariants `waouhChatSyncLock` sont réexécutés ; un test supplémentaire vérifie que `results[i].id === last_matches[i].id`.

## Validation

- Recherche réelle (« je cherche un sac Zara ») : 5 fiches, chacune avec ses propres photos, zoom OK.
- `intéressé 3` ouvre bien la fenêtre dédiée de la 3e fiche.
- Vérification web + mobile, avec et sans photos, et rechargement de l'historique.
