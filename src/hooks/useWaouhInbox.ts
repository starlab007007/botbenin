import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WaouhInboxItem = {
  id: string;
  user_id: string;
  phone_number: string | null;
  channel: string;
  last_message: string | null;
  last_direction: string | null;
  last_inbound_at: string | null;
  unread_count: number;
  updated_at: string;
};

/** Unified inbox aggregating App + WhatsApp conversations for the current device/account. */
export function useWaouhInbox(sessionId: string, authUserId: string | null) {
  const [items, setItems] = useState<WaouhInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fallbackDirect = useCallback(async () => {
    try {
      // Fallback direct query when edge function is unreachable.
      let q = supabase
        .from("waouh_conversations")
        .select("id,user_id,phone_number,channel,last_message,last_direction,last_inbound_at,unread_count,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (authUserId) {
        // Get waouh_users ids for this auth user
        const { data: users } = await supabase
          .from("waouh_users")
          .select("id")
          .eq("auth_user_id", authUserId);
        const ids = (users ?? []).map((u: any) => u.id);
        if (ids.length) q = q.in("user_id", ids);
        else return;
      } else if (sessionId) {
        q = q.eq("phone_number", `web:${sessionId}`);
      }
      const { data } = await q;
      if (Array.isArray(data)) setItems(data as WaouhInboxItem[]);
    } catch (e) {
      console.debug("[waouh-inbox] fallback failed", e);
    }
  }, [sessionId, authUserId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const body = authUserId ? { authUserId } : { sessionId };
      const { data, error } = await supabase.functions.invoke("waouh-history", { body });
      if (!error && data?.ok && Array.isArray(data.conversations)) {
        setItems(data.conversations as WaouhInboxItem[]);
      } else {
        await fallbackDirect();
      }
    } catch (e) {
      console.debug("[waouh-inbox] refresh failed, falling back", e);
      await fallbackDirect();
    } finally {
      setLoading(false);
    }
  }, [sessionId, authUserId, fallbackDirect]);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refresh(), 250);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: scoped by identity, debounced to avoid flood.
  useEffect(() => {
    const convFilter = authUserId ? undefined : `phone_number=eq.web:${sessionId}`;
    // waouh_conversations has user_id column but for anon session we filter by phone_number web:<sid>.
    // For authed users we'd need user_id in (...) which realtime cannot express;
    // rely on backend function refresh + debounce.
    const ch = supabase
      .channel(`waouh-inbox-${authUserId ?? sessionId}`)
      .on(
        "postgres_changes",
        convFilter
          ? { event: "*", schema: "public", table: "waouh_conversations", filter: convFilter }
          : { event: "*", schema: "public", table: "waouh_conversations" },
        () => debouncedRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_notifications" },
        () => debouncedRefresh(),
      )
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(ch);
    };
  }, [sessionId, authUserId, debouncedRefresh]);

  const totalUnread = items.reduce((s, it) => s + (it.unread_count || 0), 0);

  const markRead = useCallback(async (conversationId: string) => {
    try {
      await supabase.rpc("waouh_mark_conversation_read" as any, { p_conv_id: conversationId });
    } catch (e) {
      console.debug("[waouh-inbox] markRead failed", e);
    }
    setItems((prev) =>
      prev.map((it) => (it.id === conversationId ? { ...it, unread_count: 0 } : it))
    );
  }, []);

  return { items, loading, refresh, totalUnread, markRead };
}
