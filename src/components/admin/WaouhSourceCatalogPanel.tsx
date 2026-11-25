import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {WaouhProductPresentation} from '@/components/waouh/WaouhProductPresentation';
type Platform={transport:string;platform_key:string;hostname:string;label:string;access_state:string;rights_reference:string;attribution:string;media_authorized:boolean;media_hosts:string[];engine_key:string;adapter_key:string;discovery_minutes:number;recheck_minutes:number;daily_page_limit:number};
type Entry={entry_no:number;platform_key:string;label:string;url:string;alias_of:number|null;target_id:string|null;test_status:string|null;test_at:string|null;test_report?:{reason?:string;preview?:any[]}};
type Snapshot={platforms:Platform[];entries:Entry[];indexed_documents:number;documents:{id:string;target_id:string;url:string;state:string;last_error:string|null;last_checked_at:string|null;next_due_at:string}[]};
const states:Record<string,string>={review:'À valider',authorized:'Autorisation renseignée',paused:'En pause',unverified:'Adresse à vérifier',partner_only:'Accès partenaire / API'};
const date=(v:string|null)=>v?new Date(v).toLocaleString('fr-FR'):'Jamais';
export default function WaouhSourceCatalogPanel(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[draft,setDraft]=useState<Platform|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [keep,setKeep]=useState(''),[alias,setAlias]=useState(''),[reason,setReason]=useState(''),[sameOffer,setSameOffer]=useState(false);
 const [query,setQuery]=useState(''),[results,setResults]=useState<any[]|null>(null),[total,setTotal]=useState(0),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null);
 const call=async(body:Record<string,unknown>)=>{const {data,error}=await supabase.functions.invoke('waouh-radar-site-scraper',{body});
  if(error||!data?.ok)throw Error(data?.code??'Administration du catalogue indisponible.');return data;};
 const load=async()=>{try{const s=await call({action:'collection.catalog.overview'});setSnapshot(s);setDraft(old=>old??s.platforms[0]??null);setError('');}catch(e){setError((e as Error).message);}};
 useEffect(()=>{void load();},[]);
 const command=async(body:Record<string,unknown>)=>{setBusy(true);try{const r=await call(body);
  if(body.action==='collection.catalog.test')r.passed?toast.success(r.discovery_only?'Liens découverts. Les détails et photos restent à enrichir avec Apify.':'Extraction vérifiée, aucune publication.'):toast.error(`Test à corriger : ${r.reason}`);
  else toast.success('Modification enregistrée.');await load();
 }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 const search=async(page=0)=>{setBusy(true);try{const r=await call({action:'collection.catalog.search',query,offset:page});setResults(r.records);setTotal(r.total);setOffset(page);setNext(r.next_offset);}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 const patch=(value:Partial<Platform>)=>setDraft(old=>old?{...old,...value}:old);
 const entries=snapshot?.entries.filter(e=>e.platform_key===draft?.platform_key)??[];
 return <Card className="p-4 space-y-4">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Sources et catalogue unifié</h2><Button variant="outline" size="sm" disabled={busy} onClick={()=>void load()}>Actualiser le catalogue</Button></div>
  <p className="text-sm text-muted-foreground">Les sources alimentent la même base de recherche. Chaque fiche conserve sa provenance et sa galerie complète. Les tests ne publient aucune annonce.</p>
  {error&&<p role="alert">{error}</p>}
  {snapshot&&<>
   <p className="text-sm">{snapshot.platforms.length} plateformes · {snapshot.entries.length} entrées · {snapshot.indexed_documents} fiches dans l’index commun</p>
   <label className="block text-sm">Plateforme<select className="block border rounded p-2 w-full" aria-label="Plateforme de collecte" value={draft?.platform_key??''} disabled={busy} onChange={e=>setDraft(snapshot.platforms.find(p=>p.platform_key===e.target.value)??null)}>
    {snapshot.platforms.map(p=><option key={p.platform_key} value={p.platform_key}>{p.label} · {states[p.access_state]}</option>)}</select></label>
   {draft&&<>
    <div className="grid gap-3 md:grid-cols-2">
     <label className="text-sm">Accès à la source<select className="block border rounded p-2 w-full" value={draft.transport} onChange={e=>patch({transport:e.target.value})}><option value="direct">Collecte directe autorisée</option><option value="apify">API Apify : fiches et galeries</option><option value="serpapi">API SerpAPI : découverte de liens</option></select></label>
     <label className="text-sm">État d’accès<select className="block border rounded p-2 w-full" aria-label="État d’accès" value={draft.access_state} onChange={e=>patch({access_state:e.target.value})}>{Object.entries(states).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     <label className="text-sm">Adaptateur<select className="block border rounded p-2 w-full" value={draft.adapter_key} onChange={e=>patch({adapter_key:e.target.value})}>{['none','classifieds','coinafrique','goafrica','schema_org','rss_atom'].map(k=><option key={k} value={k}>{k==='none'?'À raccorder':k==='classifieds'?'Petites annonces : index et détails':k}</option>)}</select></label>
     <label className="text-sm">Référence d’autorisation<input className="block border rounded p-2 w-full" aria-label="Référence d’autorisation" value={draft.rights_reference} maxLength={1000} onChange={e=>patch({rights_reference:e.target.value})}/></label>
     <label className="text-sm">Attribution à afficher<input className="block border rounded p-2 w-full" value={draft.attribution} maxLength={240} onChange={e=>patch({attribution:e.target.value})}/></label>
     <label className="text-sm">Moteur<select className="block border rounded p-2 w-full" value={draft.engine_key} onChange={e=>patch({engine_key:e.target.value})}>{['cheerio','crawlee','playwright','scrapy','beautifulsoup','crawl4ai'].map(k=><option key={k}>{k}</option>)}</select></label>
     <label className="text-sm">Découverte, en minutes<input type="number" className="block border rounded p-2 w-full" min={30} max={10080} value={draft.discovery_minutes} onChange={e=>patch({discovery_minutes:Number(e.target.value)})}/></label>
     <label className="text-sm">Recontrôle des fiches, en minutes<input type="number" className="block border rounded p-2 w-full" min={60} max={43200} value={draft.recheck_minutes} onChange={e=>patch({recheck_minutes:Number(e.target.value)})}/></label>
     <label className="text-sm">Requêtes maximales par jour<input type="number" className="block border rounded p-2 w-full" min={1} max={1000} value={draft.daily_page_limit} onChange={e=>patch({daily_page_limit:Number(e.target.value)})}/></label>
     <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={draft.media_authorized} onChange={e=>patch({media_authorized:e.target.checked})}/>Réutilisation des photos autorisée</label>
     <label className="text-sm">Domaines des images autorisés<input className="block border rounded p-2 w-full" placeholder="images.exemple.com, cdn.exemple.com" value={draft.media_hosts.join(', ')} onChange={e=>patch({media_hosts:e.target.value.split(',').map(h=>h.trim().toLowerCase()).filter(Boolean)})}/></label>
    </div>
    <Button size="sm" disabled={busy} onClick={()=>void command({action:'collection.catalog.configure',...draft})}>Enregistrer cette plateforme</Button>
    <p className="text-xs text-muted-foreground">Renseignez l’accès autorisé et l’attribution, puis testez chaque rubrique avant de la raccorder. Le plafond commun des nouveaux collecteurs est de 300 requêtes par jour. SerpAPI découvre des liens ; Apify est nécessaire pour extraire les détails et les galeries. Les plafonds et crédits des fournisseurs restent appliqués.</p>
    <div className="space-y-3">{entries.map(e=><section key={e.entry_no} className="border rounded p-3 space-y-2">
     <strong className="text-sm">{e.entry_no}. {e.label}</strong>
     {e.alias_of?<p className="text-sm">Même source que l’entrée {e.alias_of} : collecte partagée.</p>:<>
      <input aria-label={`URL de collecte ${e.entry_no}`} className="block border rounded p-2 w-full text-xs" defaultValue={e.url} key={e.url} onBlur={event=>{if(event.target.value!==e.url)void command({action:'collection.catalog.url',entry_no:e.entry_no,url:event.target.value});}}/>
      <p className="text-xs">{e.target_id?'Cible existante':'Non raccordée'} · Test : {e.test_status==='passed'?'réussi':e.test_status==='failed'?e.test_report?.reason??'échoué':'à effectuer'} · {date(e.test_at)}</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void command({action:'collection.catalog.test',entry_no:e.entry_no})}>Tester l’extraction</Button>
       <Button size="sm" disabled={busy||e.test_status!=='passed'} onClick={()=>void command({action:'collection.catalog.connect',entry_no:e.entry_no})}>Raccorder / reprendre</Button>
       {e.target_id&&<><Button size="sm" variant="outline" disabled={busy} onClick={()=>void command({action:'collection.catalog.pause',entry_no:e.entry_no})}>Mettre la cible en pause</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>void command({action:'collection.catalog.recheck',entry_no:e.entry_no})}>Recontrôler les fiches</Button></>}</div>
      {e.test_report?.preview?.map((p,i)=><WaouhProductPresentation key={i} value={p} label="Aperçu du test"/>)}
     </>}
    </section>)}</div>
   </>}
   <details><summary>Recherche dans la base commune</summary><form className="flex gap-2 my-3" onSubmit={e=>{e.preventDefault();void search();}}><input aria-label="Recherche dans le catalogue commun" className="border rounded p-2 flex-1 min-w-0" value={query} onChange={e=>setQuery(e.target.value)}/><Button size="sm" disabled={busy}>Rechercher</Button></form>
    {results&&<><p className="text-sm">{total} fiches correspondantes · page {Math.floor(offset/20)+1}</p>{results.map(r=><div key={r.fabric_id}><small>{r.source_key} · {r.fabric_id}</small><WaouhProductPresentation value={r} label="Fiche unifiée"/></div>)}<div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy||!offset} onClick={()=>void search(Math.max(0,offset-20))}>Précédente</Button><Button size="sm" variant="outline" disabled={busy||next===null} onClick={()=>void search(next!)}>Suivante</Button></div></>}
   </details>
   <details><summary>Regrouper les références d’une même offre</summary><p className="text-sm my-2">Confirmez qu’il s’agit du même vendeur et du même objet. Les annonces sources sont conservées ; le regroupement est réversible.</p>
    <div className="grid gap-2 md:grid-cols-2"><input className="border rounded p-2 text-sm" placeholder="Identifiant external:… à conserver" aria-label="Référence principale" value={keep} onChange={e=>setKeep(e.target.value)}/><input className="border rounded p-2 text-sm" placeholder="Identifiant external:… à rattacher" aria-label="Référence à rattacher" value={alias} onChange={e=>setAlias(e.target.value)}/></div>
    <input className="border rounded p-2 w-full text-sm mt-2" placeholder="Éléments ayant permis de vérifier le doublon" value={reason} onChange={e=>setReason(e.target.value)}/>
    <label className="flex gap-2 text-sm my-2"><input type="checkbox" checked={sameOffer} onChange={e=>setSameOffer(e.target.checked)}/>Même vendeur et même offre confirmés</label>
    <div className="flex gap-2"><Button size="sm" disabled={busy||!sameOffer||reason.trim().length<10||!keep||!alias} onClick={()=>void command({action:'collection.catalog.group',keep,alias,reason,same_offer:sameOffer})}>Regrouper les références</Button><Button size="sm" variant="outline" disabled={busy||!alias} onClick={()=>void command({action:'collection.catalog.ungroup',alias})}>Détacher la référence</Button></div>
   </details>
   <details><summary>Derniers contrôles de pages ({snapshot.documents.length})</summary><div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr><th>Page</th><th>État</th><th>Dernier contrôle</th><th>Prochain contrôle</th></tr></thead><tbody>{snapshot.documents.map(d=><tr className="border-t" key={d.id}><td className="max-w-xs truncate">{d.url}</td><td>{d.state}{d.last_error?' · '+d.last_error:''}</td><td>{date(d.last_checked_at)}</td><td>{date(d.next_due_at)}</td></tr>)}</tbody></table></div></details>
  </>}
 </Card>;
}
