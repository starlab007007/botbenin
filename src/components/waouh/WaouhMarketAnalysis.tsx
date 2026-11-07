import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ExternalLink, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { analyzeMarket } from "@/lib/waouh/marketAnalysis";
import { channelName, offerChannels } from "@/lib/waouh/offerChannels";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";
import type { MissionContext, MissionKind } from "@/lib/waouh/guidedDiscovery";
import { fetchMarketReference, sourceDate, type MarketPoint, type MarketReference } from "@/lib/waouh/marketReference";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
import { WaouhDirectContact } from "./WaouhDirectContact";
import "./waouh-market.css";

const money = (n: number | null) => (n === null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} F`);

/**
 * Analyse du marché par l'avatar : repères de prix, choix de l'avatar, comparaison des meilleures offres,
 * et « Confier à l'avatar » (prise en charge de bout en bout, avec notification).
 */
export function WaouhMarketAnalysis({ results, city, budgetMax, mode = "buy", kind, missionContext, articleId, query, onInterested }: {
  results: NexusDiscoveryResult[];
  city?: string | null;
  budgetMax?: number | null;
  mode?: "buy" | "sell" | "ask";
  kind?: MissionKind;
  missionContext?: MissionContext;
  articleId?: string;
  /** Recherche de l'utilisateur, pour cadrer l'analyse. */
  query?: string;
  /** Ouvre le parcours « Intéressé » de l'offre choisie. */
  onInterested: (item: NexusDiscoveryResult) => void;
}) {
  const analysis = useMemo(() => analyzeMarket(results, { city }), [results, city]);
  const [handled, setHandled] = useState(false);
  const [reference, setReference] = useState<MarketReference | null>(null);
  const idsKey = useMemo(() => results.slice(0, 24).map((r) => r.fabric_id).join("|"), [results]);
  useEffect(() => {
    let alive = true;
    setReference(null);
    if (!idsKey) return;
    void fetchMarketReference({ query: query || results[0]?.subject || "", city, fabricIds: idsKey.split("|") }).then((r) => { if (alive) setReference(r); });
    return () => { alive = false; };
  }, [idsKey, city, query]);
  if (!results.length) return null;
  const sourceOf = (id: string) => reference?.sources.find((s) => s.fabric_id === id) ?? null;
  const cites = (point: MarketPoint) => point.cites.map((n) => <a key={n} href={`#wmk-src-${n}`} className="wmk-cite" aria-label={`Source ${n}`}>[{n}]</a>);
  const { pick, compare } = analysis;
  return (
    <section className="wmk" aria-label="Analyse du marché par votre avatar" data-testid="market-analysis">
      <header className="wmk-head">
        <BotLiveAvatar size={34} />
        <div><strong>Analyse du marché</strong><span>Par votre avatar · {analysis.total} offre{analysis.total > 1 ? "s" : ""} comparée{analysis.total > 1 ? "s" : ""}</span></div>
      </header>
      <div className="wmk-stats">
        <div><span><BarChart3 size={13} aria-hidden="true" />Prix</span><b>{money(analysis.low)}</b><small>à {money(analysis.high)} · médiane {money(analysis.median)}</small></div>
        <div><span><ShieldCheck size={13} aria-hidden="true" />Joignables</span><b>{analysis.contactable}/{analysis.total}</b><small>{(["waouh", "whatsapp", "email", "phone"] as const).filter((c) => analysis.byChannel[c] > 0).map((c) => `${analysis.byChannel[c]} ${channelName(c)}`).join(" · ") || "aucun contact"}</small></div>
        <div><span><MapPin size={13} aria-hidden="true" />Votre zone</span><b>{analysis.inZone}</b><small>{city || "toutes zones"}</small></div>
      </div>
      <p className="wmk-advice"><Sparkles size={14} aria-hidden="true" />{reference?.advice ? <>{reference.advice.text} {cites(reference.advice)}</> : analysis.advice}</p>
      {reference && reference.points.length > 0 && (
        <ul className="wmk-points" aria-label="Constats de l’avatar">
          {reference.points.map((p, i) => <li key={i}>{p.text} {cites(p)}</li>)}
        </ul>
      )}
      {pick ? (
        <div className="wmk-pick">
          <div className="wmk-pick-top"><span className="wmk-badge">Choix de l’avatar</span><strong>{pick.item.subject || pick.item.raw_text || "Offre"}</strong><b>{money(pick.price)}</b></div>
          <p>{pick.reason}</p>
          <div className="wmk-pick-actions">
            <button type="button" className="wmk-primary" onClick={() => onInterested(pick.item)}>Intéressé</button>
            <WaouhDelegateButton result={pick.item} mode={mode} articleId={articleId} discoveryKind={kind} missionContext={missionContext} city={city} budgetMax={budgetMax} label="Confier à l’avatar" variant="secondary" className="h-11"
              alternates={compare.slice(1).map((r) => ({ fabric_id: r.item.fabric_id, city: r.item.city }))} onHandled={() => setHandled(true)} />
          </div>
          <WaouhDirectContact result={pick.item} />
          {handled && <p className="wmk-handled" role="status"><CheckCircle2 size={15} aria-hidden="true" />Bot a pris en charge votre démarche, de bout en bout. Vous êtes prévenu à chaque étape et vous gardez la main.</p>}
        </div>
      ) : <p className="wmk-none">Aucune offre avec un contact exploitable. Ouvrez les annonces d’origine ou laissez l’avatar surveiller les nouvelles offres.</p>}
      {compare.length > 1 && (
        <ul className="wmk-compare" aria-label="Comparaison des meilleures offres">
          {compare.map((row, i) => (
            <li key={row.item.fabric_id} data-best={i === 0 || undefined}>
              <div><strong>{row.item.subject || "Offre"}</strong><small>{row.item.city || "Zone à préciser"} · {offerChannels(row.item).map(channelName).join(", ")}{sourceOf(row.item.fabric_id) ? <> · <a href={`#wmk-src-${sourceOf(row.item.fabric_id)!.n}`} className="wmk-cite">Source [{sourceOf(row.item.fabric_id)!.n}] {sourceOf(row.item.fabric_id)!.host}</a></> : null}</small></div>
              <div className="wmk-compare-price"><b>{money(row.price)}</b>{row.vsMedianPct !== null && <small data-sign={row.vsMedianPct <= 0 ? "down" : "up"}>{row.vsMedianPct > 0 ? "+" : ""}{row.vsMedianPct} %</small>}</div>
              <button type="button" onClick={() => onInterested(row.item)}>{i === 0 ? "Retenu" : "Choisir"}</button>
            </li>
          ))}
        </ul>
      )}
      {reference && reference.sources.length > 0 && (
        <details className="wmk-sources" open>
          <summary>Sources vérifiables ({reference.sources.length})</summary>
          <ol>
            {reference.sources.map((s) => (
              <li key={s.n} id={`wmk-src-${s.n}`}>
                <span className="wmk-src-n">[{s.n}]</span>
                <div>
                  <strong>{s.title}</strong>
                  <small>{s.host}{s.city ? ` · ${s.city}` : ""}{s.price !== null ? ` · ${money(s.price)}` : " · prix non affiché"}{sourceDate(s.observed_at) ? ` · relevé le ${sourceDate(s.observed_at)}` : ""}</small>
                </div>
                {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Ouvrir la source ${s.n}`}>Ouvrir<ExternalLink size={12} aria-hidden="true" /></a> : <em>Dans WAOUH</em>}
              </li>
            ))}
          </ol>
          <p className="wmk-src-note">Les prix et dates viennent des annonces ci-dessus ; ouvrez la source pour les vérifier.</p>
        </details>
      )}
    </section>
  );
}

export default WaouhMarketAnalysis;
