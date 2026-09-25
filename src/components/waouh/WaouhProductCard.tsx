import React, { useEffect, useRef, useState } from "react";
import { normalizeResultCards } from "@/lib/chatReply";
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
  Sparkles,
  ShieldCheck,
  Users,
  ExternalLink,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatImageLightbox } from "@/app-mobile/components/ChatImageLightbox";
import { isImageReady, preloadImage, prefetchNeighbours } from "@/components/waouh/waouhImageCache";
import { cn } from "@/lib/utils";
import { WaouhContactabilityBadge } from "./WaouhCommerceAgentBar";
import { WaouhNexusContactSheet } from "./WaouhNexusContactSheet";
import { loadWaouhProductIntelligence, type WaouhProductIntelligence } from "@/lib/waouh/productIntelligence";

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
  source_url?: string | null;
  fabric_id?: string | null;
  intent?: string | null;
  actor_type?: string | null;
  contactability_level?: string | null;
  contactability?: string | null;
  total_score?: number | null;
  relevance_score?: number | null;
  trust_score?: number | null;
  price_score?: number | null;
  location_score?: number | null;
  freshness_score?: number | null;
  scores?: Record<string, unknown> | null;
  reasons?: string[] | null;
  evidence?: Record<string, unknown> | null;
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

const metric = (result: WaouhResultCard, key: string): number | null => {
  const direct = (result as any)?.[key];
  const nested = result.scores && typeof result.scores === "object" ? (result.scores as any)[key] : null;
  const value = direct ?? nested;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
};

const resultReasons = (result: WaouhResultCard): string[] => {
  const nested = result.scores && typeof result.scores === "object" ? (result.scores as any).reasons : null;
  const raw = Array.isArray(result.reasons) ? result.reasons : Array.isArray(nested) ? nested : [];
  return raw.filter((value): value is string => typeof value === "string" && !!value.trim()).map((value) => value.trim()).slice(0, 3);
};

const contactLevel = (result: WaouhResultCard): string | null =>
  (result.contactability_level || result.contactability || (result.evidence as any)?.contactability_level || null) as string | null;

const isBuyerOpportunity = (result: WaouhResultCard): boolean => {
  const intent = String(result.intent || (result.evidence as any)?.intent || "").toUpperCase();
  const actor = String(result.actor_type || (result.evidence as any)?.actor_type || "").toLowerCase();
  return intent === "BUY" || intent === "RFQ" || actor === "buyer";
};

