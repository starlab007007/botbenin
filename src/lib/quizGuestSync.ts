// Wrapper pour la synchronisation cloud du quiz guest SIGDSTS
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'sigdsts_quiz_guest_token';
const PROFILE_KEY = 'sigdsts_quiz_guest_profile';

export interface GuestProfile {
  email: string;
  full_name: string;
  organization?: string | null;
}

export const getGuestToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setGuestToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearGuestToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
};

export const getGuestProfile = (): GuestProfile | null => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
};
export const setGuestProfile = (p: GuestProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(p));

export interface StartGuestPayload {
  email: string;
  full_name: string;
  phone?: string;
  organization?: string;
}

export const startGuestSession = async (payload: StartGuestPayload) => {
  const { data, error } = await supabase.functions.invoke('quiz-guest-start', { body: payload });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  const token = (data as any).token as string;
  setGuestToken(token);
  setGuestProfile({ email: payload.email, full_name: payload.full_name, organization: payload.organization });
  return data as { token: string; tracking_url: string; email_sent: boolean };
};

export interface SubmitAttemptPayload {
  module_id: string;
  module_title: string;
  total_questions: number;
  score: number;
  mention: 'excellent' | 'good' | 'review';
  duration_seconds?: number;
  answers: Array<{ questionId: string; selectedIndex: number; correct: boolean }>;
  certificate_issued?: boolean;
  holder_name?: string;
}

export interface SubmitAttemptResult {
  attempt_id: string;
  certificate_code: string | null;
  certificate_issued_at: string | null;
  verify_url: string | null;
}

export const submitGuestAttempt = async (payload: SubmitAttemptPayload): Promise<SubmitAttemptResult | null> => {
  const token = getGuestToken();
  if (!token) return null;
  try {
    const { data, error } = await supabase.functions.invoke('quiz-guest-submit', {
      body: { token, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return {
      attempt_id: (data as any).attempt_id,
      certificate_code: (data as any).certificate_code ?? null,
      certificate_issued_at: (data as any).certificate_issued_at ?? null,
      verify_url: (data as any).verify_url ?? null,
    };
  } catch (e) {
    console.warn('[quiz guest sync] submit failed', e);
    return null;
  }
};

export const fetchGuestHistory = async (token: string) => {
  const { data, error } = await supabase.functions.invoke('quiz-guest-history', { body: { token } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    candidate: {
      id: string; email: string; full_name: string; phone: string | null;
      organization: string | null; guest_token_expires: string;
      created_at: string; last_activity_at: string;
    };
    attempts: Array<{
      id: string; module_id: string; module_title: string; total_questions: number;
      score: number; ratio: number; mention: 'excellent' | 'good' | 'review';
      passed: boolean; duration_seconds: number | null; certificate_issued: boolean;
      certificate_code: string | null; certificate_issued_at: string | null;
      holder_name: string | null;
      created_at: string;
    }>;
  };
};

export const verifyCertificate = async (code: string) => {
  const { data, error } = await supabase.functions.invoke('quiz-verify-certificate', {
    body: { code },
  });
  if (error) throw error;
  return data as
    | { status: 'valid'; certificate: {
        certificate_code: string; holder_name: string | null; module_id: string;
        module_title: string; score: number; total_questions: number;
        ratio: number; mention: 'excellent' | 'good' | 'review';
        certificate_issued_at: string;
      } }
    | { status: 'not_found' | 'invalid_format' | 'rate_limited' | 'error'; error?: string };
};
