-- Add certificate fields to quiz_attempts
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS certificate_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS certificate_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS holder_name text;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_certificate_code ON public.quiz_attempts(certificate_code) WHERE certificate_code IS NOT NULL;

-- Public read-only view for certificate verification (no PII)
CREATE OR REPLACE VIEW public.quiz_certificate_public AS
SELECT
  a.certificate_code,
  a.holder_name,
  a.module_id,
  a.module_title,
  a.score,
  a.total_questions,
  a.ratio,
  a.mention,
  a.certificate_issued_at
FROM public.quiz_attempts a
WHERE a.certificate_code IS NOT NULL
  AND a.certificate_issued_at IS NOT NULL;

-- View is accessed only via edge function (service role); no grants needed for anon;
