import {load} from 'npm:cheerio@1.2.0/slim';
import {structuredPublicListings} from './public.ts';

export const engineKeys=['cheerio','crawlee','playwright','scrapy','beautifulsoup','crawl4ai'] as const;
export type EngineKey=typeof engineKeys[number];
type Db={from:(table:string)=>any;rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
export class DocumentEngineError extends Error {
 constructor(readonly code:string,readonly retryable=false){super(code);}
}
export function engineKey(value:unknown):EngineKey{
 if(!engineKeys.includes(value as EngineKey))throw new DocumentEngineError('invalid_engine');
 return value as EngineKey;
}
export function enginePatch(body:Record<string,unknown>){
 const key=engineKey(body.engine_key);
 if(typeof body.enabled!=='boolean'||!Number.isInteger(body.timeout_seconds)||Number(body.timeout_seconds)<5||Number(body.timeout_seconds)>30||
 !Number.isInteger(body.max_document_kb)||Number(body.max_document_kb)<64||Number(body.max_document_kb)>1200)throw new DocumentEngineError('invalid_engine_settings');
 return {key,patch:{enabled:body.enabled,timeout_seconds:body.timeout_seconds,max_document_kb:body.max_document_kb,updated_at:new Date().toISOString()}};
}
const demoUrl='https://bot.bj/waouh-engine-demo/';
export const engineDemoHtml='<!doctype html><html><head><title>Test moteur WAOUH</title><script type="application/ld+json">'+JSON.stringify({
 '@type':'Product',name:'Téléphone de démonstration WAOUH',url:'/waouh-engine-demo/telephone',model:'DEMO',offers:{price:50000,priceCurrency:'XOF'},
})+'</script></head><body><h1>Page de démonstration locale</h1><p>Aucune annonce réelle, aucun contact et aucune publication.</p></body></html>';
async function runtime(db:Db,path:'health'|'execute',body:Record<string,unknown>,timeout:number){
 const token=await db.rpc('waouh_collection_engine_token',{});
 if(token.error||typeof token.data!=='string'||token.data.length<32)throw new DocumentEngineError('engine_runtime_unconfigured');
 let response:Response;
 try{response=await fetch('https://bot.bj/api/waouh-collection-runtime/'+path,{method:'POST',redirect:'error',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.data},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});}
 catch{throw new DocumentEngineError('engine_runtime_unavailable',true);}
 if(Number(response.headers.get('content-length'))>2_100_000){await response.body?.cancel();throw new DocumentEngineError('engine_output_invalid');}
 const text=await response.text();
 if(text.length>2_000_000)throw new DocumentEngineError('engine_output_invalid');
 let result:any;try{result=JSON.parse(text);}catch{throw new DocumentEngineError('engine_runtime_unavailable',true);}
 if(!response.ok||result?.ok!==true){
  const code=['engine_timeout','engine_busy','engine_execution_failed'].includes(result?.code)?result.code:'engine_runtime_unavailable';
  throw new DocumentEngineError(code,['engine_timeout','engine_busy','engine_runtime_unavailable'].includes(code));
 }
 return result;
}
async function configuration(db:Db,key:EngineKey){
 const {data,error}=await db.from('waouh_collection_engines').select('*').eq('engine_key',key).single();
 if(error||!data)throw new DocumentEngineError('engine_settings_unavailable',true);
 if(!data.enabled)throw new DocumentEngineError('engine_paused');
 return data;
}
async function document(db:Db,key:EngineKey,html:string,url:string,demo=false){
 const config=await configuration(db,key);
 if(new TextEncoder().encode(html).length>config.max_document_kb*1000)throw new DocumentEngineError('engine_document_too_large');
 if(key==='cheerio'&&!demo)return load(html).html();
 const result=await runtime(db,'execute',{engine:key,html,url,timeout_seconds:config.timeout_seconds},(config.timeout_seconds+5)*1000);
 if(result.engine!==key||typeof result.html!=='string'||new TextEncoder().encode(result.html).length>1_500_000)throw new DocumentEngineError('engine_output_invalid');
 return result.html as string;
}
async function audited(db:Db,key:EngineKey,task:()=>Promise<string>,context:Record<string,unknown>){
 const start=Date.now();let code:string|null=null,output='';
 try{output=await task();}catch(error){code=error instanceof DocumentEngineError?error.code:'engine_execution_failed';
  const {error:logError}=await db.from('waouh_collection_engine_runs').insert({engine_key:key,...context,status:'failed',error_code:code,duration_ms:Math.min(120000,Date.now()-start)});
  if(logError)throw new DocumentEngineError('engine_audit_unavailable');throw error;
 }
 const {error}=await db.from('waouh_collection_engine_runs').insert({engine_key:key,...context,status:'passed',duration_ms:Math.min(120000,Date.now()-start)});
 if(error)throw new DocumentEngineError('engine_audit_unavailable');
 return output;
}
export async function runDocumentEngine(db:Db,job:{id:string;target_id:string},html:string,url:string){
 const {data,error}=await db.from('waouh_collection_targets').select('engine_key').eq('id',job.target_id).single();
 if(error)throw new DocumentEngineError('engine_target_unavailable',true);
 const key=engineKey(data?.engine_key);
 return audited(db,key,()=>document(db,key,html,url),{job_id:job.id,target_id:job.target_id,purpose:'collection'});
}
export async function runPreviewDocumentEngine(db:Db,key:EngineKey,html:string,url:string,actorId?:string){
 return audited(db,key,()=>document(db,key,html,url),{purpose:'demo',actor_id:actorId??null});
}
export async function engineAdmin(db:Db,body:Record<string,unknown>,actor:{actor:string;userId?:string}){
 if(!['admin','service'].includes(actor.actor))throw new DocumentEngineError('engine_admin_required');
 const action=body.action;
 if(action==='collection.engine.overview'){
  const results=await Promise.all([
   db.from('waouh_collection_engines').select('*').order('engine_key'),
   db.from('waouh_collection_targets').select('id,label,engine_key,handler,provider,enabled,radar_source_id').eq('handler','site').eq('provider','public_feed').order('label'),
   db.from('waouh_collection_engine_runs').select('id,engine_key,target_id,purpose,status,duration_ms,error_code,created_at').order('created_at',{ascending:false}).limit(50),
   db.from('waouh_radar_sources').select('id,config').eq('type','site').limit(200),
  ]);
  if(results.some(r=>r.error))throw new DocumentEngineError('engine_overview_unavailable');
  const sources=new Map<string,any>(results[3].data.map((s:any)=>[s.id,s]));
  return {ok:true,engines:results[0].data,targets:results[1].data.map((t:any)=>({id:t.id,label:t.label,engine_key:t.engine_key,enabled:t.enabled,
    applicable:sources.has(t.radar_source_id)&&!['rss_atom','catalog_json','directory'].includes(sources.get(t.radar_source_id)?.config?.collection_format)})),runs:results[2].data};
 }
 if(action==='collection.engine.configure'){
  const {key,patch}=enginePatch(body);
  const {data,error}=await db.from('waouh_collection_engines').update(patch).eq('engine_key',key).select('engine_key');
  if(error)throw new DocumentEngineError('engine_settings_unavailable');
  await adminAudit(db,actor,'engine.configure',{engine_key:key,...patch});return {ok:true,updated:data?.length??0};
 }
 if(action==='collection.engine.assign'){
  const key=engineKey(body.engine_key);
  if(typeof body.target_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.target_id))throw new DocumentEngineError('invalid_engine_target');
  const ready=await configuration(db,key);
  if(key!=='cheerio'&&(ready.last_check_status!=='available'||ready.last_test_status!=='passed'))throw new DocumentEngineError('engine_not_ready');
  const {data:target,error:readError}=await db.from('waouh_collection_targets').select('id,radar_source_id').eq('id',body.target_id).eq('handler','site').eq('provider','public_feed').single();
  if(readError||!target?.radar_source_id)throw new DocumentEngineError('invalid_engine_target');
  const {data:source,error:sourceError}=await db.from('waouh_radar_sources').select('config').eq('id',target.radar_source_id).eq('type','site').single();
  if(sourceError||!source||['rss_atom','catalog_json','directory'].includes(source.config?.collection_format))throw new DocumentEngineError('invalid_engine_target');
  const {data,error}=await db.from('waouh_collection_targets').update({engine_key:key}).eq('id',body.target_id).select('id');
  if(error)throw new DocumentEngineError('engine_assignment_unavailable');
  await adminAudit(db,actor,'engine.assign',{target_id:body.target_id,engine_key:key});return {ok:true,updated:data?.length??0};
 }
 if(action==='collection.engine.check'){
  let health:any=null;try{health=await runtime(db,'health',{},15000);}catch{/* Persist an honest unavailable status. */}
  const checked_at=new Date().toISOString();
  for(const key of engineKeys){
   const version=health?.versions?.[key];
   const {error}=await db.from('waouh_collection_engines').update({installed_version:typeof version==='string'?version:null,checked_at,last_check_status:typeof version==='string'?'available':'unavailable'}).eq('engine_key',key);
   if(error)throw new DocumentEngineError('engine_settings_unavailable');
  }
  return {ok:true,available:health?.ok===true};
 }
 if(action==='collection.engine.test'){
  const key=engineKey(body.engine_key);let passed=false,reason:string|undefined;
  try{
   await audited(db,key,async()=>{
    const output=await document(db,key,engineDemoHtml,demoUrl,true);
    const rows=structuredPublicListings(output,new URL(demoUrl),{attribution:'Démonstration interne WAOUH'});
    if(rows.length!==1||rows[0].price_min!==50000||rows[0].model!=='DEMO')throw new DocumentEngineError('engine_demo_validation_failed');
    return output;
   },{purpose:'demo',actor_id:actor.userId??null});passed=true;
  }catch(error){reason=error instanceof DocumentEngineError?error.code:'engine_execution_failed';}
  const {error}=await db.from('waouh_collection_engines').update({last_test_status:passed?'passed':'failed',last_test_at:new Date().toISOString()}).eq('engine_key',key);
  if(error)throw new DocumentEngineError('engine_settings_unavailable');
  return {ok:true,passed,reason,records:passed?1:0,published:0};
 }
 throw new DocumentEngineError('invalid_engine_action');
}
async function adminAudit(db:Db,actor:{userId?:string},action:string,details:Record<string,unknown>){
 const {error}=await db.from('waouh_collection_admin_events').insert({actor_id:actor.userId??null,action,details});
 if(error)throw new DocumentEngineError('engine_audit_unavailable');
}
