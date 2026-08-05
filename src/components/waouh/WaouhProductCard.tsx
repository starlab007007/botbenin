import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MapPin,
  Navigation,
  BadgeCheck,
  Radar,
  ShoppingBag,
  Maximize2,
  MessageCircleQuestion,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatImageLightbox } from "@/app-mobile/components/ChatImageLightbox";
import { isImageReady, preloadImage, prefetchNeighbours } from "@/components/waouh/waouhImageCache";
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
  source?: "partner" | "waouh" | "radar" | "chat" | string;
  badge?: string | null;
  market_line?: string | null;
  photos?: string[] | null;
  /**
   * undefined = générer automatiquement « intéressé N ».
   * null = pas d'action d'intérêt (ex : fiche de confirmation déjà ouverte).
   */
  action?: string | null;
  /** Optionnel : fourni par certaines surfaces pour ouvrir directement 1 article × 1 interlocuteur. */
  seller_id?: string | null;
  counterpart_user_id?: string | null;
}

type OpenDetail = {
  article_id: string;
  counterpart_user_id: string | null;
  seller_user_id?: string | null;
  kind: "buyer";
  title: string;
  price: number | null;
  city: string | null;
  photo: string | null;
  source: string;
};

const PENDING_OPEN_KEY = "waouh_pending_open";

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

const defaultInterestAction = (result: WaouhResultCard): string | null => {
  const idx = Number(result.index);
  if (!Number.isFinite(idx) || idx <= 0) return null;
  return `intéressé ${idx}`;
};

const canonicalKey = (d: OpenDetail) => `art_${d.article_id}_buyer_${d.counterpart_user_id ?? "any"}`;

function bufferOpenIntent(detail: OpenDetail) {
  try {
    const raw = localStorage.getItem(PENDING_OPEN_KEY);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    const key = canonicalKey(detail);
    const filtered = arr.filter((d: any) => {
      const candidate = `art_${d?.article_id ?? "none"}_${d?.kind === "seller" ? "seller" : "buyer"}_${d?.counterpart_user_id ?? "any"}`;
      return candidate !== key;
    });
    filtered.push(detail);
    localStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(filtered.slice(-10)));
  } catch {}
}

function shouldOpenOptimistically(result: WaouhResultCard): boolean {
  // Les sources partner/radar peuvent nécessiter une promotion backend avant d'avoir
  // un vrai waouh_articles.id. Les annonces créées dans WAOUH/chat portent déjà l'id article.
  const src = String(result.source || "waouh").toLowerCase();
  return !!result.id && src !== "partner" && src !== "radar";
}

function openDedicatedWindowFromResult(result: WaouhResultCard) {
  if (!shouldOpenOptimistically(result)) return;
  const photos = (result.photos || []).filter(Boolean);
  const detail: OpenDetail = {
    article_id: result.id,
    counterpart_user_id: result.counterpart_user_id ?? result.seller_id ?? null,
    seller_user_id: result.seller_id ?? result.counterpart_user_id ?? null,
    kind: "buyer",
    title: result.title || "Annonce",
    price: Number(result.price ?? result.price_min ?? result.price_max ?? 0) || null,
    city: result.city ?? null,
    photo: photos[0] ?? null,
    source: "product_card_interest",
  };
  bufferOpenIntent(detail);
  window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
  // Double émission courte : couvre le cas où le panneau droit / mobile tabs se monte juste après le clic.
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
  }, 120);
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
  const [ready, setReady] = useState<boolean>(() => isImageReady(photos[0]));
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const gallery = photos.map((url) => ({ url, caption: result.title }));
  const interestAction = result.action === null ? null : (result.action || defaultInterestAction(result));

  useEffect(() => {
    const url = photos[cur];
    if (!url) return;
    if (isImageReady(url)) {
      setReady(true);
    } else {
      setReady(false);
      let alive = true;
      preloadImage(url).then((ok) => { if (alive && ok) setReady(true); });
      return () => { alive = false; };
    }
    prefetchNeighbours(photos, cur);
  }, [cur, photos.join("|")]);

  const go = (dir: 1 | -1) => setCur((c) => (photos.length ? (c + dir + photos.length) % photos.length : 0));

  const counterpartWord = result.source === "partner" || result.source === "waouh" ? "vendeur" : "vendeur";
  const submitQuestion = () => {
    const q = question.trim();
    if (!q || !onAction) return;
    onAction(`question ${result.index} : ${q}`);
    setQuestion("");
    setAsking(false);
  };

  const handleInterest = () => {
    if (!interestAction || !onAction) return;
    openDedicatedWindowFromResult(result);
    onAction(interestAction);
  };

  return (
    <div className="not-prose rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className={cn("relative bg-muted", compact ? "aspect-[16/10]" : "aspect-[4/3]")}>
        {photos.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setZoom(cur)}
              className="block w-full h-full"
              aria-label={`Agrandir la photo de ${result.title}`}
            >
              {!ready && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />}
              <img
                src={photos[cur]}
                alt={result.title}
                loading="lazy"
                decoding="async"
                onLoad={() => setReady(true)}
                className={cn("w-full h-full object-cover transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")}
              />
            </button>
            <button
              type="button"
              onClick={() => setZoom(cur)}
              aria-label="Voir en plein écran"
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 shadow"
            >
              <Maximize2 className="h-3.5 w-3.5" />
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

        {onAction && (
          <div className="mt-1 space-y-1.5">
            {interestAction && (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleInterest}
              >
                Je suis intéressé
              </Button>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setAsking((a) => !a)}>
                <MessageCircleQuestion className="h-3.5 w-3.5 mr-1" />
                Question au {counterpartWord}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-[11px] text-muted-foreground hover:text-destructive" onClick={() => onAction(`annuler ${result.index}`)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Annuler
              </Button>
            </div>
            {asking && (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitQuestion(); } }}
                  placeholder={`Votre question sur « ${result.title.slice(0, 22)}… »`}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 px-2" onClick={submitQuestion} aria-label="Envoyer la question">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
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
  const normalized = results.map((r, i) => {
    const idx = Number(r.index) || i + 1;
    return {
      ...r,
      index: idx,
      action: r.action === null ? null : (r.action || `intéressé ${idx}`),
    };
  });
  return (
    <div className="not-prose mt-2 grid gap-2 sm:grid-cols-2">
      {normalized.map((r) => (
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
    const expected = `intéressé ${i + 1}`;
    if (r.action !== null && (r.action || expected) !== expected) return false;
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
