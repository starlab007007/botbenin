// Shared helpers to resolve contact/channel + rehost media for the WAOUH flow.
// Used by waouh-sell-handler, waouh-buy-handler, waouh-notify-dispatch,
// waouh-channel-in, waouh-radar-process, waouh-partner-ai.

export type WaouhChannel = "whatsapp" | "waouh_app" | "radar_ia" | "partner";

export interface ResolvedContact {
  channel: WaouhChannel;
  whatsapp: string | null;       // normalized MSISDN, no '+', e.g. "22965653468"
  waouhUserId: string | null;    // waouh_users.id
  partnerId: string | null;      // waouh_partners.id
}

export function normalizeBeninPhone(value?: string | null): string | null {
  const raw = String(value || "").replace(/@c\.us|@lid/g, "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  const last10 = digits.slice(-10);
  if (last10.length === 10 && last10.startsWith("01")) return `229${last10}`;
  const last8 = digits.slice(-8);
  return last8.length === 8 ? `229${last8}` : (digits.length > 8 ? digits : null);
}

/**
 * Resolve the contact for an article (seller) or buyer profile (buyer),
 * given a Supabase service-role client.
 *
 * `row` must contain at least: source_channel, contact_whatsapp, partner_id,
 * and seller_id/user_id (depending on the table).
 */
export async function resolveContact(
  sb: any,
  row: any,
  opts: { kind: "seller" | "buyer" }
): Promise<ResolvedContact> {
  const channel = (row?.source_channel || "waouh_app") as WaouhChannel;
  const userId = opts.kind === "seller" ? row?.seller_id : row?.user_id;

  // Direct whatsapp from row
  const rowWa = normalizeBeninPhone(row?.contact_whatsapp);
  if (channel === "whatsapp" && rowWa) {
    return { channel, whatsapp: rowWa, waouhUserId: userId ?? null, partnerId: row?.partner_id ?? null };
  }

  // Partner WhatsApp
  if (channel === "partner" && row?.partner_id) {
    const { data: p } = await sb.from("waouh_partners").select("whatsapp, telephone").eq("id", row.partner_id).maybeSingle();
    const wa = normalizeBeninPhone(p?.whatsapp || p?.telephone);
    return { channel, whatsapp: wa, waouhUserId: userId ?? null, partnerId: row.partner_id };
  }

  // Radar signal phone (best-effort)
  if (channel === "radar_ia" && row?.origin_signal_id) {
    const { data: sig } = await sb
      .from("waouh_radar_signals")
      .select("contact_whatsapp, contact_phone, payload")
      .eq("id", row.origin_signal_id)
      .maybeSingle();
    const wa = normalizeBeninPhone(sig?.contact_whatsapp || sig?.contact_phone || sig?.payload?.phone);
    return { channel, whatsapp: wa || rowWa, waouhUserId: userId ?? null, partnerId: null };
  }

  // App / fallback: look up waouh_users.phone if any
  let wa = rowWa;
  if (!wa && userId) {
    const { data: u } = await sb.from("waouh_users").select("phone, phone_number").eq("id", userId).maybeSingle();
    wa = normalizeBeninPhone(u?.phone || u?.phone_number);
  }
  return { channel: channel || "waouh_app", whatsapp: wa, waouhUserId: userId ?? null, partnerId: row?.partner_id ?? null };
}

// ----- Media rehosting (shared) -----

function mediaExt(mime: string) {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  if (/mp4|video/i.test(mime)) return "mp4";
  return "jpeg";
}

/**
 * Download a remote/WAHA-protected media URL and store it in the public
 * `waouh-media` bucket. Returns the stable public URL or null on failure.
 */
export async function rehostMedia(
  sb: any,
  sourceUrl: string,
  mime: string = "image/jpeg",
  opts: { wahaBaseUrl?: string; wahaApiKey?: string } = {}
): Promise<string | null> {
  try {
    if (!sourceUrl) return null;
    // Already hosted in our bucket
    if (sourceUrl.includes("/waouh-media/")) return sourceUrl;
    const headers: Record<string, string> = {};
    if (opts.wahaApiKey && opts.wahaBaseUrl && sourceUrl.startsWith(opts.wahaBaseUrl.replace(/\/$/, ""))) {
      headers["X-Api-Key"] = opts.wahaApiKey;
    }
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    const ext = mediaExt(mime);
    const path = `inbound/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("waouh-media").upload(path, buf, {
      contentType: mime || "image/jpeg",
      upsert: false,
    });
    if (error) return null;
    const { data: pub } = sb.storage.from("waouh-media").getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch {
    return null;
  }
}

/**
 * Rehost all photo URLs of an array, in parallel. Returns rehosted URLs,
 * falling back to the original URL when rehost fails.
 */
export async function rehostPhotos(
  sb: any,
  photos: string[] | null | undefined,
  opts: { wahaBaseUrl?: string; wahaApiKey?: string } = {}
): Promise<string[]> {
  if (!photos?.length) return [];
  const out = await Promise.all(
    photos.map(async (u) => (await rehostMedia(sb, u, "image/jpeg", opts)) || u)
  );
  return out.filter(Boolean);
}
