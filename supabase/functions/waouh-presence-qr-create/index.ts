import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return String(
      value.message ??
        value.details ??
        value.hint ??
        value.error ??
        "Erreur inconnue",
    );
  }
  return String(error ?? "Erreur inconnue");
}

async function digestHex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

function randomShortToken() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  // Le préfixe r permet à bot.bj/p de distinguer ce QR Présence
  // du QR historique du module attendance.
  return `r${suffix}`;
}

function integerValue(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (request.method !== "POST") {
    return response(405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Méthode non autorisée.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return response(500, {
      ok: false,
      error: "SUPABASE_CONFIG_MISSING",
      message: "Configuration Supabase absente.",
    });
  }

  try {
    const authorization = request.headers.get("Authorization") ?? "";

    if (!authorization.startsWith("Bearer ")) {
      return response(401, {
        ok: false,
        error: "AUTH_REQUIRED",
        message: "Connexion requise pour générer un QR.",
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const tokenJwt = authorization.slice("Bearer ".length);
    const authResult = await admin.auth.getUser(tokenJwt);

    if (authResult.error || !authResult.data.user) {
      return response(401, {
        ok: false,
        error: "INVALID_SESSION",
        message: "Session utilisateur invalide.",
      });
    }

    const user = authResult.data.user;
    const body = await request.json().catch(() => ({}));

    const siteId = String(
      body.site_id ??
        body.siteId ??
        "",
    ).trim();

    const validityMinutes = Math.max(
      1,
      Math.min(
        integerValue(
          body.validity_minutes ??
            body.validityMinutes ??
            body.minutes,
          60,
        ),
        1440,
      ),
    );

    const useLimit = Math.max(
      1,
      Math.min(
        integerValue(
          body.use_limit ??
            body.useLimit,
          500,
        ),
        10000,
      ),
    );

    if (!siteId) {
      return response(400, {
        ok: false,
        error: "SITE_REQUIRED",
        message: "Le site est obligatoire.",
      });
    }

    const siteResult = await admin
      .from("waouh_presence_sites")
      .select(
        "id,user_id,name,active",
      )
      .eq("id", siteId)
      .maybeSingle();

    if (siteResult.error) throw siteResult.error;

    const site = siteResult.data;

    if (!site || site.active === false) {
      return response(404, {
        ok: false,
        error: "SITE_NOT_FOUND",
        message: "Site introuvable ou désactivé.",
      });
    }

    let allowed = site.user_id === user.id;

    if (!allowed) {
      const managerResult = await admin
        .from("waouh_presence_members")
        .select("id")
        .eq("site_id", siteId)
        .eq("member_user_id", user.id)
        .eq("role", "manager")
        .eq("status", "active")
        .limit(1);

      if (managerResult.error) throw managerResult.error;
      allowed = (managerResult.data ?? []).length > 0;
    }

    if (!allowed) {
      return response(403, {
        ok: false,
        error: "FORBIDDEN",
        message: "Vous ne pouvez pas générer le QR de ce site.",
      });
    }

    let shortToken = "";
    let tokenHash = "";

    // Défense contre une collision extrêmement improbable.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      shortToken = randomShortToken();
      tokenHash = await digestHex(shortToken);

      const existing = await admin
        .from("waouh_presence_qr_tokens")
        .select("id")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (existing.error) throw existing.error;
      if (!existing.data) break;

      shortToken = "";
      tokenHash = "";
    }

    if (!shortToken || !tokenHash) {
      throw new Error("SHORT_TOKEN_GENERATION_FAILED");
    }

    const expiresAt = new Date(
      Date.now() + validityMinutes * 60 * 1000,
    ).toISOString();

    const insertResult = await admin
      .from("waouh_presence_qr_tokens")
      .insert({
        site_id: siteId,
        created_by: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        use_limit: useLimit,
        use_count: 0,
      })
      .select("id")
      .single();

    if (insertResult.error) throw insertResult.error;

    const publicUrl =
      `https://bot.bj/p/?c=${encodeURIComponent(shortToken)}`;

    return response(200, {
      ok: true,
      version: "8.0.0",
      site_name: site.name,
      expires_at: expiresAt,
      use_limit: useLimit,
      qr_payload: publicUrl,
      public_url: publicUrl,
      short_code: shortToken,
    });
  } catch (error) {
    console.error("waouh-presence-qr-create-v8", error);

    return response(400, {
      ok: false,
      error: "QR_CREATION_FAILED",
      message: errorMessage(error),
    });
  }
});
