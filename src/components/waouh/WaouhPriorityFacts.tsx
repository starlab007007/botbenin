import type { WaouhResultCard } from './WaouhProductCard';
import type { GuidedKind } from '@/lib/waouh/guidedAsk';
import { priorityFacts } from '@/lib/waouh/priorityFacts';
export function WaouhPriorityFacts({result,kind,query}:{result:WaouhResultCard;kind?:GuidedKind;query?:string|null}){
 const facts=priorityFacts(result,kind,query);
 return <dl className="wsl-priority-facts" aria-label="Informations essentielles">{facts.map(f=><div key={f.label} className={f.missing?'is-missing':undefined}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>;
}
