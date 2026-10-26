import { useState } from 'react';
import { ArrowUp, ArrowUpRight, ChevronRight, Globe2, MessageCircle, ShieldCheck, ShoppingBag, SlidersHorizontal, Tag } from 'lucide-react';
import { BotLiveAvatar } from './bot/BotLiveAvatar';
import type { QuickAskKind } from './WaouhQuickAsk';
import './avatar-premium.css';

export function WaouhPremiumAvatar({ name='Bot', firstName, missions=0, approvals=0, deals=0, onAction, onAsk, onSettings, onMissions }: {
  name?:string; firstName?:string|null; missions?:number; approvals?:number; deals?:number;
  onAction:(kind:QuickAskKind)=>void; onAsk:(prompt:string)=>void; onSettings:()=>void; onMissions:()=>void;
}) {
  const [prompt,setPrompt]=useState('');
  const first=String(firstName||'').trim().split(/\s+/)[0];
  const submit=()=>{if(prompt.trim()){onAsk(prompt.trim());setPrompt('');}};
  return <section className="wap wap-home" data-waouh-ui="avatar-premium-home">
    <header className="wap-header"><div className="wap-grow"><h2>Votre Avatar</h2><small>WAOUH, à vos côtés.</small></div><button type="button" className="wap-icon" aria-label="Paramétrer mon avatar" onClick={onSettings}><SlidersHorizontal/></button></header>
    <div className="wap-portrait"><button type="button" aria-label="Ouvrir mon avatar" onClick={onSettings}><BotLiveAvatar size={84} expression={approvals?'ask':missions?'work':'idle'}/></button><div className="wap-name">{name}<span>· À vos côtés</span></div><div className="wap-greeting"><h2>{first&&first.toLowerCase()!=='waouhapp'?`Bonjour ${first}`:'Bonjour'}</h2><p>Que puis-je faire pour vous ?</p></div></div>
    <div className="wap-composer"><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();}} aria-label="Votre besoin" placeholder="Décrivez votre besoin…" maxLength={1000}/><button type="button" className="wap-send" aria-label="Démarrer ma demande" disabled={!prompt.trim()} onClick={submit}><ArrowUp size={20}/></button></div>
    <div className="wap-actions">{([['acheter','Acheter',ShoppingBag],['vendre','Vendre',Tag],['trouver','Trouver',Globe2],['demander','Demander',MessageCircle]] as const).map(([kind,label,Icon])=><button type="button" className="wap-action" data-waouh-action={kind} key={kind} onClick={()=>onAction(kind)}><span className="wap-action-icon"><Icon/></span>{label}</button>)}</div>
    {(missions>0||approvals>0||deals>0)&&<button type="button" className="wap-peek" onClick={onMissions}><span className="wap-dot"/><span className="wap-grow"><strong>{approvals?`${approvals} décision${approvals>1?'s':''} à valider`:missions?`${missions} mission${missions>1?'s':''} en cours`:`${deals} échange${deals>1?'s':''} en cours`}</strong><small>Voir l’activité et la prochaine action</small></span><ArrowUpRight size={18}/></button>}
    <button type="button" className="wap-foot" onClick={onSettings}><ShieldCheck/><span>Mon Avatar, mes règles</span><ChevronRight/></button>
  </section>;
}
