// deno-lint-ignore-file no-explicit-any
// Deal Room : propriétaire sans compte WAOUH.
// Bot le joint par WhatsApp avec un lien qui ouvre l'échange sans application ni compte,
// relaie les nouveautés de l'échange, et reçoit ses réponses (WhatsApp ou lien).
// Règle prudente : seuls les partenaires, entreprises publiques et personnes ayant
// elles-mêmes publié leur offre ou initié le contact sont joints automatiquement.
import { CENTRAL_WAHA_SESSION, centralWhatsAppHealth } from "./waouh-central-whatsapp.ts";
import { decryptPhone, encryptPhone, hashPhone, sha256Hex } from "./waouh-tel/crypto.ts";
import { normalizeE164, phoneLast4 } from "./waouh-tel/phone.ts";

export const ROOM_GUEST_ACTOR = "00000000-0000-4000-8000-0000000ae01e";
export const ROOM_GUEST_TEMPLATE = "deal_room_guest_outreach";
const SITE = "https://bot.bj";
const ALLOWED_CONSENT = new Set(["public_business", "initiated", "opt_in", "partner_contract"]);
const GUEST_ACTIONS = new Set(["get", "message", "propose", "accept", "reject", "receipt", "payment_receive", "complete", "rating", "stop"]);

export const roomGuestReference = (roomId: string) => `DR-${roomId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const guestLink = (token: string) => `${SITE}/echange-deal#${token}`;
const money = (n: unknown) => new Intl.NumberFormat("fr-FR").format(Number(n) || 0);

type RoomContact = { phone: string; name: string | null; basis: "partner" | "public_business" | "initiated" | "listing_owner" | "listing_contact"; contactId: string | null };

/** Contact joignable automatiquement pour une offre, ou null. */
/** Plafonds du premier message automatique (numéro publié dans l'annonce, après « Confier à l'avatar »). */
export const LISTING_CONTACT_DAILY_PER_BUYER = 10;
export const LISTING_CONTACT_DAILY_GLOBAL = 60;

export async function resolveRoomContact(sb: any, sourceRef: string, opts: { delegated?: boolean } = {}): Promise<RoomContact | null> {
  if (sourceRef.startsWith("catalog:")) {
    const { data: row } = await sb.from("waouh_unified_catalog")
      .select("source,vendeur_nom,vendeur_whatsapp,vendeur_phone,is_active").eq("id", sourceRef.slice(8)).maybeSingle();
    if (!row || row.is_active === false) return null;
    const phone = normalizeE164(row.vendeur_whatsapp || row.vendeur_phone);
    if (!phone) return null;
    if (row.source === "partner") return { phone, name: row.vendeur_nom ?? null, basis: "partner", contactId: null };
    // Vendeur ayant lui-même publié son offre auprès de WAOUH.
    if (row.source === "chat") return { phone, name: row.vendeur_nom ?? null, basis: "listing_owner", contactId: null };
    return null;
  }
  if (sourceRef.startsWith("external:")) {
    const { data: signal } = await sb.from("waouh_external_commerce_signals")
      .select("entity_id,actor_name").eq("id", sourceRef.slice(9)).maybeSingle();
    if (!signal?.entity_id) return null;
    const { data: rows } = await sb.from("waouh_entity_contacts")
      .select("id,channel,value_encrypted,consent_state,is_public_business,contactability_level,verification_status,is_whatsapp_reachable")
      .eq("entity_id", signal.entity_id).in("channel", ["whatsapp", "phone"]).limit(20);
    for (const row of rows ?? []) {
      if (!row.value_encrypted || row.consent_state === "revoked") continue;
      const qualified = row.is_public_business === true || ALLOWED_CONSENT.has(String(row.consent_state));
      // Numéro publié dans l'annonce : l'acheteur a confié la démarche à l'avatar, et le numéro est bien sur WhatsApp.
      const listing = opts.delegated === true && row.is_whatsapp_reachable === true && row.verification_status === "reachable"
        && /^C[1-5]$/.test(String(row.contactability_level));
      if (!qualified && !listing) continue;
      let phone: string | null = null;
      try { phone = normalizeE164(await decryptPhone(row.value_encrypted)); } catch { phone = null; }
      if (phone) return { phone, name: signal.actor_name ?? null, basis: row.is_public_business === true ? "public_business" : qualified ? "initiated" : "listing_contact", contactId: row.id };
    }
  }
  return null;
}

