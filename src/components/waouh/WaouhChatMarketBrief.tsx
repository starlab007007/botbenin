import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, MapPin, ShieldCheck, Sparkles, Trophy, ChevronDown } from "lucide-react";
import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { briefMoney, chatMarketBrief, type BriefRow } from "@/lib/waouh/chatMarketBrief";
import type { GuidedKind } from "@/lib/waouh/guidedAsk";
import { WaouhDelegateButton } from "./WaouhDelegateButton";
import "./waouh-search-live.css";

const photoOf = (r: WaouhResultCard) => (Array.isArray(r.photos) ? r.photos.find((p) => typeof p === "string" && !!p) : null) ?? null;

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
export function WaouhChatMarketBrief({ results, city, budget, kind, query, renderPrimary }: {
  renderPrimary?: (row: WaouhResultCard) => ReactNode;
  query?: string | null;
  results: WaouhResultCard[];
  city?: string | null;
  budget?: number | null;
  kind?: GuidedKind;
}) {
  const brief = useMemo(() => chatMarketBrief(results, { city, budget, query }), [results, city, budget, query]);
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  if (!brief.total) return null;
  const { pick, compare, delegable } = brief;
  const best = pick && delegable.some(row => row.result === pick.result) ? pick : null;
  const alternates = best ? delegable.filter(row => row.result !== best.result).slice(0, 3) : [];
  const mode = kind && ["service", "prestation", "demander", "opportunite"].includes(kind) ? "ask" : "buy";


  return (
    <section className="wsl-brief" aria-label="Analyse du marché par Bot" data-testid="chat-market-brief">
      <details className="wsl-analysis-details"><summary><Sparkles size={15} />Analyse du marché<ChevronDown size={15} /></summary><header className="wsl-brief-head">
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

      <p className="wsl-advice"><Sparkles size={14} aria-hidden="true" /><span>{brief.advice}</span></p></details>

      {pick && (
        <article className="wsl-pick" aria-label="Le choix de Bot">
          <div className="wsl-pick-photo">{photoOf(pick.result) && brokenPhoto !== photoOf(pick.result) ? <img src={photoOf(pick.result)!} alt="" loading="lazy" decoding="async" onError={() => setBrokenPhoto(photoOf(pick.result))} /> : <Trophy size={20} aria-hidden="true" />}</div>
          <div className="wsl-pick-copy">
            <span className="wsl-tag"><Trophy size={11} aria-hidden="true" />{pick.match === 'near' || brief.exact === 0 ? 'Alternative à vérifier' : 'Le choix de Bot'}</span>
            <h4>{pick.result.title}</h4>
            <p className="wsl-pick-price">{pick.price === null ? "Prix à demander" : briefMoney(pick.price)}{pick.result.city ? <small> · {pick.result.city}</small> : null}</p>
            <ul>{pick.match === 'exact' && <li>Correspond à la demande</li>}{pick.withinBudget === true && <li>Dans le budget</li>}{pick.inZone && <li>Dans votre zone</li>}{brief.priced >= 2 && pick.vsMedianPct !== null && Math.abs(pick.vsMedianPct) < 3 && <li>Prix médian annoncé</li>}{pick.reachable && <li>Contact possible</li>}</ul><small className="wsl-verify-note">Stock et prix à confirmer</small>
          </div>
        </article>
      )}

      {pick && renderPrimary?.(pick.result)}
      {best ? (
        <div className="wsl-premium-delegate" data-testid="chat-delegate-all">
          <WaouhDelegateButton
            result={{ fabric_id: best.delegateId!, title: best.result.title, city: best.result.city ?? null, evidence: best.result.evidence ?? null, contact_pack: best.result.contact_pack }}
            mode={mode}
            city={city || best.result.city || null}
            budgetMax={budget ?? null}
            label="Confier à Bot"
            className="h-14 px-4"
            alternates={alternates.map((row) => ({ fabric_id: row.delegateId!, city: row.result.city ?? null }))}
          />
        </div>
      ) : (
        <p className="wsl-delegate-none">Automatisation indisponible pour cette offre.</p>
      )}
      {compare.length > 1 && <details className="wsl-analysis-details"><summary><BarChart3 size={15} />Comparer<ChevronDown size={15} /></summary>{compare.length > 1 && (
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
