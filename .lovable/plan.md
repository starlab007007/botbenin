# 🎫 Proposition : Ticket Express SIGDSTS — sans inscription

## Contexte & diagnostic

Aujourd'hui, sur `/sigdsts/tickets`, ouvrir un ticket exige un compte Bot.bj :
- `support_tickets.user_id` est NOT NULL et la policy RLS `support_tickets_insert_own` impose `auth.uid() = user_id`
- L'edge function `support-create-ticket` rejette toute requête sans `Bearer token` (HTTP 401)
- Les agents SIGDSTS sur le terrain (ANTS, BDS, points focaux) doivent donc s'inscrire, vérifier leur email, attendre… avant de pouvoir signaler un incident critique 🔴 (SLA 2h)

**Friction inacceptable pour un support technique métier.**

## Solution proposée : "Ticket Express"

Un parcours public en parallèle du parcours authentifié actuel — **les deux coexistent**, l'utilisateur choisit. Aucun compte requis, identité prouvée par email + lien magique signé.

### Parcours utilisateur

```
[Agent SIGDSTS sur le terrain]
        │
        ▼
/sigdsts/tickets ──► bouton "Ouvrir un ticket sans compte"
        │
        ▼
/sigdsts/ticket-express  (formulaire public)
   • Email pro *
   • Téléphone (optionnel, pour rappel WhatsApp)
   • Nom complet *
   • Site / Structure (ANTS Atlantique, BDS Cotonou…)
   • Profil + Module SIGDSTS
   • Sévérité + Description + Étapes
   • Captcha hCaptcha
        │
        ▼  POST → edge function publique
[support-create-ticket-public]
   ✓ Captcha valide ?
   ✓ Rate-limit (3 tickets / 15 min / IP) ?
   ✓ Validation Zod stricte
   ✓ Génère guest_token (32 octets crypto)
   ✓ INSERT ticket (user_id=NULL, guest_email, guest_token_hash)
   ✓ INSERT premier message (author_role='guest')
   ✓ INSERT SLA event
   ✓ Envoi email "Ticket SIGDSTS-XXXX reçu" + lien
        │
        ▼
Email reçu :
   "Suivez votre ticket : https://bot.bj/sigdsts/t/<guest_token>"
        │
        ▼
/sigdsts/t/:token  (page publique de suivi)
   • Vue détail ticket (statut, sévérité, SLA)
   • Fil de messages
   • Ajouter une réponse / pièce jointe
   • Marquer comme résolu / rouvrir
   • Bouton "Créer un compte pour récupérer mes tickets"
```

### Côté admin/N2 (inchangé visuellement)

Sur `/sigdsts/admin/tickets`, les tickets guest apparaissent dans la même liste avec :
- Badge violet `Invité` à côté du numéro
- Email du guest affiché à la place du nom utilisateur
- Bouton "Répondre par email" qui notifie automatiquement le guest à chaque message N2

---

## Plan d'implémentation

### 1. Migration base de données (1 migration)

**Fichier** : nouvelle migration Supabase

**Schéma** :
```sql
-- Rendre user_id nullable
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- Champs guest
ALTER TABLE public.support_tickets
  ADD COLUMN guest_email          text,
  ADD COLUMN guest_full_name      text,
  ADD COLUMN guest_phone          text,
  ADD COLUMN guest_token_hash     text UNIQUE,  -- SHA-256 du token (jamais le token en clair)
  ADD COLUMN guest_token_expires  timestamptz,
  ADD COLUMN is_guest_ticket      boolean GENERATED ALWAYS AS (user_id IS NULL) STORED;

-- Contrainte d'intégrité : soit user_id, soit guest_email
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_owner_chk
  CHECK ( (user_id IS NOT NULL) OR (guest_email IS NOT NULL AND guest_token_hash IS NOT NULL) );

-- Index
CREATE INDEX idx_support_tickets_guest_token ON public.support_tickets(guest_token_hash) WHERE guest_token_hash IS NOT NULL;
CREATE INDEX idx_support_tickets_guest_email ON public.support_tickets(lower(guest_email)) WHERE guest_email IS NOT NULL;

-- Étendre author_role pour les messages
-- (la colonne existe déjà comme text — on documente juste les valeurs : 'user' | 'support_agent' | 'guest' | 'system')

-- Table de rate-limiting publique
CREATE TABLE public.support_public_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_limit_ip ON public.support_public_rate_limit(ip_hash, created_at);
ALTER TABLE public.support_public_rate_limit ENABLE ROW LEVEL SECURITY;
-- Aucune policy → seul service_role (edge functions) y accède

-- RLS staff voit aussi les tickets guests (déjà couvert par is_support_staff dans la policy SELECT existante)

-- Fonction utilitaire de réclamation
CREATE OR REPLACE FUNCTION public.claim_guest_tickets(_email text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  -- Vérifie que l'email correspond à l'auth.user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND lower(email) = lower(_email)) THEN
    RETURN 0;
  END IF;
  UPDATE public.support_tickets
     SET user_id = auth.uid(),
         guest_token_hash = NULL,
         guest_token_expires = NULL
   WHERE lower(guest_email) = lower(_email)
     AND user_id IS NULL;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END $$;
```

**Note** : aucune policy RLS n'autorise l'`anon` role à lire/écrire les tickets — tout passe par edge functions avec service_role. C'est une garantie de sécurité forte.

### 2. Edge functions (3 nouvelles + 0 modifiée)

