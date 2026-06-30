import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin, Clock } from "lucide-react";
import { formatDistance, type RadarRing } from "../../utils/geo";
import type { RadarItem } from "../../hooks/useRadarScan";

interface Props {
  item: RadarItem | null;
  onClose: () => void;
  onStartChat: (item: RadarItem, intent: "interest" | "negotiate" | "buy") => void;
}

function freshness(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} j`;
}

export function RadarItemSheet({ item, onClose, onStartChat }: Props) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-0">
        {item && (
          <div>
            {item.photo && (
              <div className="relative w-full h-56 bg-muted">
                <img src={item.photo} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                <span
                  className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: item.ringColor }}
                >
                  {formatDistance(item.distanceKm)}
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-semibold bg-black/70 text-white">
                  {item.type === "STATUS" ? "Statut" : item.type === "BUY" ? "Recherche" : "Vente"}
                </span>
              </div>
            )}
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-lg leading-tight">{item.title}</h3>
              {(item.priceMin || item.priceMax) && (
                <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {item.priceMin && item.priceMax && item.priceMin !== item.priceMax
                    ? `${item.priceMin.toLocaleString("fr-FR")} – ${item.priceMax.toLocaleString("fr-FR")} ${item.devise || "FCFA"}`
                    : `${(item.priceMin || item.priceMax)?.toLocaleString("fr-FR")} ${item.devise || "FCFA"}`}
                </div>
              )}
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-4">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.city || "—"}{item.district ? ` · ${item.district}` : ""}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Mis à jour il y a {freshness(item.freshnessMs)}</span>
              </div>
              {item.sellerName && (
                <p className="text-xs text-muted-foreground">Vendeur : <span className="text-foreground font-medium">{item.sellerName}</span></p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => onStartChat(item, "interest")}>
                  <MessageCircle className="h-4 w-4 mr-1" /> Intéressé
                </Button>
                <Button variant="outline" size="sm" onClick={() => onStartChat(item, "negotiate")}>
                  Négocier
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onStartChat(item, "buy")}>
                  Acheter
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
