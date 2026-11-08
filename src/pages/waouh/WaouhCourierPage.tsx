import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import './deal-room.css';

type Mission={title:string;status:string;pickup_city?:string|null;address:string;fee?:number|null};
const isToken=(t:string)=>/^[a-f0-9]{64}$/.test(t);
const money=(n:number)=>`${new Intl.NumberFormat('fr-FR').format(n)} F`;
const ERRORS:Record<string,string>={wrong_code:'Code incorrect. Demandez-le à l’acheteur.',too_many_attempts:'Trop d’essais. Contactez le support WAOUH.',link_unavailable:'Ce lien n’est plus disponible.'};

async function call(token:string,action:string,payload:Record<string,unknown>={}):Promise<Mission>{
 const {data,error}=await supabase.functions.invoke('waouh-deal-room',{body:{courier_token:token,action,payload}});
 if(error||!data?.ok){let code=data?.error;try{code=(await (error as {context?:Response}|null)?.context?.clone().json())?.error||code;}catch{/* garde le code courant */}throw new Error(ERRORS[code as string]||'Action impossible. Réessayez.');}
 return data.data as Mission;
}

/** Mission d'un livreur, ouverte depuis un message : sans compte, limitée à une seule livraison. */
export default function WaouhCourierPage(){
 const [token]=useState(()=>window.location.hash.slice(1));
 const [mission,setMission]=useState<Mission|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState('');
 const load=useCallback(async()=>{if(!isToken(token))return;try{setMission(await call(token,'get'));setError('');}catch(e){setError((e as Error).message);}},[token]);
 useEffect(()=>{void load();},[load]);
 const act=async(action:string,payload:Record<string,unknown>={})=>{setBusy(true);setError('');try{setMission(await call(token,action,payload));if(action==='deliver')setCode('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 if(!isToken(token))return <main className="wr mx-auto max-w-xl p-3"><p role="alert" className="wr-error">Lien incomplet. Rouvrez le message reçu.</p></main>;
 return <main className="wr mx-auto max-w-xl p-3">
  <header className="mb-4"><p className="text-xs font-semibold text-cyan-700">WAOUH · Livraison</p><h1 className="mt-1 text-xl font-bold">Votre mission</h1></header>
  {error&&<p role="alert" className="wr-error">{error}</p>}
  {mission&&<section className="wr-card">
   <h2>{mission.title}</h2>
   <p>Récupération : {mission.pickup_city||'À préciser'}</p>
   <p>Livraison : {mission.address}</p>
   {mission.fee?<p>Frais : {money(mission.fee)}</p>:null}
   {mission.status==='assigned'&&<button className="wr-primary" disabled={busy} onClick={()=>void act('pickup')}>J’ai récupéré la commande</button>}
   {['assigned','picked_up'].includes(mission.status)&&<>
    <label>Code donné par l’acheteur<input inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="6 chiffres"/></label>
    <button className="wr-primary" disabled={busy||code.length!==6} onClick={()=>void act('deliver',{code})}>Confirmer la remise</button></>}
   {mission.status==='delivered'&&<p role="status" className="wr-notice">Livraison confirmée. Merci !</p>}
  </section>}
 </main>;
}
