import React, { useEffect, useRef, useState } from "react";
import "./waouh-message-text.css";
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
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { isDirectDealCandidate, openExternalDeal, openMatchDetail } from "@/lib/waouh/nexusDeal";
import { toast } from "sonner";
import { smartOfferAmount } from "@/lib/waouh/hotLabels";

/**
 * Fiche produit d'un résultat de recherche WAOUH.
 * INVARIANT : 1 fiche = 1 article + SES propres photos.
 * Le zoom plein écran est restreint aux photos de cet article.
 */
export interface WaouhResultCard {
  index: number;
  id: string;
  article_id?: string | null;
  catalog_id?: string | null;
  source_id?: string | null;
  radar_signal_id?: string | null;
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
  market_comparison?: string | null;
  comparative_analysis?: string | null;
  recommendation?: string | null;
  intelligence_provenance?: Record<string, unknown> | null;
  photos?: string[] | null;
  /**
   * undefined = générer automatiquement « intéressé N ».
   * null = pas d'action d'intérêt (ex : fiche de confirmation déjà ouverte).
   */
  action?: string | null;
  /**
   * Parcours v3 : boutons de fiche fournis par le serveur (« Je le veux à X »,
   * « Proposer un prix », « Poser une question »). Remplacent le bouton d'intérêt.
   */
  actions?: Array<{ id: string; label: string }> | null;
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
  contact_pack?: Record<string, unknown> | null;
  readiness_level?: string | null;
  readiness_score?: number | null;
  actionability_score?: number | null;
  next_best_action?: string | null;
  best_channel?: string | null;
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
  if (value == null || value === "") return null;
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

/** Phrases de provenance ou de remplissage : jamais affichées, seules les informations réelles le sont. */
const FILLER = /signal découvert|source publique|détect(?:ée|é) par nexus|annonce waouh|source (?:nexus|waouh)|en cours d[’']enrichissement|aucun détail complémentaire/i;
const cleanLine = (value?: string | null): string | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const kept = text
    .split(/\s*[·|]\s*/)
    .filter((part) => part && !FILLER.test(part) && !/^source\b/i.test(part))
    .join(" · ")
    .trim();
  return kept || null;
};
const SOURCE_LABEL = /^(annonce|source|signal|nexus|waouh|partenaire|radar|google|facebook|instagram|tiktok|telegram|web)\b/i;
const CONDITION_FR: Record<string, string> = {
  new: "Neuf", like_new: "Comme neuf", good: "Bon état", used: "Occasion", fair: "État correct", poor: "À réparer", refurbished: "Reconditionné",
};
const conditionLabel = (value?: string | null): string | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return CONDITION_FR[text.toLowerCase().replace(/[\s-]+/g, "_")] ?? text;
};

