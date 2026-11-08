import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, ExternalLink, Eye, HeartHandshake } from "lucide-react";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import type { MissionContext, MissionKind } from "@/lib/waouh/guidedDiscovery";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
import { WaouhDirectContact } from "./WaouhDirectContact";
import "./waouh-market.css";
import { offerChannels } from "@/lib/waouh/offerChannels";

type Mode = "buy" | "sell" | "ask";

/** Verbe de l'action principale, selon le type de recherche. */
export function offerPrimaryLabel(kind?: MissionKind | string | null): string {
  if (kind === "service" || kind === "project") return "Demander un devis";
  if (kind === "opportunity") return "Postuler";
  return "Intéressé";
}

/**
 * Lien vers le Deal Room existant pour une offre. Achat et service : le panneau de
 * proposition de prix s'ouvre aussitôt (prérempli avec le prix annoncé quand il est
 * connu). Opportunité : le Deal Room suit son propre parcours de dossier.
 */
export function offerDealRoomPath(result: Pick<NexusDiscoveryResult, "fabric_id" | "price_min" | "price_max">, kind?: MissionKind | string | null): string {
  const params = new URLSearchParams({ fabric_id: result.fabric_id });
  if (kind !== "opportunity") {
    const price = result.price_min ?? result.price_max;
    if (price != null && Number.isFinite(Number(price))) params.set("offer", String(Math.round(Number(price))));
    else params.set("propose", "1");
  }
  return `/app/deal-room?${params}`;
}

/**
 * Offre joignable : membre WAOUH, partenaire, ou commerce dont le contact est connu
 * et autorisé. Seules ces offres peuvent être confiées à Bot ; les autres renvoient
 * vers l'annonce d'origine.
 */
export function offerReachable(result: Pick<NexusDiscoveryResult, "fabric_id" | "evidence" | "contact_policy">): boolean {
  const id = result.fabric_id || "";
  if (id.startsWith("article:")) return true;
  const evidence = (result.evidence || {}) as Record<string, unknown>;
  if (id.startsWith("catalog:") && (evidence.source === "partner" || evidence.has_contact === true || evidence.has_contact === "true")) return true;
  if (result.contact_policy?.can_auto_contact === true) return true;
  // Contact WhatsApp retrouvé par Nexus, Radar ou une autre source : Bot peut l'écrire.
  return offerChannels(result as never).includes("whatsapp");
}

/** Les offres dont le vendeur est joignable passent devant, l'ordre de pertinence est conservé à l'intérieur de chaque groupe. */
export function joinableFirst<T extends Pick<NexusDiscoveryResult, "fabric_id" | "evidence" | "contact_policy">>(results: T[]): T[] {
  const joinable: T[] = [], other: T[] = [];
  for (const r of results) (offerReachable(r) ? joinable : other).push(r);
  return [...joinable, ...other];
}

type Shared = {
  mode: Mode;
  kind?: MissionKind;
  missionContext?: MissionContext;
  articleId?: string;
  city?: string | null;
  budgetMax?: number | null;
  /** Retourne false (et redirige vers la connexion) si l'utilisateur n'est pas connecté. */
  requireAuth: (next?: string) => boolean;
};

/**
 * Actions d'une offre : une action principale (Intéressé → Deal Room avec proposition
 * de prix) et deux discrètes (confier cette offre à Bot, voir les détails).
 * La vente garde son parcours de contact existant (`saleAction`).
 */
