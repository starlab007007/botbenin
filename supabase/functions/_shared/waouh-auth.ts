import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export const waouhCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...waouhCorsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonError(status: number, code: string, detail?: unknown) {
  console.error(`[waouh-auth] ${code}`, detail ?? "");
  return jsonResponse({ ok: false, code, error: code, detail }, status);
}

export function requestSessionId(req: Request): string | null {
  const v = req.headers.get("x-waouh-session");
  return v && v.trim() ? v.trim() : null;
}

export async function getRequestUser(req: Request): Promise<{ id: string; email?: string | null } | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;

  try {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch (e) {
    console.warn("[waouh-auth] getRequestUser failed", e);
    return null;
  }
}

export async function requireAuthOrGuestSession(req: Request, bodySessionId: string | null | undefined) {
  const authUser = await getRequestUser(req);
  const headerSessionId = requestSessionId(req);
  const bodySid = bodySessionId && String(bodySessionId).trim() ? String(bodySessionId).trim() : null;
  const sessionValid = !!bodySid && !!headerSessionId && bodySid === headerSessionId;

  if (!authUser && !sessionValid) {
    return { ok: false as const, response: jsonError(403, "invalid_guest_session") };
  }

  return {
    ok: true as const,
    authUser,
    bodySessionId: bodySid,
    headerSessionId,
    sessionValid,
  };
}

export function requireSameAuthUser(claimed: string | null | undefined, actual: string | null | undefined) {
  if (!claimed) return null;
  if (!actual) return jsonError(403, "auth_required_for_claimed_user");
  if (claimed !== actual) return jsonError(403, "auth_user_mismatch");
  return null;
}
