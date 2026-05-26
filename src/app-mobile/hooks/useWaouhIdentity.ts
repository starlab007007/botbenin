import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "./useMobileAuth";

const SESSION_KEY = "waouh_web_session_id";

export function getWaouhSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Resolve the underlying waouh_users.id(s) for the current device/account.
 * Messages and conversations are keyed on waouh_users.id (NOT auth.users.id),
 * so any realtime filter or list query must use these IDs.
 */
export function useWaouhIdentity() {
  const { user } = useMobileAuth();
  const sessionId = getWaouhSessionId();
  const [waouhUserIds, setWaouhUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ors: string[] = [];
      if (user?.id) ors.push(`auth_user_id.eq.${user.id}`);
      if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
      if (!ors.length) {
        if (!cancelled) { setWaouhUserIds([]); setReady(true); }
        return;
      }
      const { data } = await supabase
        .from("waouh_users")
        .select("id, auth_user_id, web_session_id")
        .or(ors.join(","))
        .limit(20);
      if (cancelled) return;
      const ids = Array.from(new Set((data ?? []).map((u: any) => u.id)));
      setWaouhUserIds(ids);
      setReady(true);

      // Best-effort: link this device's session to the authenticated account
      if (user?.id && data) {
        const orphan = (data as any[]).find((u) => u.web_session_id === sessionId && !u.auth_user_id);
        if (orphan) {
          supabase.from("waouh_users").update({ auth_user_id: user.id }).eq("id", orphan.id).then(() => {}, () => {});
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, sessionId]);

  return { sessionId, waouhUserIds, authUserId: user?.id ?? null, ready };
}
