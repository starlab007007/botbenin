import {Check,Loader2,Clock3} from 'lucide-react';
import {BotLiveAvatar} from './bot/BotLiveAvatar';
import type {GuidedPhase} from '@/lib/waouh/guidedDiscovery';
import './guided-discovery.css';

export function WaouhGuidedProgress({phase,count,refreshing=false,onActivity}:{phase:GuidedPhase;count:number;refreshing?:boolean;onActivity:()=>void}){
 const interrupted=['partial','paused','error'].includes(phase),ready=phase==='ready';
 const current=phase==='understanding'?0:1;
 const message=phase==='understanding'?'Je précise votre besoin et vos limites.':phase==='collecting'?refreshing?'J’ai reçu les premières pistes. Je poursuis la recherche.':'J’explore les offres correspondant à votre demande.':phase==='paused'?'La recherche est en pause.':phase==='partial'?'Une partie de la recherche n’a pas abouti. Les premières pistes restent accessibles.':phase==='error'?'Je n’ai pas pu terminer. Vous pouvez relancer la recherche.':'Ma sélection est prête. Je vous explique mes choix.';
 const labels=[['Votre besoin est compris','Vos critères guident ma recherche.'],['J’explore les offres',count?`${count} piste${count>1?'s':''} reçue${count>1?'s':''}.`:'Je recueille les premières pistes.'],['J’écarte les écarts','Doublons et critères incompatibles.'],['Je compare les offres','Prix, conditions et informations manquantes.'],['Je prépare ma sélection','Un choix expliqué et ses alternatives.']];
 return <section className="wgd wgd-progress" aria-label="Étapes de ma recherche">
  <span className="wgd-live">{ready?'Sélection prête':interrupted?'Recherche à reprendre':'Recherche en cours'}</span>
  <h2>{interrupted?'Je garde le fil.':'Je m’en occupe.'}</h2>
  <div className="wgd-guide"><BotLiveAvatar size={48}/><div><strong>Votre avatar · IA</strong><p role="status" aria-live="polite">{message}</p></div></div>
  <ol className="wgd-timeline">{labels.map(([label,note],i)=>{const done=ready||i<current,active=!ready&&!interrupted&&i===current;return <li key={label} className={done?'done':active?'current':'waiting'}><span className="wgd-stepdot">{done?<Check/>:active?<Loader2 className="animate-spin"/>:<Clock3/>}</span><div><strong>{label}</strong><small>{done||active?note:interrupted?'À reprendre':'À venir'}</small></div></li>;})}</ol>
  <button type="button" className="wmn-text" onClick={onActivity}>Voir le déroulé de ma recherche</button>
 </section>;
}