const marketIntelligence = (result: WaouhResultCard) => {
  const score = metric(result, "total_score");
  const trust = metric(result, "trust_score");
  const price = metric(result, "price_score");
  const location = metric(result, "location_score");
  const freshness = metric(result, "freshness_score");
  const level = contactLevel(result);
  const readiness = String(result.readiness_level || (result.contact_pack as any)?.readiness_level || "");
  const actionabilityRaw = result.actionability_score ?? (result.contact_pack as any)?.actionability_score;
  const actionability = actionabilityRaw != null && Number.isFinite(Number(actionabilityRaw)) ? Number(actionabilityRaw) : null;
  const bestChannel = String(result.best_channel || (result.contact_pack as any)?.best_channel || "");
  const reasons = resultReasons(result);

  return {
    market:
      cleanLine(result.market_comparison) ||
      cleanLine(result.market_line) ||
      [
        price != null ? `Prix ${Math.round(price)}/100` : null,
        location != null ? `Proximité ${Math.round(location)}/100` : null,
        freshness != null ? `Fraîcheur ${Math.round(freshness)}/100` : null,
      ].filter(Boolean).join(" · "),
    comparison:
      cleanLine(result.comparative_analysis) ||
      [
        score != null ? `Correspondance ${Math.round(score)}%` : null,
        trust != null ? `Confiance ${Math.round(trust)}%` : null,
      ].filter(Boolean).join(" · "),
    recommendation:
      cleanLine(result.recommendation) ||
      reasons.map((reason) => cleanLine(reason)).filter(Boolean).join(" · ") ||
      "",
  };
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

function productIdentityMeta(result: WaouhResultCard): Record<string, unknown> {
  const source = String(result.source || "waouh").toLowerCase();
  const explicitArticle = String(result.article_id || "").trim();
  const catalogId = String(result.catalog_id || ((source === "partner" || source === "catalog") ? result.id : "")).trim();
  const sourceId = String(result.source_id || result.radar_signal_id || (source === "radar" ? result.id : "")).trim();
  if (explicitArticle) {
    return {
      article_id: explicitArticle,
      ...(catalogId ? { catalog_id: catalogId } : {}),
      ...(sourceId ? { source_id: sourceId } : {}),
      source,
    };
  }
  if (catalogId) return { catalog_id: catalogId, source_id: sourceId || catalogId, source };
  if (sourceId && source === "radar") return { source_id: sourceId, source };
  return { article_id: result.id, source };
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
  onAction?: (text: string, meta?: Record<string, unknown>) => void;
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
  // Parcours v3 : saisie d'offre pré-remplie avec le prix suggéré.
  const [offering, setOffering] = useState(false);
  // Résultat Nexus externe : Deal Room directe. Passe à false si le serveur garde la fiche de contact.
  const [directDeal, setDirectDeal] = useState(true);
  const [openingDirect, setOpeningDirect] = useState(false);
  const [offer, setOffer] = useState("");
  const serverActions = Array.isArray(result.actions) ? result.actions.filter((a) => a?.id && a?.label).slice(0, 3) : [];
  // Carte « chaude » : sans boutons fournis par le serveur, on synthétise l'entrée du parcours v3
  // (« Je le veux à X » + « Proposer un prix » + « Poser une question ») dès que l'identité du produit
  // est connue — jamais un simple « contacter ». Pas pour les demandes d'achat ni les fiches sans action.
  const entryPrice = Number(result.price ?? result.price_min ?? result.price_max ?? 0) || null;
  const synthesizedEntry = !serverActions.length && result.id && result.action !== null && !isBuyerOpportunity(result)
    ? { id: `je-veux:${result.id}`, label: entryPrice ? `Je le veux à ${fmt(entryPrice)}` : "Je le veux" }
    : null;
  const v3Entry = serverActions.find((a) => /^je-veux:/i.test(a.id)) ?? synthesizedEntry;
  const gallery = photos.map((url) => ({ url, caption: result.title }));
  const interestAction = result.action === null ? null : (result.action || defaultInterestAction(result));
  const opportunity = isBuyerOpportunity(result);
  const level = contactLevel(result);
  const externalOpportunity = !!result.fabric_id &&
    !["waouh", "chat", "waouh_app"].includes(String(result.source || "").toLowerCase());
  const externalDeal = directDeal && externalOpportunity && !isBuyerOpportunity(result) && isDirectDealCandidate(result.fabric_id);
  const score = metric(result, "total_score");
  const trust = metric(result, "trust_score");
  const actionability = metric(result, "actionability_score");
  const readiness = String(result.readiness_level || (result.contact_pack as any)?.readiness_level || "");
  const nextBestAction = String(result.next_best_action || (result.contact_pack as any)?.next_best_action || "");
  const bestChannel = String(result.best_channel || (result.contact_pack as any)?.best_channel || "");
  const priceFit = metric(result, "price_score");
  const reasons = resultReasons(result);
  const intelligence = marketIntelligence(result);
  const evidence = result.evidence && typeof result.evidence === "object" ? result.evidence as Record<string, unknown> : {};
  const details = String(
    evidence.details ||
    evidence.description ||
    evidence.raw_text ||
    evidence.summary ||
    ""
  ).trim();
  const cleanDetails = cleanLine(details);

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
    if (v3Entry) {
      // Parcours v3 : la question part au vendeur dans la Deal Room du produit.
      openDedicatedWindowFromResult(result);
      onAction(q, { ...productIdentityMeta(result), button_payload: `poser-question:${result.id}`, commerce_action: "ask" });
      setQuestion("");
      setAsking(false);
      return;
    }
    onAction(`question ${result.index} : ${q}`);
    setQuestion("");
    setAsking(false);
  };

  const handleInterest = () => {
    if (!interestAction || !onAction) return;
    openDedicatedWindowFromResult(result);
    onAction(interestAction);
  };

  const listPrice = Number(result.price ?? result.price_min ?? result.price_max ?? 0) || null;
  const openOffer = () => {
    const suggested = smartOfferAmount(listPrice);
    setOffer(suggested ? String(suggested) : "");
    setOffering((o) => !o);
    setAsking(false);
  };
  const submitOffer = () => {
    const amount = Number(offer.replace(/\D/g, ""));
    if (!Number.isFinite(amount) || amount < 1) return;
    if (externalDeal) { setOffering(false); void enterExternalDeal(amount); return; }
    if (!onAction) return;
    openDedicatedWindowFromResult(result);
    onAction(`Je propose ${fmt(amount)}`, { ...productIdentityMeta(result), commerce_action: "offer", offer_price: amount });
    setOffering(false);
  };
  const smartAmount = smartOfferAmount(listPrice);
  const sendSmartOffer = () => {
    if (externalDeal && smartAmount) { setOffering(false); void enterExternalDeal(smartAmount); return; }
    if (!onAction || !smartAmount) return;
    openDedicatedWindowFromResult(result);
    onAction(`Je propose ${fmt(smartAmount)}`, { ...productIdentityMeta(result), commerce_action: "offer", offer_price: smartAmount });
    setOffering(false);
  };
  // Entrée directe en Deal Room d'un résultat externe (aucun contact du tiers à ce stade).
  const enterExternalDeal = async (amount: number | null) => {
    if (!result.fabric_id || openingDirect) return;
    setOpeningDirect(true);
    try {
      const outcome = await openExternalDeal(result.fabric_id, amount, getWaouhSessionId());
      if (outcome.status === "fallback") { setDirectDeal(false); return; }
      if (outcome.status === "refused") {
        toast.message(outcome.response.reply.title, { description: outcome.response.reply.detail });
        return;
      }
      const detail = openMatchDetail(outcome.response, {
        title: result.title, price: listPrice, city: result.city ?? null, photo: photos[0] ?? null,
      });
      bufferOpenIntent(detail as OpenDetail);
      window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
      window.dispatchEvent(new CustomEvent("waouh:match-updated", { detail: { article_id: outcome.response.article_id } }));
    } finally {
      setOpeningDirect(false);
    }
  };
  const handleWant = () => {
    if (externalDeal) { void enterExternalDeal(null); return; }
    if (!v3Entry || !onAction) return;
    openDedicatedWindowFromResult(result);
    onAction(v3Entry.label, { ...productIdentityMeta(result), button_payload: v3Entry.id, commerce_action: "open_deal" });
  };

  return (
    <div className={cn(
      "not-prose overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
      topPick ? "border-emerald-300 ring-1 ring-emerald-200/70" : "border-border"
    )}>
      <div className={cn("relative bg-muted", !photos.length ? "h-16" : compact ? "h-[170px] sm:h-[190px] lg:h-[210px] 2xl:h-[230px]" : "h-[clamp(170px,30vh,300px)]")}>
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

        {(score != null || trust != null || priceFit != null || level || actionability != null || readiness) && (
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
            {actionability != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-800">
                <Bot className="h-3 w-3" /> Action {Math.round(actionability)}%
              </span>
            )}
            {readiness && (
              <span className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-800">
                {readiness}
              </span>
            )}
            {level && <WaouhContactabilityBadge level={level} />}
          </div>
        )}

        {(nextBestAction || bestChannel) && (
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-violet-800">Action recommandée par Bot</div>
            <div className="mt-1 text-[10px] font-bold text-violet-950">
              {nextBestAction === "CONTACT_NOW" ? "Contacter maintenant" :
               nextBestAction === "OPEN_DEAL_ROOM" ? "Ouvrir le Deal Room" :
               nextBestAction === "REQUEST_APPROVAL" ? "Valider le contact" :
               nextBestAction === "WAIT_REPLY" ? "Attendre la réponse" :
               nextBestAction === "FOLLOW_UP" ? "Relancer" :
               nextBestAction === "NEGOTIATE" ? "Négocier" :
               nextBestAction === "ENRICH" ? "Enrichir le contact" :
               nextBestAction || "Poursuivre"}
              {bestChannel ? ` · canal ${bestChannel}` : ""}
            </div>
          </div>
        )}

        {(cleanDetails || intelligence.market || intelligence.comparison || intelligence.recommendation) && (
          <details className="waouh-message-details rounded-xl border border-slate-200 px-2.5">
            <summary>Analyse de Bot</summary>
            <div className="grid gap-1.5 pb-2">
              {cleanDetails && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-700">Détails</div>
                  <div className="text-[11px] leading-snug text-slate-700 break-words">{cleanDetails}</div>
                </div>
              )}
              {intelligence.market && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/55 px-2.5 py-2">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">Marché</div>
                  <div className="text-[11px] leading-snug text-emerald-950 break-words">{intelligence.market}</div>
                </div>
              )}
              {intelligence.comparison && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/55 px-2.5 py-2">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-blue-800">Comparaison</div>
                  <div className="text-[11px] leading-snug text-blue-950 break-words">{intelligence.comparison}</div>
                </div>
              )}
              {intelligence.recommendation && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/65 px-2.5 py-2">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                    <Bot className="h-3 w-3" /> Avis de Bot
                  </div>
                  <div className="text-[11px] leading-snug text-amber-950 break-words">{intelligence.recommendation}</div>
                </div>
              )}
            </div>
          </details>
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
          {conditionLabel(result.condition) && <span className="rounded bg-muted px-1.5 py-0.5">{conditionLabel(result.condition)}</span>}
          {result.badge && !SOURCE_LABEL.test(String(result.badge)) && !FILLER.test(String(result.badge)) && <span className="rounded bg-muted px-1.5 py-0.5">{result.badge}</span>}
        </div>

        {cleanLine(result.market_line) && (
          <p className="text-[11px] leading-snug text-muted-foreground break-words">{cleanLine(result.market_line)}</p>
        )}

        {(onAction || externalDeal) && v3Entry && (!externalOpportunity || externalDeal) && (
          <div className="mt-1 space-y-1.5">
            <Button
              size="sm"
              className="h-auto min-h-11 w-full whitespace-normal rounded-xl px-2 py-2 text-[13px] font-black leading-tight bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleWant}
            >
              {v3Entry.label}
            </Button>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Bouton intelligent : le prix suggéré est dans le libellé et part en un geste dans la fenêtre de négociation. */}
              <Button size="sm" variant="outline" className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-[12px] leading-tight" onClick={smartAmount ? sendSmartOffer : openOffer}>
                <span>{smartAmount ? `Proposer ${fmt(smartAmount)}` : "Proposer un prix"}</span>
              </Button>
              {externalDeal ? (
                // Vendeur externe : la question passe par l'offre transmise, pas par un relais inexistant.
                result.source_url ? (
                  <Button size="sm" variant="outline" className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-[12px] leading-tight" asChild>
                    <a href={result.source_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5 shrink-0" />
                      Voir l'annonce
                    </a>
                  </Button>
                ) : <span />
              ) : (
                <Button size="sm" variant="outline" className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-[12px] leading-tight" onClick={() => { setAsking((a) => !a); setOffering(false); }}>
                  <MessageCircleQuestion className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span>Poser une question</span>
                </Button>
              )}
            </div>
            {smartAmount && !offering && (
              <button type="button" className="w-full text-center text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline" onClick={openOffer}>
                Autre montant
              </button>
            )}
            {offering && (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  inputMode="numeric"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitOffer(); } }}
                  placeholder="Votre prix en FCFA"
                  className="h-8 text-xs"
                  aria-label="Votre prix en FCFA"
                />
                <Button size="sm" className="h-8 px-2" onClick={submitOffer} aria-label="Envoyer l'offre">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
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

        {onAction && !(v3Entry && (!externalOpportunity || externalDeal)) && (
          <div className="mt-1 space-y-1.5">
            {interestAction && !externalOpportunity && (
              <Button
                size="sm"
                className="h-auto min-h-11 w-full whitespace-normal rounded-xl px-2 py-2 text-[13px] font-black leading-tight bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleInterest}
              >
                {opportunity
                  ? "Proposer mon offre"
                  : "Je suis intéressé · ouvrir le Deal Room"}
              </Button>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {result.fabric_id && (externalOpportunity || !interestAction) ? (
                <WaouhNexusContactSheet
                  fabricId={result.fabric_id}
                  title={result.title}
                  sourceUrl={result.source_url}
                  contactabilityLevel={level}
                />
              ) : result.source_url ? (
                <Button size="sm" variant="outline" className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-[12px] leading-tight" asChild>
                  <a href={result.source_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5 shrink-0" />
                    Voir l’annonce
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-[12px] leading-tight" onClick={() => setAsking((a) => !a)}>
                <MessageCircleQuestion className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span>{opportunity ? "Question à l’acheteur" : `Question au ${counterpartWord}`}</span>
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
  onAction?: (text: string, meta?: Record<string, unknown>) => void;
  compact?: boolean;
}) {
  const normalized = normalizeResultCards(results);
  const scored = normalized
    .map((result, position) => {
      const match = metric(result, "total_score") ?? 0;
      const actionability = metric(result, "actionability_score") ?? 0;
      return { result, position, score: match * 0.72 + actionability * 0.28 };
    })
    .sort((a, b) => b.score - a.score);
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
        // Lisibilité du fil : la meilleure fiche ne dépasse plus 560 px de large.
        <div className="mb-3 w-full max-w-[min(100%,560px)]">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              <Sparkles className="h-3 w-3" />
              {topOpportunity ? "Meilleure opportunité" : "Meilleur choix WAOUH"}
            </span>
            <span className="text-[10px] text-muted-foreground">Classement personnalisé</span>
          </div>
          <WaouhProductCard result={top} onAction={top.source === "catalogue" ? undefined : onAction} compact={compact} topPick />
        </div>
      )}
      {remaining.length > 0 && <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{remaining.length} autre{remaining.length > 1 ? "s" : ""} option{remaining.length > 1 ? "s" : ""} · Faites défiler</span>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="outline" className="h-11 w-11" aria-label="Articles précédents" disabled={position === 0 || (position === 2 && (rail.current?.scrollLeft || 0) <= 1)} onClick={() => scroll(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="outline" className="h-11 w-11" aria-label="Articles suivants" disabled={position === 2} onClick={() => scroll(1)}><ChevronRight className="h-4 w-4" /></Button>
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
