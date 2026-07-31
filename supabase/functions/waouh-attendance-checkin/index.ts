// Check-in public depuis un QR scan. Valide géolocalisation, dernier 4 du téléphone,
// insère un événement et pousse un message WhatsApp à l'employeur via waouh_outbound_queue.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ACTION_LABELS: Record<string, string> = {
  arrival: "Arrivée",
  break_start: "Début de pause",
  break_end: "Fin de pause",
  departure: "Sortie",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { qr_token, employee_id, last4, action, lat, lng } = await req.json();
    if (!qr_token || !employee_id || !action || lat == null || lng == null) throw new Error("Paramètres manquants");
    if (!["arrival", "break_start", "break_end", "departure"].includes(action)) throw new Error("Action invalide");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: site } = await admin.from("waouh_attendance_sites").select("*").eq("qr_token", qr_token).eq("active", true).maybeSingle();
    if (!site) throw new Error("QR invalide ou site désactivé");

    const distance = haversine(Number(lat), Number(lng), Number(site.lat), Number(site.lng));
    if (distance > site.radius_m) {
      return new Response(JSON.stringify({ error: `Vous êtes à ${Math.round(distance)} m du site (max ${site.radius_m} m). Rapprochez-vous.` }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: emp } = await admin.from("waouh_attendance_employees").select("*").eq("id", employee_id).eq("site_id", site.id).eq("active", true).maybeSingle();
    if (!emp) throw new Error("Employé introuvable");
    if (last4 && String(emp.msisdn_last4) !== String(last4).slice(-4)) {
      return new Response(JSON.stringify({ error: "Les 4 derniers chiffres du téléphone ne correspondent pas." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: ev, error: evErr } = await admin.from("waouh_attendance_events").insert({
      site_id: site.id, employee_id, action, lat, lng, distance_m: Math.round(distance),
    }).select().single();
    if (evErr) throw evErr;

    // Notification WhatsApp employeur via outbound queue
    const time = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });
    const message = `📍 *${ACTION_LABELS[action]}* — ${emp.full_name}\n📅 ${time}\n🏢 ${site.name}\n📞 ${emp.msisdn}\n📏 ${Math.round(distance)} m du site`;
    try {
      await admin.from("waouh_outbound_queue").insert({
        to_msisdn: site.employer_msisdn,
        body: message,
        status: "pending",
        metadata: { source: "attendance_qr", event_id: ev.id, site_id: site.id },
      });
      await admin.from("waouh_attendance_events").update({ notification_sent: true }).eq("id", ev.id);
    } catch (_) { /* queue may have different shape */ }

    return new Response(JSON.stringify({ ok: true, message: `${ACTION_LABELS[action]} enregistrée`, distance_m: Math.round(distance) }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
