import { useEffect,useRef,useState } from 'react';
import { useNavigate,useSearchParams } from 'react-router-dom';
import { ArrowUpRight,ChevronRight,MoreHorizontal,Pause,Play,RefreshCw,Sparkles } from 'lucide-react';
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
  const [mandates,setMandates]=useState<NexusAvatarMandate[]>([]),[journeys,setJourneys]=useState<NexusOpportunityJourney[]>([]),[legacy,setLegacy]=useState<AgentMission[]>([]),[approvals,setApprovals]=useState<NonFinancialApproval[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[paused,setPaused]=useState(false),[busy,setBusy]=useState(false);
  const [need,setNeed]=useState(''),[sheet,setSheet]=useState(params.get('view')==='suivi'||params.has('focus')?'advanced':''),[active,setActive]=useState<NexusAvatarMandate|null>(null),[archive,setArchive]=useState(false),[convergence,setConvergence]=useState(params.has('convergence_invite'));
  const generation=useRef(0);const [reload,setReload]=useState(0);
  useEffect(()=>{const version=++generation.current;let pending=false;setMandates([]);setJourneys([]);setLegacy([]);setApprovals([]);setActive(null);setPaused(false);setError('');if(!user){setLoading(false);return;}
    const refresh=async()=>{if(pending||document.visibilityState==='hidden')return;pending=true;setLoading(true);const calls=await Promise.allSettled([listNexusMandates(),listNexusOpportunityJourneys({include_completed:true,limit:100}),invokeWaouhAgentic('mission.list',{limit:30}),invokeWaouhAgentic('approval.list',{status:'pending',limit:30}),loadAvatarAutonomy()]);pending=false;if(version!==generation.current)return;setLoading(false);setError(calls.slice(0,4).some(c=>c.status==='rejected')?'Une partie du suivi est indisponible. Réessayez.':'');if(calls[0].status==='fulfilled')setMandates(calls[0].value.mandates??[]);if(calls[1].status==='fulfilled')setJourneys(calls[1].value.journeys??[]);if(calls[2].status==='fulfilled')setLegacy(listFromAgenticData<AgentMission>(calls[2].value,'missions'));if(calls[3].status==='fulfilled')setApprovals(listFromAgenticData<NonFinancialApproval>(calls[3].value,'approvals'));if(calls[4].status==='fulfilled')setPaused(calls[4].value.paused);};
    void refresh();const timer=window.setInterval(()=>void refresh(),30000);const onFocus=()=>void refresh();window.addEventListener('focus',onFocus);return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',onFocus);};
  },[user?.id,reload]);
  const openedMandate=useRef('');
  useEffect(()=>{const id=params.get('mandate');if(id&&id!==openedMandate.current){const match=mandates.find(m=>m.id===id);if(match){openedMandate.current=id;setActive(match);setSheet('mission');}}},[params,mandates]);
  const linked=new Set(mandates.map(m=>m.metadata?.legacy_mission_id).filter(Boolean));
  const current=mandates.filter(m=>archive?finished.has(m.status):!finished.has(m.status));
  const legacyRows=legacy.filter(m=>!linked.has(m.id)&&(archive?finished.has(m.status):!finished.has(m.status)));
  const pending=(m:NexusAvatarMandate)=>journeys.some(j=>j.mandate_id===m.id&&j.last_action==='owner_approval_requested'&&!finished.has(j.stage));
  current.sort((a,b)=>Number(pending(b))-Number(pending(a))||Date.parse(b.created_at)-Date.parse(a.created_at));
  const archived=mandates.filter(m=>finished.has(m.status)).length+legacy.filter(m=>!linked.has(m.id)&&finished.has(m.status)).length;
  const selected=active?mandates.find(m=>m.id===active.id)??active:null;
  const update=async(status:'active'|'paused'|'cancelled')=>{if(!selected||busy)return;const version=generation.current;setBusy(true);setError('');try{const r=await updateNexusMandate(selected.id,{status});if(version===generation.current)setMandates(rows=>rows.map(m=>m.id===r.mandate.id?r.mandate:m));}catch{setError('Modification impossible. Réessayez.');}finally{if(version===generation.current)setBusy(false);}};
  const start=()=>{if(need.trim())navigate(`/app/nexus?${new URLSearchParams({q:need.trim(),go:'1',mode:'auto',kind:'trouver',follow:'1'})}`);else setSheet('new');};
  return <div className="wmn-surface"><main className="wmn" data-waouh-ui="minimal-missions">
    <header className="wmn-head"><h1>Missions</h1><span className="wmn-grow"/><button type="button" className="wmn-icon" aria-label="Autres outils de mission" onClick={()=>setSheet('tools')}><MoreHorizontal/></button></header>
    <button type="button" className="wmn-new" onClick={()=>setSheet('new')}><span className="wmn-grow">Quel est votre besoin ?</span><span><ArrowUpRight/></span></button>
    {loading&&!mandates.length&&!legacy.length?<p className="wmn-description mt-6" role="status">Chargement…</p>:<>
      {approvals.length>0&&!archive&&<button type="button" className="wmn-mission mt-6" onClick={()=>setSheet('advanced')}><span className="wmn-flag">À valider</span><h3>{approvals.length===1?approvals[0].title:`${approvals.length} décisions vous attendent`}</h3><span className="wmn-mission-bottom">Examiner<span className="wmn-grow"/><ArrowUpRight/></span></button>}
      <div className="wmn-sectionline"><span>{archive?'Terminées':'En cours'}</span><span>{current.length+legacyRows.length}</span></div>
      {current.map(m=><button type="button" className="wmn-mission" key={m.id} onClick={()=>{setActive(m);setSheet('mission');}}><span className="wmn-mission-top"><span className={`wmn-flag ${pending(m)?'':'green'}`}>{pending(m)?'À valider':m.status==='paused'||paused?'En pause':finished.has(m.status)?'Terminée':'En cours'}</span></span><h3>{m.goal}</h3><p>{m.status==='paused'||paused?'Bot attend la reprise.':pending(m)?'Votre accord est attendu.':m.replied_count?`${m.replied_count} réponse${m.replied_count>1?'s':''} reçue${m.replied_count>1?'s':''}`:m.contacted_count?`${m.contacted_count} contact${m.contacted_count>1?'s':''} sollicité${m.contacted_count>1?'s':''}`:'Bot cherche les bonnes pistes.'}</p><span className="wmn-mission-bottom">{pending(m)?'Voir la décision':'Voir le suivi'}<span className="wmn-grow"/><ArrowUpRight/></span></button>)}
      {legacyRows.map(m=><button type="button" className="wmn-mission" key={m.id} onClick={()=>setSheet('advanced')}><h3 className="!mt-0">{m.title}</h3><p>{m.status==='paused'?'En pause':finished.has(m.status)?'Terminée':'Voir le suivi de Bot'}</p></button>)}
      {!current.length&&!legacyRows.length&&<div className="wmn-screen-empty"><BotLiveAvatar size={48}/><h2>{archive?'Aucune mission terminée':user?'Votre prochaine mission commence ici':'Confiez un besoin à Bot'}</h2><p>{user?'Décrivez votre besoin en une phrase.':'La recherche est ouverte. Connectez-vous pour le suivi.'}</p>{!user&&<button type="button" className="wmn-text mx-auto" onClick={()=>navigate(buildWaouhAuthRedirect('/app/missions'))}>Se connecter</button>}</div>}
    </>}
    {user&&<button type="button" className="wmn-archive" onClick={()=>setArchive(v=>!v)}><span>{archive?'En cours':'Terminées'}</span><span className="wmn-grow"/>{archive?'':archived}<ChevronRight className="wmn-chevron"/></button>}
    <div className="wmn-bot-foot"><BotLiveAvatar size={24}/><span>{paused?'Bot est en pause.':'Bot s’occupe de la suite.'}</span></div>
    {error&&<div role="alert"><p className="wmn-error">{error}</p><button type="button" className="wmn-text" onClick={()=>setReload(v=>v+1)}><RefreshCw size={14}/>Réessayer</button></div>}
    <Sheet open={!!sheet} onOpenChange={v=>{if(!v&&!busy)setSheet('');}}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-mission-desc"><SheetTitle>{sheet==='new'?'Confier un besoin':sheet==='mission'?selected?.goal||'Ma mission':sheet==='advanced'?'Suivi détaillé':'Mes outils'}</SheetTitle><SheetDescription id="wmn-mission-desc" className="sr-only">Suivez et gérez vos missions.</SheetDescription><div className="wmn">
      {sheet==='new'&&<form onSubmit={e=>{e.preventDefault();start();}}><label className="wmn-field">Votre besoin<input autoFocus maxLength={1000} value={need} onChange={e=>setNeed(e.target.value)} placeholder="Un produit, un service, une annonce…" required/></label><p className="wmn-description">Bot recherche, compare et suit selon vos règles.</p><button type="submit" className="wmn-primary"><Sparkles size={16}/>Confier à Bot</button></form>}
      {sheet==='tools'&&<>{[['Suivi détaillé','advanced'],['Organiser un besoin','convergence'],['Mon avatar','avatar'],['Radar','radar']].map(([label,id])=><button type="button" className="wmn-setting" key={id} onClick={()=>id==='avatar'?navigate('/app/avatar'):id==='radar'?navigate('/app/radar-map'):id==='convergence'?(setSheet(''),setConvergence(true)):setSheet(id)}><span className="wmn-grow">{label}</span><ChevronRight className="wmn-chevron"/></button>)}</>}
      {sheet==='advanced'&&<><WaouhContactLedger/><WaouhAgentCenter embedded initialTab={params.get('focus')??undefined}/></>}
      {sheet==='mission'&&selected&&<><p className="wmn-description">{selected.city||'Zone à préciser'}{selected.budget_max?` · ${new Intl.NumberFormat('fr-FR').format(selected.budget_max)} F max`:''}</p>{journeys.filter(j=>j.mandate_id===selected.id).map(j=><div key={j.id} className="py-4 border-b"><strong className="text-sm">{j.subject||'Opportunité'}</strong><WaouhJourneyProgress journey={j}/>{j.thread_id&&<button type="button" className="wmn-text" onClick={()=>navigate(`/app/chat/${j.thread_id}`)}>Ouvrir l’échange</button>}</div>)}{!journeys.some(j=>j.mandate_id===selected.id)&&<p className="wmn-description">Bot cherche les bonnes pistes dans vos limites.</p>}{pending(selected)&&<button type="button" className="wmn-primary" onClick={()=>setSheet('advanced')}>Examiner la décision</button>}{!finished.has(selected.status)&&<div className="wmn-grid mt-5"><button type="button" className="wmn-secondary" disabled={busy} onClick={()=>void update(selected.status==='paused'?'active':'paused')}>{selected.status==='paused'?<Play/>:<Pause/>}{selected.status==='paused'?'Reprendre':'Pause'}</button><button type="button" className="wmn-secondary" disabled={busy} onClick={()=>{if(window.confirm('Arrêter cette mission ?'))void update('cancelled');}}>Arrêter</button></div>}{error&&<p className="wmn-error" role="alert">{error}</p>}</>}
    </div></SheetContent></Sheet>
    <WaouhConvergenceDialog open={convergence} onOpenChange={setConvergence}/>
  </main></div>;
}
