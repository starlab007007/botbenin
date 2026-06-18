## Objectif

Forcer l'authentification avant tout nouveau chat WAOUH depuis `/app/chat`, tout en préservant le chargement instantané de la liste.

## Comportement actuel

Dans `src/app-mobile/screens/ChatListScreen.tsx`, le bouton « + Nouveau chat WAOUH » (header + carte WAOUH + état vide) appelle :

```ts
const g = () => o("/app/chat/waouh");
```

Aucun contrôle d'auth — un visiteur non connecté entre directement dans le flux chat.

`useMobileAuth()` est déjà disponible et expose `{ user, loading }`. `RequireMobileAuth` redirige déjà vers `/app/auth` avec `state.from`, donc le pattern est cohérent.

## Changements

### 1. `src/app-mobile/screens/ChatListScreen.tsx`
- Importer `useMobileAuth`.
- Récupérer `user` (ne PAS bloquer sur `loading` pour préserver le rendu instantané hydraté depuis localStorage — l'auth check se fait seulement au clic).
- Remplacer le handler :
  ```ts
  const g = () => {
    if (!user) {
      navigate("/app/auth", { state: { from: "/app/chat", intent: "new_waouh_chat" } });
      return;
    }
    navigate("/app/chat/waouh");
  };
  ```
- Appliquer aux 3 points d'entrée existants : bouton header (icône +), carte WAOUH (gradient emerald), bouton CTA de l'état vide.

### 2. (Optionnel UX) `src/app-mobile/screens/ChatListScreen.tsx`
- Si `!user`, afficher un petit badge/texte discret sous la carte WAOUH : « Connectez-vous pour démarrer un chat » — sans bloquer le rendu de la liste hydratée.

### 3. Post-login redirect
- Vérifier que la page `/app/auth` (`AuthHomeScreen` / `EmailAuthScreen`) lit `location.state.from` après succès et redirige vers `/app/chat/waouh` quand `intent === "new_waouh_chat"`. Si elle redirige déjà via `state.from`, étendre légèrement la logique pour prendre en compte `intent`.

## Hors scope

- Pas de modification du flux WAOUH lui-même (verrouillé par `waouh-chat-sync-flow-locked-v12`).
- Pas de changement du service worker, du bundle splitting ou des hooks de sync — les optimisations de chargement précédentes sont conservées telles quelles.
- Pas de changement sur les conversations existantes listées (cliquer dessus reste autorisé : ce sont les conversations de l'utilisateur déjà identifié par `sessionId`).

## Vérification

- Visiteur déconnecté → clic sur n'importe lequel des 3 boutons « Nouveau chat WAOUH » → arrive sur `/app/auth`.
- Après login → redirection automatique vers `/app/chat/waouh`.
- Utilisateur connecté → comportement inchangé, ouverture directe.
- Liste `/app/chat` continue de s'afficher en <100 ms grâce à l'hydratation localStorage (aucun blocage ajouté).
