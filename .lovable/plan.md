# Finalisation du système Quiz SIGDSTS

## 1. Correction de l'erreur "Failed to send a request to the Edge Function"

**Cause racine** : les fonctions `quiz-guest-*` ne sont pas configurées avec `verify_jwt = false` dans `supabase/config.toml`. Lorsqu'un visiteur non connecté tente d'appeler `quiz-guest-start`, Supabase rejette la requête avant qu'elle n'atteigne la fonction (d'où "Failed to send a request").

**Action** : ajouter dans `supabase/config.toml` :
```toml
[functions.quiz-guest-start]
verify_jwt = false
[functions.quiz-guest-submit]
verify_jwt = false
[functions.quiz-guest-history]
verify_jwt = false
[functions.quiz-verify-certificate]   # nouvelle (voir §3)
verify_jwt = false
```
(`quiz-admin-list` reste protégée — vérification admin en interne.)

## 2. Configuration du secret Resend

Ajouter `RESEND_API_KEY = re_YbjMYtSX_E9Q4cK4Jo1ni8z5SiTLm19Sv` aux secrets Supabase via le tool `add_secret` (jamais en clair dans le code). Ajouter aussi `SUPPORT_EMAIL_FROM` (optionnel, défaut `onboarding@resend.dev` — fonctionne immédiatement, le client pourra ensuite vérifier son propre domaine sur Resend).

## 3. Génération de certificat PDF avec lien de vérification

### Base de données (migration)
Ajouter à la table `quiz_attempts` :
- `certificate_code text unique` — code public court (ex : `SIG-2026-A1B2C3D4`)
- `certificate_issued_at timestamptz`
- `holder_name text` — nom imprimé sur l'attestation (gelé au moment de l'émission)

Créer une **vue publique en lecture seule** `quiz_certificate_public` exposant uniquement : `certificate_code`, `holder_name`, `module_title`, `score`, `total_questions`, `ratio`, `mention`, `certificate_issued_at`. Aucun email/PII.

### Edge function `quiz-verify-certificate` (publique, GET)
- Input : `?code=SIG-2026-XXXXXX`
- Output : données de la vue ci-dessus + statut `valid|not_found|revoked`
- Rate-limit léger (10 req/min/IP via `quiz_public_rate_limit`)

### Edge function `quiz-guest-submit` (étendue)
Quand `certificate_issued: true` est envoyé, génère le `certificate_code` (8 chars base32 + préfixe année) si absent, persiste `holder_name` et `certificate_issued_at`, et renvoie `{ certificate_code, verify_url }` au client.

### Frontend — `src/lib/quizCertificate.ts`
Mise à jour `generateCertificate()` pour accepter `certificateCode` + `verifyUrl` et imprimer en bas du PDF :
- Numéro d'attestation : `SIG-2026-XXXXXXXX`
- URL de vérification : `https://.../sigdsts/quiz/verify/SIG-2026-XXXXXXXX`
- Un QR code (lib `qrcode` déjà installable) pointant vers cette URL

### Frontend — `src/pages/SigdstsQuizResultPage.tsx`
Refactor du bouton "Télécharger PDF" :
1. Appel `submitGuestAttempt({ ...certificate_issued: true, holder_name })` → récupère `certificate_code` + `verify_url`
2. Génère le PDF avec ces métadonnées
3. Affiche le code visible avec bouton "Copier"
4. Si pas de session guest active → fallback : génère un PDF avec `certificate_code` local (préfixe `LOCAL-`) et invite à créer un espace pour validation officielle

### Nouvelle page `src/pages/SigdstsCertificateVerifyPage.tsx`
Route : `/sigdsts/quiz/verify/:code`
- Appelle `quiz-verify-certificate`
- Affiche : vert/rouge selon validité, nom, module, score, mention, date, lien vers le module
- Sans connexion requise — accessible aux RH/recruteurs

Mise à jour `App.tsx` : ajouter la route lazy.

## 4. Timer par question avec progression automatique

### Logique (dans `SigdstsQuizPlayerPage.tsx`)
- Délai par question selon difficulté :
  - `easy` → 30 s
  - `medium` → 45 s
  - `hard` → 60 s
- Affichage : barre de progression circulaire **dans le header** + secondes restantes
- À 0 :
  - Si `selected !== null` → comportement = clic sur "Valider"
  - Sinon → réponse considérée incorrecte (`selectedIndex: -1`), révèle la bonne réponse pendant 4 s, puis avance automatiquement
- Pause du timer dès que `revealed = true` (l'utilisateur lit l'explication librement)
- Reset à chaque nouvelle question
- Toast discret "⏱️ Temps écoulé" quand auto-skip

### Composant `QuestionTimer.tsx` (nouveau)
- Props : `seconds`, `paused`, `onExpire`
- Utilise `useEffect` + `setInterval` (1 s)
- Affichage : cercle SVG + texte `MM:SS` + couleur progressive (vert > orange < 10s > rouge < 5s)
- Accessible (`aria-live="polite"`)

### Persistance des réponses non-répondues
Le payload `answers` accepte déjà `selectedIndex: number` ; on utilise `-1` pour "non répondue". `quiz-guest-submit` ne valide que `score <= total`, pas de changement de schéma nécessaire.

## 5. Ordre d'exécution

1. **Secrets** : ajouter `RESEND_API_KEY` (bloquant)
2. **Migration DB** : champs certificat + vue publique
3. **Edge functions** : config.toml + nouvelle `quiz-verify-certificate` + extension de `quiz-guest-submit`
4. **Frontend** : `QuestionTimer`, refactor `SigdstsQuizPlayerPage`, `SigdstsQuizResultPage`, certificate.ts, nouvelle page verify, route App.tsx

## Aperçu visuel du timer

```text
┌─────────────────────────────────────────┐
│ Module 3   [Expert]      Q 4 / 15       │
│                              ⏱  00:42   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────────┘
```

## Détails techniques

- Génération de QR : ajout de `qrcode` (npm) — léger, génère un dataURL inséré dans jsPDF via `doc.addImage`.
- `certificate_code` : `SIG-${year}-${crypto.randomUUID().slice(0,8).toUpperCase()}` côté edge function (jamais côté client → unicité garantie).
- La vue `quiz_certificate_public` est exposée uniquement en lecture via la fonction edge (pas de policy SELECT directe pour préserver l'anonymat).
- Aucun changement requis pour l'admin dashboard (les nouveaux champs apparaîtront automatiquement via la jointure existante).
