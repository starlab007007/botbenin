import { RefreshCw, Home } from "lucide-react";

/**
 * Lightweight, WhatsApp-styled fallback used by the mobile ErrorBoundary.
 * Avoids the heavy desktop Card UI inside the APK so a single screen crash
 * never freezes the whole app — the user can retry or go home in one tap.
 */
export function MobileErrorFallback() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="w-16 h-16 rounded-full bg-[hsl(165_91%_18%)]/10 flex items-center justify-center mb-4">
        <span className="text-3xl">🙏</span>
      </div>
      <h1 className="text-lg font-bold text-foreground mb-1">Une erreur s'est produite</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        L'écran n'a pas pu s'afficher. Réessayez ou revenez à l'accueil.
      </p>
      <div className="flex gap-2 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[hsl(165_91%_18%)] text-white font-medium active:scale-95 transition-transform"
        >
          <RefreshCw className="h-4 w-4" /> Réessayer
        </button>
        <button
          onClick={() => { window.location.href = "/app/chat"; }}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card font-medium active:scale-95 transition-transform"
        >
          <Home className="h-4 w-4" /> Accueil
        </button>
      </div>
    </div>
  );
}

export default MobileErrorFallback;
