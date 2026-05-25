
# WaouhApp — Solution native dans le repo Lovable actuel

## Recommandation : **Capacitor + React + Vite + Tailwind**

C'est la **seule option** qui permet de rester dans le repo Lovable actuel (React/TS/Vite) tout en produisant une **vraie app native Android** publiable sur Google Play Store (et iOS plus tard si besoin).

### Pourquoi Capacitor et pas autre chose ?

| Option | Reste dans Lovable ? | Vraie app native ? | Play Store ? | Verdict |
|---|---|---|---|---|
| **Capacitor** (Ionic) | ✅ Oui | ✅ Oui (WebView native + APIs natives Java/Kotlin) | ✅ Oui | **★ Choix optimal** |
| Kotlin natif | ❌ Repo séparé Android Studio | ✅ Oui | ✅ Oui | Trop coûteux pour le scope v1 |
| React Native | ❌ Repo séparé (Lovable ne supporte pas RN) | ✅ Oui | ✅ Oui | Impossible ici |
| Flutter | ❌ Dart, repo séparé | ✅ Oui | ✅ Oui | Impossible ici |
| PWA seule | ✅ Oui | ❌ Web installable | ⚠ Limité | Pas assez natif |

**Capacitor = le bon compromis** : on garde 100% du code React/Tailwind/Supabase déjà écrit, on l'enveloppe dans une app native qui a accès à toutes les APIs Android (caméra, contacts, push, biométrie, ML Kit, etc.) via des plugins natifs.

### Ce que ça donne concrètement

- **Une seule base de code** React/TS dans ce repo → web (bot.bj) **et** app Android se nourrissent du même code UI
- **APK signé** publiable sur Play Store
- **Accès natif réel** : caméra, micro, contacts du téléphone (pour Diffusion), push FCM, scan QR, stockage local, biométrie
- **Hot reload pendant le dev** : on code dans Lovable, on voit en live dans l'émulateur Android
- **Backend bot.bj inchangé** : Supabase + edge functions existantes réutilisées à 100%

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  Repo Lovable (CE REPO — React/TS/Vite)         │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Code React partagé                       │   │
│  │   • Pages waouh, partner, whatsapp        │   │
│  │   • Hooks Supabase existants              │   │
│  │   • UI shadcn + Tailwind                  │   │
│  └──────────────────────────────────────────┘   │
│        │                          │              │
│        ▼                          ▼              │
│  ┌──────────────┐         ┌───────────────────┐ │
│  │  Build web   │         │  Capacitor wrap   │ │
│  │  (bot.bj)    │         │  → Android APK    │ │
│  │  Vercel/VPS  │         │  → iOS (futur)    │ │
│  └──────────────┘         └───────────────────┘ │
└─────────────────────────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────┐
                  │  Backend Supabase bot.bj   │
                  │  (inchangé)                │
                  └────────────────────────────┘
