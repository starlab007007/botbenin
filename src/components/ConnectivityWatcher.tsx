import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Écoute la connectivité réseau et affiche un feedback discret et clair.
 * Monté une seule fois au niveau racine (App.tsx / AppMobile.tsx).
 */
export function ConnectivityWatcher() {
  const wasOffline = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOffline = () => {
      wasOffline.current = true;
      toast.error("Connexion internet perdue", {
        id: "net-offline",
        description: "Vérifiez votre Wi-Fi ou vos données mobiles.",
        duration: Infinity,
      });
    };

    const onOnline = () => {
      toast.dismiss("net-offline");
      if (wasOffline.current) {
        wasOffline.current = false;
        toast.success("Connexion rétablie", { duration: 2500 });
      }
    };

    // Erreurs globales non capturées : ne jamais exposer un message technique
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as any)?.message || e.reason || "");
      if (
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror") ||
        msg.toLowerCase().includes("load failed")
      ) {
        if (navigator.onLine === false) return; // déjà couvert par offline
        toast.error("Problème de connexion", {
          id: "net-fetch-fail",
          description: "Impossible de joindre nos serveurs. Réessayez.",
          duration: 4000,
        });
        e.preventDefault();
      }
    };

    if (navigator.onLine === false) onOffline();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
