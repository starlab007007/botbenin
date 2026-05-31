// Shared admin guard for WAOUH ops edge functions.
import { createClient } from "npm:@supabase/supabase-js@2";

export async function requireAdmin(req: Request, sb: any): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return { ok: false, status: 401, error: "Invalid session" };
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role_name: "admin" });
    if (!isAdmin) return { ok: false, status: 403, error: "Admin role required" };
    return { ok: true, userId: u.user.id };
  } catch (e) {
    return { ok: false, status: 401, error: String(e) };
  }
}

/**
 * Push a system message into the chat window of a given waouh_user, scoped
 * to an article so it shows up in the buyer/seller chat for that listing.
 * Inserts into waouh_messages (direction "out") and is read by WaouhMatchChatWindow.
 */
export async function pushDealChatEvent(
  sb: any,
  waouhUserId: string,
  articleId: string | null,
  text: string,
  meta: Record<string, any>,
) {
  if (!waouhUserId) return;
  const { data: wu } = await sb
    .from("waouh_users")
    .select("id, web_session_id")
    .eq("id", waouhUserId)
    .maybeSingle();
  if (!wu) return;
  const { data: conv } = await sb
    .from("waouh_conversations")
    .select("id")
    .eq("user_id", wu.id)
    .limit(1)
    .maybeSingle();
  await sb.from("waouh_messages").insert({
    conversation_id: conv?.id ?? null,
    user_id: wu.id,
    web_session_id: wu.web_session_id,
    channel: wu.web_session_id ? "web" : "system",
    direction: "out",
    text,
    article_id: articleId,
    meta: { kind: "deal_event", ...meta, at: new Date().toISOString() },
  });
}