export function WaouhOfferActions({ result, alternates, onDetails, saleAction, contactAction, ...shared }: Shared & {
  result: NexusDiscoveryResult;
  alternates: NexusDiscoveryResult[];
  /** Absent dans la fiche détail elle-même. */
  onDetails?: () => void;
  saleAction?: ReactNode;
  /** Autres moyens de contact, affichés seulement dans la fiche détail. */
  contactAction?: ReactNode;
}) {
  const navigate = useNavigate();
  const { mode, kind, requireAuth } = shared;
  const reachable = offerReachable(result);
  const primary = mode === "sell" && saleAction ? saleAction : !reachable ? (
    result.source_url
      ? <a className="wgd-offer-primary" href={result.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />Voir l’annonce d’origine</a>
      : <span className="wgd-offer-unreachable">Contact non disponible</span>
  ) : (
    <button type="button" className="wgd-offer-primary" onClick={() => {
      const path = offerDealRoomPath(result, kind);
      if (requireAuth(path)) navigate(path);
    }}>
      <HeartHandshake size={16} aria-hidden="true" />{offerPrimaryLabel(kind)}
    </button>
  );
  return (
    <div className="wgd-offer-actions">
      {primary}
      <WaouhDirectContact result={result} requireAuth={requireAuth} />
      <div className="wgd-offer-secondary">
        {!reachable && result.source_url && <span className="wgd-offer-unreachable">Contact non disponible</span>}
        {reachable && <WaouhDelegateButton result={result} mode={mode} articleId={shared.articleId} discoveryKind={kind} missionContext={shared.missionContext}
          city={shared.city} budgetMax={shared.budgetMax} variant="secondary" label="Bot" className="h-10"
          alternates={alternates.filter(a => a.fabric_id !== result.fabric_id && offerReachable(a)).slice(0, 3).map(a => ({ fabric_id: a.fabric_id, city: a.city }))} />}
        {onDetails && <button type="button" className="wgd-offer-ghost" onClick={onDetails}><Eye size={15} aria-hidden="true" />Détails</button>}
      </div>
      {!onDetails && contactAction && <details className="wgd-disclosure"><summary>Autres moyens de contact</summary><div className="pb-3">{contactAction}</div></details>}
    </div>
  );
}

/** Bandeau en tête des résultats : confier d'un geste les meilleures offres à Bot. */
export function WaouhBotBanner({ top, followAction, tracking, ...shared }: Shared & {
  top: NexusDiscoveryResult[];
  /** Suivi continu (nouvelles offres) : action existante de la recherche, gardée en secondaire. */
  followAction?: ReactNode;
  tracking?: string;
}) {
  const reachable = top.filter(offerReachable);
  const best = reachable[0];
  if (!top.length) return null;
  if (!best) return (
    <section className="wgd-bot-banner" aria-label="Confier la recherche à Bot">
      <div className="wgd-bot-banner-main">
        <BotLiveAvatar size={40} />
        <div className="wgd-bot-banner-copy">
          <strong>Aucun vendeur joignable pour l’instant</strong>
          <p>Consultez les annonces d’origine ou laissez Bot surveiller les nouvelles offres.</p>
        </div>
      </div>
      {(followAction || tracking) && <div className="wgd-bot-banner-follow"><Bot size={14} aria-hidden="true" />{followAction}{tracking && <span role="status">{tracking}</span>}</div>}
    </section>
  );
  const count = Math.min(4, reachable.length);
  return (
    <section className="wgd-bot-banner" aria-label="Confier la recherche à Bot">
      <div className="wgd-bot-banner-main">
        <BotLiveAvatar size={40} />
        <div className="wgd-bot-banner-copy">
          <strong>{count > 1 ? `${count} offres · Bot recommande la n°1` : "Bot recommande cette offre"}</strong>
          <p>{count > 1 ? "Il négocie dans votre plafond et passe à la suivante sans réponse sous 48 h." : "Il négocie dans votre plafond. Vous confirmez l’accord final."}</p>
          {shared.budgetMax ? <small>Plafond · {new Intl.NumberFormat("fr-FR").format(shared.budgetMax)} F</small> : null}
        </div>
        <div className="wgd-bot-banner-cta">
          <WaouhDelegateButton result={best} mode={shared.mode} articleId={shared.articleId} discoveryKind={shared.kind} missionContext={shared.missionContext}
            city={shared.city} budgetMax={shared.budgetMax} className="h-11 px-4" label={count > 1 ? `Confier les ${count} à Bot` : "Confier à Bot"}
            alternates={reachable.slice(1, 4).map(a => ({ fabric_id: a.fabric_id, city: a.city }))} />
        </div>
      </div>
      {(followAction || tracking) && <div className="wgd-bot-banner-follow"><Bot size={14} aria-hidden="true" />{followAction}{tracking && <span role="status">{tracking}</span>}</div>}
    </section>
  );
}
