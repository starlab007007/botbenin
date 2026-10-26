import { useState } from 'react';
import { CheckCircle2,ListChecks,Pause,Play } from 'lucide-react';
import { BotLiveAvatar } from './bot/BotLiveAvatar';
import './avatar-premium.css';
export type MissionActivity={id:number;at:string;text:string};
export function WaouhLiveMission({busy,paused=false,count,refreshing=false,error,events,onPause,onResume}:{busy:boolean;paused?:boolean;count:number;refreshing?:boolean;error?:string;events:MissionActivity[];onPause?:()=>void;onResume?:()=>void}){
  const [open,setOpen]=useState(false);
  const stage=busy?(refreshing?2:1):count?2:1;
  const title=paused?'Votre recherche est en pause.':error?'La recherche a été interrompue.':busy?(refreshing?'Je cherche d’autres pistes.':'Je cherche les bonnes pistes.'):count?'Vos premières pistes sont prêtes.':'Aucune piste pour le moment.';
  return <section className="wap-card" aria-label="Mission en direct" data-waouh-ui="avatar-premium-live">
    <div className="wap-live-top"><BotLiveAvatar size={40} expression={busy?'work':'idle'}/><div className="wap-grow" aria-live="polite"><strong>{title}</strong><small>{error?'Réessayez ou ajustez votre besoin.':count?`${count} offre${count>1?'s':''} repérée${count>1?'s':''} · conditions à confirmer.`:'Les résultats apparaissent dès leur réception.'}</small></div><span className="wap-state"><span className="wap-dot"/>{paused?'En pause':error?'À reprendre':busy?'En cours':'À choisir'}</span></div>
    <div className="wap-path" aria-label={`Étape : ${stage===1?'Recherche':'Comparer'}`}>{[0,1,2,3,4].map(i=><span key={i} className={i<stage?'done':i===stage?'current':''}/>)}</div><div className="wap-path-labels">{['Besoin','Recherche','Comparer','Contact','Suivi'].map((label,i)=><span className={i===stage?'current':''} key={label}>{label}</span>)}</div>
    <p className="wap-live-event">{events[events.length-1]?.text||'Votre demande est prête à être lancée.'}</p>
    <div className="wap-live-footer"><button type="button" className="wap-link" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><ListChecks size={15}/>Voir l’activité</button>{paused&&onResume?<button type="button" className="wap-link" onClick={onResume}><Play size={15}/>Reprendre</button>:busy&&onPause?<button type="button" className="wap-link" onClick={onPause}><Pause size={15}/>Mettre en pause</button>:null}</div>
    {open&&<ol className="wap-journal">{events.map(e=><li key={e.id}><time>{new Date(e.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time><CheckCircle2 size={14}/><span>{e.text}</span></li>)}</ol>}
  </section>;
}