function priceLabel(r: WaouhResultCard): string {
  if (r.price_min != null && r.price_max != null && r.price_min !== r.price_max) return `${fmt(r.price_min)} – ${fmt(r.price_max)}`;
  const p = r.price ?? r.price_min ?? r.price_max;
  return p != null && Number.isFinite(Number(p)) ? fmt(Number(p)) : "Prix à négocier";
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
  const photos = normalizeResultCards([result])[0]?.photos || [];
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
  topPick = false,
}: {
  result: WaouhResultCard;
  onAction?: (text: string) => void;
  compact?: boolean;
  topPick?: boolean;
}) {
  const photos = normalizeResultCards([result])[0]?.photos || [];
  const [cur, setCur] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState<boolean>(() => isImageReady(photos[0]));
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const gallery = photos.map((url) => ({ url, caption: result.title }));
  const interestAction = result.action === null ? null : (result.action || defaultInterestAction(result));
  const opportunity = isBuyerOpportunity(result);
  const level = contactLevel(result);
   const score = metric(result, "total_score");
  const trust = metric(result, "trust_score");
  const priceFit = metric(result, "price_score");
  const reasons = resultReasons(result);
  const [intelligence, setIntelligence] = useState<WaouhProductIntelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  useEffect(() => {
    const id = String(result.id || "").trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      setIntelligence(null);
      return;
    }
    let alive = true;
    setIntelligenceLoading(true);
    loadWaouhProductIntelligence(id).then((value) => {
      if (!alive) return;
      setIntelligence(value);
      setIntelligenceLoading(false);
    });
    return () => { alive = false; };
  }, [result.id]);

  useEffect(() => {
    setFailed(false);
    if (cur >= photos.length && cur !== 0) { setCur(0); setZoom(null); return; }
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
    <div className={cn(
      "not-prose overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
      topPick ? "border-emerald-300 ring-1 ring-emerald-200/70" : "border-border"
    )}>
      <div className={cn("relative bg-muted", compact ? "aspect-[16/10]" : "aspect-[4/3]")}>
        {photos.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setZoom(cur)}
              className="block w-full h-full"
              aria-label={`Agrandir la photo de ${result.title}`}
            >
              {!ready && !failed && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />}
              {failed ? <span className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><ImageOff className="h-5 w-5" />Photo indisponible</span> : <img
                src={photos[cur]}
                alt={result.title}
                loading="lazy"
                decoding="async"
                onLoad={() => setReady(true)}
                onError={() => setFailed(true)}
                className={cn("w-full h-full object-cover transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")}
              />}
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
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-bold shadow-sm">
            #{result.index}
          </span>
          {topPick && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
              <Sparkles className="h-3 w-3" /> Top Pick
            </span>
          )}
          {opportunity && (
            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-700 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
              <Users className="h-3 w-3" /> Acheteur
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          {opportunity ? <Users className="h-4 w-4 shrink-0 text-cyan-700" /> : <SourceIcon source={result.source} />}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {opportunity ? "Opportunité acheteur" : "Offre vendeur"}
            </div>
            <h4 className="text-sm font-semibold leading-tight text-foreground line-clamp-2">{result.title}</h4>
          </div>
        </div>
        <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{priceLabel(result)}</div>

        {(score != null || trust != null || priceFit != null || level) && (
          <div className="flex flex-wrap gap-1.5">
            {score != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">
                <Sparkles className="h-3 w-3" /> Match {Math.round(score)}%
              </span>
            )}
            {trust != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800">
                <ShieldCheck className="h-3 w-3" /> Confiance {Math.round(trust)}%
              </span>
            )}
            {priceFit != null && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                Prix {Math.round(priceFit)}%
              </span>
            )}
            {level && <WaouhContactabilityBadge level={level} />}
          </div>
        )}

        {(intelligence || intelligenceLoading) && (
          <div className="space-y-1.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <div className="text-[10px] font-black text-slate-700">Détails</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{intelligence?.details.text || "Avatar analyse la fiche…"}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-2.5 py-2">
              <div className="text-[10px] font-black text-emerald-800">Marché réel</div>
              <div className="mt-0.5 text-[11px] leading-snug text-emerald-950">{intelligence?.market.text || "Analyse des sources WAOUH…"}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-2.5 py-2">
              <div className="text-[10px] font-black text-sky-800">Analyse comparative</div>
              <div className="mt-0.5 text-[11px] leading-snug text-sky-950">{intelligence?.comparison.text || "Comparaison en cours…"}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1 text-[10px] font-black text-amber-800"><Bot className="h-3 w-3" /> Pourquoi WAOUH le recommande</div>
              <div className="text-[11px] leading-snug text-amber-950">{intelligence?.recommendation.text || (reasons.length ? reasons.join(" · ") : "Avatar consolide les données du marché…")}</div>
            </div>
            {intelligence && (
              <div className="text-[9px] font-semibold text-muted-foreground">
                Analyse réelle · {intelligence.market.sample_count} référence(s){intelligence.market.source_mix?.length ? ` · ${intelligence.market.source_mix.join(" · ")}` : ""}
              </div>
            )}
          </div>
        )}
        {!intelligence && !intelligenceLoading && reasons.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/55 px-2.5 py-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
              <Bot className="h-3 w-3" /> Pourquoi WAOUH le recommande
            </div>
            <div className="text-[11px] leading-snug text-emerald-950">{reasons.join(" · ")}</div>
          </div>
        )}

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
                className="w-full h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleInterest}
              >
                {opportunity
                  ? "Proposer mon offre"
                  : level === "C2"
                    ? "Transmettre mon intérêt via WAOUH"
                    : level === "C3" || level === "C4"
                      ? "Laisser l’Avatar poursuivre"
                      : "Je suis intéressé"}
              </Button>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
              {result.fabric_id && !interestAction ? (
                <WaouhNexusContactSheet
                  fabricId={result.fabric_id}
                  title={result.title}
                  sourceUrl={result.source_url}
                  contactabilityLevel={level}
                />
              ) : result.source_url ? (
                <Button size="sm" variant="outline" className="h-8 min-w-0 px-2 text-[11px]" asChild>
                  <a href={result.source_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Source
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="h-8 min-w-0 px-2 text-[11px]" onClick={() => setAsking((a) => !a)}>
                <MessageCircleQuestion className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span className="truncate">{opportunity ? "Question à l’acheteur" : `Question au ${counterpartWord}`}</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px] text-muted-foreground hover:text-destructive" onClick={() => onAction(`annuler ${result.index}`)}>
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
  const normalized = normalizeResultCards(results);
  const scored = normalized
    .map((result, position) => ({ result, position, score: metric(result, "total_score") }))
    .filter((entry) => entry.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = scored[0]?.result ?? normalized[0];
  const remaining = top
    ? normalized.filter((result) => !(result.id === top.id && result.index === top.index))
    : normalized;
  const topOpportunity = top ? isBuyerOpportunity(top) : false;
  const rail = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const scroll = (step: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: step * Math.max(1, el.clientWidth - 24), behavior: 'smooth' });
  };
  const updatePosition = () => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPosition(max <= 1 ? 2 : el.scrollLeft <= 1 ? 0 : el.scrollLeft >= max - 1 ? 2 : 1);
  };
  useEffect(() => {
    updatePosition();
    if (typeof ResizeObserver === 'undefined' || !rail.current) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(rail.current);
    return () => observer.disconnect();
  }, [normalized.length]);
  if (!normalized.length) return null;
  return (
    <section aria-label="Articles proposés" aria-roledescription="carrousel" className="not-prose mt-2 min-w-0 w-full overflow-hidden">
      {top && (
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              <Sparkles className="h-3 w-3" />
              {topOpportunity ? "Meilleure opportunité" : "Meilleur choix WAOUH"}
            </span>
            <span className="text-[10px] text-muted-foreground">Signal Fabric · classement intelligent</span>
          </div>
          <WaouhProductCard result={top} onAction={top.source === "catalogue" ? undefined : onAction} compact={compact} topPick />
        </div>
      )}
      {remaining.length > 0 && <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{remaining.length} autre{remaining.length > 1 ? "s" : ""} option{remaining.length > 1 ? "s" : ""} · Faites défiler</span>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Articles précédents" disabled={position === 0 || (position === 2 && (rail.current?.scrollLeft || 0) <= 1)} onClick={() => scroll(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Articles suivants" disabled={position === 2} onClick={() => scroll(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>}
      <div ref={rail} onScroll={updatePosition} className="flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2">
        {remaining.map((r, i) => <div key={`${r.id}-${r.index}`} role="group" aria-label={`${i + 2} sur ${normalized.length}`} className={cn("min-w-0 shrink-0 snap-start", "w-[calc(100%-1rem)] sm:w-[260px]")}>
          <WaouhProductCard result={r} onAction={r.source === 'catalogue' ? undefined : onAction} compact={compact} />
        </div>)}
      </div>
    </section>
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
