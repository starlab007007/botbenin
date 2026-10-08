import { sourceDisplayName } from "@/lib/waouh/sourcePresentation";
import type { NexusOpportunityJourney } from "@/lib/waouh/nexus";
import { journeyPresentation } from "@/lib/waouh/journeyPresentation";
export function WaouhJourneyProgress({ journey }: { journey: NexusOpportunityJourney }) {
  const view = journeyPresentation(journey);
  const sourceUrl = /^https?:\/\//i.test(journey.source_url || "") ? journey.source_url : null;
  return <div className="space-y-3 text-xs">
    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{view.status}</span><span className="truncate text-slate-500">{sourceDisplayName(journey.source_key)}</span></div>

    {journey.last_message && <p className="line-clamp-2 leading-relaxed text-slate-600"><strong>Dernière action : </strong>{journey.last_message}</p>}
    <p className="rounded-xl bg-blue-50 p-2 leading-relaxed"><strong>À venir : </strong>{view.next}</p>
    <details><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Voir le suivi · étapes et responsabilités</summary>
    <ol aria-label="Étapes de la démarche" className="flex flex-wrap gap-1.5">{view.steps.map(step => <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className={`rounded-full px-2 py-1 text-[10px] ${step.state === "past" ? "bg-emerald-50 text-emerald-800" : step.state === "current" ? "bg-blue-100 font-bold text-blue-800" : "bg-slate-100 text-slate-500"}`}>{step.label}</li>)}</ol>
      {journey.last_message && <p className="my-2 break-words leading-relaxed">{journey.last_message}</p>}
      <dl className="space-y-2 pb-2 leading-relaxed"><div><dt className="font-semibold">Assistant</dt><dd>{view.assistant}</dd></div><div><dt className="font-semibold">Avatar</dt><dd>{view.avatar}</dd></div><div><dt className="font-semibold">Vous</dt><dd>{view.user}</dd></div></dl>
      {journey.contact_channel && <p>Canal : {journey.contact_channel}</p>}
      {sourceUrl && <a className="flex min-h-11 items-center font-semibold text-blue-700 underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">Consulter la source</a>}
    </details>
  </div>;
}
