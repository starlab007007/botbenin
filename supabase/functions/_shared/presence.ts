import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function errorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || "Erreur interne Présence QR.",
      code: null,
      details: error.stack ?? null,
      hint: null,
    };
  }
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const text = (key: string) => {
      const raw = value[key];
      if (raw === null || raw === undefined) return null;
      if (typeof raw === "string") return raw.trim() || null;
      try {
        return JSON.stringify(raw);
      } catch {
        return String(raw);
      }
    };
    return {
      message:
        text("message") ??
        text("error") ??
        "Erreur PostgreSQL ou Supabase.",
      code: text("code"),
      details: text("details"),
      hint: text("hint"),
    };
  }
  return {
    message: String(error || "Erreur interne Présence QR."),
    code: null,
    details: null,
    hint: null,
  };
}

export async function clients(request: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    throw new Error("SUPABASE_CONFIG_MISSING");
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("SESSION_INVALID");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    url,
    anonKey,
    serviceKey,
    authorization,
    user: data.user,
    userClient,
    admin,
  };
}

export function extractToken(payload: unknown): string {
  const value = String(payload ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.searchParams.get("token") ?? value;
  } catch {
    const match = value.match(/[?&]token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : value;
  }
}
