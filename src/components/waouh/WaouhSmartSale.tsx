import {useEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,Loader2,ScanLine,Sparkles,X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {compressImage,uploadOptions} from '@/lib/imageOptimize';
import {SALE_CONDITIONS,newSaleDraft,salePlace,saleTextSuggestions,mergeSaleSuggestions,analyzeSale,publishSale,type SaleDraft,type SaleSuggestions,type PublishedSale} from '@/lib/waouh/smartSale';
import {WaouhCityField} from './WaouhCityField';
import './smart-sale.css';

const vague=(value:string)=>!value.trim()||/^(mon|ma|un|une|le|la)?\s*(téléphone|telephone|moto|ordinateur|produit|article)\s*$/i.test(value.trim());
export function WaouhSmartSale({initial={},onPublished,onConnect}:{initial?:Record<string,unknown>;onPublished:(sale:PublishedSale)=>void;onConnect?:()=>void}){
 const {user}=useAuth();
 const [draft,setDraft]=useState<SaleDraft>(()=>newSaleDraft(initial)),[suggestions,setSuggestions]=useState<SaleSuggestions>({});
 const [analyzing,setAnalyzing]=useState(false),[uploading,setUploading]=useState(false),[publishing,setPublishing]=useState(false),[notice,setNotice]=useState(''),[attempted,setAttempted]=useState(false),[saved,setSaved]=useState(false);
 const dirty=useRef(new Set<string>(['price','condition','quantity','unit'].filter(k=>initial[k]!=null&&initial[k]!==''))),photoKey=useRef(''),generation=useRef(0),latest=useRef(draft),camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null),alive=useRef(true);
 const submitLock=useRef(false),published=useRef<PublishedSale|null>(null);
 latest.current=draft;
 const ownerRef=useRef(user?.id);ownerRef.current=user?.id;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 const update=(key:keyof SaleDraft,value:unknown)=>{
  dirty.current.add(key==='district'?'city':key);if(key==='title'&&vague(String(value)))dirty.current.delete('title');
  setDraft(d=>({...d,[key]:value}));setNotice('');
  if(key==='title'){
   const parsed=saleTextSuggestions(String(value));setDraft(d=>mergeSaleSuggestions({...d,...Object.fromEntries(['price','condition','quantity','unit'].filter(k=>!dirty.current.has(k)).map(k=>[k,k==='unit'?'':null]))},parsed,dirty.current));
  }
 };
 useEffect(()=>{
  const version=++generation.current;let active=true;
  setAnalyzing(false);if(!user||uploading||publishing||saved||(!draft.title.trim()&&!draft.photos.length))return;
  const timer=window.setTimeout(async()=>{
   if(!active||version!==generation.current||!alive.current||submitLock.current)return;
   const photos=draft.photos[0]||'',visual=!!photos&&photos!==photoKey.current;
   setAnalyzing(true);
   try{
    const result=await analyzeSale(user.id,{...latest.current},visual);
    if(!active||version!==generation.current||!alive.current)return;
    if(visual)photoKey.current=photos;
    setSuggestions(result.suggestions);
    setDraft(current=>mergeSaleSuggestions(current,result.suggestions,dirty.current));
   }catch{if(active&&version===generation.current)setNotice('Vous pouvez compléter la fiche directement.');}
   finally{if(active&&version===generation.current)setAnalyzing(false);}
  },650);
  return()=>{active=false;clearTimeout(timer);};
 },[draft.title,draft.photos.join('|'),draft.condition,user?.id,uploading,publishing,saved]);
 const add=async(files:FileList|null)=>{
  if(!files?.length||uploading||publishing)return;
  if(!user){onConnect?.();return;}
  const owner=user.id;generation.current++;setAnalyzing(false);setUploading(true);setNotice('');
  const next=[...latest.current.photos];
  try{
   for(const raw of Array.from(files).slice(0,4-next.length)){
    if(!raw.type.startsWith('image/')||raw.size>10*1024*1024)throw Error();
    const file=await compressImage(raw,{maxDimension:1600,quality:.82});
    const path=`nexus/${owner}/sale/${crypto.randomUUID()}.${file.name.split('.').pop()||'jpg'}`;
    const {error}=await supabase.storage.from('waouh-uploads').upload(path,file,uploadOptions(file.type));if(error)throw error;
    next.push(supabase.storage.from('waouh-uploads').getPublicUrl(path).data.publicUrl);
    if(!alive.current||ownerRef.current!==owner)return;
    setDraft(d=>({...d,photos:next.slice(0,4)}));
   }
   if(alive.current&&ownerRef.current===owner)setDraft(d=>({...d,photos:next.slice(0,4)}));
  }catch{if(alive.current)setNotice('Photo non ajoutée. Essayez une autre image.');}
  finally{if(alive.current)setUploading(false);if(camera.current)camera.current.value='';if(gallery.current)gallery.current.value='';}
 };
 const ready=draft.title.trim().length>=3&&!!draft.price&&!!draft.condition&&!!draft.city.trim()&&!uploading&&!publishing;
 const openPublished=()=>{try{onPublished(published.current!);}catch{setNotice('Annonce publiée. Vous pouvez reprendre la recherche.');}};
 const submit=async()=>{
  if(submitLock.current)return;
  if(!user){onConnect?.();return;}
  if(published.current){openPublished();return;}
  setAttempted(true);if(!ready)return;
  submitLock.current=true;
  setPublishing(true);setAnalyzing(false);setNotice('');generation.current++;
  try{const result=await publishSale(user.id,{...draft});if(alive.current&&ownerRef.current===user.id){published.current=result;setSaved(true);setDraft(result.draft);openPublished();}}
  catch{if(alive.current)setNotice('Publication non terminée. Votre fiche est conservée.');}
  finally{submitLock.current=false;if(alive.current)setPublishing(false);}
 };
 const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
 return <div className="wss" data-waouh-ui="smart-sale">
  <div className="wss-photo-heading"><span>Votre produit</span><small>{draft.photos.length} / 4 photos</small></div>
  <div className="wss-photos">{Array.from({length:4},(_,i)=><div className={`wss-slot ${draft.photos[i]?'filled':''}`} key={i}>{draft.photos[i]?<><img src={draft.photos[i]} alt={`Photo du produit ${i+1}`}/><button type="button" aria-label={`Retirer la photo ${i+1}`} disabled={publishing||uploading||saved} onClick={()=>setDraft(d=>({...d,photos:d.photos.filter((_,j)=>j!==i)}))}><X size={13}/></button></>:<button type="button" disabled={uploading||publishing||saved} aria-label={`Ajouter la photo ${i+1}`} onClick={()=>gallery.current?.click()}>{uploading&&i===draft.photos.length?<Loader2 className="animate-spin"/>:<ImagePlus/>}<small>{i===0?'Ajouter':i+1}</small></button>}</div>)}</div>
  <div className="wss-photo-actions"><button type="button" disabled={draft.photos.length>=4||uploading||publishing||saved} onClick={()=>camera.current?.click()}><Camera size={14}/>Appareil photo</button>{analyzing&&<span role="status"><ScanLine size={14}/>Je prépare la fiche…</span>}</div>
  <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>void add(e.target.files)}/><input ref={gallery} type="file" accept="image/*" multiple hidden onChange={e=>void add(e.target.files)}/>
  <label className="wss-field">Produit<input aria-label="Produit à vendre" value={draft.title} maxLength={200} placeholder="Ex. Samsung S25, moto, soja…" disabled={publishing||saved} onChange={e=>update('title',e.target.value)}/></label>
  <div className="wss-fields"><label className={`wss-field ${attempted&&!draft.price?'invalid':''}`}>Prix souhaité<span className="wss-price-input"><input aria-label="Prix souhaité" inputMode="numeric" value={draft.price?money(draft.price):''} placeholder="Votre prix" disabled={publishing||saved} onChange={e=>update('price',Number(e.target.value.replace(/\D/g,''))||null)}/><small>F CFA</small></span></label><label className={`wss-field ${attempted&&!draft.condition?'invalid':''}`}>État<select aria-label="État du produit" value={draft.condition||''} disabled={publishing||saved} onChange={e=>update('condition',e.target.value||null)}><option value="">À préciser</option>{SALE_CONDITIONS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label></div>
  {suggestions.price&&suggestions.price.observations>0&&<button type="button" className="wss-suggestion" disabled={publishing||saved} onClick={()=>{dirty.current.delete('price');setDraft(d=>({...d,price:suggestions.price!.value}));}}><Sparkles size={13}/>{money(suggestions.price.low)}–{money(suggestions.price.high)} F observés</button>}
  <div className={`wss-place ${attempted&&!draft.city?'invalid':''}`}><label>Lieu</label><fieldset disabled={publishing||saved}><WaouhCityField value={draft.location_label||[draft.district,draft.city].filter(Boolean).join(', ')} onChange={value=>{if(submitLock.current||published.current)return;dirty.current.add('city');setDraft(d=>({...d,...salePlace(value),location_label:value,latitude:null,longitude:null}));}} placeholder="Ville ou quartier" onCoordinatesChange={coords=>{if(!submitLock.current&&!published.current)setDraft(d=>({...d,latitude:coords?.latitude??null,longitude:coords?.longitude??null}));}}/></fieldset></div>
  <details className="wss-extra"><summary>Précisions</summary><textarea aria-label="Précisions sur le produit" maxLength={2000} value={draft.description} disabled={publishing||saved} placeholder="Modèle, défaut à signaler, accessoires…" onChange={e=>update('description',e.target.value)}/><div className="wss-fields"><label className="wss-field">Quantité<input aria-label="Quantité" type="number" min={0.001} step="any" disabled={publishing||saved} value={draft.quantity??''} onChange={e=>update('quantity',Number(e.target.value)||null)}/></label><label className="wss-field">Unité<input aria-label="Unité" disabled={publishing||saved} value={draft.unit} placeholder="pièce, kg, tonne…" onChange={e=>update('unit',e.target.value)}/></label></div></details>
  {notice&&<p className="wss-notice" role="status">{notice}</p>}
  <div className="wss-footer"><button type="button" className="wss-publish" disabled={uploading||publishing||draft.title.trim().length<3} onClick={()=>void submit()}>{publishing?<><Loader2 className="animate-spin"/>Publication…</>:saved?'Reprendre la recherche':user?'Publier et trouver':'Continuer'}</button><small>Vérifiez les suggestions avant de publier.</small></div>
 </div>;
}
