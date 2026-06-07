import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEMPLATE_TITLES: Record<string, string> = {
  match_seller: "📩 Nouvel acheteur intéressé !",
  match_buyer: "🎯 Annonce trouvée pour vous",
  negotiation_open: "🤝 Nouvelle offre reçue",
  contact_exchange: "🎉 Accord conclu — livraison en cours d'organisation",
  deal_created: "🛵 Accord conclu — livraison en préparation",
  deal_seller: "🛵 Vente conclue — un livreur va vous contacter",
  deal_buyer: "🛵 Achat confirmé — livraison en préparation",
  deal_ops: "📦 Nouveau deal à orchestrer",
  deal_assigned: "🛵 Livreur assigné — ETA en cours",
  deal_eta_updated: "⏱️ ETA mise à jour",
  deal_picked_up: "📦 Colis collecté",
  deal_delivered: "📬 Colis livré",
  deal_payment_request: "💵 Confirmez le paiement",
  deal_paid: "✅ Paiement confirmé",
  deal_cancelled: "⚠️ Livraison annulée",
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
  article_id?: string | null;
  payload?: any;
};

const MATCH_TEMPLATES = new Set([
  "match",
  "match_buyer",
  "match_seller",
  "new_buyer",
  "radar_match",
]);

/**
 * Templates that represent the user's OWN action (acks/echos), not an
 * inbound event from someone else. The bell only shows incoming/received
 * notifications, so these are filtered out.
 */
const SELF_TEMPLATES = new Set([
  "sale_published",
  "buyer_interest_ack",
  "negotiation_ack",
  "payment_ack",
]);

function isSelfNotif(template: string): boolean {
  if (SELF_TEMPLATES.has(template)) return true;
  return /_ack$/.test(template);
}

export function getMatchKind(template: string): "buyer" | "seller" | null {
  if (template === "match_seller" || template === "new_buyer") return "seller";
  if (template === "match" || template === "match_buyer" || template === "radar_match") return "buyer";
  return null;
}

