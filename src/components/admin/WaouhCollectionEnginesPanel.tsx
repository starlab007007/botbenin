import React,{useState} from 'react';
import {invokeCollection,useCollectionResource} from './collection/CollectionControlContext';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Card} from '@/components/ui/card';
import {toast} from 'sonner';

const labels:Record<string,string>={cheerio:'Cheerio',crawlee:'Crawlee',playwright:'Playwright',scrapy:'Scrapy',beautifulsoup:'Beautiful Soup',crawl4ai:'Crawl4AI'};
const descriptions:Record<string,string>={cheerio:'Extraction HTML légère, moteur natif par défaut.',crawlee:'Traitement des documents avec la file Crawlee.',playwright:'Rendu du document avec Chromium.',scrapy:'Traitement des documents par un spider Scrapy.',beautifulsoup:'Analyse HTML avec Python.',crawl4ai:'Rendu et préparation du document, sans appel à une IA payante.'};
type Engine={engine_key:string;enabled:boolean;timeout_seconds:number;max_document_kb:number;installed_version:string|null;checked_at:string|null;last_check_status:string|null;last_test_status:string|null;last_test_at:string|null};
type Snapshot={engines:Engine[];targets:{id:string;label:string;engine_key:string;enabled:boolean;applicable:boolean}[];runs:{id:string;engine_key:string;purpose:string;status:string;duration_ms:number;error_code:string|null;created_at:string}[]};
const date=(v:string|null)=>v?new Date(v).toLocaleString('fr-FR'):'Non vérifié';
export default function WaouhCollectionEnginesPanel(){
 const resource=useCollectionResource('engines');
 const snapshot=resource.data as Snapshot|null;
 const {error,loading,refresh:load}=resource;
 const [busy,setBusy]=useState(false);
 const [drafts,setDrafts]=useState<Record<string,Partial<Engine>>>({});
 const call=invokeCollection;
 const command=async(body:Record<string,unknown>)=>{
  setBusy(true);try{
   const r=await call(body);
   if(body.action==='collection.engine.test'){
    if(r.passed)toast.success('Test réussi : une fiche de démonstration reconnue, aucune publication.');
    else toast.error(`Test échoué : ${r.reason??'moteur indisponible'}.`);
   }else if(body.action==='collection.engine.check'){
    if(r.available)toast.success('Les versions installées ont été vérifiées.');
    else toast.error('Le service d’exécution ne répond pas. Aucun moteur n’est déclaré disponible.');
   }else if(r.updated===0)throw new Error('Configuration introuvable. Actualisez le tableau.');
   else toast.success('Configuration du moteur enregistrée.');
   if(body.action==='collection.engine.configure')setDrafts(old=>{const next={...old};delete next[String(body.engine_key)];return next;});
   await load();
  }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const save=(engine:Engine,patch:Partial<Engine>)=>void command({action:'collection.engine.configure',engine_key:engine.engine_key,enabled:engine.enabled,timeout_seconds:engine.timeout_seconds,max_document_kb:engine.max_document_kb,...patch});
 return <Card className="p-5 space-y-4 rounded-2xl border-slate-200 shadow-none">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Moteurs de collecte et d’extraction</h2><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy||loading} onClick={()=>void load()}>Actualiser les moteurs</Button><Button size="sm" disabled={busy} onClick={()=>void command({action:'collection.engine.check'})}>Vérifier l’installation</Button></div></div>
  <p className="text-sm text-muted-foreground">Choisissez un moteur après avoir vérifié son installation et son test. Les démonstrations ne publient aucune annonce.</p>

  {error&&<p role="alert">{error}</p>}
  {!snapshot&&!error&&<p>Chargement des moteurs…</p>}
  {snapshot&&<>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.engines.map(engine=>{const draft=drafts[engine.engine_key];return <section key={engine.engine_key} className="rounded-xl border border-slate-200 p-4 space-y-3" aria-label={labels[engine.engine_key]}>
    <div className="flex justify-between gap-2"><strong>{labels[engine.engine_key]}</strong><label className="flex gap-2 text-sm">{engine.enabled?'Autorisé':'En pause'}<Switch aria-label={`Activer le moteur ${labels[engine.engine_key]}`} checked={engine.enabled} disabled={busy||!!draft} onCheckedChange={enabled=>save(engine,{enabled})}/></label></div>
    <p className="text-sm">{descriptions[engine.engine_key]}</p>
    <p className="text-xs">Installation : {engine.last_check_status==='available'?`disponible · ${engine.installed_version}`:engine.last_check_status==='unavailable'?'service indisponible':'à vérifier'}<br/>Contrôle : {date(engine.checked_at)}<br/>Test : {engine.last_test_status==='passed'?'réussi':engine.last_test_status==='failed'?'échoué':'non effectué'} · {date(engine.last_test_at)}</p>
    <details><summary className="text-xs text-slate-500 cursor-pointer">Limites avancées</summary><div className="space-y-3 mt-3"><label className="flex justify-between gap-2 text-sm">Délai maximal<select aria-label={`Délai ${labels[engine.engine_key]}`} disabled={busy} value={draft?.timeout_seconds??engine.timeout_seconds} onChange={e=>setDrafts(old=>({...old,[engine.engine_key]:{...old[engine.engine_key],timeout_seconds:Number(e.target.value)}}))}>{[5,10,15,20,25,30].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>
    <label className="flex justify-between gap-2 text-sm">Taille du document<select aria-label={`Taille ${labels[engine.engine_key]}`} disabled={busy} value={draft?.max_document_kb??engine.max_document_kb} onChange={e=>setDrafts(old=>({...old,[engine.engine_key]:{...old[engine.engine_key],max_document_kb:Number(e.target.value)}}))}>{[64,128,256,512,1000,1200].map(n=><option key={n} value={n}>{n} Ko</option>)}</select></label>
    <Button size="sm" variant="outline" disabled={busy||!draft} onClick={()=>save(engine,draft??{})}>Enregistrer les limites</Button>{draft&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>setDrafts(old=>{const next={...old};delete next[engine.engine_key];return next;})}>Annuler</Button>}</div></details><Button size="sm" variant="outline" disabled={busy||!engine.enabled||!!draft} onClick={()=>void command({action:'collection.engine.test',engine_key:engine.engine_key})}>Tester {labels[engine.engine_key]}</Button>
   </section>;})}</div>
   <details className="wcc-disclosure"><summary>Moteur utilisé par chaque source ({snapshot.targets.length})</summary><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Source</th><th className="text-left">Moteur</th></tr></thead><tbody>{snapshot.targets.map(t=><tr className="border-t" key={t.id}><td>{t.label}{!t.enabled?' · source en pause':''}</td><td>{t.applicable?<select aria-label={`Moteur ${t.label}`} value={t.engine_key} disabled={busy} onChange={e=>void command({action:'collection.engine.assign',target_id:t.id,engine_key:e.target.value})}>{snapshot.engines.map(e=><option key={e.engine_key} value={e.engine_key} disabled={!e.enabled||(e.engine_key!=='cheerio'&&(e.last_check_status!=='available'||e.last_test_status!=='passed'))}>{labels[e.engine_key]}{!e.enabled?' · en pause':e.engine_key!=='cheerio'&&e.last_test_status!=='passed'?' · test requis':''}</option>)}</select>:'Lecture directe RSS / JSON'}</td></tr>)}</tbody></table></div></details>
   <details className="wcc-disclosure"><summary>Historique des moteurs ({snapshot.runs.length} derniers passages)</summary><ul className="text-xs space-y-1">{!snapshot.runs.length&&<li>Aucun passage enregistré.</li>}{snapshot.runs.map(run=><li key={run.id}>{date(run.created_at)} · {labels[run.engine_key]} · {run.purpose==='demo'?'Démonstration':'Collecte'} · {run.status==='passed'?'réussi':'échoué'} · {run.duration_ms} ms{run.error_code?` · ${run.error_code}`:''}</li>)}</ul></details>
  </>}
 </Card>;
}
