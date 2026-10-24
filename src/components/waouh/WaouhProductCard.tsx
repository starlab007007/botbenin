import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WaouhConvergenceDialog } from "./WaouhConvergenceWorkspace";
import { WaouhResultEssentials } from "./WaouhResultEssentials";
import { CONVERGENCE_LIMIT, resultEssentials, resultKind, withSearchReferences } from "@/lib/waouh/convergence";
import "./waouh-results-vip.css";
import React, { useEffect, useRef, useState } from "react";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
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
  const [convergenceOpen, setConvergenceOpen] = useState(false);
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
    <div className="wr-vip-card">
      <div className="wr-card-head">
        <div className="wr-photo"><button type="button" onClick={() => photos.length && setZoom(cur)} aria-label={`Agrandir la photo de ${result.title}`}>
          {photos.length && !failed ? <img src={photos[cur]} alt={result.title} loading="lazy" decoding="async" onLoad={() => setReady(true)} onError={() => setFailed(true)} /> : <span className="flex flex-col gap-2 items-center text-xs text-muted-foreground"><ImageOff size={22} />Photo non fournie</span>}
        </button>{photos.length > 1 && <div className="wr-photo-controls"><button type="button" aria-label="Photo précédente" onClick={() => go(-1)}><ChevronLeft size={14} /></button><span>{cur + 1}/{photos.length}</span><button type="button" aria-label="Photo suivante" onClick={() => go(1)}><ChevronRight size={14} /></button></div>}</div>
        <div className="wr-card-title"><span>{opportunity ? 'Demande d’un acheteur' : resultKind(result) === 'service' ? 'Prestation' : resultKind(result) === 'announcement' ? 'Annonce' : 'Offre produit'}</span><h4>{result.title}</h4><div className="wr-location">{[result.city, result.quartier, conditionLabel(result.condition)].filter(Boolean).join(' · ') || 'Localisation à préciser'}</div><div className="wr-price">{priceLabel(result)}</div></div>
      </div>
      <WaouhResultEssentials result={result} />
      <div className="wr-actions">
        {resultKind(result) === "announcement" && <Button className="w-full min-h-11" onClick={() => setConvergenceOpen(true)}>Préparer une réponse à l’annonce</Button>}
        {resultKind(result) !== "announcement" && (onAction || externalDeal) && v3Entry && (!externalOpportunity || externalDeal) && (
          <div className="mt-1 space-y-1.5">
            <Button
              size="sm"
              className="h-auto min-h-11 w-full whitespace-normal rounded-xl px-2 py-2 text-[13px] font-black leading-tight bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleWant}
            >
              {resultKind(result) === "service" ? "Demander cette prestation" : resultKind(result) === "announcement" ? "Répondre à l’annonce" : v3Entry.label}
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

        {onAction && resultKind(result) !== "announcement" && !(v3Entry && (!externalOpportunity || externalDeal)) && (
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
              {result.fabric_id && (
                <WaouhDelegateButton result={{ ...result, fabric_id: result.fabric_id }} mode={opportunity ? "sell" : "buy"} className="h-11" />
              )}
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
        <details className="wr-more"><summary>Autres actions et résultat attendu</summary><div className="wr-more-actions">{externalDeal && result.fabric_id && <WaouhDelegateButton result={{ ...result, fabric_id: result.fabric_id }} mode={opportunity ? "sell" : "buy"} />}<Button variant="outline" onClick={() => setConvergenceOpen(true)}>Organiser ce besoin avec Bot</Button>{result.source_url && <a href={result.source_url} target="_blank" rel="noreferrer" className="text-xs underline">Voir l’annonce d’origine</a>}</div></details>
      </div>
      <WaouhConvergenceDialog open={convergenceOpen} onOpenChange={setConvergenceOpen} source={result} />

      {zoom !== null && photos.length > 0 && (
        <ChatImageLightbox images={gallery} index={zoom} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}

export function WaouhProductResults({ results, onAction, compact }: { results: WaouhResultCard[]; onAction?: (text: string, meta?: Record<string, unknown>) => void; compact?: boolean }) {
  const normalized = withSearchReferences(normalizeResultCards(results));
  const [selected, setSelected] = useState<string[]>([]), [page, setPage] = useState(0), [all, setAll] = useState(false), [sort, setSort] = useState('selection');
  const [comparing, setComparing] = useState(false), [organizing, setOrganizing] = useState(false), [notice, setNotice] = useState('');
  const refs = useRef(new Map<string, HTMLDivElement>());
  const key = (r: WaouhResultCard) => `${r.id}:${r.index}`;
  const signature = normalized.map(key).join('|');
  useEffect(() => { setSelected(old => old.filter(k => normalized.some(r => key(r) === k))); setPage(0); }, [signature]);
  // Sort the presentation only; never rewrite canonical indices or action IDs.
  const ordered = [...normalized].sort((a,b) => sort === 'asc' ? (a.price ?? a.price_min ?? Infinity) - (b.price ?? b.price_min ?? Infinity) : sort === 'desc' ? (b.price ?? b.price_min ?? -1) - (a.price ?? a.price_min ?? -1) : 0);
  const size = all ? Math.max(1, ordered.length) : 5, currentPage = Math.min(page, Math.max(0, Math.ceil(ordered.length / size) - 1));
  const visible = ordered.slice(currentPage * size, (currentPage + 1) * size), chosen = normalized.filter(r => selected.includes(key(r)));
  if (!normalized.length) return null;
  return <section className="wr-results not-prose" aria-label="Offres et annonces proposées">
    <div className="wr-toolbar"><h3>{normalized.length} résultat{normalized.length > 1 ? 's' : ''} · le choix en clair</h3><div className="wr-toolbar-actions"><label><span className="sr-only">Trier les résultats</span><select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="selection">Sélection reçue</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></label><Button variant="outline" disabled={chosen.length < 2} onClick={() => setComparing(true)}>Comparer {chosen.length}/5</Button><Button variant="outline" onClick={() => setOrganizing(true)}><Sparkles size={15} />Organiser mon besoin</Button></div></div>
    <p className="text-xs text-muted-foreground mb-3">Produits, services et annonces · informations annoncées, à confirmer avec l’interlocuteur.</p>
    <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{notice}</p>
    <div className="wr-grid">{visible.map(r => <div key={key(r)} ref={el => { if (el) refs.current.set(key(r), el); else refs.current.delete(key(r)); }} className="wr-wrap"><div className="wr-pick"><span>Résultat {r.index}</span><label><input type="checkbox" aria-label={`Comparer ${r.title}, résultat ${r.index}`} checked={selected.includes(key(r))} onChange={e => { if (!e.target.checked) setSelected(old => old.filter(x => x !== key(r))); else if (selected.length < CONVERGENCE_LIMIT) setSelected(old => [...old, key(r)]); else setNotice('Vous pouvez comparer jusqu’à 5 offres. Retirez-en une pour en ajouter une autre.'); }} />Comparer</label></div><WaouhProductCard result={r} onAction={r.source === 'catalogue' ? undefined : onAction} compact={compact} /></div>)}</div>
    <div className="wr-paging"><Button variant="outline" size="icon" aria-label="Résultats précédents" disabled={currentPage === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></Button><span>{currentPage * size + 1}–{Math.min((currentPage + 1) * size, normalized.length)} sur {normalized.length}</span><Button variant="outline" size="icon" aria-label="Résultats suivants" disabled={(currentPage + 1) * size >= normalized.length} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></Button></div>
    {normalized.length > 5 && <div className="wr-all"><Button variant="ghost" onClick={() => { setAll(x => !x); setPage(0); }}>{all ? 'Revenir à 5 résultats par page' : `Afficher les ${normalized.length} résultats ensemble`}</Button></div>}
    <Dialog open={comparing} onOpenChange={setComparing}><DialogContent className="wr-compare-dialog"><DialogHeader><DialogTitle>Comparer votre sélection · {chosen.length}/5</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Comparez les références, le périmètre et le coût total. Les différences de modèle ou de prestation limitent la comparaison des prix.</p><div className="wr-compare-grid">{chosen.map(r => { const v = resultEssentials(r); return <article className="wr-compare-item" key={key(r)}>{r.photos?.[0] && <img src={r.photos[0]} alt={r.title} />}<h3>{r.title}</h3><p>{priceLabel(r)}</p><small>{r.city || 'Localisation à confirmer'}</small><p>{v.advice || v.market}</p><small>{v.missing.join(' · ')}</small><Button variant="outline" onClick={() => { setComparing(false); setAll(true); setTimeout(() => refs.current.get(key(r))?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0); }}>Retrouver cette fiche</Button><Button variant="ghost" onClick={() => setSelected(old => old.filter(k => k !== key(r)))}>Retirer</Button></article>; })}</div></DialogContent></Dialog>
    <WaouhConvergenceDialog open={organizing} onOpenChange={setOrganizing} />
  </section>;
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
