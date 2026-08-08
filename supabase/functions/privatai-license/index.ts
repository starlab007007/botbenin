import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DAY_MS = 86_400_000;
const normalizeCode = (value: unknown) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const cleanText = (value: unknown, max = 160) => String(value || "").trim().slice(0, max) || null;
const isoAfterDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
const expired = (iso: string | null | undefined) => Boolean(iso && new Date(iso).getTime() <= Date.now());

async function settings() {
  const { data } = await admin
    .from("privatai_license_settings")
    .select("trial_days,default_validity_days,default_max_devices,online_check_hours")
    .eq("id", 1)
    .maybeSingle();
  return {
    trial_days: Number(data?.trial_days || 7),
    default_validity_days: Number(data?.default_validity_days || 30),
    default_max_devices: Number(data?.default_max_devices || 1),
    online_check_hours: Number(data?.online_check_hours || 24),
  };
}

async function logEvent(licenseId: string | null, deviceHash: string | null, eventType: string, detail: Record<string, unknown> = {}) {
  await admin.from("privatai_license_events").insert({
    license_id: licenseId,
    device_hash: deviceHash,
    event_type: eventType,
    detail,
  });
}

async function ensureLicenseExpiry(row: any) {
  if (row.activation_mode === "fixed") {
    const fixed = row.fixed_expires_at || row.expires_at;
    return { ...row, expires_at: fixed };
  }

  if (row.expires_at) return row;

  const activatedAt = row.first_activated_at || new Date().toISOString();
  const expiresAt = new Date(new Date(activatedAt).getTime() + Number(row.validity_days || 30) * DAY_MS).toISOString();
  const { data, error } = await admin
    .from("privatai_licenses")
    .update({
      first_activated_at: row.first_activated_at || activatedAt,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function handleTrial(body: any) {
  const deviceHash = cleanText(body?.device_id, 128);
  if (!deviceHash || deviceHash.length < 16) return json({ valid: false, error: "DEVICE_REQUIRED" }, 400);

  const cfg = await settings();
  const { data: existing, error: lookupError } = await admin
    .from("privatai_trials")
    .select("*")
    .eq("device_hash", deviceHash)
    .maybeSingle();
  if (lookupError) return json({ valid: false, error: "TRIAL_LOOKUP_FAILED", detail: lookupError.message }, 500);

  let trial = existing;
  if (!trial) {
    const startedAt = new Date().toISOString();
    const expiresAt = isoAfterDays(cfg.trial_days);
    const { data, error } = await admin
      .from("privatai_trials")
      .insert({
        device_hash: deviceHash,
        device_label: cleanText(body?.device_label),
        platform: cleanText(body?.platform, 80),
        app_version: cleanText(body?.app_version, 40),
        started_at: startedAt,
        expires_at: expiresAt,
        last_seen_at: startedAt,
      })
      .select("*")
      .single();
    if (error) return json({ valid: false, error: "TRIAL_CREATE_FAILED", detail: error.message }, 500);
    trial = data;
  } else {
    await admin.from("privatai_trials").update({
      last_seen_at: new Date().toISOString(),
      device_label: cleanText(body?.device_label) || trial.device_label,
      platform: cleanText(body?.platform, 80) || trial.platform,
      app_version: cleanText(body?.app_version, 40) || trial.app_version,
    }).eq("id", trial.id);
  }

  const isValid = !expired(trial.expires_at);
  return json({
    valid: isValid,
    status: isValid ? "trial" : "trial_expired",
    trialStartedAt: trial.started_at,
    trialExpiresAt: trial.expires_at,
    serverTime: new Date().toISOString(),
    onlineCheckHours: cfg.online_check_hours,
    message: isValid ? "Essai PrivatAI actif." : "La période d'essai de 7 jours est terminée.",
  }, isValid ? 200 : 402);
}

async function lookupLicense(code: string) {
  const { data, error } = await admin
    .from("privatai_licenses")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function handleActivate(body: any) {
  const code = normalizeCode(body?.code);
  const deviceHash = cleanText(body?.device_id, 128);
  if (!code || !deviceHash || deviceHash.length < 16) return json({ valid: false, error: "CODE_AND_DEVICE_REQUIRED" }, 400);

  let license = await lookupLicense(code);
  if (!license) {
    await logEvent(null, deviceHash, "activation_rejected", { reason: "unknown_code" });
    return json({ valid: false, error: "LICENSE_NOT_FOUND", message: "Code de licence invalide." }, 404);
  }
  if (!license.active) {
    await logEvent(license.id, deviceHash, "activation_rejected", { reason: "inactive" });
    return json({ valid: false, error: "LICENSE_INACTIVE", message: "Cette licence a été désactivée par l'administrateur." }, 403);
  }

  license = await ensureLicenseExpiry(license);
  if (expired(license.expires_at)) {
    await logEvent(license.id, deviceHash, "activation_rejected", { reason: "expired" });
    return json({ valid: false, error: "LICENSE_EXPIRED", expiresAt: license.expires_at, message: "Cette licence est expirée." }, 402);
  }

  const { data: device } = await admin
    .from("privatai_license_devices")
    .select("*")
    .eq("license_id", license.id)
    .eq("device_hash", deviceHash)
    .maybeSingle();

  if (device?.revoked_at) {
    return json({ valid: false, error: "DEVICE_REVOKED", message: "Cet appareil a été révoqué pour cette licence." }, 403);
  }

  if (!device) {
    const { count } = await admin
      .from("privatai_license_devices")
      .select("id", { count: "exact", head: true })
      .eq("license_id", license.id)
      .is("revoked_at", null);
    if ((count || 0) >= Number(license.max_devices || 1)) {
      await logEvent(license.id, deviceHash, "activation_rejected", { reason: "device_limit", max_devices: license.max_devices });
      return json({ valid: false, error: "DEVICE_LIMIT_REACHED", message: "Le nombre maximal d'appareils autorisés pour cette licence est atteint." }, 409);
    }

    const { error } = await admin.from("privatai_license_devices").insert({
      license_id: license.id,
      device_hash: deviceHash,
      device_label: cleanText(body?.device_label),
      platform: cleanText(body?.platform, 80),
      app_version: cleanText(body?.app_version, 40),
    });
    if (error) return json({ valid: false, error: "DEVICE_ACTIVATION_FAILED", detail: error.message }, 500);
  } else {
    await admin.from("privatai_license_devices").update({
      last_seen_at: new Date().toISOString(),
      device_label: cleanText(body?.device_label) || device.device_label,
      platform: cleanText(body?.platform, 80) || device.platform,
      app_version: cleanText(body?.app_version, 40) || device.app_version,
    }).eq("id", device.id);
  }

  await admin.from("privatai_licenses").update({ last_validated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", license.id);
  await logEvent(license.id, deviceHash, "activated", { app_version: cleanText(body?.app_version, 40) });
  const cfg = await settings();

  return json({
    valid: true,
    status: "licensed",
    expiresAt: license.expires_at,
    customerName: license.customer_name,
    maxDevices: license.max_devices,
    serverTime: new Date().toISOString(),
    onlineCheckHours: cfg.online_check_hours,
    message: "Licence PrivatAI activée avec succès.",
  });
}

async function handleValidate(body: any) {
  const code = normalizeCode(body?.code);
  const deviceHash = cleanText(body?.device_id, 128);
  if (!code || !deviceHash || deviceHash.length < 16) return json({ valid: false, error: "CODE_AND_DEVICE_REQUIRED" }, 400);

  let license = await lookupLicense(code);
  if (!license) return json({ valid: false, error: "LICENSE_NOT_FOUND", message: "Licence introuvable." }, 404);
  if (!license.active) return json({ valid: false, error: "LICENSE_INACTIVE", message: "Licence désactivée." }, 403);
  license = await ensureLicenseExpiry(license);
  if (expired(license.expires_at)) return json({ valid: false, error: "LICENSE_EXPIRED", expiresAt: license.expires_at, message: "Licence expirée." }, 402);

  const { data: device, error } = await admin
    .from("privatai_license_devices")
    .select("*")
    .eq("license_id", license.id)
    .eq("device_hash", deviceHash)
    .maybeSingle();
  if (error) return json({ valid: false, error: "DEVICE_LOOKUP_FAILED", detail: error.message }, 500);
  if (!device) return json({ valid: false, error: "DEVICE_NOT_ACTIVATED", message: "Cette licence n'est pas activée sur cet appareil." }, 403);
  if (device.revoked_at) return json({ valid: false, error: "DEVICE_REVOKED", message: "Cet appareil a été révoqué." }, 403);

  const seenAt = new Date().toISOString();
  await Promise.all([
    admin.from("privatai_license_devices").update({ last_seen_at: seenAt, app_version: cleanText(body?.app_version, 40) || device.app_version }).eq("id", device.id),
    admin.from("privatai_licenses").update({ last_validated_at: seenAt, updated_at: seenAt }).eq("id", license.id),
  ]);
  await logEvent(license.id, deviceHash, "validated", {});
  const cfg = await settings();

  return json({
    valid: true,
    status: "licensed",
    expiresAt: license.expires_at,
    customerName: license.customer_name,
    maxDevices: license.max_devices,
    serverTime: seenAt,
    onlineCheckHours: cfg.online_check_hours,
    message: "Licence valide.",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "trial");
    if (action === "trial") return await handleTrial(body);
    if (action === "activate") return await handleActivate(body);
    if (action === "validate") return await handleValidate(body);
    return json({ valid: false, error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    console.error("privatai-license", error);
    return json({ valid: false, error: "INTERNAL_ERROR", detail: String((error as Error)?.message || error) }, 500);
  }
});
