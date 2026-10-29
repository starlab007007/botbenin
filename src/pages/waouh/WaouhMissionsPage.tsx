import {WaouhProductPresentation} from '@/components/waouh/WaouhProductPresentation';
import {supabase} from '@/integrations/supabase/client';
import {normalizeMissionKind} from '@/lib/waouh/guidedDiscovery';
import {automaticMissionMessage} from '@/lib/waouh/automaticMission';
import { useEffect,useRef,useState } from 'react';
import { useNavigate,useSearchParams } from 'react-router-dom';
import { ArrowUpRight,ChevronRight,MoreHorizontal,Workflow,Pause,Play,RefreshCw,Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet,SheetContent,SheetTitle,SheetDescription } from '@/components/ui/sheet';
import { BotLiveAvatar } from '@/components/waouh/bot/BotLiveAvatar';
import { WaouhAgentCenter } from '@/components/waouh/WaouhAgentCenter';
import { WaouhContactLedger } from '@/components/waouh/WaouhContactLedger';
import { WaouhConvergenceDialog } from '@/components/waouh/WaouhConvergenceWorkspace';
import { WaouhJourneyProgress } from '@/components/waouh/WaouhJourneyProgress';
import { listNexusMandates,listNexusOpportunityJourneys,updateNexusMandate,type NexusAvatarMandate,type NexusOpportunityJourney } from '@/lib/waouh/nexus';
import { invokeWaouhAgentic } from '@/lib/waouh/agenticClient';
import { listFromAgenticData,type AgentMission,type NonFinancialApproval } from '@/lib/waouh/agenticContracts';
import { loadAvatarAutonomy } from '@/lib/waouh/avatarAutonomy';
import { buildWaouhAuthRedirect } from '@/lib/waouhAccessPolicy';
import '@/components/waouh/minimal-premium.css';

