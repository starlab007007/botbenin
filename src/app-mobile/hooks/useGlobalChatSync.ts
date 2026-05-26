import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "./useMobileAuth";
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
        extra: { convId, route: `/app/chat/${convId}` },
      }],
    });
  } catch (e) {
    console.debug("[notif] native skipped", e);
  }
}

/**
 * Listens globally to all inbound messages for the current user,
 * fires in-app toasts + native notifications, and exposes total unread count
 * for the bottom tab badge. Mount once at the shell level.
 */
export function useGlobalChatSync() {
  const { user } = useMobileAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  const [totalUnread, setTotalUnread] = useState(0);
  const convCacheRef = useRef<Record<string, { phone_number: string | null }>>({});

  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  // Recompute total unread on mount + on read events
  useEffect(() => {
    if (!user) { setTotalUnread(0); return; }
    let cancelled = false;

    const recompute = async () => {
      const { data: convs } = await supabase
        .from("waouh_conversations")
        .select("id,phone_number")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (!convs) return;
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

    // Permission request once on native
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") await LocalNotifications.requestPermissions();
        // Tap handler
        await LocalNotifications.removeAllListeners();
        await LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
          const route = (e?.notification?.extra as any)?.route;
          if (route) navigate(route);
        });
      } catch {}
    })();

    // Global realtime: any new inbound message for this user
    const ch = supabase.channel(`mobile-global-msgs-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const m: any = payload.new;
          if (m.direction !== "in") return;
          setTotalUnread((n) => n + 1);
          // Resolve sender
          let sender = convCacheRef.current[m.conversation_id]?.phone_number ?? null;
          if (!sender) {
            const { data } = await supabase
              .from("waouh_conversations")
              .select("phone_number")
              .eq("id", m.conversation_id)
              .maybeSingle();
            sender = data?.phone_number ?? null;
            if (data) convCacheRef.current[m.conversation_id] = { phone_number: sender };
          }
          const title = sender ?? "Nouveau message";
          const body = (m.text ?? "").toString().slice(0, 140) || "📎 Message reçu";

          // Skip in-app toast if user is already inside this conversation
          const inThisChat = pathRef.current === `/app/chat/${m.conversation_id}`;
          if (!inThisChat) {
            toast.message(title, {
              description: body,
              action: { label: "Ouvrir", onClick: () => navigate(`/app/chat/${m.conversation_id}`) },
            });
            fireNativeNotification(title, body, m.conversation_id);
          }
        })
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("waouh-chat-read", onRead);
      supabase.removeChannel(ch);
    };
  }, [user, navigate]);

  return { totalUnread };
}
