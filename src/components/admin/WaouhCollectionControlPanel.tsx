import React,{useState} from 'react';
import {PauseCircle,PlayCircle,RefreshCw,Wallet} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {toast} from 'sonner';
import {cadenceLabel,explainCollectionReason,formatDate,providerLabel} from '@/lib/admin/collectionControl';
import {invokeCollection,useCollectionResource} from './collection/CollectionControlContext';
export default function WaouhCollectionControlPanel({compact=false}:{compact?:boolean}){
 const {data:snapshot,error,loading,refresh}=useCollectionResource('collection');const [busy,setBusy]=useState(false);
 const change=async(body:Record<string,unknown>)=>{setBusy(true);try{const r=await invokeCollection(body);if(r.updated===0)throw new Error('La configuration a changé. Actualisez le tableau.');toast.success('Configuration des collectes enregistrée.');await refresh();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 return <div className="space-y-4">
  <div className="wcc-section-heading"><div><h2 className="font-semibold">Fournisseurs et quotas</h2><p className="text-xs text-muted-foreground mt-1">Consommation du jour et autorisation de collecte par fournisseur.</p></div><Button variant="outline" size="sm" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw size={14} className={loading?'mr-2 animate-spin':'mr-2'}/>Actualiser les collectes</Button></div>
  {error&&<p role="alert" className="wcc-notice">{error}{snapshot?' Le dernier relevé est conservé.':''}</p>}
  {!snapshot&&!error&&<p className="wcc-help">Chargement des collectes…</p>}
  {snapshot&&<>
   {!compact&&<Card className="p-4 space-y-3"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[
    ['Fiches exploitables',snapshot.counts.usable],['Contrôlées depuis 7 jours',snapshot.counts.recent],['Contrôle de plus de 7 jours',snapshot.counts.old],['Date de contrôle inconnue',snapshot.counts.undated],['Externes expirées',snapshot.counts.expired],['Externes ajoutées depuis 7 jours',snapshot.counts.added],
   ].map(([label,value])=><div key={label} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><strong>{value}</strong></div>)}</div>
   <p className="wcc-help">Qualité sur les {snapshot.quality.sample_size} fiches les plus récemment contrôlées : {snapshot.quality.complete} complètes ; {snapshot.quality.missing_photo} sans photo ; {snapshot.quality.missing_price} sans prix ; {snapshot.quality.missing_contact} sans contact.</p></Card>}
   <div className="grid gap-4 md:grid-cols-2">{snapshot.policies.map((p:any)=>{
    const usage=snapshot.usage?.filter((u:any)=>u.provider===p.provider),reserved=usage?.reduce((sum:number,u:any)=>sum+Number(u.estimated_cost??0),0);
    const cap=p.estimated_daily_cost_limit,exhausted=cap!=null&&reserved!==undefined&&reserved>=Number(cap);
    const config=snapshot.provider_configs?.find((c:any)=>c.provider===p.provider);
    const units=usage?.reduce((sum:number,u:any)=>sum+Number(u.units??0),0);
    const status=p.paused?'En pause':exhausted?'Plafond atteint':p.cooldown_until&&Date.parse(p.cooldown_until)>Date.now()?'En attente':'Collecte autorisée';
    return <section key={p.provider} className="wcc-surface"><div className="flex justify-between gap-3 items-start"><div className="flex gap-3"><span className="wcc-kpi-icon"><Wallet size={18}/></span><div><h3 className="font-semibold text-sm">{providerLabel(p.provider)}</h3><span className={`wcc-chip mt-2 ${p.paused?'wcc-chip-muted':exhausted?'wcc-chip-warning':'wcc-chip-info'}`}>{status}</span></div></div><Switch aria-label={`Activer ${p.provider}`} checked={!p.paused} disabled={busy} onCheckedChange={v=>void change({action:'collection.policy',provider:p.provider,paused:!v})}/></div>
     {p.provider==='public_feed'?<p className="wcc-help mt-4">Lectures publiques sans crédits API. Les limites de pages et les règles des sites restent appliquées.</p>:<><dl className="wcc-quality-list"><div><dt>Coût réservé aujourd’hui</dt><dd>{reserved===undefined?'Non disponible':`${reserved.toFixed(2)} ${p.cost_currency??''}`}</dd></div><div><dt>Plafond quotidien</dt><dd>{cap==null?'Non renseigné':`${Number(cap).toFixed(2)} ${p.cost_currency??''}`}</dd></div>{units!==undefined&&<div><dt>Appels réservés</dt><dd>{units}</dd></div>}{config&&<div><dt>Quota d’appels configuré</dt><dd>{config.daily_quota} / jour</dd></div>}</dl>{cap!=null&&reserved!==undefined&&Number(cap)>0&&<div className="wcc-meter" aria-label={`Budget réservé ${providerLabel(p.provider)}`}><span style={{width:`${Math.min(100,100*reserved/Number(cap))}%`,background:exhausted?'#d7a34b':undefined}}/></div>}</>}
     {p.last_block_reason&&<p className="wcc-help">{explainCollectionReason(p.last_block_reason).title}.</p>}{p.cooldown_until&&<p className="wcc-help">Reprise possible après {formatDate(p.cooldown_until)}.</p>}
     <p className="wcc-help flex items-start gap-2">{p.paused?<PauseCircle size={14} className="mt-0.5 shrink-0"/>:<PlayCircle size={14} className="mt-0.5 shrink-0"/>}{p.paused?'La pause est conservée jusqu’à votre reprise.':'Désactiver met les nouvelles collectes de ce fournisseur en pause.'}{exhausted?' Réactiver ne réinitialise pas le budget du jour.':''}</p>
    </section>;
   })}</div>
   <p className="wcc-help">Relevé du {formatDate(snapshot.checked_at)}. Les montants sont des réservations estimées, pas une facture. Les quotas quotidiens se réinitialisent à 01 h au Bénin.</p>
   <details className="wcc-disclosure"><summary>Cadence et santé des collecteurs ({snapshot.targets.length})</summary><div className="wcc-scroll-table"><table><thead><tr><th>Source</th><th>État</th><th>Dernier succès</th><th>Prochaine collecte</th><th>Cadence</th></tr></thead><tbody>{snapshot.targets.map((t:any)=><tr key={t.id}><td>{t.label}</td><td>{!t.enabled?'En pause':({succeeded:'Dernier passage réussi',blocked:'Dernier passage bloqué',failed:'Dernier passage en échec',empty:'Pas de nouvelle fiche'}[t.last_outcome]??'Activée · à suivre')}</td><td>{formatDate(t.last_success_at)}</td><td>{formatDate(t.next_due_at)}</td><td><select className="wcc-native-select" aria-label={`Cadence ${t.label}`} value={t.interval_minutes} disabled={busy} onChange={e=>void change({action:'collection.cadence',target_id:t.id,minutes:Number(e.target.value)})}>{[...new Set([30,60,360,720,1440,10080,t.interval_minutes])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{cadenceLabel(n as number)}</option>)}</select>{t.adaptive&&<small>Adaptative</small>}</td></tr>)}</tbody></table></div></details>
   <details className="wcc-disclosure"><summary>Dernières tâches ({snapshot.jobs.length})</summary><div className="wcc-scroll-table"><table><thead><tr><th>Date</th><th>Fournisseur</th><th>Résultat</th><th>Fiches</th></tr></thead><tbody>{snapshot.jobs.map((j:any)=><tr key={j.id}><td>{formatDate(j.created_at)}</td><td>{providerLabel(j.provider)}</td><td>{j.report?.reason?explainCollectionReason(j.report.reason).title:({succeeded:'Terminé',failed:'Échec',blocked:'Bloqué',empty:'Aucune nouvelle fiche',queued:'En attente',running:'En cours',partial:'Partiel'}[j.status]??'Passage enregistré')}</td><td>{j.report?.inserted??0} nouvelles · {j.report?.updated??0} actualisées · {j.report?.unchanged??0} inchangées</td></tr>)}</tbody></table></div></details>
  </>}
 </div>;
}
