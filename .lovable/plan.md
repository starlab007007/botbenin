# Refonte UI/UX des messages de chat — direction "Vivante & Futuriste"

## Objectif

Donner à TOUS les messages de chat de l'app (ChatScreen mobile, WaouhChatScreen, WaouhWebChat, ChatMessage web) un langage visuel **unifié, moderne et vivant**, avec une typographie soignée, des séparateurs élégants, des bulles affinées et une hiérarchie de contenu claire — sans toucher à la logique d'envoi/réception.

## Direction visuelle proposée

**Concept : "Living Glass"** — bulles glassmorphiques légères, micro-relief, accent vert WAOUH électrique, typographie éditoriale + sans-serif technique.

- **Police principale** : `Inter` (corps, UI) — déjà chargée
- **Police accent / titres dans bulles bot** : `Fraunces` (serif moderne) — déjà chargée
- **Police mono pour codes/IDs/horaires** : `JetBrains Mono` (à ajouter)
- **Palette bulles** :
  - Sortant (out) : dégradé subtil `hsl(142 65% 88%) → hsl(150 70% 82%)`, bord interne lumineux, ombre verte douce
  - Entrant (in) : verre dépoli `hsl(0 0% 100% / 0.92)` light / `hsl(165 25% 14% / 0.85)` dark, ring 1px `hsl(165 30% 88%)`
  - Système/info : pilule centrée `hsl(165 30% 95%)` texte petite-caps
- **Séparateurs de jour** : pilule horodatée centrée style WhatsApp moderne ("Aujourd'hui", "Hier", "12 mai") avec micro-divider en losange
- **Séparateurs intra-bulle** : ligne en dégradé radial avec losange ◆ central (déjà présent dans `.waouh-bot-bubble hr`, à généraliser)

## Mise en forme du texte

- **Paragraphes** : `font-size: 14.5px`, `line-height: 1.55`, `letter-spacing: -0.005em`
- **Gras** (`**texte**`) : poids 600, accent vert `hsl(165 70% 26%)`
- **Italique** : devient petite-cap tagline (uppercase 11px, tracking 0.08em) — déjà présent pour bot, à étendre
- **Liens** : couleur verte WAOUH, underline offset 3px, hover : surbrillance douce
- **Listes** : puces • vertes alignées, espacement aéré
- **Emojis** : taille +2px, alignement vertical médian
- **Mentions @user / #tag** : badge pill couleur accent
- **Code inline** `\`code\`` : fond `hsl(165 20% 94%)`, mono, 13px
- **Citation `> texte`** : barre verticale verte 3px, texte légèrement muté
- **URLs auto-détectées** : preview compact (favicon + titre) si possible, sinon lien stylé
- **Numéros, montants FCFA, dates** : `font-variant-numeric: tabular-nums`

## Bulles & micro-détails

- Coins : `rounded-2xl` avec coin "queue" `rounded-br-sm` (out) / `rounded-bl-sm` (in)
- Ombre multi-couche : highlight blanc 1px inset + ombre verte diffuse `0 8px 24px -12px hsl(165 60% 30% / 0.18)`
- Animation d'entrée : `translateY(4px) → 0` + `opacity 0 → 1` en 180ms cubic-bezier
- Tail/queue SVG optionnelle pour la première bulle d'une rafale
- Regroupement : bulles consécutives du même expéditeur dans une fenêtre de 2 min → coins arrondis uniformes, avatar/horodatage seulement sur la dernière
- **Horodatage** : 10.5px, mono, tabular-nums, opacité 0.55, position bottom-right avec mini-icône ✓/✓✓ pour les sortants
- **État** : envoi (cadran ⏱), envoyé (✓), reçu (✓✓), lu (✓✓ vert)

## Séparateurs de jour & système

```text
─────  ◆  Aujourd'hui  ◆  ─────
```
- Pilule centrée avec léger backdrop-blur, fond `hsl(0 0% 100% / 0.7)`
- Messages système ("X a rejoint", "Conversation chiffrée") en italique 11px centré, opacité 0.6

## Fichiers à modifier

### Nouveau
- `src/app-mobile/theme/chat-message.css` — design tokens et classes `.chat-bubble`, `.chat-bubble-out`, `.chat-bubble-in`, `.chat-day-separator`, `.chat-time`, `.chat-status` + animations
- `src/app-mobile/utils/chatGrouping.ts` — regroupement par expéditeur + insertion séparateurs de jour
- `src/app-mobile/components/ChatBubble.tsx` — composant unique réutilisé partout (props : direction, text, time, status, grouped, channel)
- `src/app-mobile/components/ChatDaySeparator.tsx`

### Mis à jour
- `src/app-mobile/theme/mobile-theme.css` — `@import "./chat-message.css"`, ajout `JetBrains Mono` au lien Google Fonts
- `src/app-mobile/theme/bot-prose.css` — promouvoir certaines règles (séparateur ◆, em small-caps) au niveau `.chat-bubble` pour usage universel
- `src/app-mobile/screens/ChatScreen.tsx` — remplacer la div bulle inline (l. 173-185) par `<ChatBubble>` + insertion `<ChatDaySeparator>`
- `src/components/waouh/WaouhWebChat.tsx` — même remplacement autour de la l. 358
- `src/components/ChatMessage.tsx` — adopter `ChatBubble` (variante web), conserver l'animation de frappe
- `src/components/bot-conversation/components/MessageItem.tsx` — adopter le style unifié (admin)

### Non touché
- Logique d'envoi, hooks, Supabase, realtime, services chat. Aucune migration SQL.

## Détails techniques

- Tokens HSL ajoutés dans `index.css` `:root` et `.dark` : `--chat-out-bg-from`, `--chat-out-bg-to`, `--chat-in-bg`, `--chat-bubble-ring`, `--chat-accent`, `--chat-time`, `--chat-quote`, `--chat-code-bg`
- Classes utilitaires Tailwind via plugin inline dans les composants (pas de modif `tailwind.config.ts`) — tout via classes CSS dans `chat-message.css`
- Markdown léger : on garde le rendu existant (`MediaRenderer` / texte brut). Le styling agit via la classe parente `.chat-bubble` qui cible `p, strong, em, a, ul, li, hr, code, blockquote`
- Le fond `.waouh-chat-bg` (doodle) reste — il vient juste d'être unifié
- Animations limitées à `prefers-reduced-motion: no-preference`

## Hors scope

- Pas de changement de structure des données messages
- Pas de nouveau provider markdown
- Pas de modification des écrans Bots / WhatsApp / Partenaire
