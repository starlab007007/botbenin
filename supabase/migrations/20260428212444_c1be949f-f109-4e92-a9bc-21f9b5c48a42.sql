-- ========================================
-- Quiz SIGDSTS : suivi guest sans connexion
-- ========================================

-- Table candidats (identité légère, sans auth)
CREATE TABLE public.quiz_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  organization text,
  guest_token_hash text NOT NULL UNIQUE,
  guest_token_expires timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX quiz_candidates_email_lower_idx ON public.quiz_candidates (lower(email));
CREATE INDEX quiz_candidates_token_hash_idx ON public.quiz_candidates (guest_token_hash);

ALTER TABLE public.quiz_candidates ENABLE ROW LEVEL SECURITY;

-- Aucun accès direct (lecture/écriture) côté client : tout passe par les edge functions service-role
CREATE POLICY "No direct access to quiz_candidates"
  ON public.quiz_candidates FOR SELECT USING (false);
CREATE POLICY "No direct insert to quiz_candidates"
  ON public.quiz_candidates FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update to quiz_candidates"
  ON public.quiz_candidates FOR UPDATE USING (false);
CREATE POLICY "No direct delete to quiz_candidates"
  ON public.quiz_candidates FOR DELETE USING (false);

-- Lecture admin via has_role
CREATE POLICY "Admins can read quiz_candidates"
  ON public.quiz_candidates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Table tentatives
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.quiz_candidates(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  module_title text NOT NULL,
  total_questions integer NOT NULL CHECK (total_questions > 0),
  score integer NOT NULL CHECK (score >= 0),
  ratio numeric GENERATED ALWAYS AS (score::numeric / NULLIF(total_questions, 0)::numeric) STORED,
  mention text NOT NULL CHECK (mention IN ('excellent','good','review')),
  passed boolean NOT NULL DEFAULT false,
  duration_seconds integer,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  certificate_issued boolean NOT NULL DEFAULT false,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quiz_attempts_candidate_idx ON public.quiz_attempts (candidate_id, created_at DESC);
CREATE INDEX quiz_attempts_module_idx ON public.quiz_attempts (module_id, created_at DESC);
CREATE INDEX quiz_attempts_created_idx ON public.quiz_attempts (created_at DESC);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to quiz_attempts"
  ON public.quiz_attempts FOR SELECT USING (false);
CREATE POLICY "No direct insert to quiz_attempts"
  ON public.quiz_attempts FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update to quiz_attempts"
  ON public.quiz_attempts FOR UPDATE USING (false);
CREATE POLICY "No direct delete to quiz_attempts"
  ON public.quiz_attempts FOR DELETE USING (false);

CREATE POLICY "Admins can read quiz_attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vue admin enrichie
CREATE VIEW public.quiz_admin_attempts
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.candidate_id,
  c.email AS candidate_email,
  c.full_name AS candidate_name,
  c.organization AS candidate_organization,
  a.module_id,
  a.module_title,
  a.total_questions,
  a.score,
  a.ratio,
  a.mention,
  a.passed,
  a.duration_seconds,
  a.certificate_issued,
  a.ip_hash,
  a.created_at
FROM public.quiz_attempts a
JOIN public.quiz_candidates c ON c.id = a.candidate_id;

-- Rate limit dédié (mêmes colonnes que support_public_rate_limit)
CREATE TABLE public.quiz_public_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quiz_rl_ip_idx ON public.quiz_public_rate_limit (ip_hash, created_at DESC);
CREATE INDEX quiz_rl_email_idx ON public.quiz_public_rate_limit (email_hash, created_at DESC);

ALTER TABLE public.quiz_public_rate_limit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to quiz_public_rate_limit"
  ON public.quiz_public_rate_limit FOR SELECT USING (false);
CREATE POLICY "No direct insert to quiz_public_rate_limit"
  ON public.quiz_public_rate_limit FOR INSERT WITH CHECK (false);
