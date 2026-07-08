import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Intercepte les erreurs globales non capturées (unhandled promise rejections)
 * pour ne jamais exposer un message technique brut à l'utilisateur.
 * La connectivité online/offline est gérée par OfflineBanner.
 */
export function ConnectivityWatcher() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as any)?.message || e.reason || "").toLowerCase();
      if (!msg) return;

      if (
        msg.includes("failed to fetch") ||
        msg.includes("networkerror") ||
        msg.includes("network request failed") ||
        msg.includes("load failed")
      ) {
        // Si offline, OfflineBanner s'en charge déjà.
        if (navigator.onLine === false) {
          e.preventDefault();
          return;
        }
        toast.error("Problème de connexion", {
          id: "net-fetch-fail",
          description: "Impossible de joindre nos serveurs. Réessayez dans un instant.",
          duration: 4000,
        });
        e.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return null;
}
