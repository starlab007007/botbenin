import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, MapPin, Navigation, BadgeCheck, Radar, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatImageLightbox } from "@/app-mobile/components/ChatImageLightbox";
import { cn } from "@/lib/utils";

/**
 * Fiche produit d'un résultat de recherche WAOUH.
 * INVARIANT : 1 fiche = 1 article + SES propres photos.
 * Le zoom plein écran est restreint aux photos de cet article.
 */
export interface WaouhResultCard {
  index: number;
  id: string;
  title: string;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  city?: string | null;
  quartier?: string | null;
  condition?: string | null;
  distance_km?: number | null;
  source?: "partner" | "waouh" | "radar" | string;
  badge?: string | null;
  market_line?: string | null;
  photos?: string[] | null;
  action?: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function priceLabel(r: WaouhResultCard): string {
  if (r.price_min && r.price_max && r.price_min !== r.price_max) return `${fmt(r.price_min)} – ${fmt(r.price_max)}`;
  const p = r.price ?? r.price_min ?? r.price_max;
  return p ? fmt(Number(p)) : "Prix à négocier";
}

function SourceIcon({ source }: { source?: string }) {
  if (source === "partner") return <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />;
  if (source === "radar") return <Radar className="h-3.5 w-3.5 text-sky-500" />;
  return <ShoppingBag className="h-3.5 w-3.5 text-primary" />;
}

export function WaouhProductCard({
  result,
  onAction,
  compact,
}: {
  result: WaouhResultCard;
  onAction?: (text: string) => void;
  compact?: boolean;
}) {
  const photos = (result.photos || []).filter(Boolean);
  const [cur, setCur] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const gallery = photos.map((url) => ({ url, caption: result.title }));

  const go = (dir: 1 | -1) => setCur((c) => (photos.length ? (c + dir + photos.length) % photos.length : 0));

  return (
    <div className="not-prose rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Carrousel — photos de CET article uniquement */}
      <div className={cn("relative bg-muted", compact ? "aspect-[16/10]" : "aspect-[4/3]")}>
        {photos.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setZoom(cur)}
              className="block w-full h-full"
              aria-label={`Agrandir la photo de ${result.title}`}
            >
              <img
                src={photos[cur]}
                alt={result.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Photo précédente"
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Photo suivante"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="absolute bottom-1 right-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-medium text-background">
                  {cur + 1}/{photos.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">Pas de photo</span>
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] font-bold">
          #{result.index}
        </span>
      </div>

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <SourceIcon source={result.source} />
          <h4 className="flex-1 text-sm font-semibold leading-tight text-foreground line-clamp-2">{result.title}</h4>
        </div>
        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{priceLabel(result)}</div>

        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
          {(result.city || result.quartier) && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              <MapPin className="h-3 w-3" />
              {[result.city, result.quartier].filter(Boolean).join(" · ")}
            </span>
          )}
          {typeof result.distance_km === "number" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              <Navigation className="h-3 w-3" />
              {result.distance_km} km
            </span>
          )}
          {result.condition && <span className="rounded bg-muted px-1.5 py-0.5">{result.condition}</span>}
          {result.badge && <span className="rounded bg-muted px-1.5 py-0.5">{result.badge}</span>}
        </div>

        {result.market_line && (
          <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3">{result.market_line}</p>
        )}

        {result.action && onAction && (
          <Button size="sm" className="w-full h-8 text-xs mt-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction(result.action!)}>
            Je suis intéressé
          </Button>
        )}
      </div>

      {zoom !== null && photos.length > 0 && (
        <ChatImageLightbox images={gallery} index={zoom} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}

export function WaouhProductResults({
  results,
  onAction,
  compact,
}: {
  results: WaouhResultCard[];
  onAction?: (text: string) => void;
  compact?: boolean;
}) {
  if (!results?.length) return null;
  return (
    <div className="not-prose mt-2 grid gap-2 sm:grid-cols-2">
      {results.map((r) => (
        <WaouhProductCard key={`${r.id}-${r.index}`} result={r} onAction={onAction} compact={compact} />
      ))}
    </div>
  );
}

export default WaouhProductCard;

/**
 * INVARIANT v14 — l'ordre des fiches doit refléter exactement `last_matches` :
 * la fiche en position i porte index i+1 et l'action « intéressé i+1 ».
 * Utilisé par les tests de verrouillage du flux de chat.
 */
export function validateResultsInvariant(results: WaouhResultCard[], lastMatches?: Array<{ id: string }>): boolean {
  return results.every((r, i) => {
    if (r.index !== i + 1) return false;
    if (r.action && r.action !== `intéressé ${i + 1}`) return false;
    if (lastMatches && lastMatches[i] && lastMatches[i].id !== r.id) return false;
    return true;
  });
}

/**
 * Quand des fiches produit structurées existent, le texte listant à nouveau
 * chaque annonce fait doublon : on ne garde que l'entête et le pied de réponse.
 */
export function compactResultsText(text: string): string {
  if (!text) return text;
  const blocks = text.split(/\n?━{3,}\n?/).map((b) => b.trim()).filter(Boolean);
  const kept = blocks.filter((b) => !/^\*?\d+[.)]/.test(b));
  if (!kept.length) return "";
  return kept.join("\n\n");
}
