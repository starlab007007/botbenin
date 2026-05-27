## Objectif

Refondre `src/app-mobile/screens/auth/EmailAuthScreen.tsx` pour qu'il offre une **expérience 100% native Android** (sans iframe, sans `window.open`, sans dialog web) tout en ayant la **parité fonctionnelle complète** avec `/auth` (web).

## Parité fonctionnelle requise (depuis `AuthPage.tsx`)

3 onglets segmentés natifs :
1. **Connexion** — email + mot de passe + bouton Google
2. **Inscription** — nom complet + email + mot de passe + confirmation + Google
3. **Mot de passe** — email pour reset

Toutes les actions passent par le même `AuthContext` (`login`, `register`, `resetPassword`, `loginWithGoogle`) → backend Supabase identique au web.

## Design natif Android

- Plein écran `fixed inset-0` avec `safe-area` (status bar + nav bar)
- **Header sticky** vert WaouhApp avec flèche retour + titre
- **SegmentedControl** custom (3 onglets, pill animé, haptic au tap)
- **TextField natif** : label flottant, icône préfixe (Mail/Lock/User), toggle œil pour password, `inputMode` adapté (`email`, `text`), `autoComplete` (`email`, `current-password`, `new-password`, `name`), `enterKeyHint`
- **Bouton Google** : carte blanche avec logo SVG, ripple effect tactile
- **Séparateur "OU PAR EMAIL"** avec lignes fines
- **Bouton primaire** sticky en bas avec safe-area, état loading (spinner inline)
- **Validation inline** sous chaque champ (rouge si erreur, vert check si valide)
- **Indicateur force mot de passe** (faible/moyen/fort) sur l'onglet Inscription
- Transitions fluides entre onglets (`framer-motion` slide horizontal)
- **Haptic feedback** via `@capacitor/haptics` (sélection onglet, submit, erreur)
- Scroll fluide `[-webkit-overflow-scrolling:touch]` + `overscroll-contain`
- Clavier-aware : `pb-[env(keyboard-inset-height)]` pour que le bouton reste visible

## Fichiers à créer

- `src/app-mobile/components/auth/SegmentedTabs.tsx` — pill segmenté animé
- `src/app-mobile/components/auth/NativeTextField.tsx` — input natif avec icône, toggle, validation
- `src/app-mobile/components/auth/PasswordStrengthBar.tsx` — barre force mot de passe
- `src/app-mobile/components/auth/GoogleButton.tsx` — bouton Google natif réutilisable

## Fichier à réécrire

- `src/app-mobile/screens/auth/EmailAuthScreen.tsx` — nouvelle implémentation native

## Backend & intégrations

- **Aucune nouvelle table, aucune nouvelle edge function.**
- Réutilise `useAuth()` du `AuthContext` web pour `login`, `register`, `resetPassword`, `loginWithGoogle`.
- Google OAuth : `signInWithOAuth({ redirectTo: ${origin}/app/chat })` → mêmes données utilisateurs que le web.
- Après succès → `navigate('/app/chat')`.

## Détails techniques

```text
EmailAuthScreen
├── Header sticky (back + title dynamique)
├── SegmentedTabs (Connexion | Inscription | Reset)
├── AnimatePresence (slide horizontal entre tabs)
│   ├── LoginPanel  → GoogleButton + Email + Password + Submit + lien Reset
│   ├── SignupPanel → GoogleButton + Name + Email + Password + Confirm + Strength + Submit
│   └── ResetPanel  → Alert info + Email + Submit + lien retour
└── Footer sticky safe-area (bouton primaire de l'onglet actif)
```

- Validation zod côté client (email, password ≥ 6, match confirm).
- Messages d'erreur Supabase mappés en français (déjà géré par AuthContext).
- Pas de `<Dialog>`, pas de `min-h-screen` (utilise `100dvh` + `fixed inset-0`).

## Vérification

- Build mobile OK (typecheck).
- Aucun `window.open` / iframe / lien externe.
- Login, signup, reset et Google fonctionnent et créent les mêmes lignes Supabase que `/auth`.
- Session synchronisée : se connecter sur `/app/auth/email` ouvre une session valide aussi sur `/auth`.

## Hors scope

- Aucune modification de la page web `/auth`.
- Aucune nouvelle route, ni changement de navigation.
- Pas de modification de `WhatsAppOtpScreen` ni `AuthHomeScreen`.