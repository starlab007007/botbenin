// deno-lint-ignore-file no-explicit-any
// WAOUH — Livraison dans la Deal Room.
// Un accord « livraison » assigne un livreur (ville proche, moins chargé). Le livreur reçoit un lien sans compte,
// l'acheteur un code à lui donner à la remise. Code correct = réception et remise confirmées dans l'échange.
import { enqueue, notifyOwner } from "./waouh-room-guest.ts";
import { sha256Hex } from "./waouh-tel/crypto.ts";

const SITE = "https://bot.bj";
const MAX_CODE_ATTEMPTS = 5;
const courierLink = (token: string) => `${SITE}/livraison#${token}`;
const money = (n: unknown) => new Intl.NumberFormat("fr-FR").format(Number(n) || 0);

/** Code à 6 chiffres propre à l'échange et à la version de l'accord ; rien n'est stocké. */
export async function deliveryCode(roomId: string, version: number): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`delivery:${roomId}:${version}`)));
  const n = ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

const sameCity = (a: string, b: string) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));

async function pickCourier(sb: any, city: string) {
  const { data: couriers } = await sb.from("waouh_couriers").select("id,name,phone_number,city").eq("active", true).limit(100);
  if (!couriers?.length) return null;
  const { data: busy } = await sb.from("waouh_room_deliveries").select("courier_id").in("status", ["assigned", "picked_up"]).not("courier_id", "is", null).limit(2000);
  const load = new Map<string, number>();
  for (const r of busy ?? []) load.set(String(r.courier_id), (load.get(String(r.courier_id)) || 0) + 1);
  const target = city.trim().toLowerCase();
  return [...couriers].sort((a: any, b: any) => {
    const sa = sameCity(String(a.city || "").trim().toLowerCase(), target) ? 1 : 0, sb2 = sameCity(String(b.city || "").trim().toLowerCase(), target) ? 1 : 0;
    if (sa !== sb2) return sb2 - sa;
    const d = (load.get(String(a.id)) || 0) - (load.get(String(b.id)) || 0);
    return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
  })[0];
}

/** Accords « livraison » confirmés : crée la livraison puis assigne un livreur. Rejouable sans doublon. */
export async function assignRoomDeliveries(sb: any): Promise<number> {
  const { data: agreements } = await sb.from("waouh_convergence_agreements").select("component_id,version,terms").eq("status", "accepted").limit(200);
  const wanted = (agreements ?? []).filter((a: any) => a.terms?.delivery_mode === "delivery" && String(a.terms?.delivery_address || "").trim().length >= 5);
  if (!wanted.length) return 0;
  const ids = wanted.map((a: any) => a.component_id);
  const [{ data: rooms }, { data: existing }, { data: comps }] = await Promise.all([
    sb.from("waouh_deal_room_links").select("id").in("id", ids),
    sb.from("waouh_room_deliveries").select("room_id,status,agreement_version").in("room_id", ids),
    sb.from("waouh_convergence_components").select("id,title,source_snapshot,mission_id").in("id", ids),
  ]);
  const roomSet = new Set((rooms ?? []).map((r: any) => r.id)), have = new Map((existing ?? []).map((d: any) => [d.room_id, d]));
  let assigned = 0;
  for (const a of wanted) {
    if (!roomSet.has(a.component_id)) continue;
    const comp = (comps ?? []).find((c: any) => c.id === a.component_id);
    const row = have.get(a.component_id) as any;
    try {
      if (!row) {
        const { data: mission } = await sb.from("waouh_convergence_missions").select("city").eq("id", comp?.mission_id).maybeSingle();
        const { error } = await sb.from("waouh_room_deliveries").insert({
          room_id: a.component_id, agreement_version: a.version, delivery_address: String(a.terms.delivery_address).slice(0, 300),
          delivery_fee: Number(a.terms.delivery_fee) > 0 ? Number(a.terms.delivery_fee) : null,
          pickup_city: String(comp?.source_snapshot?.product?.city || mission?.city || "").slice(0, 120) || null,
        });
        if (error && error.code !== "23505") throw error;
      } else if (row.status !== "pending") continue;
      if (await assignOne(sb, a.component_id, comp?.title ?? "votre commande")) assigned++;
    } catch (e) { console.warn("[room-delivery] assign", e instanceof Error ? e.message : "failed"); }
  }
  return assigned;
}

