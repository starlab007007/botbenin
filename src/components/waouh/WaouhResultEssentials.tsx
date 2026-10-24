import { BarChart3, CircleHelp, Sparkles } from 'lucide-react';
import { resultEssentials, safeReferenceUrl } from '../../../supabase/functions/_shared/waouh-convergence-contract';
import type { WaouhResultCard } from './WaouhProductCard';
export function WaouhResultEssentials({ result }: { result: WaouhResultCard }) {
  const view = resultEssentials(result);
  const currency = view.refs.find(r => r.comparable)?.currency;
  return <div className="wr-essentials">
    {view.facts.length > 0 && <div className="wr-facts">{view.facts.map((x,i) => <span key={i}>{x}</span>)}</div>}
    <div className="wr-insights">
      <div className="wr-insight wr-ai"><span><Sparkles size={14} />{view.advice ? 'Avis IA' : 'À savoir'}</span><p>{view.advice || (view.kind === 'announcement' ? 'Vérifiez les conditions et la validité avant de répondre.' : 'Confirmez les conditions de cette offre avant de vous engager.')}</p></div>
      <div className="wr-insight wr-market"><span><BarChart3 size={14} />Repère marché</span><p>{view.market}</p>
        {view.median !== null && <p>Médiane : {new Intl.NumberFormat('fr-FR').format(view.median)} {currency === 'XOF' ? 'F CFA' : currency}.</p>}
        <small>{view.referenceScope} · échantillon limité aux sources affichées.</small>
        <details><summary>{view.refs.length ? `Voir les ${view.refs.length} sources` : 'À compléter'}</summary>
          {view.refs.map(r => <div className="wr-reference" key={r.url}><a href={safeReferenceUrl(r.url)!} target="_blank" rel="noreferrer">{r.seller}</a><strong>{new Intl.NumberFormat('fr-FR').format(r.amount)} {r.currency === 'XOF' ? 'F CFA' : r.currency}</strong><small>{r.observed_at ? new Date(r.observed_at).toLocaleDateString('fr-FR') : 'Date non précisée'} · {r.comparable ? 'Comparabilité annoncée' : 'Équivalence à confirmer'}</small></div>)}
          {!view.refs.length && <small>Aucun prix moyen n’est déduit sans sources comparables.</small>}
        </details>
      </div>
    </div>
    {view.missing.length > 0 && <div className="wr-missing"><CircleHelp size={14} /><span>{view.missing.slice(0, 2).join(' · ')}</span>{view.missing.length > 2 && <details><summary>+{view.missing.length - 2}</summary>{view.missing.slice(2).map(x => <p key={x}>{x}</p>)}</details>}</div>}
  </div>;
}
