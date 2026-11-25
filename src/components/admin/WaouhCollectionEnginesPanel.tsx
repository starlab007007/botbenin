import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
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
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const call=async(body:Record<string,unknown>)=>{
  const {data,error}=await supabase.functions.invoke('waouh-radar-site-scraper',{body});
  if(error||!data?.ok)throw new Error('Le pilotage des moteurs est momentanément indisponible.');return data;
 };
 const load=async()=>{setError('');try{setSnapshot(await call({action:'collection.engine.overview'}));}catch(e){setError((e as Error).message);}};
 useEffect(()=>{void load();},[]);
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
   await load();
  }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const save=(engine:Engine,patch:Partial<Engine>)=>void command({action:'collection.engine.configure',engine_key:engine.engine_key,enabled:engine.enabled,timeout_seconds:engine.timeout_seconds,max_document_kb:engine.max_document_kb,...patch});
 return <Card className="p-4 space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Moteurs de collecte et d’extraction</h2><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void load()}>Actualiser les moteurs</Button><Button size="sm" disabled={busy} onClick={()=>void command({action:'collection.engine.check'})}>Vérifier l’installation</Button></div></div>
  <p className="text-sm text-muted-foreground">Les six outils utilisent les documents fournis par la collecte autorisée. Les tests emploient une page de démonstration et ne publient aucune annonce. Les nouveaux sites seront raccordés séparément.</p>
  <p className="text-xs text-muted-foreground">Le rendu des navigateurs exécute les scripts intégrés au document ; les ressources et appels réseau externes sont désactivés. Les règles de provenance, de fraîcheur et de publication NEXUS restent appliquées.</p>
  {error&&<p role="alert">{error}</p>}
  {!snapshot&&!error&&<p>Chargement des moteurs…</p>}
  {snapshot&&<>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.engines.map(engine=><section key={engine.engine_key} className="rounded-lg border p-3 space-y-3" aria-label={labels[engine.engine_key]}>
    <div className="flex justify-between gap-2"><strong>{labels[engine.engine_key]}</strong><label className="flex gap-2 text-sm">{engine.enabled?'Autorisé':'En pause'}<Switch aria-label={`Activer le moteur ${labels[engine.engine_key]}`} checked={engine.enabled} disabled={busy} onCheckedChange={enabled=>save(engine,{enabled})}/></label></div>
    <p className="text-sm">{descriptions[engine.engine_key]}</p>
    <p className="text-xs">Installation : {engine.last_check_status==='available'?`disponible · ${engine.installed_version}`:engine.last_check_status==='unavailable'?'service indisponible':'à vérifier'}<br/>Contrôle : {date(engine.checked_at)}<br/>Test : {engine.last_test_status==='passed'?'réussi':engine.last_test_status==='failed'?'échoué':'non effectué'} · {date(engine.last_test_at)}</p>
    <label className="flex justify-between gap-2 text-sm">Délai maximal<select aria-label={`Délai ${labels[engine.engine_key]}`} disabled={busy} value={engine.timeout_seconds} onChange={e=>save(engine,{timeout_seconds:Number(e.target.value)})}>{[5,10,15,20,25,30].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>
    <label className="flex justify-between gap-2 text-sm">Taille du document<select aria-label={`Taille ${labels[engine.engine_key]}`} disabled={busy} value={engine.max_document_kb} onChange={e=>save(engine,{max_document_kb:Number(e.target.value)})}>{[64,128,256,512,1000,1200].map(n=><option key={n} value={n}>{n} Ko</option>)}</select></label>
    <Button size="sm" variant="outline" disabled={busy||!engine.enabled} onClick={()=>void command({action:'collection.engine.test',engine_key:engine.engine_key})}>Tester {labels[engine.engine_key]}</Button>
   </section>)}</div>
   <details><summary>Moteur utilisé par chaque source ({snapshot.targets.length})</summary><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Source</th><th className="text-left">Moteur</th></tr></thead><tbody>{snapshot.targets.map(t=><tr className="border-t" key={t.id}><td>{t.label}{!t.enabled?' · source en pause':''}</td><td>{t.applicable?<select aria-label={`Moteur ${t.label}`} value={t.engine_key} disabled={busy} onChange={e=>void command({action:'collection.engine.assign',target_id:t.id,engine_key:e.target.value})}>{snapshot.engines.map(e=><option key={e.engine_key} value={e.engine_key} disabled={!e.enabled||(e.engine_key!=='cheerio'&&(e.last_check_status!=='available'||e.last_test_status!=='passed'))}>{labels[e.engine_key]}{!e.enabled?' · en pause':e.engine_key!=='cheerio'&&e.last_test_status!=='passed'?' · test requis':''}</option>)}</select>:'Lecture directe RSS / JSON'}</td></tr>)}</tbody></table></div></details>
   <details><summary>Historique des moteurs ({snapshot.runs.length} derniers passages)</summary><ul className="text-xs space-y-1">{!snapshot.runs.length&&<li>Aucun passage enregistré.</li>}{snapshot.runs.map(run=><li key={run.id}>{date(run.created_at)} · {labels[run.engine_key]} · {run.purpose==='demo'?'Démonstration':'Collecte'} · {run.status==='passed'?'réussi':'échoué'} · {run.duration_ms} ms{run.error_code?` · ${run.error_code}`:''}</li>)}</ul></details>
  </>}
 </Card>;
}
