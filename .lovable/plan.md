## Diagnostic

L'écran « Une erreur s'est produite » s'affiche partout en production à cause d'une erreur React fatale levée par le hook `useNotifications` :

```
cannot add `postgres_changes` callbacks for realtime:notifications-changes after `subscribe()`
```

### Cause racine
Dans `src/hooks/useNotifications.ts`, le `useEffect` qui crée le canal Realtime :
- utilise un **nom de canal fixe** `notifications-changes`,
- a `fetchNotifications` dans ses dépendances (qui change à chaque re-render via `useCallback([user])`),
- en production le client Supabase réutilise/garde le canal existant, donc au 2ᵉ run de l'effet on rappelle `.on('postgres_changes', …)` sur un canal déjà `subscribe()`-é → exception → ErrorBoundary attrape et bloque toute l'app (le `MainLayout` est wrappé par l'ErrorBoundary global).

### Erreur secondaire (non bloquante mais bruyante)
CSP bloque `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX` car :
1. `googletagmanager.com` n'est pas dans `script-src`,
2. l'ID GA est encore le placeholder `G-XXXXXXXXXX` — on charge un script inutile.

## Plan de correction

### 1. `src/hooks/useNotifications.ts` — corriger l'abonnement Realtime
- Retirer `fetchNotifications` des dépendances du `useEffect` (ne dépendre que de `user?.id`).
- Utiliser un **nom de canal unique** par utilisateur : `` `notifications-changes-${user.id}` ``.
- Nettoyer proprement : `supabase.removeChannel(channel)` dans le cleanup (déjà présent, OK).
- Garder un flag local pour éviter un double-subscribe en StrictMode.

### 2. `src/components/GoogleAnalytics.tsx` — ne rien charger tant que l'ID n'est pas configuré
- Court-circuit en début de `useEffect` : `if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.includes('XXXX')) return;`
- Évite l'erreur CSP et un appel réseau inutile en production.

### 3. (Optionnel, robustesse) `src/components/ErrorBoundary.tsx`
- Ne pas remonter l'erreur en plein écran pour des erreurs Realtime non critiques. Laisser tel quel pour l'instant — la vraie correction est la #1.

## Fichiers modifiés
- `src/hooks/useNotifications.ts`
- `src/components/GoogleAnalytics.tsx`

## Vérification
- Recharger après déploiement : plus d'écran d'erreur après login.
- Console : plus de message `cannot add postgres_changes…` ni de violation CSP googletagmanager.
