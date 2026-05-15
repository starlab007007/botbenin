import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEMPLATE_TITLES: Record<string, string> = {
  match_seller: "📩 Nouvel acheteur intéressé !",
  match_buyer: "🎯 Annonce trouvée pour vous",
  negotiation_open: "🤝 Nouvelle offre reçue",
  payment_link: "💳 Lien de paiement",
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

export function useWaouhMatchNotifications(sessionId: string | null) {
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

  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`waouh_outbound_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waouh_outbound_queue",
          filter: `web_session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const row: any = payload.new;
          const title = TEMPLATE_TITLES[row.template] || "WAOUH";
          const body = buildBody(row.template, row.payload || {});

          const notif: WaouhNotification = {
            id: row.id,
            title,
            body,
            template: row.template,
            created_at: row.created_at ?? new Date().toISOString(),
            read: false,
            image_url: row.image_url ?? null,
            message_id: row.message_id ?? row.payload?.message_id ?? null,
            transaction_id: row.transaction_id ?? row.payload?.transaction_id ?? null,
          };
          setNotifications((prev) => {
            if (prev.find((n) => n.id === notif.id)) return prev;
            const updated = [notif, ...prev].slice(0, 50);
            saveNotifs(sessionId, updated);
            return updated;
          });

          toast(title, { description: body, duration: 6000 });

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
          } catch (e) {
            console.warn("[waouh] showNotification failed", e);
          }

          if (!row.to_phone) {
            await supabase
              .from("waouh_outbound_queue")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { permission, requestPermission, notifications, unreadCount, markAllRead, clearAll };
}