/** L'offre a-t-elle un interlocuteur joignable (membre WAOUH ou contact autorisé) ? */
export async function sourceReachable(sb: any, sourceRef: string, delegated = false): Promise<boolean> {
  if (sourceRef.startsWith("article:")) {
    const { data } = await sb.from("waouh_articles").select("id").eq("id", sourceRef.slice(8)).eq("status", "active").maybeSingle();
    return !!data;
  }
  return !!(await resolveRoomContact(sb, sourceRef, { delegated }));
}

async function enqueue(sb: any, phone: string, text: string, payload: Record<string, unknown>, dedupe: string) {
  const { error } = await sb.rpc("waouh_enqueue_outbound_v2", {
    p_to_phone: phone.replace(/\D/g, ""), p_to_user_id: null, p_template: ROOM_GUEST_TEMPLATE,
    p_payload: { waha_session: CENTRAL_WAHA_SESSION, text, actions: [], ...payload },
    p_web_session_id: null, p_image_url: null, p_channel: "whatsapp", p_dedupe_key: dedupe, p_event_type: "deal_room_guest",
  });
  if (error) throw error;
}

async function notifyOwner(sb: any, roomId: string, text: string, key: string) {
  const { data: link } = await sb.from("waouh_deal_room_links").select("owner_id").eq("id", roomId).maybeSingle();
  if (!link?.owner_id) return;
  const { data: user } = await sb.from("waouh_users").select("id").eq("auth_user_id", link.owner_id).order("created_at").limit(1).maybeSingle();
  if (!user) return;
  const { error } = await sb.from("waouh_notifications").insert({
    user_id: user.id, notification_type: "avatar_mission_progress", photos: [], channel: "waouh_app", delivery_status: "recorded",
    dedupe_key: key, payload: { text, url: `/app/deal-room?room_id=${roomId}`, room_id: roomId },
  });
  if (error && error.code !== "23505") console.warn("[room-guest] notice", error.code);
}

/** Premier message automatique : session saine et plafonds quotidiens par acheteur et au total. */
async function listingContactAllowed(sb: any, ownerId: string | null | undefined): Promise<boolean> {
  try { if (!(await centralWhatsAppHealth()).working) return false; } catch { return false; }
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count: global } = await sb.from("waouh_room_guests").select("room_id", { count: "exact", head: true })
    .eq("consent_basis", "listing_contact").gte("created_at", since.toISOString());
  if ((global ?? 0) >= LISTING_CONTACT_DAILY_GLOBAL) return false;
  if (ownerId) {
    const { data: rooms } = await sb.from("waouh_deal_room_links").select("id").eq("owner_id", ownerId);
    const ids = (rooms ?? []).map((r: any) => r.id);
    if (ids.length) {
      const { count: mine } = await sb.from("waouh_room_guests").select("room_id", { count: "exact", head: true })
        .eq("consent_basis", "listing_contact").gte("created_at", since.toISOString()).in("room_id", ids);
      if ((mine ?? 0) >= LISTING_CONTACT_DAILY_PER_BUYER) return false;
    }
  }
  return true;
}

/**
 * Joint le propriétaire d'un échange qui n'a pas encore d'interlocuteur.
 * Idempotent : un échange n'est contacté qu'une fois ; un numéro ayant répondu STOP ne l'est plus jamais.
 */
