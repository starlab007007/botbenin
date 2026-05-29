// Helpers to render human-friendly labels for chats coming from multiple
// sources (web sessions, WhatsApp numbers, in-app authenticated users).

export type ConvLike = {
  id: string;
  channel?: string | null;
  phone_number?: string | null;
  user_id?: string | null;
};

export type WaouhUserLike = {
  id: string;
  display_name?: string | null;
  phone_number?: string | null;
  channel?: string | null;
  auth_user_id?: string | null;
};

/** Format a raw phone number (digits) into a readable form. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/@.*/, "").replace(/^\+?/, "+");
  const m = cleaned.match(/^(\+\d{1,4})(\d+)$/);
  if (m) {
    const tail = m[2].replace(/(\d{2})(?=\d)/g, "$1 ");
    return `${m[1]} ${tail}`.trim();
  }
  return cleaned;
}

/** Short alphanumeric tail (uppercase) used to derive WAOUH codes. */
function tailOf(value: string | null | undefined, n: number): string {
  if (!value) return "";
  const raw = value.startsWith("web:") ? value.slice(4) : value;
  return raw.replace(/[^a-z0-9]/gi, "").slice(-n).toUpperCase();
}

/** Fallback short ID for a generic WAOUH chat: "WAOUH·CHAT-XXXX". */
export function shortWebId(idOrPhone: string | null | undefined): string {
  const t = tailOf(idOrPhone, 4);
  return `WAOUH·CHAT-${t || "0000"}`;
}

/** Product-scoped match chat label: WAOUH·ACH-{ART4}-{USR3} or WAOUH·VEN-… */
export function formatMatchLabel(opts: {
  articleId?: string | null;
  userKey?: string | null;
  role: "buyer" | "seller";
}): string {
  const art = tailOf(opts.articleId, 4) || "ANNO";
  const usr = tailOf(opts.userKey, 3) || "000";
  const prefix = opts.role === "buyer" ? "ACH" : "VEN";
  return `WAOUH·${prefix}-${art}-${usr}`;
}

export function formatConvLabel(conv: ConvLike, user?: WaouhUserLike | null): string {
  const channel = (conv.channel ?? user?.channel ?? "").toLowerCase();
  if (channel === "whatsapp") {
    return formatPhone(user?.phone_number ?? conv.phone_number);
  }
  if (channel === "app") {
    return user?.display_name?.trim() || formatPhone(user?.phone_number) || "Utilisateur";
  }
  return shortWebId(conv.phone_number ?? user?.phone_number ?? conv.id);
}

export function convInitials(label: string): string {
  const cleaned = label
    .replace(/^WAOUH·(ACH|VEN|CHAT)-/, "")
    .replace(/^(\+|Web #)/, "")
    .trim();
  const parts = cleaned.split(/[\s\-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  return cleaned.slice(-2).toUpperCase() || "??";
}

export function channelBadge(channel: string | null | undefined): { label: string; tint: string } {
  const c = (channel ?? "web").toLowerCase();
  if (c === "whatsapp") return { label: "WhatsApp", tint: "bg-emerald-500 text-white" };
  if (c === "app") return { label: "App", tint: "bg-sky-500 text-white" };
  return { label: "WAOUH", tint: "bg-teal-600 text-white" };
}
