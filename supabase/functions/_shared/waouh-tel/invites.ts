import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { randomCode, sha256Hex } from "./crypto.ts";

export function inviteCodeFromMessage(text: string) {
  const match = text.trim().match(/^BONJOUR\s+([A-Z0-9-]{4,32})$/i);
  return match ? match[1].toUpperCase().replace(/[^A-Z0-9]/g, "") : null;
}

export async function findActiveInvite(admin: SupabaseClient, code: string) {
  const codeHash = await sha256Hex(
    code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  );
  const { data, error } = await admin.from("waouh_tel_invites").select("*").eq(
    "code_hash",
    codeHash,
  ).maybeSingle();
  if (error) throw new Error(`invite_lookup_failed:${error.message}`);
  if (
    !data || data.status !== "active" || data.use_count >= data.max_uses ||
    (data.expires_at && Date.parse(data.expires_at) <= Date.now())
  ) return null;
  return data;
}

export async function redeemInvite(
  admin: SupabaseClient,
  code: string,
  telUserId: string,
  eventId?: string | null,
) {
  const invite = await findActiveInvite(admin, code);
  if (!invite) return { ok: false as const, reason: "invite_invalid" };
  const { data: existing } = await admin.from("waouh_tel_invite_redemptions")
    .select("id").eq("invite_id", invite.id).eq("tel_user_id", telUserId)
    .maybeSingle();
  if (existing) return { ok: true as const, invite, already_redeemed: true };
  const nextCount = invite.use_count + 1;
  const { data: claimed, error: claimError } = await admin.from(
    "waouh_tel_invites",
  ).update({
    use_count: nextCount,
    status: nextCount >= invite.max_uses ? "exhausted" : "active",
  }).eq("id", invite.id).eq("use_count", invite.use_count).eq(
    "status",
    "active",
  ).select("*").maybeSingle();
  if (claimError || !claimed) {
    return { ok: false as const, reason: "invite_already_claimed" };
  }
  const { error } = await admin.from("waouh_tel_invite_redemptions").insert({
    invite_id: invite.id,
    tel_user_id: telUserId,
    event_id: eventId ?? null,
  });
  if (error) throw new Error(`invite_redemption_failed:${error.message}`);
  return { ok: true as const, invite: claimed, already_redeemed: false };
}

export async function createInvite(
  admin: SupabaseClient,
  options: {
    campaign?: string | null;
    initialMessage?: string | null;
    maxUses?: number;
    expiresAt?: string | null;
    createdBy?: string | null;
  },
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode(8);
    const { data, error } = await admin.from("waouh_tel_invites").insert({
      code_hash: await sha256Hex(code),
      code_hint: `${code.slice(0, 2)}••${code.slice(-2)}`,
      campaign: options.campaign || null,
      initial_message: options.initialMessage?.trim().slice(0, 160) ||
        "BONJOUR",
      max_uses: Math.max(
        1,
        Math.min(100_000, Math.trunc(options.maxUses || 1)),
      ),
      expires_at: options.expiresAt || null,
      created_by: options.createdBy || null,
    }).select("*").single();
    if (!error) return { code, invite: data };
    if (error.code !== "23505") {
      throw new Error(`invite_create_failed:${error.message}`);
    }
  }
  throw new Error("invite_code_generation_failed");
}
