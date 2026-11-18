import React,{useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export default function RadarPublicSourceForm({source,onSaved}:{source:{id:string;identifier:string;config?:Record<string,any>};onSaved:()=>void}){
 const [url,setUrl]=useState(source.config?.canonical_url??source.identifier),[format,setFormat]=useState(source.config?.collection_format??'schema_org');
 const [category,setCategory]=useState(source.config?.category??''),[attribution,setAttribution]=useState(source.config?.attribution??'');
 const [authorized,setAuthorized]=useState(source.config?.automation_authorized===true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{setBusy(true);setError('');try{
  const r=await supabase.functions.invoke('waouh-radar-site-scraper',{body:{action:'collection.source.configure',source_id:source.id,url,format,category,attribution,authorized}});
  if(r.error||!r.data?.ok||r.data.updated!==1)throw new Error('Vérifiez l’URL du domaine raccordé, le format, l’attribution et l’autorisation. Un nouveau domaine doit être raccordé côté serveur.');
  onSaved();
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <details className="basis-full w-full"><summary className="cursor-pointer text-sm">Configurer la collecte gratuite</summary>
  <div className="grid sm:grid-cols-2 gap-2 pt-2">
   <label className="text-xs">URL publique<Input value={url} onChange={e=>setUrl(e.target.value)}/></label>
   <label className="text-xs">Modèle de collecte<select className="w-full rounded border h-10 bg-background" value={format} onChange={e=>setFormat(e.target.value)}>{Object.entries({rss_atom:'RSS / Atom',schema_org:'Données structurées',catalog_json:'Catalogue JSON',directory:'Annuaire JSON',coinafrique:'CoinAfrique',goafrica:'Go Africa',telegram_public:'Telegram public'}).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label className="text-xs">Domaine / catégorie<Input value={category} onChange={e=>setCategory(e.target.value)}/></label>
   <label className="text-xs">Attribution de la source<Input value={attribution} onChange={e=>setAttribution(e.target.value)}/></label>
   <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/>Collecte automatique publique autorisée pour cette source</label>
   <Button size="sm" disabled={busy||!authorized||attribution.trim().length<5} onClick={()=>void save()}>{busy?'Enregistrement…':'Enregistrer le modèle'}</Button>
   {error&&<p role="alert" className="text-xs sm:col-span-2">{error}</p>}
   <p className="text-xs text-muted-foreground sm:col-span-2">L’enregistrement ne change pas l’interrupteur d’activation. Les photos ne sont réutilisées que si leur autorisation existe déjà. La première collecte doit confirmer le format et l’accès.</p>
  </div>
 </details>;
}