```

## Stack détaillée

### Capacitor + plugins natifs
| Besoin | Plugin |
|---|---|
| Caméra (envoi photos chat / produits) | `@capacitor/camera` |
| Contacts téléphone (import Diffusion) | `@capacitor-community/contacts` |
| Push notifications | `@capacitor/push-notifications` + Firebase |
| Scan QR (connexion WhatsApp WAHA) | `@capacitor-mlkit/barcode-scanning` |
| Stockage sécurisé (tokens Supabase) | `@capacitor/preferences` + chiffrement |
| Réseau / offline | `@capacitor/network` |
| Partage natif | `@capacitor/share` |
| Géolocalisation (Waouh Partenaire) | `@capacitor/geolocation` |
| Splash screen + status bar | `@capacitor/splash-screen` + `@capacitor/status-bar` |
| Haptics (feedback tactile WhatsApp-like) | `@capacitor/haptics` |
| Système de fichiers (médias offline) | `@capacitor/filesystem` |

### Stack web déjà en place (réutilisée)
- React 18 + TypeScript + Vite (déjà)
- Tailwind + shadcn/ui (déjà)
- Supabase JS (déjà)
- TanStack Query (déjà)
- React Router (déjà)

### Nouveau pour l'app
- `@capacitor/core` + `@capacitor/cli`
- `@capacitor/android` (+ `@capacitor/ios` plus tard)
- `framer-motion` pour transitions WhatsApp-like (slides, fades)
- `vaul` pour bottom sheets natives
- `react-spring` ou `motion` pour gestures (swipe to reply, pull-to-refresh)

## App mobile = nouvelle zone /app dans le repo

Pour ne pas casser bot.bj web, on crée une **section dédiée** à l'app :

```text
src/
├── pages/                  (existant — site web bot.bj)
├── pages/partner/          (existant — utilisé aussi par mobile)
├── app-mobile/             (NOUVEAU — UI native-like)
│   ├── layouts/
│   │   ├── BottomTabBar.tsx       ← style WhatsApp 5 onglets
│   │   └── MobileShell.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── AuthHomeScreen.tsx        ← 2 boutons : WhatsApp / Email
│   │   │   ├── EmailAuthScreen.tsx
│   │   │   └── WhatsAppOtpScreen.tsx     ← OTP via WAHA
│   │   ├── chat/
│   │   │   ├── ChatListScreen.tsx        ← liste conversations
│   │   │   ├── ChatScreen.tsx            ← bulles type WhatsApp
│   │   │   └── components/
│   │   │       ├── MessageBubble.tsx
│   │   │       ├── VoiceRecorder.tsx
│   │   │       └── MediaPicker.tsx
│   │   ├── bots/
│   │   │   ├── BotsListScreen.tsx
│   │   │   └── CreateBotWizard.tsx       ← 4 étapes
│   │   ├── whatsapp/
│   │   │   ├── WhatsAppConnectScreen.tsx ← scan QR ML Kit
│   │   │   └── WhatsAppChatsScreen.tsx
│   │   ├── diffusion/
│   │   │   ├── CampaignsListScreen.tsx
│   │   │   ├── NewCampaignScreen.tsx
│   │   │   └── ContactsImportScreen.tsx  ← lit contacts natifs
│   │   └── partner/
│   │       ├── PartnerDashboardScreen.tsx
│   │       ├── ProductsScreen.tsx
│   │       ├── SalesScreen.tsx
│   │       └── PayoutsScreen.tsx
│   ├── hooks/
│   │   ├── useIsNative.ts            ← détecte runtime Capacitor
│   │   ├── usePushNotifications.ts
│   │   └── useNativeContacts.ts
│   └── theme/
│       └── mobile-theme.css          ← design WhatsApp-like
└── App.tsx                  ← branche /app/* sur MobileShell
```

### Routing intelligent
```tsx
// Détection runtime : web bot.bj OU app native
import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();

// Dans App.tsx :
{isNative ? <MobileShell /> : <WebRouter />}
```

L'app native démarre directement sur `MobileShell` → bottom tabs WhatsApp-like.
Le web continue de servir bot.bj normalement.

## Design — feeling WhatsApp/Telegram

- **Couleurs** : palette inspirée WhatsApp (#075E54 vert profond, #25D366 vert action, #DCF8C6 bulle envoyée), avec accent bot.bj (orange Bénin) sur les CTAs commerce
- **Typo** : SF Pro / Roboto (système natif) pour le feeling OS
- **Bottom Tab Bar** : 5 onglets avec icônes Lucide, badge unread rouge, transitions Framer Motion
- **Listes de conversations** : avatar circulaire, nom gras, dernier message tronqué, heure à droite, badge unread
- **Écran chat** : bulles arrondies (sent à droite primary, received à gauche muted), timestamps discrets, indicateur "vu" (✓✓ bleu), bouton micro long-press pour vocal, swipe-to-reply
- **Haptics** : vibration courte à l'envoi/réception (via `@capacitor/haptics`)
- **Pull-to-refresh** sur listes
- **Splash screen** avec logo Waouh animé
- **Mode sombre** complet
- **Safe areas** iOS/Android (notch, gestures)

## Périmètre v1 (validé)

5 onglets bottom bar :
1. **Chat** — conversations Waouh (1-1, groupes, bots) + temps réel Supabase
2. **Bots** — wizard création + liste + stats
3. **WhatsApp IA** — connexion QR WAHA + bascule manuel/IA
4. **Diffusion** — campagnes + import contacts natifs Android
5. **Partenaire** — dashboard, produits, ventes, payouts

Auth : email/password **ou** numéro WhatsApp via OTP WAHA (2 nouvelles edge functions).

**Hors scope v1** : Mobile Money, ElevenLabs, NLLB, Radar inline, vocal Kpakpato, modules admin (qui restent sur le web).

## Backend — ajouts minimes côté Supabase bot.bj

1. **2 nouvelles edge functions** :
   - `whatsapp-otp-send` → génère code 6 chiffres + envoie via `waha-send-message`
   - `whatsapp-otp-verify` → vérifie code + crée/login user via `auth.admin`

2. **1 nouvelle table** :
   - `whatsapp_otp_codes` (phone, code_hash, expires_at, attempts, used)

3. **Push notifications** :
   - Table `device_tokens` (user_id, fcm_token, platform)
   - Edge function `register-device-token`
   - Trigger sur nouveaux messages → push FCM

Aucune modification breaking côté web bot.bj. RLS partagée via `auth.uid()`.

## Phases de livraison (~6 semaines au lieu de 10)

```text
Phase 0 — Setup Capacitor (3 jours)
  • Install @capacitor/core, cli, android
  • npx cap init (appId: bj.bot.waouhapp, name: WaouhApp)
  • npx cap add android
  • Splash + icônes + manifest
  • Détection isNative + MobileShell + bottom tabs

Phase 1 — Auth & Chat (1.5 sem)
  • 2 edge functions OTP WhatsApp
  • Écrans auth (email + WhatsApp OTP)
  • Liste conversations + écran chat realtime Supabase
  • Envoi texte/photo/vocal/doc avec plugins Capacitor

Phase 2 — Bots & WhatsApp IA (1.5 sem)
  • Wizard création bot 4 étapes
  • Liste mes bots + stats
  • Scan QR ML Kit pour WhatsApp WAHA
  • Bascule manuel/IA

Phase 3 — Diffusion & Partenaire (1.5 sem)
  • Import contacts natifs Android
  • Création campagne + suivi live
  • Dashboard partenaire mobile
  • Produits/ventes/payouts adaptés mobile

Phase 4 — Polish & Play Store (1 sem)
  • Animations Framer Motion
  • Push FCM + table device_tokens
  • Mode sombre, safe areas, haptics
  • Build release signé, ASO Play Store
```

## Workflow utilisateur (toi)

1. **Tu codes dans Lovable** comme d'habitude (React/TS)
2. **Tu vois en live dans le navigateur** (preview Lovable)
3. **Pour tester sur téléphone Android** :
   - Tu exportes le repo vers GitHub
   - Tu fais `git pull` localement
   - `npm install` puis `npx cap add android`
   - `npm run build && npx cap sync`
   - `npx cap run android` (émulateur ou téléphone branché)
4. **Hot reload sur téléphone** : grâce à la config `server.url` qui pointe vers le sandbox Lovable, l'app sur ton téléphone se met à jour en live quand tu modifies dans Lovable
5. **Publier sur Play Store** : `npx cap open android` → Android Studio → Build → Generate Signed APK → upload Play Console

## Comparatif final : pourquoi Capacitor gagne ici

| Critère | Capacitor (recommandé) | Kotlin natif (plan précédent) |
|---|---|---|
| Reste dans Lovable | ✅ | ❌ |
| Réutilise 100% du code React déjà écrit | ✅ | ❌ (tout à réécrire) |
| Vraie app native publiable Play Store | ✅ | ✅ |
| Accès caméra/contacts/QR/push | ✅ (via plugins) | ✅ |
| Délai v1 | 6 semaines | 10 semaines |
| Coût maintenance (1 base de code) | ✅ Web + Android = 1 codebase | ❌ Web + Android = 2 codebases |
| iOS plus tard | ✅ `npx cap add ios` | ❌ Tout réécrire Swift |
| Performance perçue | ✅ Excellente sur Android moderne (WebView v100+) | ✅ Optimale |

**Verdict** : pour WaouhApp v1 (chat + bots + WhatsApp + diffusion + partenaire), Capacitor offre **95% de l'expérience native pour 50% du temps et 30% du coût**, tout en restant dans Lovable. Le natif Kotlin n'apporte un gain réel que si on a besoin de calculs lourds, jeux 3D, ou animations ultra-complexes — ce qui n'est pas notre cas.

## Prochaine étape (à valider avant build)

Si tu valides Capacitor, on enchaîne ainsi :

1. **Setup Capacitor** dans ce repo (install plugins + config + premier APK)
2. **Création des 2 edge functions OTP WhatsApp** + table `whatsapp_otp_codes`
3. **Création du `MobileShell` + bottom tabs + écrans auth**
4. Puis Chat, Bots, WhatsApp IA, Diffusion, Partenaire dans l'ordre

**Une question avant de lancer la phase 0** :

L'icône de l'app et le splash screen — tu veux qu'on génère un logo "Waouh" dédié (style WhatsApp/Telegram, vert ou orange), ou tu fournis un logo existant ?
