# WaouhApp — Phases 1, 2 & 3 livrées

## Phase 0 (rappel) — Setup Capacitor ✅
- `capacitor.config.ts`, plugins natifs, `MobileShell`, `BottomTabBar`, thème WhatsApp-like.

## Phase 1 — Auth & Chat ✅

**Backend**
- Table `whatsapp_otp_codes` (RLS deny-all, accessible uniquement via edge functions service-role).
- Table `device_tokens` (RLS user-scoped, pour push FCM).
- Edge functions déployées :
  - `whatsapp-otp-send` — génère un code 6 chiffres, le hashe, le stocke 5 min, l'envoie via `waha-send-message`.
  - `whatsapp-otp-verify` — vérifie le code, crée/récupère l'utilisateur (`auth.admin`), retourne `email_otp` pour ouvrir la session.
  - `register-device-token` — enregistre le token FCM pour les notifications push.

**Frontend mobile**
- `src/app-mobile/hooks/useMobileAuth.ts` — session Supabase + `onAuthStateChange`.
- Écrans `auth/AuthHomeScreen`, `auth/EmailAuthScreen`, `auth/WhatsAppOtpScreen` (OTP 6 cases).
- `ChatListScreen` — liste temps réel des `waouh_conversations` (Supabase Realtime).
- `ChatScreen` — bulles WhatsApp-like, fond `#ECE5DD`, insert dans `waouh_messages`, push vers WAHA si canal whatsapp.

**Routes ajoutées**
```
/app/auth                 → AuthHomeScreen
/app/auth/email           → EmailAuthScreen
/app/auth/whatsapp        → WhatsAppOtpScreen
/app/chat                 → ChatListScreen
/app/chat/:id             → ChatScreen
```

## Phase 2 — Bots & WhatsApp IA ✅

- `BotsScreen` — liste depuis `bots.owner_id=user.id`, statut Actif/Inactif, FAB orange.
- `CreateBotWizard` — assistant 4 étapes (Identité → Personnalité → Canal → Récap) avec barre de progression.
- `WhatsAppScreen` — bouton "Générer un QR Code" → `waha-connect` (start), affichage QR image, liste des sessions `waha_sessions_data` avec statut.

**Routes**
```
/app/bots                 → BotsScreen
/app/bots/new             → CreateBotWizard
/app/whatsapp             → WhatsAppScreen
```

## Phase 3 — Diffusion & Partenaire ✅

- `DiffusionScreen` — import natif des contacts Android via `@capacitor-community/contacts` (lazy, native only), liste des `campaigns` de l'utilisateur.
- `PartnerScreen` — KPI réels : entreprises, produits, total ventes (FCFA), payouts en attente. Liens vers les pages partenaires existantes pour les détails.

**Plugin natif ajouté**
- `@capacitor-community/contacts@7.2.0` (import dynamique, sécurisé pour le build web).

## Stratégie de test
1. **Web preview** : `/app/auth` → email login → tabs bottom bar fonctionnels.
2. **OTP WhatsApp** : nécessite la session WAHA `default` active.
3. **Android natif** : `npm run build && npx cap sync && npx cap run android` — import contacts disponible.

## Reste à faire (Phase 4)
- Push FCM (config Firebase + écoute `pushNotifications`).
- Animations Framer Motion + haptics sur send/receive.
- Build release signé et upload Play Store.
- Voice recorder dans `ChatScreen` (composant existant à intégrer).
