import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {convergence} from '@/lib/waouh/convergence';
import {ArrowLeft,ChevronRight,RefreshCw,ShieldCheck,CheckCircle2,Clock3,MessageSquare,Search,Handshake,Briefcase,UserRound,Truck,Check,MapPin} from 'lucide-react';
const stages=[
 {title:'Je cherche pour vous',subtitle:'Recherche en direct',icon:Search,path:'/app/avatar/acheter',group:0},
 {title:'Votre sélection',subtitle:'Comparer les offres',icon:CheckCircle2,path:'/app/avatar/acheter',group:0},
 {title:'Votre offre',subtitle:'Sources et vérifications',icon:ShieldCheck,path:'/app/avatar/acheter',group:0},
 {title:'Nouvelle demande',subtitle:'Réponse du vendeur',icon:MessageSquare,path:'/app/chat',group:1},
 {title:'Votre échange',subtitle:'Négociation privée',icon:Handshake,path:'/app/chat',group:1},
 {title:'Votre accord',subtitle:'Confirmation bilatérale',icon:CheckCircle2,path:'/app/missions?view=suivi',group:1},
 {title:'Votre prestation',subtitle:'Comparer les devis',icon:Briefcase,path:'/app/avatar/demander',group:2},
 {title:'Votre opportunité',subtitle:'Vérifier les conditions',icon:MapPin,path:'/app/avatar/demander',group:2},
 {title:'Bot, à votre rythme',subtitle:'Mandat et limites',icon:UserRound,path:'/app/missions',group:2},
 {title:'Une demande vous attend',subtitle:'Accès sécurisé',icon:ShieldCheck,path:'/app/missions?convergence_invite=1',group:3},
 {title:'Votre remise',subtitle:'Suivre la réalisation',icon:Truck,path:'/app/missions?view=suivi',group:3},
 {title:'Échange terminé',subtitle:'Clôture confirmée',icon:Check,path:'/app/missions?view=suivi',group:3},
] as const;
const groups=['01 — Trouver et choisir','02 — Du contact à l’accord','03 — Services, opportunités, autonomie','04 — Rejoindre, suivre, conclure'];
type Mission={id?:string;goal?:string;title?:string;status?:string;city?:string};
export default function WaouhPremiumJourneyPage(){
 const navigate=useNavigate(),[missions,setMissions]=useState<Mission[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [group,setGroup]=useState(0);
 const refresh=async()=>{setLoading(true);setError('');try{const data=await convergence<{missions?:Mission[]}>('list');setMissions(Array.isArray(data.missions)?data.missions:[]);}catch{setError('Le suivi est temporairement indisponible. Aucune action commerciale n’a été envoyée.');}finally{setLoading(false);}};
 useEffect(()=>{void refresh();},[]);
 return <main className="min-h-screen bg-[#f5f7fc] pb-24 text-[#09163a]">
  <header className="sticky top-0 z-20 border-b border-[#e3e8f4] bg-white/95 px-4 py-4 backdrop-blur">
   <div className="mx-auto flex max-w-4xl items-center justify-between">
    <button aria-label="Retour" onClick={()=>navigate('/app/avatar')}><ArrowLeft size={22}/></button>
    <strong className="text-xl tracking-tight">WAOUH</strong>
    <button aria-label="Actualiser" onClick={()=>void refresh()}><RefreshCw size={19}/></button>
   </div>
  </header>
  <div className="mx-auto max-w-4xl px-4 pt-7">
   <div className="mx-auto mb-6 max-w-md text-center">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e3ebff] text-2xl">🤖</div>
    <p className="text-sm text-[#526285]">Je cherche, je vérifie et je prépare vos échanges.</p>
    <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Votre parcours, avec Bot</h1>
    <p className="mt-2 text-[#64718e]">Vous validez l’accord final. Rien n’est annoncé comme confirmé sans preuve.</p>
   </div>
   <div className="mb-6 grid grid-cols-4 gap-2" role="tablist" aria-label="Étapes du parcours">
   {groups.map((x,i)=><button key={x} role="tab" aria-selected={group===i} onClick={()=>setGroup(i)} className={`rounded-xl px-2 py-3 text-center text-xs font-semibold transition ${group===i?'bg-[#4266fa] text-white shadow-lg':'border border-[#d9e1f3] bg-white text-[#445577]'}`}>{String(i+1).padStart(2,'0')}</button>)}
   </div>
   <h2 className="mb-4 text-center text-xl font-bold">{groups[group]}</h2>
   {loading&&<p role="status" className="py-3 text-center text-sm">Actualisation du dossier…</p>}
   {error&&<p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {missions.length>0&&<div className="mb-5 rounded-2xl border border-[#dfe7f5] bg-white p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#51617e]">Vos missions réelles · {missions.length}</p>{missions.slice(0,2).map((m,i)=><div key={m.id??i} className="flex items-center justify-between py-2 text-sm"><span className="truncate">{m.goal??m.title??'Mission'}</span><span className="ml-2 rounded-full bg-[#ecf1ff] px-2 py-1 text-xs">{m.status??'À suivre'}</span></div>)}</div>}
   <div className="grid gap-4 md:grid-cols-3">
    {stages.filter(s=>s.group===group).map((s,i)=><article key={s.title} className="flex min-h-[350px] flex-col rounded-[26px] border border-[#dbe2f0] bg-white p-5 shadow-[0_12px_35px_rgba(12,31,82,.07)]">
      <div className="mb-5 flex items-center justify-between"><button onClick={()=>setGroup(Math.max(0,group-1))} aria-label="Étape précédente"><ArrowLeft size={19}/></button><strong className="text-lg">WAOUH</strong><s.icon size={20}/></div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
       <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf0ff] text-[#315dff]"><s.icon size={30}/></span>
       <h3 className="text-2xl font-bold">{s.title}</h3><p className="mt-3 text-sm text-[#59698b]">{s.subtitle}</p>
       <div className="mt-6 w-full rounded-xl bg-[#f3f6fc] p-4 text-left text-sm text-[#536483]">
        {group===0?'Résultats, prix et disponibilité issus des sources consultées.':group===1?'Contact et accord liés aux messages et confirmations réels.':group===2?'Comparer et agir selon votre mandat et vos autorisations.':'Suivi de la réalisation et preuves de confirmation des parties.'}
       </div>
      </div>
      <button className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#4266fa] px-4 font-semibold text-white" onClick={()=>navigate(s.path)}>{i===0?'Continuer avec Bot':'Ouvrir cette étape'} <ChevronRight size={17}/></button>
    </article>)}
   </div>
   <div className="mt-6 flex justify-between gap-3"><button disabled={group===0} onClick={()=>setGroup(v=>v-1)} className="rounded-xl border border-[#d8e2f6] bg-white px-5 py-3 disabled:opacity-40">Précédent</button><button disabled={group===3} onClick={()=>setGroup(v=>v+1)} className="rounded-xl bg-[#4266fa] px-5 py-3 font-semibold text-white disabled:opacity-40">Suivant</button></div>
   <p className="mt-6 text-center text-xs text-[#73819c]">Les images du concept sont illustratives. Cette interface n’invente ni prix, ni messages, ni paiements.</p>
  </div>
 </main>;
}