#### `support-create-ticket-public` (POST, public)
- Valide hCaptcha (`HCAPTCHA_SECRET` à ajouter)
- Vérifie rate-limit : max 3 INSERT dans `support_public_rate_limit` pour `sha256(ip)` sur 15 min
- Validation Zod stricte (email, longueurs, énums)
- Génère `token = crypto.getRandomValues(32 bytes)` → URL base64url
- Stocke uniquement `sha256(token)` en BDD
- Insert ticket + premier message (`author_role='guest'`, `author_id=NULL`)
- Envoie email transactionnel via la fonction `transactional-email` existante (Resend) avec :
  - Numéro ticket
  - Lien : `https://bot.bj/sigdsts/t/<token>`
  - Récap sévérité + SLA
- Renvoie `{ ticket_number, tracking_url }`

#### `support-guest-ticket-get` (POST, public)
- Body : `{ token }`
- Calcule `sha256(token)` → SELECT ticket + messages (filtre `is_internal_note = false`)
- Vérifie `guest_token_expires > now()`
- Renvoie ticket + messages + statut SLA

#### `support-guest-ticket-message` (POST, public)
- Body : `{ token, message }`
- Idem vérif token
- Insert message `author_role='guest'`, `is_internal_note=false`
- Notifie l'agent N2 assigné par email (via `transactional-email`)

**Note importante** : `support-create-ticket` (authentifié) reste **inchangée** — coexistence des deux flows.

### 3. Frontend (4 nouveaux fichiers + 2 retouches)

#### Nouveaux
- `src/pages/SupportTicketExpressPage.tsx` — formulaire public `/sigdsts/ticket-express`
- `src/pages/SupportGuestTicketPage.tsx` — vue suivi public `/sigdsts/t/:token`
- `src/components/support/GuestTicketForm.tsx` — composant formulaire (réutilise les enums de `TicketForm`)
- `src/components/support/HCaptcha.tsx` — wrapper React du widget hCaptcha

#### Retouches
- `src/App.tsx` : ajouter les 2 routes publiques (en dehors du `<ProtectedRoute>`)
- `src/pages/SupportTechniquePage.tsx` :
  - Sur la `ActionCard` "Ouvrir un ticket N2", **retirer** `requireAuth` et router vers `/sigdsts/ticket-express` quand non connecté (gardes `TicketForm` modal pour les connectés)
  - Ajouter une 5e card discrète "🚀 Ticket Express — sans compte" pour rendre le parcours visible

### 4. Email transactionnel

- Réutilise l'infrastructure `transactional-email` existante (déjà déployée pour d'autres notifications du projet)
- 2 templates HTML simples (FR) :
  - **"ticket_created"** : numéro, sévérité, SLA, lien magique, validité 90j
  - **"ticket_reply"** : nouveau message N2 + lien direct
- Si l'infra email n'est pas active, bascule automatiquement sur affichage in-page du lien (avec avertissement) — pour ne pas bloquer la démo

### 5. Secrets à configurer

À ajouter via le tool `add_secret` (le tool demandera l'approbation utilisateur) :
- `HCAPTCHA_SECRET` — clé secrète hCaptcha
- `HCAPTCHA_SITE_KEY` — clé publique (exposée frontend via env)

Si l'utilisateur ne souhaite pas hCaptcha, fallback : Cloudflare Turnstile, ou simple honeypot + rate-limit IP renforcé (1 ticket / 5 min).

### 6. Sécurité — récapitulatif

| Risque | Mitigation |
|---|---|
| Spam massif | hCaptcha + rate-limit IP (sha256) + rate-limit email |
| Vol de token | Token 256 bits, jamais en clair en BDD (sha256), expire 90j, transmis uniquement par email |
| Énumération de tickets | Token aléatoire = espace de 2²⁵⁶ — impossible à deviner |
| Élévation de privilège | Aucune policy RLS pour `anon` ; tout passe par edge functions service_role validées |
| Phishing inverse | Email envoyé depuis domaine vérifié uniquement |
| Réclamation abusive | `claim_guest_tickets` exige que `auth.users.email = guest_email` (preuve de possession) |

### 7. Tests à valider après déploiement

1. ✅ Création de ticket sans compte → email reçu → lien fonctionne
2. ✅ Ajout d'un message côté guest → notification email à l'agent N2
3. ✅ Réponse N2 dans `/admin/tickets` → email envoyé au guest
4. ✅ Tentative de 4e ticket dans 15 min → bloqué (429)
5. ✅ Token expiré → page d'erreur claire
6. ✅ Création de compte avec même email → réclamation visible des anciens tickets
7. ✅ Tickets authentifiés actuels continuent de fonctionner (régression zéro)

---

## Ce que je NE vais PAS faire

- ❌ Supprimer le flow authentifié actuel — il reste pour les utilisateurs réguliers (historique unifié, dashboards)
- ❌ Permettre l'écriture directe par `anon` sur `support_tickets` — tout reste protégé par edge functions
- ❌ Stocker les tokens en clair
- ❌ Toucher aux RLS existantes du staff/admin
- ❌ Modifier le flow chatbot N1 (il continue d'escalader vers le flow authentifié pour les connectés ; pour les anonymes il escaladera vers Ticket Express)

## Bénéfices attendus

- ⏱️ **Temps de signalement d'un incident critique : ~30 s** (vs 5–10 min avec inscription)
- 🌍 Adapté au terrain SIGDSTS (BDS, ANTS, points focaux ruraux à connectivité limitée)
- 📈 Réduction des incidents non rapportés
- 🔄 Migration douce vers compte complet possible à tout moment via réclamation
- 🛡️ Sécurité préservée (token signé, RLS intacte, rate-limit, captcha)
