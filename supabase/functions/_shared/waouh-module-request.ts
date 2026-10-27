import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {getRequestUser,isServiceRoleRequest,waouhCorsHeaders} from './waouh-auth.ts';
import {modulePolicyAllowed} from './waouh-module-policy.ts';
export async function moduleRequestGate(req:Request,keys:string[],automatic=false):Promise<Response|null>{
 if(req.method==='OPTIONS')return null;
 try{
  const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!secret)throw Error();
  const sb=createClient(url,secret,{auth:{persistSession:false}}),service=isServiceRoleRequest(req);
  const actor=service?req.headers.get('x-waouh-owner-id')||null:(await getRequestUser(req))?.id??null;
  let allowed=false;
  if(service&&!actor){const {data,error}=await sb.from('waouh_frontend_modules').select('module_key,access_enabled,automation_enabled').in('module_key',keys);allowed=!error&&keys.every(k=>data?.some(r=>r.module_key===k&&r.access_enabled&&(!automatic||r.automation_enabled)));}
  else allowed=await modulePolicyAllowed(sb,keys,actor,automatic);
  if(allowed)return null;
  return new Response(JSON.stringify({ok:false,error:{code:'module_unavailable',message:'Ce module est actuellement indisponible.'}}),{status:403,headers:{...waouhCorsHeaders,'Content-Type':'application/json'}});
 }catch{return new Response(JSON.stringify({ok:false,error:{code:'module_policy_unavailable',message:'Accès momentanément indisponible. Réessayez.'}}),{status:503,headers:{...waouhCorsHeaders,'Content-Type':'application/json'}});}
}
