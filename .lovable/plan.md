## Objectif

Sur `/app/chat`, remplacer la double-barre actuelle (header vert mobile + header bleu du `WaouhWebChat`) par **une seule fenêtre de chat native**, ultra-moderne, avec :
- 1 seul header compact (identité WAOUH + ville + profil + notifications)
- Une **barre de payloads** (Vendre · Acheter · Négocier) tout en haut juste sous le header, façon "chips" iOS/Android
- Une **zone de messages** plein écran
- Un **composer natif** : textarea auto-grow, bouton trombone (galerie) + bouton appareil photo, **max 2 photos** en preview au-dessus du champ, bouton envoyer rond animé

Pas de logique métier modifiée (auth, IA, paiement, escrow, géoloc, notifs restent identiques) — uniquement la couche présentation mobile.

## Changements

### 1. Nouveau composant `WaouhWebChat` en mode `native`
Ajouter un prop `variant?: "web" | "native"` (par défaut `web` pour ne rien casser sur desktop / pages existantes). En mode `native` :
- Masquer le header interne bleu (`WAOUH · Achetez · Vendez…`) → le header mobile devient l'unique chrome
- Masquer le `WaouhQuickActions` du bas
- Exposer la fonction `triggerQuickAction(key)` via un ref (forwardRef + useImperativeHandle) pour que la barre de payloads externe puisse déclencher Vendre/Acheter/Négocier
- Limiter `pendingAtts` à **2** (au lieu d'illimité aujourd'hui) avec toast si dépassement
- Remplacer le composer interne par un composer "native" (voir §3) quand `variant=native`

### 2. Refonte `WaouhChatScreen.tsx`
Structure finale :
```
┌─────────────────────────────────────┐
│ [logo] WAOUH · IA   📍Cotonou  🔔 👤│  ← header unique (vert)
├─────────────────────────────────────┤
│  [🛍 Vendre] [🔍 Acheter] [🤝 Négo.]│  ← chips payload sticky
├─────────────────────────────────────┤
│                                     │
│         messages (flex-1)           │
│                                     │
├─────────────────────────────────────┤
│ [📷] [📎]  écrire un message…  [➤] │  ← composer natif
│ [photo1][photo2]                    │
└─────────────────────────────────────┘
```
- Intégrer la `WaouhCityBadge` (déplacée depuis l'ancien header bleu) dans le header vert, à droite
- Ajouter la barre de chips ronds (h-9, rounded-full, gradient subtil sur l'actif, ombre douce, scroll-x si besoin)
- Passer `variant="native"` à `<WaouhWebChat />` et brancher les chips sur `chatRef.current.triggerQuickAction(...)`

### 3. Composer natif (nouveau sous-composant `WaouhNativeComposer`)
- Conteneur sticky bottom avec `pb-[env(safe-area-inset-bottom)]`
- Boutons icône ronds 40×40 : `Camera` (capture directe via `<input capture="environment">`) et `Paperclip` (galerie, `accept="image/*"`)
- `Textarea` auto-resize (1 → 5 lignes), placeholder « Écrivez en français, Fon, Yoruba… »
- Bouton **Send** : rond 44×44, gradient WAOUH (vert→cyan), scale-tap animation, désactivé tant que `(input.trim() === "" && atts.length === 0)`
- **Previews photos** au-dessus du champ : 2 miniatures 64×64 arrondies avec croix de suppression, compteur `1/2` ou `2/2`
- Indicateur d'upload (spinner) et indicateur de frappe "WAOUH écrit…" au-dessus du composer pendant `sending`

### 4. Styles
- Réutiliser les tokens existants `--wa-green` et la palette mobile (`src/app-mobile/theme/mobile-theme.css`)
- Ajouter (si absents) tokens `--waouh-chip-bg`, `--waouh-chip-active`, `--waouh-composer-bg` dans le thème mobile, en HSL
- Aucune couleur en dur dans les composants

### 5. Fichiers touchés
- **Créés** : `src/app-mobile/components/WaouhNativeComposer.tsx`, `src/app-mobile/components/WaouhPayloadChips.tsx`
- **Modifiés** :
  - `src/components/waouh/WaouhWebChat.tsx` (ajout prop `variant`, ref impératif, cap 2 photos, branche composer alternatif)
  - `src/app-mobile/screens/WaouhChatScreen.tsx` (nouvelle structure, intègre chips + city badge dans header)
  - `src/app-mobile/theme/mobile-theme.css` (tokens chips/composer)

## Non-objectifs
- Pas de changement à l'IA, à `chat-message-process`, à l'escrow, ni à la table `waouh_*`
- Pas de modification de `WaouhWebChat` en mode web (rétro-compatible)
- Le `/app/conversations` (liste WhatsApp) et le `WaouhNotificationsBell` restent tels quels

## Critères d'acceptation
1. Sur `/app/chat`, **un seul header** visible (vert), pas de bandeau bleu
2. Chips Vendre/Acheter/Négocier visibles en haut, cliquables, déclenchent l'action existante (wizard vendre / préfixe acheter / préfixe négocier)
3. Composer en bas avec icônes 📷 et 📎 fonctionnelles, max **2 photos** en preview avec compteur
4. Bouton Send rond animé, désactivé quand vide
5. Aucune régression sur desktop / `WaouhChatPage` (variant par défaut = web)
6. Tout fonctionne en safe-area (notch iOS, gesture bar Android)
