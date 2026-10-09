import { useEffect, useRef } from "react";

/**
 * Resynchronisation globale du web WAOUH.
 *
 * Les canaux temps réel peuvent être suspendus (onglet en arrière-plan, veille de
 * l'appareil, perte de réseau) sans que l'interface le sache. Au retour du réseau
 * ou de l'onglet au premier plan, on émet UN événement « waouh:resync » : chaque
 * liste (chat, boîte de réception, notifications, non-lus) relit alors le serveur.
 */
export const WAOUH_RESYNC_EVENT = "waouh:resync";
const MIN_GAP_MS = 3000;

let started = false;
let lastEmit = 0;

function emit(reason: string) {
  const now = Date.now();
  if (now - lastEmit < MIN_GAP_MS) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  lastEmit = now;
  window.dispatchEvent(new CustomEvent(WAOUH_RESYNC_EVENT, { detail: { reason } }));
}

/** À appeler une fois (coque de l'application) ; idempotent. */
export function startWaouhResync(): () => void {
  if (typeof window === "undefined" || started) return () => {};
  started = true;
  const onVisible = () => { if (document.visibilityState === "visible") emit("visible"); };
  const onOnline = () => emit("online");
  const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) emit("pageshow"); };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onPageShow);
  return () => {
    started = false;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("pageshow", onPageShow);
  };
}

/** Exécute `callback` à chaque resynchronisation (toujours la dernière version du callback). */
export function useWaouhResync(callback: () => void | Promise<unknown>) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const handler = () => { try { void ref.current(); } catch { /* best effort */ } };
    window.addEventListener(WAOUH_RESYNC_EVENT, handler);
    return () => window.removeEventListener(WAOUH_RESYNC_EVENT, handler);
  }, []);
}
