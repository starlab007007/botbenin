import {Check,Clock3,ArrowRight,ShieldAlert} from 'lucide-react';
export const roomGuideActions=new Set(['invite','review','propose','message','receipt','payment_report','payment_receive','complete','rating','issue','refresh','takeover','resume_bot','approve_step','application_prepare','application_submit','application_outcome']);
export function searchGuidance(searching:boolean,hasResults:boolean){return {
 schema:'waouh.room_guidance.v1',phase:'search',step:1,total:6,status:'active',actor:searching?'bot':'you',actor_label:searching?'Bot':'À vous',
 title:searching?'Recherche en cours':hasResults?'Choisissez une offre':'Décrivez votre besoin',
 detail:searching?'Les offres reçues apparaissent progressivement.':hasResults?'Écrivez à l’interlocuteur ou confiez la suite à Bot.':'Le parcours se précise à partir des offres trouvées.',action:null,
 steps:['Recherche','Contact','Négociation','Accord','Réception','Clôture'].map((label,i)=>({id:String(i),label,state:i===0?'current':'upcoming'})),checklist:[]
};}
export function WaouhDealGuidance({guide,busy=false,onAction}:{guide:any;busy?:boolean;onAction?:(action:string)=>void}){
 if(guide?.schema!=='waouh.room_guidance.v1')return null;
 const complete=guide.status==='completed',blocked=['blocked','stopped'].includes(guide.status);
 return <section className={`wr-guide ${complete?'is-complete':blocked?'is-blocked':''}`} aria-label="Suivi du parcours">
  <div className="wr-guide-top"><span>{complete?'Parcours terminé':`Étape ${guide.step} sur ${guide.total}`}</span><span className={`wr-role wr-role-${guide.actor}`}>{blocked?<ShieldAlert size={14}/>:complete?<Check size={14}/>:guide.actor==='counterparty'?<Clock3 size={14}/>:null}{guide.actor_label}</span></div>
  <nav aria-label="Progression du deal"><ol className="wr-guide-steps">{guide.steps.map((step:any,i:number)=><li key={step.id} data-state={step.state} aria-current={step.state==='current'||step.state==='blocked'?'step':undefined}><span className="wr-step-dot" aria-hidden="true">{step.state==='complete'?<Check size={15}/>:i+1}</span><span>{step.label}<small>{step.state==='complete'?'Confirmé':step.state==='current'?'En cours':step.state==='blocked'?'Suspendu':'À venir'}</small></span></li>)}</ol></nav>
  <div className="wr-guide-task" aria-live="polite"><h2>{guide.title}</h2><p>{guide.detail}</p></div>
  {guide.action&&onAction&&roomGuideActions.has(guide.action)&&<button className="wr-primary wr-guide-action" disabled={busy} onClick={()=>onAction(guide.action)}>{guide.action_label}<ArrowRight size={17}/></button>}
  {onAction&&guide.alternatives?.length>0&&<div className="wr-guide-alternatives" aria-label="Autres confirmations disponibles">{guide.alternatives.filter((item:any)=>roomGuideActions.has(item.action)).map((item:any)=><button key={item.action} disabled={busy} onClick={()=>onAction(item.action)}>{item.label}</button>)}</div>}
  {guide.checklist?.length>0&&<details className="wr-confirmations" open={!complete}><summary>Confirmations enregistrées</summary><ul>{guide.checklist.map((item:any)=><li key={item.label} data-confirmed={item.confirmed}><span aria-hidden="true">{item.confirmed?<Check size={15}/>:<Clock3 size={15}/>}</span>{item.label}<small>{item.confirmed?'Confirmé':'En attente'}</small></li>)}</ul></details>}
 </section>;
}
