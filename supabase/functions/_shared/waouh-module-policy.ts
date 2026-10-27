import catalog from './waouh-module-catalog.json' with {type:'json'};
export {catalog as moduleCatalog};
export type ModulePermission={module_key:string;visible:boolean;access_enabled:boolean;automation_enabled:boolean};
export function moduleForPath(value:string):string|null{
 let path:string;try{path=new URL(value,'https://waouh.local').pathname.replace(/\/$/,'')||'/';}catch{return null;}
 const candidates=catalog.flatMap(m=>m.paths.map(p=>({key:m.key,path:p}))).sort((a,b)=>b.path.length-a.path.length);
 return candidates.find(m=>path===m.path||(m.path!=='/'&&path.startsWith(m.path+'/')))?.key??null;
}
export function modulesForAction(action:string):string[]{
 if(/^nexus\.mandate\.|^nexus\.autopilot\./.test(action))return ['nexus','missions','avatar'];
 if(/^mission\.|^watch\.|^approval\.|^activity\./.test(action))return ['missions'];
 if(/^nexus\./.test(action))return ['nexus'];
 if(/^seller_policy\.|^offer\./.test(action))return ['ventes'];
 if(/^media\.|^domain\./.test(action))return ['ia'];
 return [];
}
export function policyAllows(rows:ModulePermission[],keys:string[],automatic=false){return keys.every(key=>{const p=rows.find(r=>r.module_key===key);return p?.access_enabled===true&&(!automatic||p.automation_enabled===true);});}
/** Service clients supply only an already authenticated owner, never a user-provided identity. */
export async function modulePolicyAllowed(sb:any,keys:string[],owner:string|null=null,automatic=false){
 if(!keys.length)return true;
 const {data,error}=await sb.rpc('waouh_module_policy',{p_user_id:owner||null});
 return !error&&Array.isArray(data)&&policyAllows(data,keys,automatic);
}
