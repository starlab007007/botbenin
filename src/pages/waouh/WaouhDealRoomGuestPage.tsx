import {useCallback,useEffect,useRef,useState} from 'react';
import {guestRoomCall,roomErrorText,type DealRoom} from '@/lib/waouh/dealRoom';
import {WaouhDealGuidance} from '@/components/waouh/WaouhDealGuidance';
import {ProductGallery} from '@/components/waouh/WaouhProductPresentation';
import './deal-room.css';

const money=(n:any)=>n==null?'Prix à préciser':`${new Intl.NumberFormat('fr-FR').format(Number(n))} F`;
const TERM_LABELS:Record<string,string>={amount:'Prix',quantity:'Quantité',scope:'Périmètre',deadline:'Remise / délai',exclusions:'Exclusions',expected_result:'Résultat attendu',payment:'Paiement'};
export const isGuestToken=(t:string)=>/^[a-f0-9]{64}$/.test(t);

/** Échange ouvert depuis un message WhatsApp par un vendeur ou un annonceur qui n’a pas l’application. */
export default function WaouhDealRoomGuestPage(){
 const [token]=useState(()=>window.location.hash.slice(1));
 const [room,setRoom]=useState<DealRoom|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[stopped,setStopped]=useState(false);
 const [message,setMessage]=useState(''),[panel,setPanel]=useState(''),[note,setNote]=useState('');
 const [terms,setTerms]=useState({amount:'',quantity:'1',scope:'',deadline:'',exclusions:'À préciser',expected_result:'',payment:''});
 const pending=useRef(false);
 useEffect(()=>{const meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.appendChild(meta);return()=>meta.remove();},[]);
 const load=useCallback(async()=>{if(pending.current||!isGuestToken(token))return;try{setRoom(await guestRoomCall(token,'get'));setError('');}catch(e){setError(roomErrorText(e));}},[token]);
 useEffect(()=>{void load();const t=setInterval(()=>{if(document.visibilityState==='visible')void load();},15000);return()=>clearInterval(t);},[load]);
 const act=async(action:string,p:Record<string,unknown>={})=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const d=await guestRoomCall(token,action,p);if(action==='stop'){setStopped(true);setRoom(null);}else setRoom(d);return d;}catch(e){setError(roomErrorText(e));}finally{pending.current=false;setBusy(false);}};
 const a=room?.agreement,allowed=(n:string)=>!!room?.allowed_actions?.includes(n),guide=room?.guidance?.schema==='waouh.room_guidance.v1'?room.guidance:null;
 const openOffer=()=>{const t=a?.terms;setTerms({amount:String(t?.amount??room?.price??''),quantity:String(t?.quantity??1),scope:t?.scope||room?.title||'',deadline:t?.deadline||'',exclusions:t?.exclusions||'À préciser',expected_result:t?.expected_result||room?.title||'',payment:t?.payment||''});setPanel('offer');};
 const guideAction=(action:string)=>{
  if(action==='propose')return openOffer();
  if(action==='receipt'){setNote('');setPanel('receipt');return;}
  if(action==='message'){document.getElementById('wg-message')?.focus();return;}
  if(action==='rating'){document.getElementById('wg-rating')?.scrollIntoView({block:'start'});return;}
  if(action==='review'||action==='accept'){if(a)void act('accept',{version:a.version});return;}
  if(action==='refresh'){void load();return;}
  if(['payment_receive','complete'].includes(action)&&a){void act(action,{version:a.version});return;}
 };
 const header=<header className="mb-4"><p className="text-xs font-semibold text-cyan-700">WAOUH · Échange sécurisé</p><h1 className="mt-1 text-xl font-bold">Répondez sans installer l’application</h1><p className="mt-1 text-xs text-slate-600">Un client s’intéresse à votre offre. Échangez, proposez votre prix et confirmez l’accord ici.</p></header>;
 if(!isGuestToken(token))return <main className="wr mx-auto max-w-xl p-3">{header}<p role="alert" className="wr-error">Lien incomplet. Répondez au message reçu pour obtenir un nouveau lien.</p></main>;
 if(stopped)return <main className="wr mx-auto max-w-xl p-3">{header}<p role="status" className="wr-notice">C’est noté : vous ne serez plus contacté pour cette demande.</p></main>;
 return <main className="wr mx-auto max-w-xl p-3">{header}
  {error&&<p className="wr-error" role="alert">{error}</p>}
  {!room&&!error&&<p role="status">Chargement de l’échange…</p>}
  {room&&<>
   <WaouhDealGuidance guide={guide} busy={busy} onAction={guideAction}/>
   <section className="wr-card"><ProductGallery photos={room.product?.photos||[]} title={room.title} compact/><h2>{room.title}</h2><b className="wr-price">{money(room.price)}</b><p>{room.city}</p></section>
   <div className="wr-messages" aria-live="polite">{(room.messages||[]).map((m:any)=><article className={m.mine?'mine':''} key={m.id}><small>{m.mine?'Vous':m.author_kind==='bot'?'Assistant du client':'Client'}</small><p>{m.text}</p></article>)}</div>
   {allowed('message')&&<form onSubmit={e=>{e.preventDefault();void act('message',{text:message}).then(d=>{if(d)setMessage('');});}}><label>Votre réponse<textarea id="wg-message" value={message} maxLength={2000} onChange={e=>setMessage(e.target.value)}/></label><button className="wr-primary" disabled={busy||!message.trim()}>Envoyer</button></form>}
   {allowed('propose')&&guide?.action!=='propose'&&<button disabled={busy} onClick={openOffer}>Proposer un prix / des conditions</button>}
   <section className="wr-card wr-agreement"><h2>{a?.status==='completed'?'Échange clôturé':a?.status==='accepted'?'Accord confirmé':'Accord'}</h2>
    {a?<><b className="wr-price">{money(a.terms?.amount)}</b><dl>{Object.entries(a.terms||{}).filter(([k])=>k!=='workflow_version').map(([k,v])=><div key={k}><dt>{TERM_LABELS[k]||'Condition'}</dt><dd>{String(v)}</dd></div>)}</dl><p>{a.owner_accepted_at?'✓':'○'} Client · {a.provider_accepted_at?'✓':'○'} Vous</p>
     {allowed('accept')&&<button className="wr-primary" disabled={busy} onClick={()=>void act('accept',{version:a.version})}>Confirmer ces conditions</button>}
     {allowed('reject')&&<button disabled={busy} onClick={()=>void act('reject',{version:a.version})}>Refuser cette version</button>}
     {allowed('receipt')&&<button disabled={busy} onClick={()=>{setNote('');setPanel('receipt');}}>Confirmer la remise</button>}
     {allowed('payment_receive')&&<button disabled={busy} onClick={()=>void act('payment_receive',{version:a.version})}>J’ai reçu le paiement</button>}
     {allowed('complete')&&<button disabled={busy} onClick={()=>void act('complete',{version:a.version})}>Confirmer la clôture</button>}
    </>:<p>Le prix et les conditions seront confirmés ici par les deux parties.</p>}
    {allowed('rating')&&<section id="wg-rating"><h3>Évaluer cet échange</h3>{[1,2,3,4,5].map(r=><button key={r} disabled={busy} aria-label={`${r} étoiles`} onClick={()=>void act('rating',{rating:r})}>{r} ★</button>)}</section>}
   </section>
   <details className="wr-card"><summary>Ne plus être contacté</summary><p>Le client sera informé que vous ne donnez pas suite.</p><button disabled={busy} onClick={()=>void act('stop')}>Ne plus être contacté</button></details>
  </>}
  {panel==='offer'&&room&&<div className="wr-overlay" role="dialog" aria-modal="true" aria-label="Votre proposition"><section className="wr-sheet"><button disabled={busy} onClick={()=>setPanel('')}>Fermer</button><h2>Votre proposition</h2>
   <label>Prix total · F<input type="number" min="1" value={terms.amount} onChange={e=>setTerms({...terms,amount:e.target.value})}/></label>
   <label>Quantité<input type="number" min="1" value={terms.quantity} onChange={e=>setTerms({...terms,quantity:e.target.value})}/></label>
   <label>Remise / délai<input value={terms.deadline} onChange={e=>setTerms({...terms,deadline:e.target.value})} placeholder="Ex. : demain à Cotonou"/></label>
   <label>Paiement<input value={terms.payment} onChange={e=>setTerms({...terms,payment:e.target.value})} placeholder="Ex. : à la remise"/></label>
   <button className="wr-primary" disabled={busy||!(Number(terms.amount)>0)||!terms.payment.trim()} onClick={()=>void act('propose',{version:room.current_offer_version??0,terms:{...terms,amount:Number(terms.amount),quantity:Number(terms.quantity)}}).then(d=>{if(d)setPanel('');})}>Envoyer la proposition</button></section></div>}
  {panel==='receipt'&&room&&a&&<div className="wr-overlay" role="dialog" aria-modal="true" aria-label="Confirmer la remise"><section className="wr-sheet"><button disabled={busy} onClick={()=>setPanel('')}>Fermer</button><h2>Confirmer la remise</h2><label>Précision (facultatif)<textarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)}/></label><button className="wr-primary" disabled={busy} onClick={()=>void act('receipt',{version:a.version,...(note.trim()?{text:note.trim()}:{})}).then(d=>{if(d)setPanel('');})}>Confirmer la remise</button></section></div>}
 </main>;
}
