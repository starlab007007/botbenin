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
 * Listens globally to all inbound messages for the current user's waouh identity.
 * Boot work is deferred behind requestIdleCallback so it does not delay the first
 * paint of /app/chat on slow networks (root cause of ERR_TIMED_OUT loops).
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
    let started = false;
    const channels: any[] = [];
    let onRead: (() => void) | null = null;

    const recompute = async () => {
      // Single aggregated COUNT (1 request) instead of N COUNT queries.
      // Pick the conversation list from waouh_users mapping when available.
      let convIds: string[] = [];
      if (waouhUserIds.length) {
        const { data } = await supabase
          .from("waouh_conversations")
          .select("id,phone_number")
          .in("user_id", waouhUserIds)
          .order("updated_at", { ascending: false })
          .limit(100);
        const list = data ?? [];
        const cache: Record<string, { phone_number: string | null }> = {};
        list.forEach((c: any) => { cache[c.id] = { phone_number: c.phone_number }; });
        convCacheRef.current = cache;
        convIds = list.map((c: any) => c.id);
      } else if (sessionId) {
        const { data: msgs } = await supabase
          .from("waouh_messages")
          .select("conversation_id, phone_number")
          .eq("web_session_id", sessionId)
          .not("conversation_id", "is", null)
          .limit(200);
        const seen = new Set<string>();
        (msgs ?? []).forEach((m: any) => {
          if (!m.conversation_id || seen.has(m.conversation_id)) return;
          seen.add(m.conversation_id);
          convCacheRef.current[m.conversation_id] = { phone_number: m.phone_number };
        });
        convIds = Array.from(seen);
      }
      if (!convIds.length) { if (!cancelled) setTotalUnread(0); return; }

      // Use the earliest "since" timestamp as a server-side lower bound, then
      // re-filter the small client-side response set per-conversation. This
      // collapses N COUNT requests into a single SELECT.
      const map = readMap();
      const sinces = convIds.map((id) => map[id] ?? "1970-01-01T00:00:00Z");
      const minSince = sinces.reduce((a, b) => (a < b ? a : b), sinces[0]);
      const { data: recent } = await supabase
        .from("waouh_messages")
        .select("conversation_id, created_at")
        .in("conversation_id", convIds)
        .eq("direction", "in")
        .gt("created_at", minSince)
        .limit(1000);
      let total = 0;
      (recent ?? []).forEach((m: any) => {
        const since = map[m.conversation_id] ?? "1970-01-01T00:00:00Z";
        if (m.created_at > since) total += 1;
      });
      if (!cancelled) setTotalUnread(total);
    };

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
      const currentPath = pathRef.current || "";
      const inThisChat =
        currentPath === route ||
        currentPath === "/app/chat" ||
        currentPath.startsWith("/app/chat/");
      if (!inThisChat) {
        toast.message(title, {
          description: body,
          action: { label: "Ouvrir", onClick: () => navigate(route) },
        });
        fireNativeNotification(title, body, m.conversation_id ?? "");
      }
    };

    const boot = async () => {
      if (cancelled) return;
      void recompute();

      onRead = () => recompute();
      window.addEventListener("waouh-chat-read", onRead);

      // Native notification listeners (skipped silently on web).
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== "granted") await LocalNotifications.requestPermissions();
          await LocalNotifications.removeAllListeners();
          await LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
            const route = (e?.notification?.extra as any)?.route;
            if (route) navigate(route);
          });
          try {
            const { PushNotifications } = await import("@capacitor/push-notifications");
            await PushNotifications.addListener("pushNotificationActionPerformed", (e: any) => {
              const route = e?.notification?.data?.route;
              if (route) navigate(route);
            });
          } catch {}
        }
      } catch {}

      // Realtime subscriptions, one per identity.
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
    };

    // Defer boot so it never competes with the first paint of /app/chat.
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const startToken: number = ric
      ? ric(() => { started = true; void boot(); }, { timeout: 1500 })
      : (setTimeout(() => { started = true; void boot(); }, 250) as unknown as number);

    return () => {
      cancelled = true;
      if (!started) {
        const cic = (window as any).cancelIdleCallback as ((h: number) => void) | undefined;
        if (cic) cic(startToken);
        else clearTimeout(startToken as unknown as ReturnType<typeof setTimeout>);
      }
      if (onRead) window.removeEventListener("waouh-chat-read", onRead);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [ready, waouhUserIds.join("|"), sessionId, navigate]);

  return { totalUnread };
}