export async function reachRoomOwner(sb: any, roomId: string): Promise<"joined" | "contacted" | "already" | "unreachable" | "pending"> {
  const { data: comp } = await sb.from("waouh_convergence_components").select("id,provider_id,title,kind,source_ref").eq("id", roomId).maybeSingle();
  if (!comp) return "unreachable";
  const pendingGuest = comp.provider_id === ROOM_GUEST_ACTOR;
  if (comp.provider_id && !pendingGuest) return "joined";
  const { data: existing } = await sb.from("waouh_room_guests").select("room_id").eq("room_id", roomId).maybeSingle();
  if (existing) return "already";
  // Annonce externe sans contact joignable : l'acheteur peut déjà écrire et proposer ; tout part dès qu'un contact est trouvé.
  const waitForContact = async () => {
    if (pendingGuest || !String(comp.source_ref || "").startsWith("external:")) return "unreachable" as const;
    const { data: ok } = await sb.rpc("waouh_room_attach_pending_guest", { p_room: roomId });
    return ok === true ? ("pending" as const) : ("unreachable" as const);
  };
  const { data: link } = await sb.from("waouh_deal_room_links").select("owner_id,control_mode").eq("id", roomId).maybeSingle();
  const contact = await resolveRoomContact(sb, String(comp.source_ref || ""), { delegated: link?.control_mode === "bot" });
  if (!contact) return await waitForContact();
  if (contact.basis === "listing_contact" && !(await listingContactAllowed(sb, link?.owner_id))) return await waitForContact();
  const phoneHash = await hashPhone(contact.phone);
  const { data: refused } = await sb.from("waouh_room_guests").select("room_id").eq("phone_hash", phoneHash).eq("status", "stopped").limit(1);
  if (refused?.length) return "unreachable";
  let since: string | null = null;
  if (pendingGuest) {
    const { data: ev } = await sb.from("waouh_room_events").select("created_at").eq("room_id", roomId).eq("event_type", "seller_pending").order("id").limit(1).maybeSingle();
    since = ev?.created_at ? new Date(Date.parse(ev.created_at) - 1000).toISOString() : null;
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
  const reference = roomGuestReference(roomId);
  const { error } = await sb.from("waouh_room_guests").insert({
    room_id: roomId, reference, display_name: contact.name, phone_encrypted: await encryptPhone(contact.phone), phone_hash: phoneHash,
    phone_last4: phoneLast4(contact.phone), consent_basis: contact.basis, contact_id: contact.contactId,
    token_hash: await sha256Hex(token), token_encrypted: await encryptPhone(token), token_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    ...(since ? { relayed_until: since } : {}),
  });
  if (error) { if (error.code === "23505") return "already"; throw error; }
  const { data: attached, error: attachError } = pendingGuest ? { data: true, error: null } : await sb.rpc("waouh_room_attach_guest", { p_room: roomId });
  if (attachError || attached !== true) { await sb.from("waouh_room_guests").delete().eq("room_id", roomId); return attached === false ? "joined" : "unreachable"; }
  const who = comp.kind === "announcement" ? "un candidat" : "un client";
  const what = comp.kind === "announcement" ? "votre annonce" : "votre offre";
  await enqueue(sb, contact.phone,
    contact.basis === "listing_contact"
      ? `Bonjour${contact.name ? ` ${contact.name}` : ""}, je suis l’assistant WAOUH d’${who === "un candidat" ? "un candidat" : "un acheteur"} intéressé par ${what} « ${comp.title} », publiée en ligne avec ce numéro. Il souhaite en discuter avec vous. Répondez simplement ici, ou ouvrez l’échange sans application ni compte : ${guestLink(token)} · Réf. ${reference} · Répondez STOP pour ne plus être contacté.`
      : `Bonjour${contact.name ? ` ${contact.name}` : ""}, ${who} passe par WAOUH pour ${what} « ${comp.title} ». Son assistant va vous écrire pour en discuter. Répondez simplement ici, ou ouvrez l’échange sans application ni compte : ${guestLink(token)} · Réf. ${reference} · Répondez STOP pour ne plus être contacté.`,
    { room_id: roomId, reference, first_contact: true }, `dr-first:${roomId}`);
  // Bot écrit tout de suite (proposition initiale), puis ce message est relayé.
  await sb.rpc("waouh_room_tick", { p_limit: 1, p_room_id: roomId });
  await relayRoomGuests(sb, roomId);
  return "contacted";
}

/** Relaie par WhatsApp ce qui est nouveau dans l'échange (messages, proposition, accord). */
export async function relayRoomGuests(sb: any, roomId?: string) {
  let query = sb.from("waouh_room_guests").select("*").in("status", ["contacted", "joined"]).gt("token_expires_at", new Date().toISOString());
  if (roomId) query = query.eq("room_id", roomId);
  const { data: guests } = await query.limit(100);
  let sent = 0;
  for (const g of guests ?? []) {
    try {
      const since = g.relayed_until ?? new Date(Date.parse(g.contacted_at) - 1000).toISOString();
      const [{ data: msgs }, { data: ag }, { data: link }] = await Promise.all([
        sb.from("waouh_business_messages").select("id,text,created_at").eq("component_id", g.room_id).neq("actor_id", ROOM_GUEST_ACTOR).gt("created_at", since).order("created_at").limit(10),
        sb.from("waouh_convergence_agreements").select("version,status,terms").eq("component_id", g.room_id).maybeSingle(),
        sb.from("waouh_deal_room_links").select("last_offer_actor").eq("id", g.room_id).maybeSingle(),
      ]);
      const lines = (msgs ?? []).map((m: any) => `Message : ${String(m.text).slice(0, 600)}`);
      let version = g.relayed_version, status = g.relayed_status;
      if (ag?.status === "proposed" && ag.version > g.relayed_version && link?.last_offer_actor !== ROOM_GUEST_ACTOR) {
        lines.push(`Proposition : ${money(ag.terms?.amount)} F · quantité ${ag.terms?.quantity ?? 1}${ag.terms?.payment ? ` · ${ag.terms.payment}` : ""}. Acceptez-la ou proposez autre chose dans l’échange.`);
        version = ag.version;
      }
      if (ag && ["accepted", "completed"].includes(ag.status) && ag.status !== g.relayed_status) {
        lines.push(ag.status === "accepted" ? "Accord confirmé par les deux parties. La remise et le paiement se confirment dans l’échange." : "Échange clôturé. Merci.");
        status = ag.status;
      }
      if (!lines.length) continue;
      const token = await decryptPhone(g.token_encrypted);
      const phone = await decryptPhone(g.phone_encrypted);
      const text = `${lines.join("\n")}\nRépondez ici ou dans l’échange : ${guestLink(token)} · Réf. ${g.reference}`;
      await enqueue(sb, phone, text, { room_id: g.room_id, reference: g.reference }, `dr-relay:${g.room_id}:${await sha256Hex(text)}`);
      const lastAt = msgs?.length ? msgs[msgs.length - 1].created_at : new Date().toISOString();
      await sb.from("waouh_room_guests").update({ relayed_until: lastAt, relayed_version: version, relayed_status: status }).eq("room_id", g.room_id);
      sent++;
    } catch (e) {
      console.warn("[room-guest] relay", e instanceof Error ? e.message : "failed");
    }
  }
  return { sent };
}

async function stopRoom(sb: any, guest: any) {
  await sb.rpc("waouh_room_guest_stop", { p_room: guest.room_id });
  if (guest.contact_id) await sb.from("waouh_entity_contacts").update({ consent_state: "revoked" }).eq("id", guest.contact_id);
  await notifyOwner(sb, guest.room_id, "Le vendeur ne souhaite pas être contacté. Bot passe à l’offre suivante si vous en avez confié d’autres.", `room-guest-stop:${guest.room_id}`);
}

const uuidFrom = async (value: string) => {
  const h = await sha256Hex(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/**
 * Réponse WhatsApp entrante d'un propriétaire contacté pour un Deal Room.
 * Retourne le texte de réponse automatique, ou null si ce numéro n'est lié à aucun échange.
 */
export async function handleRoomGuestInbound(sb: any, phoneCandidates: string[], text: string, messageRef: string): Promise<string | null> {
  const hashes = [...new Set(await Promise.all(phoneCandidates.map((p) => normalizeE164(p)).filter(Boolean).map((p) => hashPhone(p as string))))];
  if (!hashes.length) return null;
  const { data: guests } = await sb.from("waouh_room_guests").select("room_id,reference,status,contact_id")
    .in("phone_hash", hashes).neq("status", "stopped").gt("token_expires_at", new Date().toISOString()).order("contacted_at", { ascending: false }).limit(20);
  if (!guests?.length) return null;
  const body = String(text || "").trim();
  if (/^stop\b/i.test(body)) {
    for (const g of guests) await stopRoom(sb, g);
    return "C’est noté : vous ne serez plus contacté pour ces échanges.";
  }
  const ref = body.match(/\bDR-([A-F0-9]{8})\b/i)?.[1]?.toUpperCase();
  const target = ref ? guests.find((g: any) => g.reference === `DR-${ref}`) : guests.length === 1 ? guests[0] : null;
  if (!target) return `Plusieurs échanges sont en cours. Ajoutez la référence (${guests.map((g: any) => g.reference).join(", ")}) à votre message.`;
  const clean = body.replace(/\bDR-[A-F0-9]{8}\b/ig, "").trim();
  if (!clean) return "Écrivez votre message après la référence.";
  const { error } = await sb.rpc("waouh_room_command", {
    p_actor: ROOM_GUEST_ACTOR, p_action: "message",
    p: { deal_room_id: target.room_id, text: clean.slice(0, 2000), request_id: await uuidFrom(`dr-in:${messageRef}`) },
  });
  if (error) { console.warn("[room-guest] inbound", error.code); return "Votre message n’a pas pu être transmis. Réessayez dans quelques instants."; }
  await sb.from("waouh_room_guests").update({ status: "joined", joined_at: new Date().toISOString(), last_inbound_at: new Date().toISOString() }).eq("room_id", target.room_id).eq("status", "contacted");
  await sb.from("waouh_room_guests").update({ last_inbound_at: new Date().toISOString() }).eq("room_id", target.room_id);
  await notifyOwner(sb, target.room_id, `Le vendeur a répondu : « ${clean.slice(0, 160)} »`, `room-guest-reply:${messageRef}`);
  return "Message transmis. Vous recevrez la réponse ici.";
}

/**
 * Accès par lien (sans compte) : le jeton n'ouvre que son propre échange, avec les seules
 * actions d'un interlocuteur. Retourne { status, body }.
 */
export async function handleRoomGuestRequest(sb: any, token: string, action: string, payload: Record<string, unknown>) {
  if (!/^[a-f0-9]{64}$/.test(token) || !GUEST_ACTIONS.has(action)) return { status: 400, body: { ok: false, error: "invitation_unavailable" } };
  const { data: guest } = await sb.from("waouh_room_guests").select("*").eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (!guest || guest.status === "stopped" || Date.parse(guest.token_expires_at) <= Date.now()) return { status: 404, body: { ok: false, error: "invitation_unavailable" } };
  if (guest.status === "contacted") await sb.from("waouh_room_guests").update({ status: "joined", joined_at: new Date().toISOString() }).eq("room_id", guest.room_id);
  if (action === "stop") { await stopRoom(sb, guest); return { status: 200, body: { ok: true, data: { stopped: true } } }; }
  const p: Record<string, unknown> = { ...payload, deal_room_id: guest.room_id };
  if (action !== "get" && typeof p.request_id !== "string") p.request_id = crypto.randomUUID();
  const { data, error } = await sb.rpc("waouh_room_command", { p_actor: ROOM_GUEST_ACTOR, p_action: action, p });
  if (error) return { status: 409, body: { ok: false, error: error.message } };
  if (action !== "get") {
    await sb.from("waouh_room_guests").update({ last_inbound_at: new Date().toISOString() }).eq("room_id", guest.room_id);
    await sb.from("waouh_deal_room_links").update({ next_run_at: new Date().toISOString() }).eq("id", guest.room_id).eq("control_mode", "bot");
    await sb.rpc("waouh_room_tick", { p_limit: 1, p_room_id: guest.room_id });
    await notifyOwner(sb, guest.room_id, action === "message" ? "Le vendeur vous a écrit dans l’échange." : "Le vendeur a mis à jour l’échange.", `room-guest-act:${guest.room_id}:${String(p.request_id)}`);
    const fresh = await sb.rpc("waouh_room_snapshot", { p_actor: ROOM_GUEST_ACTOR, p_room: guest.room_id });
    if (!fresh.error) return { status: 200, body: { ok: true, data: { ...fresh.data, guest_name: guest.display_name } } };
  }
  return { status: 200, body: { ok: true, data: { ...data, guest_name: guest.display_name } } };
}


/**
 * Un vendeur joint qui ne répond pas après les relances : l'acheteur est prévenu une seule fois,
 * l'offre reste en veille et l'avatar continue à chercher une autre voie.
 */
export async function notifyRoomSilence(sb: any): Promise<number> {
  const { data: links } = await sb.from("waouh_deal_room_links").select("id,owner_id,expires_at,followups,mandate")
    .eq("control_mode", "bot").lte("expires_at", new Date().toISOString()).limit(50);
  let sent = 0;
  for (const link of links ?? []) {
    const { data: guest } = await sb.from("waouh_room_guests").select("room_id,last_inbound_at,status").eq("room_id", link.id).maybeSingle();
    if (!guest || guest.last_inbound_at || guest.status === "stopped") continue;
    const { data: comp } = await sb.from("waouh_convergence_components").select("title").eq("id", link.id).maybeSingle();
    await notifyOwner(sb, link.id, `Pas de réponse du vendeur pour « ${comp?.title ?? "cette offre"} » après les relances. Votre démarche reste en veille ; vous pouvez choisir une autre offre ou relancer.`, `room-silent:${link.id}`);
    sent++;
  }
  return sent;
}
