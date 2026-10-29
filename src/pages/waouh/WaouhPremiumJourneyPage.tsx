import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {convergence} from '@/lib/waouh/convergence';
import {ChevronRight,RefreshCw} from 'lucide-react';

const steps = [
  ['Je cherche pour vous','/app/avatar/acheter'],
  ['Votre sélection','/app/avatar/acheter'],
  ['Votre offre','/app/avatar/acheter'],
  ['Nouvelle demande','/app/chat'],
  ['Votre échange','/app/chat'],
  ['Votre accord','/app/missions?view=suivi'],
  ['Votre prestation','/app/avatar/demander'],
  ['Votre opportunité','/app/avatar/demander'],
  ['Bot, à votre rythme','/app/missions'],
  ['Une demande vous attend','/app/missions?convergence_invite=1'],
  ['Votre remise','/app/missions?view=suivi'],
  ['Votre échange terminé','/app/missions?view=suivi'],
] as const;

export default function WaouhPremiumJourneyPage() {
  const navigate=useNavigate();
  const [count,setCount]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const refresh=async()=>{
    setLoading(true);setError('');
    try {
      const data=await convergence<{missions?: unknown[]}>('list');
      setCount(Array.isArray(data.missions)?data.missions.length:0);
    } catch {
      setError('Impossible de récupérer vos missions. Réessayez.');
    } finally {setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);
  return <main className="min-h-screen bg-gradient-to-b from-[#f3f6ff] to-white px-4 py-8">
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-[#0b1944]">Votre parcours WAOUH</h1>
      <p className="mt-2 text-[#53627b]">Bot trouve et prépare. Vous confirmez chaque accord.</p>
      <button onClick={()=>void refresh()} className="my-4 flex items-center gap-2 text-sm text-[#315bf5]" aria-label="Actualiser les missions">
        <RefreshCw size={16}/> Actualiser
      </button>
      {loading&&<p role="status">Synchronisation des missions…</p>}
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {count!==null&&<p className="mb-5 text-sm text-[#53627b]">{count} mission(s) retrouvée(s) dans votre compte.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
      {steps.map(([title,path],i)=><button key={i} onClick={()=>navigate(path)}
        className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#dfe6f4] bg-white p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315bf5]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6edff] font-bold text-[#315bf5]">{i+1}</span>
        <span className="flex-1 font-semibold text-[#0b1944]">{title}</span><ChevronRight size={18}/>
      </button>)}
      </div>
      <p className="mt-6 text-xs text-[#53627b]">Prix, disponibilités, confirmations et notifications proviennent des fonctions métier. Aucun contact n'est déclenché en consultant ce parcours.</p>
    </section>
  </main>;
}
