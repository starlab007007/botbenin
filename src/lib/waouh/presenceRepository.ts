// Parité Web ↔ Flutter (branche codex) : présence QR.
// Mêmes tables (waouh_presence_*), mêmes RPC v5 et mêmes edge functions
// (waouh-presence-qr-create / -qr-preview / -checkin) que l'app Flutter.
import { supabase } from "@/integrations/supabase/client";

export type PresenceSite = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  max_accuracy_meters: number | null;
  require_geolocation: boolean;
  require_employee_code: boolean;
  require_pin: boolean;
  responsible_whatsapp: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PresenceMember = {
  id: string;
  site_id: string;
  display_name: string;
  employee_code: string | null;
  member_email: string | null;
  member_phone: string | null;
  role: string;
  status: string;
};

export type PresenceEvent = {
  id: string;
  site_id: string;
  member_id: string | null;
  action: string;
  occurred_at: string;
  inside_radius: boolean | null;
  distance_meters: number | null;
  accuracy_meters: number | null;
  waouh_presence_sites?: { name: string } | null;
  waouh_presence_members?: { display_name: string } | null;
};

export type PresenceQrToken = {
  qr_payload: string;
  expires_at?: string | null;
  use_limit?: number | null;
};

const db = supabase as any;

function nullable(value?: string | null) {
  const text = (value ?? "").trim();
  return text.length ? text : null;
}

function single<T>(raw: any, message: string): T {
  if (Array.isArray(raw)) {
    if (raw.length && raw[0] && typeof raw[0] === "object") return raw[0] as T;
  } else if (raw && typeof raw === "object") {
    return raw as T;
  }
  throw new Error(message);
}

async function invoke(fn: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || `Le service ${fn} a échoué.`);
  if (!data || typeof data !== "object") throw new Error(`Réponse ${fn} invalide.`);
  const err = (data as any).error;
  if (err) throw new Error(typeof err === "string" ? err : "Opération Présence QR impossible.");
  return data as any;
}

export const presenceRepository = {
  async claimMemberships() {
    await db.rpc("waouh_presence_claim_memberships_v5");
  },

  async fetchSites(): Promise<PresenceSite[]> {
    try {
      await this.claimMemberships();
    } catch {
      /* non bloquant */
    }
    const { data, error } = await db
      .from("waouh_presence_sites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as PresenceSite[];
  },

  async fetchSite(siteId: string): Promise<PresenceSite | null> {
    const { data, error } = await db
      .from("waouh_presence_sites")
      .select("*")
      .eq("id", siteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as PresenceSite) || null;
  },

  async fetchDashboard(siteId?: string | null) {
    const { data, error } = await db.rpc("waouh_presence_dashboard_v5", {
      p_site_id: siteId ?? null,
    });
    if (error) throw new Error(error.message);
    return (data || {}) as Record<string, any>;
  },

  async fetchMembers(siteId: string): Promise<PresenceMember[]> {
    const { data, error } = await db
      .from("waouh_presence_members")
      .select("*")
      .eq("site_id", siteId)
      .order("display_name");
    if (error) throw new Error(error.message);
    return (data || []) as PresenceMember[];
  },

  async fetchEvents(siteId?: string | null, limit = 100): Promise<PresenceEvent[]> {
    let query = db
      .from("waouh_presence_events")
      .select(
        "id,site_id,member_id,action,occurred_at,inside_radius,distance_meters,accuracy_meters," +
          "waouh_presence_sites(name),waouh_presence_members(display_name)",
      );
    if (siteId) query = query.eq("site_id", siteId);
    const { data, error } = await query.order("occurred_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data || []) as PresenceEvent[];
  },

  async saveSite(input: {
    siteId?: string | null;
    name: string;
    address?: string | null;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    maxAccuracyMeters?: number;
    requireGeolocation?: boolean;
    requireEmployeeCode?: boolean;
    requirePin?: boolean;
    responsibleWhatsapp?: string | null;
    active?: boolean;
  }): Promise<PresenceSite> {
    const name = input.name.trim();
    if (!name) throw new Error("Nom du site obligatoire");
    if (input.latitude < -90 || input.latitude > 90) throw new Error("Latitude invalide");
    if (input.longitude < -180 || input.longitude > 180) throw new Error("Longitude invalide");
    if (input.radiusMeters < 10 || input.radiusMeters > 10000)
      throw new Error("Rayon compris entre 10 et 10 000 mètres");

    const params: Record<string, unknown> = {
      p_name: name,
      p_address: nullable(input.address),
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_radius_meters: input.radiusMeters,
      p_max_accuracy_meters: input.maxAccuracyMeters ?? 100,
      p_require_geolocation: input.requireGeolocation ?? true,
      p_require_employee_code: input.requireEmployeeCode ?? false,
      p_require_pin: input.requirePin ?? false,
      p_responsible_whatsapp: nullable(input.responsibleWhatsapp),
      p_active: input.active ?? true,
    };
    if (input.siteId) params.p_site_id = input.siteId;

    const { data, error } = await db.rpc(
      input.siteId ? "waouh_presence_update_site_v5" : "waouh_presence_create_site_v5",
      params,
    );
    if (error) throw new Error(error.message);
    return single<PresenceSite>(data, "Réponse de configuration du site invalide.");
  },

  async saveMember(input: {
    siteId: string;
    memberId?: string | null;
    displayName: string;
    employeeCode?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string;
    pin?: string | null;
  }): Promise<PresenceMember> {
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Nom du membre obligatoire");
    const pin = nullable(input.pin);
    if (pin && !/^\d{4}$/.test(pin)) throw new Error("Le PIN doit contenir 4 chiffres");

    const { data, error } = await db.rpc("waouh_presence_upsert_member_v5", {
      p_site_id: input.siteId,
      p_member_id: input.memberId ?? null,
      p_display_name: displayName,
      p_employee_code: nullable(input.employeeCode),
      p_email: nullable(input.email),
      p_phone: nullable(input.phone),
      p_role: input.role || "member",
      p_pin: pin,
    });
    if (error) throw new Error(error.message);
    return single<PresenceMember>(data, "Réponse de gestion de l'équipe invalide.");
  },

  async setMemberStatus(memberId: string, status: string) {
    const { error } = await db.rpc("waouh_presence_set_member_status_v5", {
      p_member_id: memberId,
      p_status: status,
    });
    if (error) throw new Error(error.message);
  },

  async createQrToken(siteId: string, validityMinutes = 60 * 24 * 30, useLimit = 500): Promise<PresenceQrToken> {
    const data = await invoke("waouh-presence-qr-create", {
      site_id: siteId,
      validity_minutes: validityMinutes,
      use_limit: useLimit,
      replace_active: true,
    });
    const payload = String(data.qr_payload ?? data.token ?? "").trim();
    if (!payload) throw new Error("Le QR de pointage n'a pas pu être généré.");
    return { qr_payload: payload, expires_at: data.expires_at ?? null, use_limit: data.use_limit ?? null };
  },

  async previewQr(qrPayload: string) {
    return invoke("waouh-presence-qr-preview", { qr_payload: qrPayload });
  },

  async record(input: {
    qrPayload: string;
    action: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    employeeCode?: string | null;
    pin?: string | null;
  }) {
    return invoke("waouh-presence-checkin", {
      qr_payload: input.qrPayload,
      action: input.action,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_meters: input.accuracyMeters,
      employee_code: nullable(input.employeeCode),
      pin: nullable(input.pin),
    });
  },
};
