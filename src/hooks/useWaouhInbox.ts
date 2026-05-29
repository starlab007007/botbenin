import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-history", {
        body: { sessionId, authUserId },
      });
      if (!error && data?.ok && Array.isArray(data.conversations)) {
        setItems(data.conversations as WaouhInboxItem[]);
      }
    } catch (e) {
      console.debug("[waouh-inbox] refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, [sessionId, authUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: re-fetch on any new message or notification touching this device.
  useEffect(() => {
    const ch = supabase
      .channel(`waouh-inbox-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_conversations" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_notifications" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, refresh]);

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