export function getMatchBadgeLabel(template: string): string | null {
  switch (template) {
    case "radar_match":
      return "Radar IA";
    case "match":
    case "match_buyer":
      return "Annonce trouvée";
    case "new_buyer":
    case "match_seller":
      return "Nouvel acheteur";
    case "deal_created":
    case "deal_seller":
    case "deal_buyer":
    case "deal_ops":
    case "deal_assigned":
    case "deal_eta_updated":
    case "deal_picked_up":
    case "deal_delivered":
    case "deal_payment_request":
    case "deal_paid":
    case "deal_cancelled":
      return "Livraison";
    default:
      return null;
  }
}

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
    let unifiedIds: string[] = [];
    setNotifications((prev) => {
      unifiedIds = prev.filter((n) => !n.read && MATCH_TEMPLATES.has(n.template)).map((n) => n.id);
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifs(sessionId, updated);
      return updated;
    });
    if (unifiedIds.length) {
      supabase
        .from("waouh_notifications" as any)
        .update({ opened: true })
        .in("id", unifiedIds)
        .then(({ error }) => {
          if (error) console.warn("[waouh-notifs] markAllRead error", error);
        });
    }
  }, [sessionId]);

  // "Tout effacer" is now a soft action — we mark every notification as read
  // server-side (so they stay rechargeable from the History tab) and only hide
  // them from the active list locally.
  const clearAll = useCallback(() => {
    if (!sessionId) return;
    let unifiedIds: string[] = [];
    setNotifications((prev) => {
      unifiedIds = prev
        .filter((n) => !n.read && MATCH_TEMPLATES.has(n.template))
        .map((n) => n.id);
      // Mark everything as read locally; do NOT drop the array so the bell can
      // still show history when explicitly requested.
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifs(sessionId, updated);
      return updated;
    });
    if (unifiedIds.length) {
      supabase
        .from("waouh_notifications" as any)
        .update({ opened: true })
        .in("id", unifiedIds)
        .then(({ error }) => {
          if (error) console.warn("[waouh-notifs] clearAll error", error);
        });
    }
  }, [sessionId]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        if (sessionId) saveNotifs(sessionId, updated);
        return updated;
      });
      // Best-effort DB sync (only matches unified notifications by id)
      supabase
        .from("waouh_notifications" as any)
        .update({ opened: true })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("[waouh-notifs] markRead error", error);
        });
    },
    [sessionId]
  );

  const upsertNotif = useCallback((notif: WaouhNotification, withToast = true) => {
    let isNew = true;
    setNotifications((prev) => {
      const idx = prev.findIndex((n) => n.id === notif.id);
      let updated: WaouhNotification[];
      if (idx >= 0) {
        isNew = false;
        const merged = { ...prev[idx], ...notif, read: prev[idx].read && notif.read };
        updated = [...prev];
        updated[idx] = merged;
      } else {
        updated = [notif, ...prev].slice(0, 50);
      }
      updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (sessionId) saveNotifs(sessionId, updated);
      return updated;
    });
    if (!isNew || !withToast) return;
    // Gate toast: only show when user is not actively on the WAOUH chat page,
    // or when the tab is hidden.
    const onChatPage =
      typeof window !== "undefined" &&
      /\/(app\/chat|waouh-chat)/.test(window.location.pathname);
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    if (hidden || !onChatPage) {
      toast(notif.title, { description: notif.body, duration: 6000 });
    }
  }, [sessionId]);

  // === Force-load history per user (queue + unified notifications) ===
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    (async () => {
      // Strict per-identity scoping: ignore the anonymous session row when
      // the user is logged in, so two accounts on the same browser don't share
      // notifications.
      let wusers: any[] | null = null;
      if (authUserId) {
        const { data } = await supabase
          .from("waouh_users").select("id").eq("auth_user_id", authUserId).limit(50);
        wusers = data ?? [];
      } else {
        const { data } = await supabase
          .from("waouh_users").select("id").eq("web_session_id", sessionId).limit(50);
        wusers = data ?? [];
      }
      const waouhIds = Array.from(new Set((wusers ?? []).map((u: any) => u.id)));

      // 1) Outbound queue (legacy templated notifs)
      const qOrs: string[] = [];
      if (waouhIds.length) qOrs.push(`to_user_id.in.(${waouhIds.join(",")})`);
      if (!authUserId) qOrs.push(`web_session_id.eq.${sessionId}`);
      const queryQueue = qOrs.length
        ? supabase.from("waouh_outbound_queue" as any)
            .select("id,template,payload,created_at,image_url,message_id,transaction_id")
            .or(qOrs.join(","))
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null } as any);
      const { data: queue, error: qErr } = await queryQueue;
      if (qErr) console.warn("[waouh-notifs] queue load error", qErr);

      // 2) Unified in-app notifications: strict scoping mirror
      let unified: any[] = [];
      const uOrs: string[] = [];
      if (waouhIds.length) uOrs.push(`user_id.in.(${waouhIds.join(",")})`);
      if (!authUserId) uOrs.push(`web_session_id.eq.${sessionId}`);
      const { data: uData, error: uErr } = uOrs.length
        ? await supabase
            .from("waouh_notifications" as any)
            .select("id,notification_type,payload,photos,sent_at,article_id,opened,web_session_id,user_id")
            .or(uOrs.join(","))
            .order("sent_at", { ascending: false })
            .limit(50)
        : { data: [], error: null } as any;
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
        article_id: row.article_id ?? null,
        payload: row.payload ?? null,
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
        article_id: row.article_id ?? null,
        payload: row.payload ?? null,
      };
      upsertNotif(notif);
      // Notify the list to refresh — but do NOT auto-open a chat window.
      // The user opens it intentionally by clicking the notification/list row.
      try {
        window.dispatchEvent(
          new CustomEvent("waouh:match-updated", {
            detail: { article_id: row.article_id ?? null, notification_id: row.id },
          })
        );
      } catch {}
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
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_outbound_queue", filter: `to_user_id=eq.${u.id}` }, onQueueInsert)
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

  return { permission, requestPermission, notifications, unreadCount, markAllRead, markRead, clearAll };
}
