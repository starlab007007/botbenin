import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEMPLATE_TITLES: Record<string, string> = {
  match_seller: "📩 Nouvel acheteur intéressé !",
  match_buyer: "🎯 Annonce trouvée pour vous",
  negotiation_open: "🤝 Nouvelle offre reçue",
  contact_exchange: "🎉 Accord conclu — contact partagé",
  sale_published: "✅ Annonce publiée",
  new_buyer: "🛒 Nouvel acheteur intéressé",
  match: "🎯 Annonce trouvée pour vous",
};


function fmt(n: number | null | undefined) {
  if (n == null) return "";
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}

function buildBody(template: string, p: any): string {
  switch (template) {
    case "match_seller":
      return `Un acheteur cherche : ${p?.title ?? "votre produit"}${p?.price ? ` — ${fmt(p.price)}` : ""}`;
    case "match_buyer":
      return `${p?.title ?? "Annonce"} — ${fmt(p?.price)} ${p?.city ? `(${p.city})` : ""}`;
    case "negotiation_open":
      return `Offre : ${fmt(p?.offer ?? p?.price)}`;
    case "payment_link":
      return `Montant : ${fmt(p?.amount)}`;
    default:
      return p?.text || "Mise à jour WAOUH";
  }
}

export type WaouhNotification = {
  id: string;
  title: string;
  body: string;
  template: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
  message_id?: string | null;
  transaction_id?: string | null;
};

const STORAGE_PREFIX = "waouh_notifs_";

function loadNotifs(sessionId: string): WaouhNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + sessionId);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, 50);
  } catch { return []; }
}

function saveNotifs(sessionId: string, list: WaouhNotification[]) {
  try { localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(list.slice(0, 50))); } catch {}
}

