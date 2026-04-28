## Objectif

Reproduire pour les **quiz SIGDSTS** le pattern « Ticket Express » déjà en place :
- N'importe qui peut passer un quiz **sans créer de compte**
- Le candidat peut **suivre ses tentatives, scores et attestations** via un lien magique personnel (token)
- L'**administrateur** voit en un coup d'œil **toutes les tentatives de tous les candidats** (notes, modules, dates, mention)

## Architecture (calquée sur les guest tickets)

### 1. Base de données (2 nouvelles tables + 1 vue admin)

**`quiz_candidates`** — identité légère du candidat (sans auth)
- `id` uuid PK
- `email` text (lowercase, unique)
- `full_name` text
- `phone` text nullable
- `organization` text nullable (BDS/site)
- `guest_token_hash` text unique (SHA-256, jamais le clair)
- `guest_token_expires` timestamptz (TTL 180 jours)
- `created_at`, `last_activity_at`
- RLS : aucun SELECT direct (`USING (false)`) — accès uniquement via edge function service-role + politique admin via `has_role`

**`quiz_attempts`** — chaque passage de quiz
- `id` uuid PK
- `candidate_id` uuid FK → `quiz_candidates`
- `module_id` text (ex `'accueil-donneur'`)
- `module_title` text (snapshot)
- `total_questions` int
- `score` int (bonnes réponses)
- `ratio` numeric généré (`score::numeric / total_questions`)
- `mention` text (`excellent`/`good`/`review`)
- `passed` bool (≥ 70%)
- `duration_seconds` int nullable
- `answers` jsonb (`[{questionId, selectedIndex, correct}]`)
- `certificate_issued` bool default false
- `ip_hash` text, `user_agent` text (analytics anti-abus)
- `created_at`
- RLS : aucun SELECT direct, accès via edge function

**`quiz_public_rate_limit`** (réutilise le pattern existant) — 1 ligne par tentative, purge ≥ 24 h
- 10 tentatives / IP / heure
- 30 tentatives / email / jour

**Vue `quiz_admin_attempts`** (`security_invoker=on`) — join lisible candidat + tentative pour le dashboard admin, protégée par RLS `has_role(auth.uid(),'admin')`.

### 2. Edge functions (4 nouvelles, mêmes helpers `_shared/guestTicket.ts`)

| Function | Rôle |
|---|---|
| `quiz-guest-start` | POST `{email, full_name, phone?, organization?, captcha_token?}` → crée/upsert le candidat, génère token clair (renvoyé 1 seule fois) + envoie email avec lien `/sigdsts/quiz/suivi/:token`. Rate-limit IP/email. |
| `quiz-guest-submit` | POST `{token, module_id, score, total, answers, duration_seconds}` → valide token, insère `quiz_attempts`, met à jour `last_activity_at`, renvoie `attempt_id`. |
| `quiz-guest-history` | POST `{token}` → renvoie le candidat (sans hash) + toutes ses tentatives (best-score par module, mentions, dates). |
| `quiz-admin-list` | POST (JWT requis, vérif `has_role admin`) `{search?, module_id?, mention?, from?, to?}` → liste paginée toutes tentatives + candidat (email, nom). |

Toutes utilisent `corsHeaders`, `sha256Hex`, `verifyCaptcha`, honeypot — code partagé existant.

### 3. Frontend

**Pages publiques nouvelles**
- `/sigdsts/quiz` (existante) → ajouter en haut un bandeau « Suivi de mes évaluations » + bouton « Démarrer / Récupérer mon lien » qui ouvre une `Dialog` (email + nom). À la soumission : appel `quiz-guest-start`, affichage du lien + email envoyé. Token aussi stocké en `localStorage` (`sigdsts_quiz_guest_token`) pour pré-remplissage.
- `/sigdsts/quiz/suivi/:token` (**nouvelle**) `SigdstsQuizGuestHistoryPage` — affiche identité du candidat, **toutes ses tentatives** par module, meilleur score, mention, bouton « Refaire » et bouton « Re-télécharger l'attestation » pour chaque réussite.

**Pages existantes adaptées**
- `SigdstsQuizPlayerPage` : si un `guest_token` est en `localStorage`, l'envoyer à `quiz-guest-submit` à la fin du quiz (en plus du `localStorage` actuel — fallback offline conservé).
- `SigdstsQuizResultPage` : appeler `quiz-guest-submit` au montage si pas encore fait, marquer `certificate_issued=true` quand l'utilisateur télécharge le PDF.
- `SigdstsQuizIndexPage` : afficher un badge « Synchronisé ☁️ » si token présent, sinon « Local uniquement ».

**Page admin nouvelle**
- `/sigdsts/admin/quiz` `AdminQuizAttemptsPage` (sous `<AdminRoute>`) :
  - Tableau responsive (cards stackées en mobile, tableau en desktop) : Date · Candidat (nom + email) · Module · Score · Mention · Durée · IP hash
  - Filtres : recherche (nom/email/module), module, mention, plage de dates
  - KPIs en haut : nb candidats, nb tentatives, taux de réussite global, top modules
  - Export CSV côté client
- Lien dans la nav admin SIGDSTS (`/sigdsts/admin` dashboard) vers la nouvelle page.

### 4. Email transactionnel

Template `emailQuizAccess` ajouté à `_shared/guestTicket.ts` (ou `_shared/guestQuiz.ts`) :
- Sujet : « Votre espace de formation SIGDSTS »
- Bouton « Voir mes évaluations » → `${PUBLIC_APP_URL}/sigdsts/quiz/suivi/${token}`
- Mention TTL 180 jours, lien personnel à ne pas partager

## Sécurité

- Token jamais stocké en clair côté serveur (SHA-256), comparé via `quiz-guest-history`/`submit`
- RLS strict : `quiz_candidates` et `quiz_attempts` inaccessibles via API publique sans token, accessibles à l'admin via `has_role`
- Service-role utilisé uniquement côté edge functions
- Honeypot + captcha optionnel + rate-limit (table partagée renommée ou dédiée `quiz_public_rate_limit`)
- Aucun PII renvoyé hors contexte (l'historique d'un token ne renvoie que ce candidat)

## Compatibilité

- L'ancien `localStorage` (`quizStorage.ts`) reste comme **fallback** si l'utilisateur refuse l'email/captcha
- Les attestations PDF actuelles continuent de fonctionner ; le drapeau `certificate_issued` est purement informatif côté admin

## Livrables

**Migration SQL** (2 tables + vue + RLS + index `module_id`, `created_at`, `candidate_id`)

**Edge functions** :
- `supabase/functions/quiz-guest-start/index.ts`
- `supabase/functions/quiz-guest-submit/index.ts`
- `supabase/functions/quiz-guest-history/index.ts`
- `supabase/functions/quiz-admin-list/index.ts`
- `supabase/functions/_shared/guestQuiz.ts` (template email + helpers spécifiques)

**Frontend** :
- `src/pages/SigdstsQuizGuestHistoryPage.tsx` (nouveau)
- `src/pages/admin/AdminQuizAttemptsPage.tsx` (nouveau)
- `src/lib/quizGuestSync.ts` (wrapper appels edge + gestion token localStorage)
- `src/components/quiz/QuizGuestStartDialog.tsx` (modal email/nom)
- Édits : `SigdstsQuizIndexPage`, `SigdstsQuizPlayerPage`, `SigdstsQuizResultPage`, `App.tsx` (2 nouvelles routes), nav admin

Aucun changement aux 200 questions ni à la génération du certificat PDF.
