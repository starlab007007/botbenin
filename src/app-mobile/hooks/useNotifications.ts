import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "./useMobileAuth";

export type AppNotification = {
  id: string;
  title: string;
  content: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
  action_url: string | null;
  metadata: any;
};

/**
 * Loads notifications for the current auth user, with live unread counter
 * via realtime INSERT/UPDATE on public.notifications.
 */
export function useNotifications() {
  const { user } = useMobileAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); setUnread(0); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,title,content,type,read,created_at,action_url,metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data ?? []) as AppNotification[];
    setItems(list);
    setUnread(list.filter((n) => !n.read).length);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 100));
          if (!n.read) setUnread((u) => u + 1);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as AppNotification;
          setItems((prev) => prev.map((x) => x.id === n.id ? n : x));
          setUnread((prev) => {
            const next = (p.new as any).read ? Math.max(0, prev - 1) : prev;
            return next;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((x) => x.id === id ? { ...x, read: true } : x));
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }, [user?.id]);

  return { items, unread, loading, reload: load, markRead, markAllRead };
}
