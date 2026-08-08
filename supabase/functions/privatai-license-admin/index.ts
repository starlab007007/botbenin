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
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function requireAdmin(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const token = authorization.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("AUTH_INVALID");
  const { data: allowed, error: roleError } = await admin.rpc("has_role", {
    _user_id: data.user.id,
    _role_name: "admin",
  });
  if (roleError) throw new Error(`ADMIN_CHECK_FAILED:${roleError.message}`);
  if (!allowed) throw new Error("ADMIN_REQUIRED");
  return { admin, user: data.user };
}

function randomGroup(length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function newLicenseCode() {
  return `PA-${randomGroup()}-${randomGroup()}-${randomGroup()}`;
}

const safeText = (value: unknown, max = 500) => String(value || "").trim().slice(0, max) || null;

function statusOf(row: any) {
  if (!row.active) return "inactive";
  const expiry = row.expires_at || row.fixed_expires_at;
  if (expiry && new Date(expiry).getTime() <= Date.now()) return "expired";
  if (!row.first_activated_at) return "unused";
  return "active";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const { admin, user } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "overview");

    if (action === "overview") {
      const [settingsRes, licensesRes, devicesRes, trialsRes, eventsRes] = await Promise.all([
        admin.from("privatai_license_settings").select("*").eq("id", 1).maybeSingle(),
        admin.from("privatai_licenses").select("*").order("created_at", { ascending: false }).limit(1000),
        admin.from("privatai_license_devices").select("*").order("last_seen_at", { ascending: false }).limit(2000),
        admin.from("privatai_trials").select("*").order("last_seen_at", { ascending: false }).limit(1000),
        admin.from("privatai_license_events").select("*").order("created_at", { ascending: false }).limit(300),
      ]);
      const firstError = settingsRes.error || licensesRes.error || devicesRes.error || trialsRes.error || eventsRes.error;
      if (firstError) return json({ error: "DATABASE_ERROR", detail: firstError.message }, 500);

      const devices = devicesRes.data || [];
      const deviceCount = new Map<string, number>();
      for (const device of devices) {
        if (!device.revoked_at) deviceCount.set(device.license_id, (deviceCount.get(device.license_id) || 0) + 1);
      }
      const licenses = (licensesRes.data || []).map((row: any) => ({
        ...row,
        status: statusOf(row),
        active_devices: deviceCount.get(row.id) || 0,
      }));
      const trials = trialsRes.data || [];
      const now = Date.now();
      const stats = {
        total_licenses: licenses.length,
        active_licenses: licenses.filter((x: any) => x.status === "active").length,
        unused_licenses: licenses.filter((x: any) => x.status === "unused").length,
        expired_licenses: licenses.filter((x: any) => x.status === "expired").length,
        inactive_licenses: licenses.filter((x: any) => x.status === "inactive").length,
        active_devices: devices.filter((x: any) => !x.revoked_at).length,
        total_trials: trials.length,
        active_trials: trials.filter((x: any) => new Date(x.expires_at).getTime() > now).length,
      };
      return json({ settings: settingsRes.data, licenses, devices, trials, events: eventsRes.data || [], stats });
    }

    if (action === "generate_licenses") {
      const count = Math.min(Math.max(Number(body?.count) || 1, 1), 100);
      const validityDays = Math.min(Math.max(Number(body?.validity_days) || 30, 1), 3650);
      const maxDevices = Math.min(Math.max(Number(body?.max_devices) || 1, 1), 100);
      const activationMode = body?.activation_mode === "fixed" ? "fixed" : "first_use";
      const fixedExpiresAt = activationMode === "fixed" && body?.fixed_expires_at ? new Date(body.fixed_expires_at).toISOString() : null;
      if (activationMode === "fixed" && !fixedExpiresAt) return json({ error: "FIXED_EXPIRY_REQUIRED" }, 400);

      const generated: any[] = [];
      let attempts = 0;
      while (generated.length < count && attempts < count * 20) {
        attempts += 1;
        const code = newLicenseCode();
        const { data, error } = await admin.from("privatai_licenses").insert({
          code,
          customer_name: safeText(body?.customer_name, 180),
          customer_email: safeText(body?.customer_email, 240),
          notes: safeText(body?.notes),
          validity_days: validityDays,
          activation_mode: activationMode,
          fixed_expires_at: fixedExpiresAt,
          expires_at: fixedExpiresAt,
          max_devices: maxDevices,
          active: true,
          created_by: user.id,
        }).select("*").single();
        if (!error && data) {
          generated.push({ ...data, status: statusOf(data), active_devices: 0 });
          continue;
        }
        if (error?.code === "23505") continue;
        return json({ error: "GENERATE_FAILED", detail: error?.message || "Erreur inconnue" }, 400);
      }
      if (generated.length !== count) return json({ error: "GENERATION_INCOMPLETE", generated_count: generated.length }, 500);
      return json({ generated, count: generated.length });
    }

    if (action === "toggle_license") {
      const licenseId = String(body?.license_id || "");
      const active = Boolean(body?.active);
      const { error } = await admin.from("privatai_licenses").update({ active, updated_at: new Date().toISOString() }).eq("id", licenseId);
      if (error) return json({ error: "TOGGLE_FAILED", detail: error.message }, 400);
      await admin.from("privatai_license_events").insert({ license_id: licenseId, event_type: active ? "admin_enabled" : "admin_disabled", detail: { admin_user_id: user.id } });
      return json({ ok: true });
    }

    if (action === "update_license") {
      const licenseId = String(body?.license_id || "");
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body?.customer_name !== undefined) update.customer_name = safeText(body.customer_name, 180);
      if (body?.customer_email !== undefined) update.customer_email = safeText(body.customer_email, 240);
      if (body?.notes !== undefined) update.notes = safeText(body.notes);
      if (body?.max_devices !== undefined) update.max_devices = Math.min(Math.max(Number(body.max_devices) || 1, 1), 100);
      if (body?.validity_days !== undefined) update.validity_days = Math.min(Math.max(Number(body.validity_days) || 1, 1), 3650);
      if (body?.expires_at !== undefined) update.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
      const { data, error } = await admin.from("privatai_licenses").update(update).eq("id", licenseId).select("*").single();
      if (error) return json({ error: "UPDATE_FAILED", detail: error.message }, 400);
      await admin.from("privatai_license_events").insert({ license_id: licenseId, event_type: "admin_updated", detail: { admin_user_id: user.id } });
      return json({ license: { ...data, status: statusOf(data) } });
    }

    if (action === "reset_license") {
      const licenseId = String(body?.license_id || "");
      const { data: row, error: lookupError } = await admin.from("privatai_licenses").select("activation_mode,fixed_expires_at").eq("id", licenseId).single();
      if (lookupError) return json({ error: "LICENSE_NOT_FOUND", detail: lookupError.message }, 404);
      await admin.from("privatai_license_devices").delete().eq("license_id", licenseId);
      const { error } = await admin.from("privatai_licenses").update({
        first_activated_at: null,
        expires_at: row.activation_mode === "fixed" ? row.fixed_expires_at : null,
        last_validated_at: null,
        active: true,
        updated_at: new Date().toISOString(),
      }).eq("id", licenseId);
      if (error) return json({ error: "RESET_FAILED", detail: error.message }, 400);
      await admin.from("privatai_license_events").insert({ license_id: licenseId, event_type: "admin_reset", detail: { admin_user_id: user.id } });
      return json({ ok: true });
    }

    if (action === "revoke_device") {
      const deviceId = String(body?.device_id || "");
      const revoked = body?.revoked !== false;
      const { data, error } = await admin.from("privatai_license_devices").update({
        revoked_at: revoked ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
      }).eq("id", deviceId).select("license_id,device_hash").single();
      if (error) return json({ error: "DEVICE_UPDATE_FAILED", detail: error.message }, 400);
      await admin.from("privatai_license_events").insert({
        license_id: data.license_id,
        device_hash: data.device_hash,
        event_type: revoked ? "admin_device_revoked" : "admin_device_restored",
        detail: { admin_user_id: user.id },
      });
      return json({ ok: true });
    }

    if (action === "update_settings") {
      const update = {
        trial_days: Math.min(Math.max(Number(body?.trial_days) || 7, 1), 90),
        default_validity_days: Math.min(Math.max(Number(body?.default_validity_days) || 30, 1), 3650),
        default_max_devices: Math.min(Math.max(Number(body?.default_max_devices) || 1, 1), 100),
        online_check_hours: Math.min(Math.max(Number(body?.online_check_hours) || 24, 1), 720),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await admin.from("privatai_license_settings").update(update).eq("id", 1).select("*").single();
      if (error) return json({ error: "SETTINGS_FAILED", detail: error.message }, 400);
      return json({ settings: data });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (message === "AUTH_REQUIRED" || message === "AUTH_INVALID") return json({ error: message }, 401);
    if (message === "ADMIN_REQUIRED") return json({ error: message }, 403);
    if (message.startsWith("ADMIN_CHECK_FAILED:")) return json({ error: "ADMIN_CHECK_FAILED", detail: message.slice(19) }, 500);
    console.error("privatai-license-admin", error);
    return json({ error: "INTERNAL_ERROR", detail: message }, 500);
  }
});
