import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {type ModulePermission} from '../../supabase/functions/_shared/waouh-module-policy';

type State={visibleKeys:Set<string>;permissions:ModulePermission[];loading:boolean;error:boolean;reload:()=>void;canAccess:(key:string)=>boolean};
type Snapshot={owner:string|null|undefined;rows:ModulePermission[];loading:boolean;error:boolean};
const Context=createContext<State>({visibleKeys:new Set(),permissions:[],loading:true,error:false,reload:()=>{},canAccess:()=>false});
const MIN_REFRESH_MS=30000;
const MAX_RETRY_MS=120000;
export function FrontendModulesProvider({children}:{children:ReactNode}){
 const {user}=useAuth(),owner=user?.id??null;
 const [state,setState]=useState<Snapshot>({owner:undefined,rows:[],loading:true,error:false});
 const [retry,setRetry]=useState(0);
 const reload=useCallback(()=>setRetry(v=>v+1),[]);
 useEffect(()=>{
  let active=true,pending=false,failures=0,timer:number|undefined;
  setState({owner,rows:[],loading:true,error:false});
  const schedule=(ms:number)=>{
   window.clearTimeout(timer);
   if(active)timer=window.setTimeout(()=>void load(),ms);
  };
  const load=async()=>{
   if(!active||pending||document.visibilityState==='hidden')return;
   pending=true;
   try{
    const {data,error}=await supabase.rpc('waouh_module_policy' as never);
    if(error||!Array.isArray(data))throw Error('module_policy_unavailable');
    failures=0;
    if(active)setState({owner,rows:data as ModulePermission[],loading:false,error:false});
    schedule(MIN_REFRESH_MS);
   }catch{
    failures=Math.min(failures+1,6);
    // Fail closed: never reuse stale permissions after an RPC failure.
    if(active)setState({owner,rows:[],loading:false,error:true});
    const backoff=Math.min(MAX_RETRY_MS,Math.round(3000*2**(failures-1)));
    schedule(backoff+Math.round(Math.random()*1000));
   }finally{pending=false;}
  };
  const onFocus=()=>{if(document.visibilityState==='visible'&&!pending){window.clearTimeout(timer);schedule(500);}};
  void load();
  window.addEventListener('focus',onFocus);
  document.addEventListener('visibilitychange',onFocus);
  // A single refresh loop prevents bursts of polling when PostgREST is degraded.
  return()=>{active=false;window.clearTimeout(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};
 },[owner,retry]);
 const own=state.owner===owner,rows=own?state.rows:[];
 return <Context.Provider value={{visibleKeys:new Set(rows.filter(r=>r.visible&&r.access_enabled).map(r=>r.module_key)),permissions:rows,loading:!own||state.loading,error:own&&state.error,reload,canAccess:key=>rows.some(r=>r.module_key===key&&r.access_enabled)}}>{children}</Context.Provider>;
}
export const useFrontendModules=()=>useContext(Context);
export default useFrontendModules;
