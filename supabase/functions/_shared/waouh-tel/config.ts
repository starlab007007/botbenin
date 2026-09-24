import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.49.8";
import { constantTimeEqual } from "./crypto.ts";
import { telRuntimeSecret } from "./runtime-secret.ts";
import type { TelSettings } from "./types.ts";

export function createTelAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("supabase_service_configuration_missing");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getTelSettings(
  admin: SupabaseClient,
): Promise<TelSettings> {
  const { data, error } = await admin.from("waouh_tel_settings").select("*").eq(
    "key",
    "default",
  ).single();
  if (error || !data) {
    throw new Error(
      `native_messaging_settings_unavailable:${error?.message || "missing"}`,
    );
  }
  return data as TelSettings;
}

export async function isInternalRequest(req: Request): Promise<boolean> {
  const expected = await telRuntimeSecret("internal_secret");
  const auth = req.headers.get("authorization") || "";
  const supplied = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  return Boolean(
    expected.length >= 24 && supplied && constantTimeEqual(supplied, expected),
  );
}

export async function requireInternalRequest(req: Request): Promise<void> {
  if (!(await isInternalRequest(req))) {
    throw new Error("internal_authorization_required");
  }
}

export async function auditTel(
  admin: SupabaseClient,
  eventType: string,
  options: {
    telUserId?: string | null;
    threadId?: string | null;
    actorType?: "user" | "provider" | "worker" | "admin" | "system";
    outcome?: "success" | "denied" | "failed";
    correlationId?: string | null;
    details?: Record<string, unknown>;
  } = {},
) {
  const { error } = await admin.from("waouh_tel_audit_log").insert({
    tel_user_id: options.telUserId ?? null,
    thread_id: options.threadId ?? null,
    actor_type: options.actorType ?? "system",
    event_type: eventType,
    outcome: options.outcome ?? "success",
    correlation_id: options.correlationId ?? null,
    details: options.details ?? {},
  });
  if (error) console.warn("[waouh-tel] audit insert failed", error.message);
}