import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWaouhIdentity } from "./useWaouhIdentity";
import { toast } from "sonner";

const STORAGE_KEY = "waouh_chat_read_v1";

function readMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

async function fireNativeNotification(title: string, body: string, convId: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const r = await LocalNotifications.requestPermissions();
      if (r.display !== "granted") return;
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1_000_000),
        title,
        body,
        smallIcon: "ic_stat_icon_config_sample",
        extra: { convId, route: convId ? `/app/chat/${convId}` : `/app/chat` },
      }],
    });
  } catch (e) {
    console.debug("[notif] native skipped", e);
  }
}

/**
 * Listens globally to all inbound messages for the current user's waouh identity
 * (auth_user_id OR web_session_id mapping). Fires in-app toasts + native
 * notifications and exposes total unread count for the bottom tab badge.
 */
export function useGlobalChatSync() {
  const { waouhUserIds, sessionId, ready } = useWaouhIdentity();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  const [totalUnread, setTotalUnread] = useState(0);
  const convCacheRef = useRef<Record<string, { phone_number: string | null }>>({});

  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (!waouhUserIds.length && !sessionId) { setTotalUnread(0); return; }
    let cancelled = false;

    const recompute = async () => {
      // Fetch all conversations for this identity
      let convs: any[] = [];
      if (waouhUserIds.length) {
        const { data } = await supabase
          .from("waouh_conversations")
          .select("id,phone_number")
          .in("user_id", waouhUserIds)
          .order("updated_at", { ascending: false })
          .limit(100);
        convs = data ?? [];
      }
      // Fallback: derive from messages by session id if no conv mapping
      if (!convs.length && sessionId) {
        const { data: msgs } = await supabase
          .from("waouh_messages")
          .select("conversation_id, phone_number")
          .eq("web_session_id", sessionId)
          .not("conversation_id", "is", null)
          .limit(200);
        const seen = new Set<string>();
        convs = (msgs ?? []).filter((m: any) => {
          if (!m.conversation_id || seen.has(m.conversation_id)) return false;
          seen.add(m.conversation_id);
          return true;
        }).map((m: any) => ({ id: m.conversation_id, phone_number: m.phone_number }));
      }

      const cache: Record<string, { phone_number: string | null }> = {};
      convs.forEach((c: any) => { cache[c.id] = { phone_number: c.phone_number }; });
      convCacheRef.current = cache;

      const map = readMap();
      let total = 0;
      await Promise.all(convs.map(async (c: any) => {
        const since = map[c.id] ?? "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("waouh_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("direction", "in")
          .gt("created_at", since);
        total += count ?? 0;
      }));
      if (!cancelled) setTotalUnread(total);
    };
    recompute();

    const onRead = () => recompute();
    window.addEventListener("waouh-chat-read", onRead);

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") await LocalNotifications.requestPermissions();
        await LocalNotifications.removeAllListeners();
        await LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
          const route = (e?.notification?.extra as any)?.route;
          if (route) navigate(route);
        });
        // Remote push tap → navigate
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          await PushNotifications.addListener("pushNotificationActionPerformed", (e: any) => {
            const route = e?.notification?.data?.route;
            if (route) navigate(route);
          });
        } catch {}
      } catch {}
    })();

    // Realtime: subscribe per waouh user id + per web_session_id
    const channels: any[] = [];
    const handler = async (payload: any) => {
      const m: any = payload.new;
      if (m.direction !== "in") return;
      setTotalUnread((n) => n + 1);
      let sender = m.conversation_id ? convCacheRef.current[m.conversation_id]?.phone_number ?? null : null;
      if (!sender && m.conversation_id) {
        const { data } = await supabase
          .from("waouh_conversations")
          .select("phone_number")
          .eq("id", m.conversation_id)
          .maybeSingle();
        sender = (data as any)?.phone_number ?? m.phone_number ?? null;
        if (m.conversation_id && data) convCacheRef.current[m.conversation_id] = { phone_number: sender };
      }
      sender = sender ?? m.phone_number ?? null;
      const title = sender ?? "WAOUH";
      const body = (m.text ?? "").toString().slice(0, 140) || "📎 Message reçu";
      const route = m.conversation_id ? `/app/chat/${m.conversation_id}` : `/app/chat/waouh`;
      const inThisChat = pathRef.current === route;
      if (!inThisChat) {
        toast.message(title, {
          description: body,
          action: { label: "Ouvrir", onClick: () => navigate(route) },
        });
        fireNativeNotification(title, body, m.conversation_id ?? "");
      }
    };

    for (const uid of waouhUserIds) {
      const ch = supabase.channel(`mobile-msgs-uid-${uid}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "waouh_messages", filter: `user_id=eq.${uid}` },
          handler)
        .subscribe();
      channels.push(ch);
    }
    if (sessionId) {
      const ch = supabase.channel(`mobile-msgs-sess-${sessionId}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` },
          handler)
        .subscribe();
      channels.push(ch);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("waouh-chat-read", onRead);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [ready, waouhUserIds.join("|"), sessionId, navigate]);

  return { totalUnread };
}
