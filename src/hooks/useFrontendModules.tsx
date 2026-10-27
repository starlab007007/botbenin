import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {type ModulePermission} from '../../supabase/functions/_shared/waouh-module-policy';
type State={visibleKeys:Set<string>;permissions:ModulePermission[];loading:boolean;error:boolean;reload:()=>void;canAccess:(key:string)=>boolean};
const Context=createContext<State>({visibleKeys:new Set(),permissions:[],loading:true,error:false,reload:()=>{},canAccess:()=>false});
export function FrontendModulesProvider({children}:{children:ReactNode}){
 const {user}=useAuth(),owner=user?.id??null;
 const [state,setState]=useState<{owner:string|null|undefined;rows:ModulePermission[];loading:boolean;error:boolean}>({owner:undefined,rows:[],loading:true,error:false});
 const [retry,setRetry]=useState(0);const reload=useCallback(()=>setRetry(v=>v+1),[]);
 useEffect(()=>{let active=true,pending=false;setState({owner,rows:[],loading:true,error:false});
  const load=async()=>{if(pending)return;pending=true;try{const {data,error}=await supabase.rpc('waouh_module_policy' as never);if(error||!Array.isArray(data))throw Error();if(active)setState({owner,rows:data as ModulePermission[],loading:false,error:false});}catch{if(active)setState({owner,rows:[],loading:false,error:true});}finally{pending=false;}};
  void load();const timer=window.setInterval(()=>void load(),30000),focus=()=>void load();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  const channel=supabase.channel('module-policy-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'waouh_module_revision'},load).subscribe();
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);void supabase.removeChannel(channel);};
 },[owner,retry]);
 const own=state.owner===owner,rows=own?state.rows:[];
 return <Context.Provider value={{visibleKeys:new Set(rows.filter(r=>r.visible&&r.access_enabled).map(r=>r.module_key)),permissions:rows,loading:!own||state.loading,error:own&&state.error,reload,canAccess:key=>rows.some(r=>r.module_key===key&&r.access_enabled)}}>{children}</Context.Provider>;
}
export const useFrontendModules=()=>useContext(Context);
export default useFrontendModules;
