import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Relie les notifications (réponse rapide / ouverture) au chat Bot. À monter dans le Router. */
export function WaouhQuickReplyBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    const onReply = (event: Event) => {
      const d = (event as CustomEvent).detail || {};
      const text = String(d.text || "").trim();
      if (!text) return;
      const about = String(d.about || "").trim();
      const params = new URLSearchParams({ reply: text });
      if (about) params.set("about", about.slice(0, 160));
      if (d.journeyId) params.set("journey", String(d.journeyId));
      navigate(`/app/chat/waouh?${params.toString()}`);
    };
    const onOpen = (event: Event) => {
      const route = (event as CustomEvent).detail?.route;
      navigate(typeof route === "string" && route.startsWith("/app/") ? route : "/app/chat/waouh");
    };
    window.addEventListener("waouh:quick-reply", onReply);
    window.addEventListener("waouh:open-notif", onOpen);
    return () => {
      window.removeEventListener("waouh:quick-reply", onReply);
      window.removeEventListener("waouh:open-notif", onOpen);
    };
  }, [navigate]);
  return null;
}
