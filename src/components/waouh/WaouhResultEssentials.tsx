import { CircleHelp, Sparkles } from 'lucide-react';
import { resultEssentials, safeReferenceUrl } from '../../../supabase/functions/_shared/waouh-convergence-contract';
import type { WaouhResultCard } from './WaouhProductCard';

const nf = new Intl.NumberFormat('fr-FR');
const money = (value: number, currency?: string) => `${nf.format(Math.round(value))} ${!currency || currency === 'XOF' ? 'F CFA' : currency}`;

const toAmount = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const medianOf = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Verdict de prix lisible en un coup d'œil, ou rien quand il n'y a pas de base de comparaison. */
function priceVerdict(price: number | null, amounts: number[]) {
  if (price === null || amounts.length < 2) return null;
  const min = Math.min(...amounts, price);
  const max = Math.max(...amounts, price);
  const median = medianOf(amounts);
  const gap = (price - median) / median;
  const position = max === min ? 50 : Math.round(((price - min) / (max - min)) * 100);
  const tone: 'good' | 'fair' | 'high' = gap <= -0.08 ? 'good' : gap >= 0.08 ? 'high' : 'fair';
  const label = tone === 'good' ? `${Math.round(Math.abs(gap) * 100)} % sous la médiane`
    : tone === 'high' ? `${Math.round(gap * 100)} % au-dessus de la médiane`
    : 'Dans la moyenne du marché';
  return { min, max, median, position: Math.min(96, Math.max(4, position)), tone, label };
}

export function WaouhResultEssentials({ result }: { result: WaouhResultCard }) {
  const view = resultEssentials(result);
  const currency = view.refs.find((r) => r.comparable)?.currency ?? view.refs[0]?.currency;
  // L'état est déjà dit sous le titre : pas de répétition.
  const facts = view.facts.filter((x) => x !== result.condition);
  // L'avis tient en quelques mots-clés, pas en phrase : « Même zone · Signal récent ».
  const reasons = (view.advice ?? '').split(/\s*[·•|]\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 4);
  const price = toAmount((result as { price?: unknown }).price ?? (result as { price_min?: unknown }).price_min);
  const amounts = view.refs.map((r) => r.amount).filter((n) => Number.isFinite(n) && n > 0);
  const verdict = priceVerdict(price, amounts);
  const comparable = view.refs.filter((r) => r.comparable).length >= 2;
  const missing = view.missing.slice(0, 3);
  if (!facts.length && !reasons.length && !verdict && !view.refs.length && !missing.length) return null;

  return <div className="wr-essentials">
    {facts.length > 0 && <div className="wr-facts">{facts.map((x, i) => <span key={i}>{x}</span>)}</div>}

    {(reasons.length > 0 || verdict || view.refs.length > 0) && <div className="wr-verdict">
      {reasons.length > 0 && <div className="wr-verdict-row">
        <span className="wr-verdict-tag"><Sparkles size={13} />Avis IA</span>
        {reasons.map((x) => <span className="wr-chip" key={x}>{x}</span>)}
      </div>}

      {verdict && <div className={`wr-gauge wr-gauge-${verdict.tone}`}>
        <div className="wr-gauge-head"><strong>{verdict.label}</strong><small>{comparable ? 'Références comparables' : `${amounts.length} offres de cette recherche`}</small></div>
        <div className="wr-gauge-track" role="img" aria-label={`${verdict.label}. Prix entre ${money(verdict.min, currency)} et ${money(verdict.max, currency)}.`}>
          <span className="wr-gauge-dot" style={{ left: `${verdict.position}%` }} />
        </div>
        <div className="wr-gauge-scale"><span>{money(verdict.min, currency)}</span><span>Médiane {money(verdict.median, currency)}</span><span>{money(verdict.max, currency)}</span></div>
      </div>}

      {!verdict && view.refs.length === 1 && <p className="wr-single-ref">Autre offre vue : {money(view.refs[0].amount, currency)}</p>}

      {view.refs.length > 0 && <details className="wr-sources">
        <summary>{view.refs.length} source{view.refs.length > 1 ? 's' : ''} consultée{view.refs.length > 1 ? 's' : ''}</summary>
        {view.refs.map((r) => <div className="wr-reference" key={r.url}>
          <a href={safeReferenceUrl(r.url)!} target="_blank" rel="noreferrer">{r.seller}</a>
          <strong>{money(r.amount, r.currency)}</strong>
          <small>{r.observed_at ? new Date(r.observed_at).toLocaleDateString('fr-FR') : 'Date non précisée'}</small>
        </div>)}
      </details>}
    </div>}

    {missing.length > 0 && <div className="wr-missing"><CircleHelp size={14} /><span>À confirmer : {missing.map((x) => x.replace(/ à (préciser|confirmer)$/i, '')).join(' · ')}</span></div>}
  </div>;
}