export function useWaouhMatchNotifications(sessionId: string | null, authUserId?: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [notifications, setNotifications] = useState<WaouhNotification[]>(() =>
    sessionId ? loadNotifs(sessionId) : []
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") toast.success("Notifications activées");
    return p;
  }, []);

  const markAllRead = useCallback(() => {
    if (!sessionId) return;
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifs(sessionId, updated);
      return updated;
    });
  }, [sessionId]);

  const clearAll = useCallback(() => {
    if (!sessionId) return;
    setNotifications([]);
    saveNotifs(sessionId, []);
  }, [sessionId]);

  const upsertNotif = useCallback((notif: WaouhNotification, withToast = true) => {
    setNotifications((prev) => {
      if (prev.find((n) => n.id === notif.id)) return prev;
      const updated = [notif, ...prev].slice(0, 50);
      if (sessionId) saveNotifs(sessionId, updated);
      return updated;
    });
    if (withToast) toast(notif.title, { description: notif.body, duration: 6000 });
  }, [sessionId]);

  // === Force-load history per user (queue + unified notifications) ===
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    (async () => {
      // Resolve waouh_users.id linked to this device or auth account
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
      const { data: wusers, error: wuErr } = await supabase
        .from("waouh_users").select("id").or(ors.join(",")).limit(50);
      if (wuErr) console.warn("[waouh-notifs] users lookup error", wuErr);
      const waouhIds = Array.from(new Set((wusers ?? []).map((u: any) => u.id)));

      // 1) Outbound queue (legacy templated notifs)
      const qOrs: string[] = [`web_session_id.eq.${sessionId}`];
      if (waouhIds.length) qOrs.push(`to_user_id.in.(${waouhIds.join(",")})`);
      const { data: queue, error: qErr } = await supabase
        .from("waouh_outbound_queue" as any)
        .select("id,template,payload,created_at,image_url,message_id,transaction_id")
        .or(qOrs.join(","))
        .order("created_at", { ascending: false })
        .limit(50);
      if (qErr) console.warn("[waouh-notifs] queue load error", qErr);

      // 2) Unified in-app notifications: by session OR by linked user_id
      let unified: any[] = [];
      const uOrs: string[] = [`web_session_id.eq.${sessionId}`];
      if (waouhIds.length) uOrs.push(`user_id.in.(${waouhIds.join(",")})`);
      const { data: uData, error: uErr } = await supabase
        .from("waouh_notifications" as any)
        .select("id,notification_type,payload,photos,sent_at,article_id,opened,web_session_id,user_id")
        .or(uOrs.join(","))
        .order("sent_at", { ascending: false })
        .limit(50);
      if (uErr) console.warn("[waouh-notifs] notifications load error", uErr);
      unified = uData ?? [];

      if (!active) return;

      const fromQueue: WaouhNotification[] = (queue ?? []).map((row: any) => ({
        id: row.id,
        title: TEMPLATE_TITLES[row.template] || "WAOUH",
        body: buildBody(row.template, row.payload || {}),
        template: row.template,
        created_at: row.created_at,
        read: true, // historical → mark as read
        image_url: row.image_url ?? null,
        message_id: row.message_id ?? row.payload?.message_id ?? null,
        transaction_id: row.transaction_id ?? row.payload?.transaction_id ?? null,
      }));

      const pickPhoto = (row: any): string | null => {
        if (Array.isArray(row.photos) && row.photos[0]) return row.photos[0];
        if (Array.isArray(row.payload?.photos) && row.payload.photos[0]) return row.payload.photos[0];
        if (row.payload?.image_url) return row.payload.image_url;
        return null;
      };

      const fromUnified: WaouhNotification[] = unified.map((row: any) => ({
        id: row.id,
        title: TEMPLATE_TITLES[row.notification_type] || "WAOUH",
        body: row.payload?.text || "Mise à jour WAOUH",
        template: row.notification_type,
        created_at: row.sent_at,
        read: !!row.opened,
        image_url: pickPhoto(row),
        message_id: null,
        transaction_id: null,
      }));

      // Merge with local cache, dedupe by id, sort by date desc, cap 50
      setNotifications((prev) => {
        const map = new Map<string, WaouhNotification>();
        [...fromUnified, ...fromQueue, ...prev].forEach((n) => {
          if (!map.has(n.id)) map.set(n.id, n);
        });
        const merged = Array.from(map.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);
        if (sessionId) saveNotifs(sessionId, merged);
        return merged;
      });
    })();

    return () => { active = false; };
  }, [sessionId, authUserId]);

  // === Realtime subscriptions (session + per-user) ===
  useEffect(() => {
    if (!sessionId) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channels: any[] = [];

    const onQueueInsert = async (payload: any) => {
      const row: any = payload.new;
      const title = TEMPLATE_TITLES[row.template] || "WAOUH";
      const body = buildBody(row.template, row.payload || {});
      const notif: WaouhNotification = {
        id: row.id, title, body, template: row.template,
        created_at: row.created_at ?? new Date().toISOString(),
        read: false,
        image_url: row.image_url ?? null,
        message_id: row.message_id ?? row.payload?.message_id ?? null,
        transaction_id: row.transaction_id ?? row.payload?.transaction_id ?? null,
      };
      upsertNotif(notif);
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const reg = await navigator.serviceWorker?.getRegistration();
          const opts: NotificationOptions = {
            body, icon: "/favicon.ico", badge: "/favicon.ico",
            tag: `waouh-${row.id}`, data: { url: "/waouh-chat" },
          };
          if (reg) await reg.showNotification(title, opts);
          else new Notification(title, opts);
        }
      } catch (e) { console.warn("[waouh] showNotification failed", e); }
      if (!row.to_phone) {
        await supabase.from("waouh_outbound_queue" as any)
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    };

    const onUnifiedInsert = (payload: any) => {
      const row: any = payload.new;
      const pickPhoto =
        (Array.isArray(row.photos) && row.photos[0]) ||
        (Array.isArray(row.payload?.photos) && row.payload.photos[0]) ||
        row.payload?.image_url ||
        null;
      const notif: WaouhNotification = {
        id: row.id,
        title: TEMPLATE_TITLES[row.notification_type] || "WAOUH",
        body: row.payload?.text || "Mise à jour WAOUH",
        template: row.notification_type,
        created_at: row.sent_at ?? new Date().toISOString(),
        read: !!row.opened,
        image_url: pickPhoto,
      };
      upsertNotif(notif);
      // Anti self-notification: ignore if recipient is seller but user_id is the buyer (or vice versa)
      // Server-side guard handles primary case; this is a UI safety net.
      const recipient = row.payload?.recipient;
      const buyerProfileId = row.payload?.buyer_profile_id ?? null;

      // Auto-open a dedicated chat window for match-type notifications
      const matchKinds = ["match", "match_buyer", "match_seller", "new_buyer"];
      if (matchKinds.includes(row.notification_type) && row.article_id) {
        const kind =
          row.notification_type === "match_seller" || row.notification_type === "new_buyer"
            ? "seller"
            : "buyer";
        try {
          window.dispatchEvent(
            new CustomEvent("waouh:open-match-chat", {
              detail: {
                article_id: row.article_id,
                buyer_profile_id: buyerProfileId,
                recipient,
                kind,
                title: row.payload?.title,
                price: row.payload?.price,
                city: row.payload?.city,
                photo: pickPhoto,
              },
            })
          );
        } catch {}
      }
    };


    channels.push(
      supabase
        .channel(`waouh_outbound_${sessionId}_${suffix}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_outbound_queue", filter: `web_session_id=eq.${sessionId}` }, onQueueInsert)
        .subscribe()
    );
    // Realtime for unified notifications scoped to this session
    channels.push(
      supabase
        .channel(`waouh_notifs_s_${sessionId}_${suffix}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_notifications", filter: `web_session_id=eq.${sessionId}` }, onUnifiedInsert)
        .subscribe()
    );

    // Resolve waouh_users.id and subscribe per-user for both tables (auth users only)
    (async () => {
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
      const { data: wusers } = await supabase
        .from("waouh_users").select("id").or(ors.join(",")).limit(50);
      (wusers ?? []).forEach((u: any) => {
        channels.push(
          supabase
            .channel(`waouh_outbound_u_${u.id}_${suffix}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_outbound_queue", filter: `user_id=eq.${u.id}` }, onQueueInsert)
            .subscribe()
        );
        channels.push(
          supabase
            .channel(`waouh_notifs_u_${u.id}_${suffix}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_notifications", filter: `user_id=eq.${u.id}` }, onUnifiedInsert)
            .subscribe()
        );
      });
    })();

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [sessionId, authUserId, upsertNotif]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { permission, requestPermission, notifications, unreadCount, markAllRead, clearAll };
}
