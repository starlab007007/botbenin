import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "waouh_chat_read_v1";

type ReadMap = Record<string, string>; // convId -> ISO lastReadAt

function readMap(): ReadMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function writeMap(m: ReadMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch {}
}

export function markConversationRead(convId: string) {
  const m = readMap();
  m[convId] = new Date().toISOString();
  writeMap(m);
  window.dispatchEvent(new CustomEvent("waouh-chat-read", { detail: { convId } }));
}

/**
 * Compute unread counts (direction='in' AND created_at > lastReadAt) per conversation.
 * Subscribes to Realtime INSERT on waouh_messages and bumps counts live.
 */
export function useUnreadCounts(convIds: string[], userId?: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const recompute = useCallback(async () => {
    if (!convIds.length) { setCounts({}); return; }
    const map = readMap();
    const next: Record<string, number> = {};
    // Run in parallel; small N (<=50 in current list)
    await Promise.all(convIds.map(async (id) => {
      const since = map[id] ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("waouh_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", id)
        .eq("direction", "in")
        .gt("created_at", since);
      next[id] = count ?? 0;
    }));
    setCounts(next);
  }, [convIds.join("|")]);

  useEffect(() => { recompute(); }, [recompute]);

  // Listen to read events to clear locally
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.convId;
      if (id) setCounts((c) => ({ ...c, [id]: 0 }));
    };
    window.addEventListener("waouh-chat-read", handler);
    return () => window.removeEventListener("waouh-chat-read", handler);
  }, []);

  // Realtime: bump on incoming messages
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`mobile-unread-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `user_id=eq.${userId}` },
        (p) => {
          const m: any = p.new;
          if (m.direction !== "in") return;
          if (!convIds.includes(m.conversation_id)) return;
          setCounts((c) => ({ ...c, [m.conversation_id]: (c[m.conversation_id] ?? 0) + 1 }));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, convIds.join("|")]);

  return counts;
}
