import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, MapPin, ShieldCheck, Sparkles, Trophy, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { briefMoney, chatMarketBrief, type BriefRow } from "@/lib/waouh/chatMarketBrief";
import type { GuidedKind } from "@/lib/waouh/guidedAsk";
import { offerJourney } from "@/lib/waouh/offerJourney";
import { resultKind } from "@/lib/waouh/convergence";
import { WaouhPriorityFacts } from "./WaouhPriorityFacts";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
import "./waouh-search-live.css";


function PremiumOfferGallery({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const images = photos.filter(p => !failed.includes(p));
  const active = Math.min(index, Math.max(0, images.length - 1));
  if (!images.length) return null;
  return <div className="wsl-hero-gallery" aria-label="Photos de l’offre">
    <img src={images[active]} alt={`${title} — photo ${active + 1}`} decoding="async" onError={() => {setFailed(old => [...old, images[active]]);setIndex(0);}} />
    {images.length > 1 && <>
      <button type="button" className="wsl-photo-prev" aria-label="Photo précédente" onClick={() => setIndex((active + images.length - 1) % images.length)}><ChevronLeft size={19}/></button>
      <button type="button" className="wsl-photo-next" aria-label="Photo suivante" onClick={() => setIndex((active + 1) % images.length)}><ChevronRight size={19}/></button>
      <span className="wsl-photo-count" aria-live="polite">{active + 1} / {images.length}</span>
      <div className="wsl-photo-thumbs">{images.map((url,i) => <button key={url} type="button" aria-label={`Afficher la photo ${i+1}`} aria-pressed={i===active} onClick={()=>setIndex(i)}><img src={url} alt="" loading="lazy" onError={()=>setFailed(old=>[...old,url])}/></button>)}</div>
    </>}
  </div>;
}

const gapLabel = (row: BriefRow) => {
  if (row.vsMedianPct === null) return row.price === null ? "Prix à demander" : "—";
  if (Math.abs(row.vsMedianPct) < 3) return "Au prix médian";
  return row.vsMedianPct < 0 ? `${Math.abs(row.vsMedianPct)} % sous la médiane` : `${row.vsMedianPct} % au-dessus`;
};

/**
 * Analyse du marché par Bot, dans la fenêtre de recherche du Chat : repères de prix, choix de Bot,
 * comparaison des meilleures offres, et un seul bouton pour tout confier à Bot. Les fiches
 * complètes (photos, intérêt, message, proposition) restent juste en dessous.
 */
export function WaouhChatMarketBrief({ results, city, budget, kind, query, renderPrimary, onWatch, watchBusy }: {
  onWatch?: () => void;
  watchBusy?: boolean;
  renderPrimary?: (row: WaouhResultCard) => ReactNode;
  query?: string | null;
  results: WaouhResultCard[];
  city?: string | null;
  budget?: number | null;
  kind?: GuidedKind;
}) {
  const brief = useMemo(() => chatMarketBrief(results, { city, budget, query }), [results, city, budget, query]);

  if (!brief.total) return null;
  const { pick, compare, delegable } = brief;
  const journey = offerJourney(kind, pick ? resultKind(pick.result) : "");
  const commercial = journey === "purchase";
  const best = journey !== "opportunity" && pick && delegable.some(row => row.result === pick.result) ? pick : null;
  const alternates = best ? delegable.filter(row => row.result !== best.result && offerJourney(kind,resultKind(row.result)) === journey).slice(0, 3) : [];
  const mode = kind && ["service", "prestation", "demander", "opportunite"].includes(kind) ? "ask" : "buy";


  return (
    <section className="wsl-brief" aria-label="Analyse du marché par Bot" data-testid="chat-market-brief">
      {commercial && <details className="wsl-analysis-details"><summary><Sparkles size={15} />Analyse du marché<ChevronDown size={15} /></summary><header className="wsl-brief-head">
        <BotLiveAvatar size={38} />
        <div>
          <strong>Analyse du marché</strong>
          <span>{brief.total} offre{brief.total > 1 ? "s" : ""} comparée{brief.total > 1 ? "s" : ""} par Bot</span>
        </div>
      </header>

      <div className="wsl-stats">
        <div>
          <span><BarChart3 size={13} aria-hidden="true" />Prix</span>
          <b>{brief.low === null ? "À demander" : briefMoney(brief.low)}</b>
          <small>{brief.low !== null && brief.high !== null && brief.high !== brief.low ? `jusqu’à ${briefMoney(brief.high)} · médiane ${briefMoney(brief.median)}` : `${brief.priced}/${brief.total} offre${brief.total > 1 ? "s" : ""} chiffrée${brief.priced > 1 ? "s" : ""}`}</small>
        </div>
        <div>
          <span><MapPin size={13} aria-hidden="true" />Votre zone</span>
          <b>{city ? `${brief.inZone}/${brief.total}` : "—"}</b>
          <small>{city || "Zone non précisée"}</small>
        </div>
        <div>
          <span><ShieldCheck size={13} aria-hidden="true" />Joignables</span>
          <b>{brief.reachable}/{brief.total}</b>
          <small>{brief.reachable ? "contact possible" : "contact à trouver"}</small>
        </div>
      </div>

      <p className="wsl-advice"><Sparkles size={14} aria-hidden="true" /><span>{brief.advice}</span></p></details>}

      {pick && (
        <article className="wsl-pick" aria-label="Le choix de Bot">
          <PremiumOfferGallery key={`${pick.result.id}:${pick.result.index}`} photos={Array.from(new Set((pick.result.photos ?? []).filter((p): p is string => typeof p === "string" && /^https?:\/\//i.test(p))))} title={pick.result.title} />
          <div className="wsl-pick-copy">
            <span className="wsl-tag"><Trophy size={11} aria-hidden="true" />{pick.match === 'near' || brief.exact === 0 ? 'Alternative à vérifier' : 'Le choix de Bot'}</span>
            <h4>{pick.result.title}</h4>
            <p className="wsl-pick-price">{journey === "opportunity" ? "Conditions à consulter" : pick.price === null ? "Prix à demander" : briefMoney(pick.price)}{pick.result.city ? <small> · {pick.result.city}</small> : null}</p>
            <ul>{pick.match === 'exact' && <li>Correspond à la demande</li>}{pick.withinBudget === true && <li>Dans le budget</li>}{pick.inZone && <li>Dans votre zone</li>}{commercial && brief.priced >= 2 && pick.vsMedianPct !== null && Math.abs(pick.vsMedianPct) < 3 && <li>Prix médian annoncé</li>}{pick.reachable && <li>Contact possible</li>}</ul><WaouhPriorityFacts result={pick.result} kind={kind} query={query}/>
          </div>
        </article>
      )}

      {pick && renderPrimary?.(pick.result)}
      {best ? (
        <div className="wsl-premium-delegate" data-testid="chat-delegate-all">
          <WaouhDelegateButton
            result={{ price_min: best.price, fabric_id: best.delegateId!, title: best.result.title, city: best.result.city ?? null, evidence: best.result.evidence ?? null, contact_pack: best.result.contact_pack }}
            mode={mode}
            discoveryKind={journey}
            city={city || best.result.city || null}
            budgetMax={budget ?? null}
            label={kind === "trouver" && commercial ? "Confier la piste à Bot" : "Confier à Bot"}
            className="h-14 px-4"
            alternates={alternates.map((row) => ({ fabric_id: row.delegateId!, city: row.result.city ?? null }))}
          />
        </div>
      ) : journey === "opportunity" && onWatch ? (
        <button type="button" className="wsl-premium-watch" onClick={onWatch} disabled={watchBusy}>{watchBusy ? "Activation…" : "Suivre l’opportunité"}</button>
      ) : (
        <p className="wsl-delegate-none">{journey === "opportunity" ? "Vous gardez la main sur votre candidature." : "Automatisation indisponible pour cette offre."}</p>
      )}
      {commercial && compare.length > 1 && <details className="wsl-analysis-details"><summary><BarChart3 size={15} />Comparer<ChevronDown size={15} /></summary>{compare.length > 1 && (
        <div className="wsl-compare" role="table" aria-label="Comparaison des meilleures offres">
          {compare.map((row) => (
            <div role="row" key={`${row.result.id}:${row.result.index}`} className={row.rank === 1 ? "is-top" : undefined}>
              <span role="cell" className="wsl-rank">{row.rank}</span>
              <span role="cell" className="wsl-compare-title"><b>{row.result.title}</b><small>Résultat {row.result.index}{row.result.city ? ` · ${row.result.city}` : ""}</small></span>
              <span role="cell" className="wsl-compare-price"><b>{row.price === null ? "—" : briefMoney(row.price)}</b><small>{gapLabel(row)}</small></span>
            </div>
          ))}
        </div>
      )}</details>}
    </section>
  );
}

export default WaouhChatMarketBrief;
