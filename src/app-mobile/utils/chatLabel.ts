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
  // WhatsApp "@lid" or "@c.us" suffixes — keep the leading digits
  const cleaned = raw.replace(/@.*/, "").replace(/^\+?/, "+");
  // Try to space-group the last 8 digits
  const m = cleaned.match(/^(\+\d{1,4})(\d+)$/);
  if (m) {
    const tail = m[2].replace(/(\d{2})(?=\d)/g, "$1 ");
    return `${m[1]} ${tail}`.trim();
  }
  return cleaned;
}

/** Short, stable ID for web sessions: "Web #ABCDEF". */
export function shortWebId(idOrPhone: string | null | undefined): string {
  if (!idOrPhone) return "Web #?";
  const raw = idOrPhone.startsWith("web:") ? idOrPhone.slice(4) : idOrPhone;
  const clean = raw.replace(/[^a-z0-9]/gi, "");
  return `Web #${clean.slice(-6).toUpperCase()}`;
}

export function formatConvLabel(conv: ConvLike, user?: WaouhUserLike | null): string {
  const channel = (conv.channel ?? user?.channel ?? "").toLowerCase();
  if (channel === "whatsapp") {
    return formatPhone(user?.phone_number ?? conv.phone_number);
  }
  if (channel === "app") {
    return user?.display_name?.trim() || formatPhone(user?.phone_number) || "Utilisateur";
  }
  // web / fallback
  return shortWebId(conv.phone_number ?? user?.phone_number ?? conv.id);
}

export function convInitials(label: string): string {
  const cleaned = label.replace(/^(\+|Web #)/, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(-2).toUpperCase() || "??";
}

export function channelBadge(channel: string | null | undefined): { label: string; tint: string } {
  const c = (channel ?? "web").toLowerCase();
  if (c === "whatsapp") return { label: "WhatsApp", tint: "bg-emerald-500 text-white" };
  if (c === "app") return { label: "App", tint: "bg-sky-500 text-white" };
  return { label: "Web", tint: "bg-slate-500 text-white" };
}
