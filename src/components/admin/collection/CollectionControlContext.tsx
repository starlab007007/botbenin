import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {explainCollectionReason} from '@/lib/admin/collectionControl';
export type ResourceKind='collection'|'catalog'|'engines';
type Resource={data:any;error:string;loading:boolean;updatedAt:string|null};
const actions:Record<ResourceKind,string>={collection:'collection.overview',catalog:'collection.catalog.overview',engines:'collection.engine.overview'};
const empty=():Resource=>({data:null,error:'',loading:true,updatedAt:null});
export async function invokeCollection(body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke('waouh-radar-site-scraper',{body});
 if(error||!data?.ok){
  let code=data?.code;
  if(!code&&error?.context instanceof Response){try{code=(await error.context.clone().json()).code;}catch{/* Generic user message below. */}}
  throw new Error(code?explainCollectionReason(code).title:'Le contrôle des collectes est momentanément indisponible.');
 }
 return data;
}
type ControlContext={resources:Record<ResourceKind,Resource>;refresh:(kind?:ResourceKind)=>Promise<void>;autoRefresh:boolean;setAutoRefresh:(value:boolean)=>void};
export const CollectionControlContext=createContext<ControlContext|null>(null);
export function CollectionControlProvider({children}:{children:React.ReactNode}){
 const [resources,setResources]=useState<Record<ResourceKind,Resource>>(()=>({collection:empty(),catalog:empty(),engines:empty()}));
 const [autoRefresh,setAutoRefresh]=useState(true);
 const mounted=useRef(true),pending=useRef<Partial<Record<ResourceKind,Promise<void>>>>({});
 const refresh=useCallback(async(kind?:ResourceKind)=>{
  const load=(key:ResourceKind)=>{
   if(pending.current[key])return pending.current[key]!;
   setResources(old=>({...old,[key]:{...old[key],loading:true}}));
   const task=(async()=>{
    try{const data=await invokeCollection({action:actions[key]});if(mounted.current)setResources(old=>({...old,[key]:{data,error:'',loading:false,updatedAt:new Date().toISOString()}}));}
    catch(e){if(mounted.current)setResources(old=>({...old,[key]:{...old[key],error:(e as Error).message,loading:false}}));}
    finally{delete pending.current[key];}
   })();pending.current[key]=task;return task;
  };
  await Promise.allSettled((kind?[kind]:Object.keys(actions) as ResourceKind[]).map(load));
 },[]);
 useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false;};},[refresh]);
 useEffect(()=>{if(!autoRefresh)return;const timer=window.setInterval(()=>{if(!document.hidden)void refresh();},60000);return()=>window.clearInterval(timer);},[autoRefresh,refresh]);
 return <CollectionControlContext.Provider value={{resources,refresh,autoRefresh,setAutoRefresh}}>{children}</CollectionControlContext.Provider>;
}
export const useCollectionControl=()=>useContext(CollectionControlContext);
/** Standalone panels keep working; inside the workspace they share the same reads. */
export function useCollectionResource(kind:ResourceKind){
 const context=useCollectionControl();const [local,setLocal]=useState<Resource>(empty);
 const refresh=useCallback(async()=>{
  if(context){await context.refresh(kind);return;}
  setLocal(old=>({...old,loading:true}));
  try{const data=await invokeCollection({action:actions[kind]});setLocal({data,error:'',loading:false,updatedAt:new Date().toISOString()});}
  catch(e){setLocal(old=>({...old,loading:false,error:(e as Error).message}));}
 },[context?.refresh,kind]);
 useEffect(()=>{if(!context)void refresh();},[!!context,refresh]);
 return {...(context?.resources[kind]??local),refresh};
}
