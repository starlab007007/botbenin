import { Eye, MapPin, MessageCircle, Tag, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type WaouhStatus } from "@/hooks/useStatuses";
import { StatusCountdown } from "./StatusCountdown";

const TYPE_STYLES: Record<WaouhStatus["type"], { bg: string; label: string; accent: string }> = {
  sell: {
    bg: "bg-gradient-to-br from-[hsl(0_60%_28%)] to-[hsl(0_55%_22%)]",
    label: "Urgence vente",
    accent: "bg-red-400/20 text-red-100",
  },
  buy: {
    bg: "bg-gradient-to-br from-[hsl(165_65%_22%)] to-[hsl(165_70%_16%)]",
    label: "Recherche urgente",
    accent: "bg-emerald-400/20 text-emerald-100",
  },
  announce: {
    bg: "bg-gradient-to-br from-[hsl(38_70%_28%)] to-[hsl(35_75%_20%)]",
    label: "Annonce",
    accent: "bg-amber-400/20 text-amber-100",
  },
};

interface Props {
  status: WaouhStatus;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function StatusCard({ status, canDelete, onDelete, compact }: Props) {
  const navigate = useNavigate();
  const style = TYPE_STYLES[status.type];
  const code = status.waouh_code ?? status.article_id?.slice(0, 12).toUpperCase() ?? "WAOUH";
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const photos = (status.media_urls && status.media_urls.length > 0
    ? status.media_urls
    : status.media_url
      ? [status.media_url]
      : []).filter(Boolean) as string[];

  const counterpartLabel =
    status.type === "buy" ? "l'acheteur" : status.type === "announce" ? "l'annonceur" : "le vendeur";

  const openChat = () => {
    const article_id = status.article_id ?? status.id;
    const kind: "buyer" | "seller" = status.type === "buy" ? "seller" : "buyer";
    const priceLine =
      status.price_fcfa != null
        ? `💰 *Prix demandé* : ${status.price_fcfa.toLocaleString("fr-FR")} FCFA`
        : `💰 *Prix demandé* : à négocier`;
    const distanceLine = (status as any).distance_km != null
      ? `📏 *à ${Number((status as any).distance_km).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km de vous*`
      : null;
    const partyLabel = status.type === "buy" ? "Vendeur" : status.type === "announce" ? "Annonceur" : "Acheteur";
    const cityLine = status.location ? `🏙️ *${partyLabel}* : ${status.location}` : null;
    const counterExample =
      status.price_fcfa != null
        ? `*Je propose ${Math.max(1, Math.round(status.price_fcfa * 0.9)).toLocaleString("fr-FR")} FCFA*`
        : `*Je propose [votre prix] FCFA*`;
    const seed_text = [
      `*📩 Nouvel acheteur intéressé*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `📦 *${status.title}*`,
      priceLine,
      distanceLine,
      cityLine,
      ``,
      `Répondez *OUI* pour accepter, *NON* pour refuser, ou écrivez ${counterExample} pour contre-offrir.`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `_✨ WAOUH — Achetez · Vendez · Négociez en confiance_`,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const detail = {
      notification_id: null,
      notification_ids: [],
      seed_text,
      article_id,
      buyer_profile_id: null,
      counterpart_user_id: status.user_id,
      kind,
      title: status.title,
      price: status.price_fcfa,
      city: status.location,
      photo: status.media_url,
    };
    try {
      const raw = localStorage.getItem("waouh_pending_open");
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      arr.push(detail);
      localStorage.setItem("waouh_pending_open", JSON.stringify(arr.slice(-10)));
    } catch {}
    navigate("/app/chat/waouh");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
    }, 50);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid double-trigger when an inner interactive (photo/delete) is clicked
    if ((e.target as HTMLElement).closest("[data-stop-card]")) return;
    openChat();
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openChat();
          }
        }}
        className={cn(
          "relative rounded-2xl text-white shadow-lg overflow-hidden cursor-pointer",
          "transition-transform active:scale-[0.99] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/40",
          style.bg,
          compact ? "p-2.5" : "p-3"
        )}
      >
        <div className="flex gap-3">
          <button
            type="button"
            data-stop-card
            onClick={(e) => {
              e.stopPropagation();
              if (photos.length > 0) setLightboxIdx(0);
            }}
            className={cn(
              "rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center",
              photos.length > 0 && "cursor-zoom-in active:scale-95 transition-transform",
              compact ? "w-14 h-14" : "w-16 h-16"
            )}
            aria-label={photos.length > 0 ? "Voir les photos" : "Statut"}
          >
            {status.media_url ? (
              status.media_kind === "video" ? (
                <video src={status.media_url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={status.media_url} alt={status.title} className="w-full h-full object-cover" loading="lazy" />
              )
            ) : (
              <Tag className="w-6 h-6 text-white/60" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wide text-white/80 truncate">
                WAOUH · {code}
              </span>
              <StatusCountdown expiresAt={status.expires_at} />
            </div>

            <h3 className={cn("font-bold leading-tight truncate", compact ? "text-sm mt-0.5" : "text-base mt-1")}>
              {status.title}
            </h3>

            <div className="text-xs text-white/90 truncate flex items-center gap-1 mt-0.5">
              {status.price_fcfa != null && (
                <span className="font-semibold">{status.price_fcfa.toLocaleString("fr-FR")} FCFA</span>
              )}
              {status.location && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {status.location}
                  </span>
                </>
              )}
            </div>

            {!compact && (
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style.accent)}>
                  {style.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-white/80">
                  <MessageCircle className="w-3 h-3" />
                  Discuter avec {counterpartLabel}
                </span>
                {status.views_count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                    <Eye className="w-3 h-3" /> {status.views_count}
                  </span>
                )}
                {canDelete && (
                  <button
                    data-stop-card
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(status.id);
                    }}
                    className="ml-auto p-1 rounded hover:bg-white/15 text-white/80"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {lightboxIdx !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => ((i ?? 0) - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => ((i ?? 0) + 1) % photos.length);
                }}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Suivant"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIdx]}
            alt={status.title}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx(i);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === lightboxIdx ? "bg-white w-6" : "bg-white/40"
                  )}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