async function assignOne(sb: any, roomId: string, title: string): Promise<boolean> {
  const { data: d } = await sb.from("waouh_room_deliveries").select("*").eq("room_id", roomId).maybeSingle();
  if (!d || d.status !== "pending") return false;
  const courier = await pickCourier(sb, String(d.pickup_city || ""));
  if (!courier) {
    const attempts = (d.attempts ?? 0) + 1;
    await sb.from("waouh_room_deliveries").update({ attempts, updated_at: new Date().toISOString() }).eq("room_id", roomId);
    if (attempts === 3) await notifyOwner(sb, roomId, "La livraison est en attente : aucun livreur n’est disponible pour l’instant. Nous réessayons automatiquement.", `delivery-wait:${roomId}`);
    return false;
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
  const { data: claimed } = await sb.from("waouh_room_deliveries").update({
    status: "assigned", courier_id: courier.id, courier_name: courier.name ?? "Livreur", token_hash: await sha256Hex(token), assigned_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("room_id", roomId).eq("status", "pending").select("room_id");
  if (!claimed?.length) return false;
  const fee = d.delivery_fee ? ` · Frais ${money(d.delivery_fee)} F` : "";
  if (courier.phone_number) {
    await enqueue(sb, String(courier.phone_number), `Nouvelle livraison WAOUH : « ${title} ».\nRécupération : ${d.pickup_city || "à préciser"}\nLivraison : ${d.delivery_address}${fee}\nOuvrez la mission : ${courierLink(token)}`,
      { room_id: roomId }, `dr-courier:${roomId}:${d.agreement_version}`);
  }
  await notifyOwner(sb, roomId, `Livreur assigné pour « ${title} ». Votre code de remise est dans l’échange : donnez-le au livreur à la livraison.`, `delivery-assigned:${roomId}:${d.agreement_version}`);
  return true;
}

/** Actions du livreur, par lien sans compte : consulter, signaler la collecte, valider la remise avec le code. */
export async function handleCourierRequest(sb: any, token: string, action: string, payload: Record<string, unknown>) {
  if (!/^[a-f0-9]{64}$/.test(token) || !["get", "pickup", "deliver"].includes(action)) return { status: 400, body: { ok: false, error: "link_unavailable" } };
  const { data: d } = await sb.from("waouh_room_deliveries").select("*").eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (!d) return { status: 404, body: { ok: false, error: "link_unavailable" } };
  const { data: comp } = await sb.from("waouh_convergence_components").select("title").eq("id", d.room_id).maybeSingle();
  const view = () => ({ title: comp?.title ?? "Livraison", status: d.status, pickup_city: d.pickup_city, address: d.delivery_address, fee: d.delivery_fee });
  if (action === "get") return { status: 200, body: { ok: true, data: view() } };
  if (action === "pickup") {
    if (d.status === "assigned") {
      await sb.from("waouh_room_deliveries").update({ status: "picked_up", picked_up_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("room_id", d.room_id).eq("status", "assigned");
      await notifyOwner(sb, d.room_id, "Le livreur a récupéré votre commande et se met en route.", `delivery-pickup:${d.room_id}:${d.agreement_version}`);
      d.status = "picked_up";
    }
    return { status: 200, body: { ok: true, data: view() } };
  }
  if (d.status === "delivered") return { status: 200, body: { ok: true, data: view() } };
  if (!["assigned", "picked_up"].includes(d.status)) return { status: 409, body: { ok: false, error: "link_unavailable" } };
  if ((d.attempts ?? 0) >= MAX_CODE_ATTEMPTS) return { status: 429, body: { ok: false, error: "too_many_attempts" } };
  const given = String(payload.code ?? "").replace(/\D/g, "");
  if (given !== await deliveryCode(d.room_id, d.agreement_version)) {
    await sb.from("waouh_room_deliveries").update({ attempts: (d.attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq("room_id", d.room_id);
    return { status: 422, body: { ok: false, error: "wrong_code" } };
  }
  const { error } = await sb.rpc("waouh_room_delivery_complete", { p_room: d.room_id });
  if (error) { console.warn("[room-delivery] complete", error.message); return { status: 409, body: { ok: false, error: "request_failed" } }; }
  await notifyOwner(sb, d.room_id, "Livraison confirmée avec votre code. Il reste à confirmer le paiement dans l’échange.", `delivery-done:${d.room_id}:${d.agreement_version}`);
  d.status = "delivered";
  return { status: 200, body: { ok: true, data: view() } };
}
