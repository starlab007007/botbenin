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

export function useWaouhMatchNotifications(sessionId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      toast.success("Notifications activées");
    }
    return p;
  }, []);

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

          // In-app toast
          toast(title, { description: body, duration: 6000 });

          // System notification via Service Worker
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              const reg = await navigator.serviceWorker?.getRegistration();
              const opts: NotificationOptions = {
                body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: `waouh-${row.id}`,
                data: { url: "/waouh-chat" },
              };
              if (reg) await reg.showNotification(title, opts);
              else new Notification(title, opts);
            }
          } catch (e) {
            console.warn("[waouh] showNotification failed", e);
          }

          // Mark as sent (web is delivered via realtime, no WAHA needed)
          if (!row.to_phone) {
            await supabase
              .from("waouh_outbound_queue")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  return { permission, requestPermission };
}
