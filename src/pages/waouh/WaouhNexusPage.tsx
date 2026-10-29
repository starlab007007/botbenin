import {useState} from 'react';
import {useNavigate,useSearchParams,Navigate} from 'react-router-dom';
import {ChevronRight} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {WaouhGlobalDiscoveryPanel} from '@/components/waouh/WaouhGlobalDiscoveryPanel';
import {WaouhNexusInnovationPanel} from '@/components/waouh/WaouhNexusInnovationPanel';
import {useAuth} from '@/contexts/AuthContext';
import {buildWaouhAuthRedirect} from '@/lib/waouhAccessPolicy';
import {ErrorBoundary} from '@/components/ErrorBoundary';
import '@/components/waouh/minimal-premium.css';
export default function WaouhNexusPage(){
 const navigate=useNavigate(),{user}=useAuth();const [params,setParams]=useSearchParams();const [tools,setTools]=useState(false);const lab=params.get('tab')==='lab';
 const [recovery,setRecovery]=useState(0);
 if(params.get('tab')==='missions')return <Navigate to="/app/missions" replace/>;
 return <main className="h-full min-h-0 overflow-y-auto bg-[#f7f8fc]"><div className="wmn-surface"><div className="wmn">
  <ErrorBoundary key={`${user?.id??'guest'}:${params.toString()}:${recovery}`} fallback={<div className="wmn-screen-empty" role="alert"><h1>La recherche a été interrompue.</h1><p>Vous pouvez la reprendre. Les annonces déjà publiées sont conservées.</p><button type="button" className="wmn-primary" onClick={()=>setRecovery(n=>n+1)}>Reprendre ma recherche</button></div>}>
  {lab?<><header className="wmn-head"><h1>Outils avancés</h1></header><button type="button" className="wmn-text" onClick={()=>{params.delete('tab');setParams(params);}}>Revenir à ma recherche</button><WaouhNexusInnovationPanel/></>:<WaouhGlobalDiscoveryPanel key={user?.id??'guest'} onTools={()=>setTools(true)}/>}
  </ErrorBoundary>
  <Sheet open={tools} onOpenChange={setTools}><SheetContent side="bottom" className="wmn-sheet" aria-describedby="wmn-search-tools"><SheetTitle>Mes outils</SheetTitle><SheetDescription id="wmn-search-tools" className="sr-only">Accédez aux réglages et au suivi.</SheetDescription><div className="wmn">{[['Mes missions','/app/missions'],['Mon avatar','/app/avatar'],['Outils avancés','/app/nexus?tab=lab']].map(([label,path])=><button key={path} type="button" className="wmn-setting" onClick={()=>{setTools(false);navigate(user?path:buildWaouhAuthRedirect(path));}}><span className="wmn-grow">{label}</span><ChevronRight className="wmn-chevron"/></button>)}</div></SheetContent></Sheet>
 </div></div></main>;
}
