import { Eye, MapPin, MessageCircle, Tag, Trash2 } from "lucide-react";
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

  const openChat = () => {
    const article_id = status.article_id ?? status.id;
    const kind: "buyer" | "seller" = status.type === "buy" ? "seller" : "buyer";
    const detail = {
      notification_id: null,
      notification_ids: [],
      seed_text:
        status.type === "buy"
          ? `Bonjour, j'ai ce que vous cherchez : "${status.title}".`
          : `Bonjour, je suis intéressé(e) par votre statut : "${status.title}".`,
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

  return (
    <article
      className={cn(
        "relative rounded-2xl text-white shadow-lg overflow-hidden",
        "transition-transform active:scale-[0.99]",
        style.bg,
        compact ? "p-2.5" : "p-3"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center",
            compact ? "w-14 h-14" : "w-16 h-16"
          )}
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
        </div>

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
            <span>·</span>
            <button
              onClick={openChat}
              className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline font-medium"
            >
              <MessageCircle className="w-3 h-3" />
              Discutez avec {status.type === "buy" ? "l'acheteur" : "le vendeur"}
            </button>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", style.accent)}>
                {style.label}
              </span>
              {status.views_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                  <Eye className="w-3 h-3" /> {status.views_count}
                </span>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete?.(status.id)}
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
  );
}
