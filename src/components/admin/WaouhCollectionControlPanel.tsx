import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {toast} from 'sonner';

type Snapshot={checked_at:string;counts:{usable:number;recent:number;old:number;undated:number;expired:number;added:number};
 quality:{sample_size:number;complete:number;missing_photo:number;missing_price:number;missing_contact:number};
 policies:{provider:string;paused:boolean;cooldown_until:string|null;last_block_reason:string|null;estimated_daily_cost_limit:number|null;cost_currency:string|null}[];
 targets:{id:string;label:string;provider:string;enabled:boolean;adaptive:boolean;interval_minutes:number;next_due_at:string|null;last_success_at:string|null;last_outcome:string|null}[];
 jobs:{id:string;provider:string;status:string;created_at:string;report:Record<string,unknown>}[]};
const date=(v:string|null)=>v?new Date(v).toLocaleString('fr-FR'):'Jamais';
export default function WaouhCollectionControlPanel(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const call=async(body:Record<string,unknown>)=>{const r=await supabase.functions.invoke('waouh-radar-site-scraper',{body});
   if(r.error||!r.data?.ok)throw new Error('Le contrôle des collectes est momentanément indisponible.');return r.data;};
 const load=async()=>{setError('');try{setSnapshot(await call({action:'collection.overview'}));}catch(e){setError((e as Error).message);}};
 useEffect(()=>{void load();},[]);
 const change=async(body:Record<string,unknown>)=>{setBusy(true);try{const r=await call(body);
   if(r.updated===0)throw new Error('La configuration a changé. Actualisez le tableau.');
   toast.success('Configuration des collectes enregistrée.');await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 return <Card className="p-4 space-y-4">
  <div className="flex justify-between gap-2 flex-wrap"><h2 className="font-semibold">Alimentation et fraîcheur NEXUS</h2><Button variant="outline" size="sm" onClick={()=>void load()}>Actualiser les collectes</Button></div>
  {error&&<p role="alert">{error}</p>}
  {!snapshot&&!error&&<p>Chargement des collectes…</p>}
  {snapshot&&<>
   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[
    ['Fiches exploitables',snapshot.counts.usable],['Contrôlées depuis 7 jours',snapshot.counts.recent],['Contrôle de plus de 7 jours',snapshot.counts.old],
    ['Date de contrôle inconnue',snapshot.counts.undated],['Externes expirées',snapshot.counts.expired],['Externes ajoutées depuis 7 jours',snapshot.counts.added],
   ].map(([label,value])=><div key={label} className="rounded border p-2"><div className="text-xs text-muted-foreground">{label}</div><strong>{value}</strong></div>)}</div>
   <p className="text-xs text-muted-foreground">Contrôle au {date(snapshot.checked_at)}. Une fiche ancienne conserve sa provenance ; elle ne devient récente qu’après vérification. Les fiches externes expirées sont exclues des résultats.</p>
   <p className="text-sm">Qualité sur les {snapshot.quality.sample_size} fiches les plus récemment contrôlées : {snapshot.quality.complete} complètes ; {snapshot.quality.missing_photo} sans photo ; {snapshot.quality.missing_price} sans prix ; {snapshot.quality.missing_contact} sans contact. Un prix absent pour une prestation reste à demander.</p>
   <div className="space-y-2">{snapshot.policies.map(p=><div key={p.provider} className="flex justify-between gap-3 border rounded p-2 text-sm">
    <div><strong>{p.provider==='public_feed'?'Collecte publique gratuite':p.provider}</strong><p className="text-xs">{p.provider==='public_feed'?'Sans crédits API':`Plafond de coût : ${p.estimated_daily_cost_limit??'à configurer'} ${p.cost_currency??''}`}{p.last_block_reason?` · ${p.last_block_reason}`:''}{p.cooldown_until?` · Reprise après ${date(p.cooldown_until)}`:''}</p></div>
    <label className="flex items-center gap-2">{p.paused?'En pause':'Activée'}<Switch aria-label={`Activer ${p.provider}`} checked={!p.paused} disabled={busy} onCheckedChange={v=>void change({action:'collection.policy',provider:p.provider,paused:!v})}/></label>
   </div>)}</div>
   <details><summary>Cadence et santé des sources ({snapshot.targets.length})</summary><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th>Source</th><th>État</th><th>Dernier succès</th><th>Prochaine collecte</th><th>Cadence</th></tr></thead><tbody>{snapshot.targets.map(t=><tr key={t.id} className="border-b"><td>{t.label}</td><td>{t.enabled?t.last_outcome??'Première collecte':'En pause'}</td><td>{date(t.last_success_at)}</td><td>{date(t.next_due_at)}</td><td><select aria-label={`Cadence ${t.label}`} value={t.interval_minutes} disabled={busy} onChange={e=>void change({action:'collection.cadence',target_id:t.id,minutes:Number(e.target.value)})}>{[...new Set([30,60,360,720,1440,10080,t.interval_minutes])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} min</option>)}</select>{t.adaptive?' · adaptative':''}</td></tr>)}</tbody></table></div></details>
   <details><summary>Dernières tâches ({snapshot.jobs.length})</summary><ul className="text-xs">{snapshot.jobs.map(j=><li key={j.id}>{date(j.created_at)} · {j.provider} · {j.status}{typeof j.report?.inserted==='number'?` · ${j.report.inserted} nouvelles`:''}{typeof j.report?.updated==='number'?` · ${j.report.updated} actualisées`:''}{typeof j.report?.unchanged==='number'?` · ${j.report.unchanged} inchangées`:''}{typeof j.report?.reason==='string'?` · ${j.report.reason}`:''}</li>)}</ul></details>
  </>}
 </Card>;
}