const finished=new Set(['completed','cancelled','expired','failed']);
export default function WaouhMissionsPage(){
  const {user}=useAuth(),navigate=useNavigate();const [params]=useSearchParams();
  const [dataOwner,setDataOwner]=useState<string|undefined>(undefined);
  const [mandates,setMandates]=useState<NexusAvatarMandate[]>([]),[journeys,setJourneys]=useState<NexusOpportunityJourney[]>([]),[legacy,setLegacy]=useState<AgentMission[]>([]),[approvals,setApprovals]=useState<NonFinancialApproval[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[paused,setPaused]=useState(false),[busy,setBusy]=useState(false);
  const [need,setNeed]=useState(''),[sheet,setSheet]=useState(params.get('view')==='suivi'||params.has('focus')?'advanced':''),[active,setActive]=useState<NexusAvatarMandate|null>(null),[archive,setArchive]=useState(false),[convergence,setConvergence]=useState(params.has('convergence_invite'));
  const generation=useRef(0), refreshNow=useRef<()=>void>(()=>{});
  useEffect(()=>{
    const version=++generation.current;let pending=false,retries=0,retryTimer:number|undefined;
    setMandates([]);setJourneys([]);setLegacy([]);setApprovals([]);setActive(null);setPaused(false);setError('');setDataOwner(user?.id);
    if(!user){setLoading(false);refreshNow.current=()=>{};return;}
    const refresh=async()=>{
      if(pending||document.visibilityState==='hidden')return;
      pending=true;setLoading(true);
      const calls=await Promise.allSettled([listNexusMandates(),listNexusOpportunityJourneys({include_completed:true,limit:100}),invokeWaouhAgentic('mission.list',{limit:30}),invokeWaouhAgentic('approval.list',{status:'pending',limit:30}),loadAvatarAutonomy()]);
      pending=false;if(version!==generation.current)return;
      setLoading(false);setDataOwner(user.id);
      const failed=calls.slice(0,4).some(c=>c.status==='rejected');
      setError(failed?'Je rétablis le suivi automatiquement…':'');
      if(calls[0].status==='fulfilled')setMandates(calls[0].value.mandates??[]);
      if(calls[1].status==='fulfilled')setJourneys(calls[1].value.journeys??[]);
      if(calls[2].status==='fulfilled')setLegacy(listFromAgenticData<AgentMission>(calls[2].value,'missions'));
      if(calls[3].status==='fulfilled')setApprovals(listFromAgenticData<NonFinancialApproval>(calls[3].value,'approvals'));
      if(calls[4].status==='fulfilled')setPaused(calls[4].value.paused);
      clearTimeout(retryTimer);
      if(failed){retries++;retryTimer=window.setTimeout(()=>void refresh(),retries===1?5000:retries===2?15000:30000);}else retries=0;
    };
    refreshNow.current=()=>void refresh();void refresh();
    const timer=window.setInterval(()=>void refresh(),30000),onFocus=()=>void refresh();
    window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
    const channel=supabase.channel('mission-feed-'+Math.random().toString(36).slice(2));
    for(const table of ['waouh_avatar_mandates','waouh_opportunity_journeys'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`owner_id=eq.${user.id}`},()=>void refresh());
    channel.subscribe();
    return()=>{generation.current++;refreshNow.current=()=>{};clearInterval(timer);clearTimeout(retryTimer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);void supabase.removeChannel(channel);};
  },[user?.id]);
  const openedMandate=useRef('');
  useEffect(()=>{const id=params.get('mandate');if(id&&id!==openedMandate.current){const match=mandates.find(m=>m.id===id);if(match){openedMandate.current=id;setActive(match);setSheet('mission');}}},[params,mandates]);
  const linked=new Set(mandates.map(m=>m.metadata?.legacy_mission_id).filter(Boolean));
  const own=dataOwner===user?.id;
  const scopedMandates=own?mandates:[],scopedJourneys=own?journeys:[],scopedLegacy=own?legacy:[],scopedApprovals=own?approvals:[];
  const current=scopedMandates.filter(m=>archive?finished.has(m.status):!finished.has(m.status));
  const legacyRows=scopedLegacy.filter(m=>!linked.has(m.id)&&(archive?finished.has(m.status):!finished.has(m.status)));
  const pending=(m:NexusAvatarMandate)=>scopedJourneys.some(j=>j.mandate_id===m.id&&j.last_action==='owner_approval_requested'&&!finished.has(j.stage));
  current.sort((a,b)=>Number(pending(b))-Number(pending(a))||Date.parse(b.created_at)-Date.parse(a.created_at));
  const archived=scopedMandates.filter(m=>finished.has(m.status)).length+scopedLegacy.filter(m=>!linked.has(m.id)&&finished.has(m.status)).length;
  const selected=own&&active?mandates.find(m=>m.id===active.id)??active:null;
  const watchRows=selected?.metadata?.discovery_kind==='opportunity'&&Array.isArray(selected.metadata.latest_selection)?selected.metadata.latest_selection.filter((r:unknown):r is {fabric_id:string;subject:string;deadline?:number|string|null}=>!!r&&typeof r==='object'&&typeof (r as {subject?:unknown}).subject==='string'):[];
  const update=async(status:'active'|'paused'|'cancelled')=>{if(!selected||busy)return;const version=generation.current;setBusy(true);setError('');try{const r=await updateNexusMandate(selected.id,{status});if(version===generation.current)setMandates(rows=>rows.map(m=>m.id===r.mandate.id?r.mandate:m));}catch{setError('Modification impossible. Réessayez.');}finally{if(version===generation.current)setBusy(false);}};
  const start=()=>{if(need.trim())navigate(`/app/nexus?${new URLSearchParams({q:need.trim(),go:'1',mode:'auto',kind:'trouver',follow:'1'})}`);else setSheet('new');};
  return <div className="wmn-surface"><main className="wmn" data-waouh-ui="minimal-missions">
    <header className="wmn-head"><h1>Missions</h1><span className="wmn-grow"/><button type="button" className="wmn-icon" aria-label="Autres outils de mission" onClick={()=>setSheet('tools')}><MoreHorizontal/></button></header>
    <button type="button" className="wmn-new" onClick={()=>setSheet('new')}><span className="wmn-grow">Quel est votre besoin ?</span><span><ArrowUpRight/></span></button>
    <button type="button" className="wmn-primary" onClick={()=>navigate('/app/premium')}>Mon parcours achat, service et vente<ChevronRight size={17}/></button>
    {loading&&!mandates.length&&!legacy.length?<p className="wmn-description mt-6" role="status">Chargement…</p>:<>
      {scopedApprovals.length>0&&!archive&&<button type="button" className="wmn-mission mt-6" onClick={()=>setSheet('advanced')}><span className="wmn-flag">À valider</span><h3>{scopedApprovals.length===1?scopedApprovals[0].title:`${scopedApprovals.length} décisions vous attendent`}</h3><span className="wmn-mission-bottom">Examiner<span className="wmn-grow"/><ArrowUpRight/></span></button>}
      <div className="wmn-sectionline"><span>{archive?'Terminées':'En cours'}</span><span>{current.length+legacyRows.length}</span></div>
      {current.map(m=>{const decision=pending(m),isPaused=m.status==='paused'||paused,line=isPaused?'Bot attend la reprise.':finished.has(m.status)?'Terminée':decision?'Votre accord est attendu.':m.replied_count?`${m.replied_count} réponse${m.replied_count>1?'s':''} reçue${m.replied_count>1?'s':''}`:m.contacted_count?`${m.contacted_count} contact${m.contacted_count>1?'s':''} sollicité${m.contacted_count>1?'s':''}`:automaticMissionMessage(m);return <button type="button" className={`wmn-mission ${decision?'':'compact'}`} key={m.id} onClick={()=>{setActive(m);setSheet('mission');}}>{decision?<><span className="wmn-flag">{isPaused?'En pause':'À valider'}</span><h3>{m.goal}</h3><p>{line}</p><span className="wmn-mission-bottom">Voir la décision<span className="wmn-grow"/><ArrowUpRight/></span></>:<><span className="wmn-mode-icon"><Workflow/></span><span className="wmn-grow"><h3>{m.goal}</h3><p>{line}</p></span><ChevronRight className="wmn-chevron"/></>}</button>;})}
      {legacyRows.map(m=><button type="button" className="wmn-mission" key={m.id} onClick={()=>setSheet('advanced')}><h3 className="!mt-0">{m.title}</h3><p>{m.status==='paused'?'En pause':finished.has(m.status)?'Terminée':'Voir le suivi de Bot'}</p></button>)}
      {!current.length&&!legacyRows.length&&!error&&<div className="wmn-screen-empty"><BotLiveAvatar size={48}/><h2>{archive?'Aucune mission terminée':user?'Votre prochaine mission commence ici':'Confiez un besoin à Bot'}</h2><p>{user?'Décrivez votre besoin en une phrase.':'La recherche est ouverte. Connectez-vous pour le suivi.'}</p>{!user&&<button type="button" className="wmn-text mx-auto" onClick={()=>navigate(buildWaouhAuthRedirect('/app/missions'))}>Se connecter</button>}</div>}
    </>}
    {user&&<button type="button" className="wmn-archive" onClick={()=>setArchive(v=>!v)}><span>{archive?'En cours':'Terminées'}</span><span className="wmn-grow"/>{archive?'':archived}<ChevronRight className="wmn-chevron"/></button>}
    <div className="wmn-bot-foot"><BotLiveAvatar size={24}/><span>{paused?'Bot est en pause.':error?'Actualisation automatique du suivi…':'Bot s’occupe de la suite.'}</span></div>
    {error&&<div role="alert"><p className="wmn-description" role="status">{error}</p><button type="button" className="wmn-text" onClick={()=>refreshNow.current()}><RefreshCw size={14}/>Actualiser maintenant</button></div>}
    <Sheet open={!!sheet} onOpenChange={v=>{if(!v&&!busy)setSheet('');}}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-mission-desc"><SheetTitle>{sheet==='new'?'Confier un besoin':sheet==='mission'?selected?.goal||'Ma mission':sheet==='advanced'?'Suivi détaillé':'Mes outils'}</SheetTitle><SheetDescription id="wmn-mission-desc" className="sr-only">Suivez et gérez vos missions.</SheetDescription><div className="wmn">
      {sheet==='new'&&<form onSubmit={e=>{e.preventDefault();start();}}><label className="wmn-field">Votre besoin<input autoFocus maxLength={1000} value={need} onChange={e=>setNeed(e.target.value)} placeholder="Un produit, un service, une annonce…" required/></label><p className="wmn-description">Bot recherche, compare et suit selon vos règles.</p><button type="submit" className="wmn-primary"><Sparkles size={16}/>Confier à Bot</button></form>}
      {sheet==='tools'&&<>{[['Suivi détaillé','advanced'],['Organiser un besoin','convergence'],['Mon avatar','avatar'],['Radar','radar']].map(([label,id])=><button type="button" className="wmn-setting" key={id} onClick={()=>id==='avatar'?navigate('/app/avatar'):id==='radar'?navigate('/app/radar-map'):id==='convergence'?(setSheet(''),setConvergence(true)):setSheet(id)}><span className="wmn-grow">{label}</span><ChevronRight className="wmn-chevron"/></button>)}</>}
      {sheet==='advanced'&&<><WaouhContactLedger/><WaouhAgentCenter embedded initialTab={params.get('focus')??undefined}/></>}
      {sheet==='mission'&&selected&&<>{selected.metadata?.article_snapshot&&<WaouhProductPresentation value={selected.metadata.article_snapshot} label="Mon article à vendre"/>}<p className="wmn-description">{selected.city||'Zone à préciser'}{selected.budget_max?` · ${new Intl.NumberFormat('fr-FR').format(selected.budget_max)} F max`:''}</p>{scopedJourneys.filter(j=>j.mandate_id===selected.id).map(j=><div key={j.id} className="py-4 border-b"><strong className="text-sm">{j.subject||'Opportunité'}</strong><WaouhJourneyProgress journey={j}/>{j.thread_id&&<button type="button" className="wmn-text" onClick={()=>navigate(`/app/chat/${j.thread_id}`)}>Ouvrir l’échange</button>}</div>)}{selected.metadata?.discovery_kind==='opportunity'?<><p className="wmn-description">{automaticMissionMessage(selected)}</p>{watchRows.map(r=>{const d=typeof r.deadline==='number'?r.deadline:Date.parse(String(r.deadline??''));return <div className="py-3 border-b" key={r.fabric_id}><strong className="text-sm">{r.subject}</strong><p className="wmn-description">{Number.isFinite(d)?`Échéance annoncée · ${new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'Africa/Porto-Novo'}).format(d)}`:'Échéance à préciser'}</p></div>})}</>:!scopedJourneys.some(j=>j.mandate_id===selected.id)&&<p className="wmn-description">Bot cherche les bonnes pistes dans vos limites.</p>}<button type="button" className="wmn-text" onClick={()=>navigate(`/app/nexus?${new URLSearchParams({q:selected.goal,city:selected.city||'',kind:normalizeMissionKind(selected.metadata?.discovery_kind,selected.goal,selected.mode)})}`)}>Nouvelle recherche</button>{pending(selected)&&<button type="button" className="wmn-primary" onClick={()=>setSheet('advanced')}>Examiner la décision</button>}{!finished.has(selected.status)&&<div className="wmn-grid mt-5"><button type="button" className="wmn-secondary" disabled={busy} onClick={()=>void update(selected.status==='paused'?'active':'paused')}>{selected.status==='paused'?<Play/>:<Pause/>}{selected.status==='paused'?'Reprendre':'Pause'}</button><button type="button" className="wmn-secondary" disabled={busy} onClick={()=>{if(window.confirm('Arrêter cette mission ?'))void update('cancelled');}}>Arrêter</button></div>}{error&&<p className="wmn-error" role="alert">{error}</p>}</>}
    </div></SheetContent></Sheet>
    <WaouhConvergenceDialog open={convergence} onOpenChange={setConvergence}/>
  </main></div>;
}
