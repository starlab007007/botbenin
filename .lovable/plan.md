# Finalisation Connexion WhatsApp (parité Email)

## Objectif
Permettre à un utilisateur de se connecter via **WhatsApp + OTP (WAHA)** avec exactement le même résultat fonctionnel qu'une connexion email : profil complété (nom), `profiles` à jour, redirection identique, session Supabase native. **Sans toucher au flux existant** (email/Google).

## État actuel
- ✅ Edge functions `whatsapp-otp-send` / `whatsapp-otp-verify` existent et fonctionnent (envoi WAHA + magic-link Supabase).
- ✅ Écran mobile `WhatsAppOtpScreen.tsx` (étapes phone → otp).
- ✅ `useMobileProfile` crée déjà un row `profiles` automatiquement avec `provider='whatsapp'`.
- ❌ **Pas d'étape "Compléter le profil"** (nom complet) pour un nouveau compte WA → un user WA reste avec `full_name = "+229..."`, ce qui n'est PAS la parité email (où le nom est obligatoire à l'inscription).
- ❌ **Aucun bouton "Continuer avec WhatsApp" sur le web** (`/auth` AuthPage.tsx).
- ❌ Pas d'indicateur côté front si l'utilisateur est "nouveau" → l'app ne sait pas s'il faut afficher l'étape profil.
- ⚠️ Pas de rate-limiting / cooldown visible côté UI (renvoi de code immédiat).

## Plan (parallèle, sans casser l'existant)

### 1. Backend — enrichir `whatsapp-otp-verify`
- Retourner `is_new_user: boolean` (basé sur `created` vs `found` dans la fonction existante).
- Aucune signature break : on **ajoute** un champ.

### 2. Backend — nouvelle edge function `whatsapp-complete-profile`
- Inputs : `{ full_name, email? }` + JWT user.
- Validations : nom min. 2 chars ; si email fourni, vérifier qu'il n'est pas déjà pris.
- Update `profiles` (full_name, email réel si fourni) + `auth.users.email` via `admin.updateUserById` (remplace `wa_xxx@waouhapp.local` par l'email réel **si** fourni, sinon on garde l'email technique).
- Marque `profiles.provider = 'whatsapp'`.

### 3. Frontend mobile — étendre `WhatsAppOtpScreen.tsx`
Ajouter une **3ᵉ étape** `profile` affichée uniquement si `is_new_user === true` :
- Champ **Nom complet** (obligatoire)
- Champ **Email** (optionnel, pour récupération)
- Bouton **Terminer** → appelle `whatsapp-complete-profile` puis `navigate("/app/chat")`.
Si `is_new_user === false`, on saute directement à `/app/chat` (comportement actuel conservé).

### 4. Frontend web — nouveau composant `WhatsAppLoginDialog` + bouton sur `AuthPage`
- Ajouter un bouton **"Continuer avec WhatsApp"** (vert #25D366, identique au mockup fourni) sur `src/pages/AuthPage.tsx`, **au-dessus** des onglets email existants (les onglets email restent intacts).
- Ouvre une `Dialog` shadcn qui reproduit les 3 étapes (phone → otp → profile si nouveau) en réutilisant la même logique que l'écran mobile (extraite dans un hook `useWhatsAppOtpFlow`).
- À la fin : `navigate("/dashboard")` (même destination que login email web).

### 5. Hook partagé `useWhatsAppOtpFlow` (`src/hooks/useWhatsAppOtpFlow.ts`)
- États : `step`, `phone`, `code`, `loading`, `isNewUser`.
- Méthodes : `sendCode`, `verifyCode`, `completeProfile`, `resend`, `cooldown` (anti-spam 30 s).
- Utilisé par l'écran mobile **et** la dialog web → DRY, zéro duplication.

### 6. Cooldown / UX
- Bouton "Renvoyer le code" désactivé 30 s après envoi (timer visible).
- Toast d'erreur clair sur : numéro invalide, code expiré, trop de tentatives.

### 7. Aucune modification destructive
- Aucune migration de table requise (`profiles` et `whatsapp_otp_codes` existent et ont les bonnes colonnes).
- Aucune modification des edge functions existantes hors **ajout** d'un champ dans la réponse `verify`.
- Aucun changement du flux email / Google.
- Le flux WA mobile actuel continue de fonctionner pendant la transition.

## Section technique

```text
Architecture finale
───────────────────
                    ┌────────────────────────────┐
                    │ useWhatsAppOtpFlow (hook) │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        │                         │                          │
┌───────▼────────┐      ┌─────────▼─────────┐      ┌─────────▼──────────┐
│ Mobile screen  │      │  Web dialog       │      │ (futur: widget)    │
│ WhatsAppOtp    │      │  WhatsAppLogin    │      │                    │
│   .tsx (3 step)│      │  Dialog.tsx       │      │                    │
└───────┬────────┘      └─────────┬─────────┘      └────────────────────┘
        │                         │
        └─────────────┬───────────┘
                      ▼
         ┌──────────────────────────────┐
         │  edge: whatsapp-otp-send     │ → WAHA → user WhatsApp
         │  edge: whatsapp-otp-verify   │ → magic-link + is_new_user
         │  edge: whatsapp-complete-    │
         │        profile (NEW)         │ → profiles + auth email
         └──────────────────────────────┘
```

**Fichiers créés**
- `supabase/functions/whatsapp-complete-profile/index.ts`
- `src/hooks/useWhatsAppOtpFlow.ts`
- `src/components/auth/WhatsAppLoginDialog.tsx`

**Fichiers modifiés (additions uniquement)**
- `supabase/functions/whatsapp-otp-verify/index.ts` — ajoute `is_new_user`
- `src/app-mobile/screens/auth/WhatsAppOtpScreen.tsx` — bascule sur le hook + step `profile`
- `src/pages/AuthPage.tsx` — ajoute le bouton vert + dialog

**Sécurité**
- `whatsapp-complete-profile` requiert JWT valide (vérification via `auth.getUser()`).
- Email fourni → check unicité via `auth.admin.listUsers` (réutilise pattern existant).
- Pas de service_role exposé côté client.
