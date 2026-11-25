import {getRadarApiKey} from '../radar-api-config.ts';
import {trustedHttps} from './commerce.ts';
import {detailUrl} from './adapters.ts';
import {boundedBody,SourceReadError} from './network.ts';
type Db={from:(name:string)=>any;rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
/** Search is discovery only. Prices, contacts and photos require a subsequent publisher-page check. */
export async function discoverWeb(db:Db,job:{id:string;lease_token:string;target_id:string;max_items:number}){
 const {data:target,error}=await db.from('waouh_collection_targets').select('query,enabled,provider').eq('id',job.target_id).single();
 if(error||!target?.enabled||target.provider!=='serpapi'||typeof target.query!=='string'||!target.query.trim())throw new SourceReadError('invalid_web_target');
 const key=await getRadarApiKey(db,'serpapi','SERPAPI_KEY');
 if(!key.ok||!key.key||!key.configId)throw new SourceReadError('provider_credentials_unavailable');
 const reserved=await db.rpc('waouh_collection_reserve',{p_job:job.id,p_token:job.lease_token,p_config:key.configId,p_delta:1});
 if(reserved.error||reserved.data!==true)throw new SourceReadError('provider_quota_exhausted');
 const endpoint=new URL('https://serpapi.com/search.json');
 endpoint.search=new URLSearchParams({engine:'google',q:target.query.slice(0,800)+' Bénin',gl:'bj',hl:'fr',num:'6',api_key:key.key}).toString();
 let response:Response;
 try{response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw new SourceReadError('provider_network_unavailable',true);}
 if(!response.ok){await response.body?.cancel();throw new SourceReadError([401,402,403].includes(response.status)?'provider_access_or_billing_blocked':response.status===429?'provider_rate_limited':'provider_search_failed',response.status>=500);}
 let payload:any;try{payload=JSON.parse(await boundedBody(response));}catch{throw new SourceReadError('provider_output_invalid');}
 if(payload.error)throw new SourceReadError('provider_search_failed');
 const sources=await db.from('waouh_radar_sources').select('id,identifier,config').eq('type','site').eq('active',true);
 if(sources.error)throw new SourceReadError('source_read_failed',true);
 const targets=await db.from('waouh_collection_targets').select('id,radar_source_id,enabled').eq('handler','site').eq('enabled',true);
 if(targets.error)throw new SourceReadError('target_read_failed',true);
 const results=(Array.isArray(payload.organic_results)?payload.organic_results:[]).slice(0,Math.min(6,job.max_items));
 let routed=0;const seen=new Set<string>();
 for(const item of results){
  const url=trustedHttps(item.link);if(!url||!detailUrl(url)||seen.has(url.href))continue;seen.add(url.href);
  const source=sources.data.find((s:any)=>{const root=trustedHttps(s.config?.canonical_url??s.identifier);return root?.origin===url.origin&&s.config?.automation_authorized===true&&s.config?.managed_catalog===true;});
  const destination=source&&targets.data.find((t:any)=>t.radar_source_id===source.id);
  if(!destination)continue;
  const written=await db.from('waouh_collection_pages').upsert({target_id:destination.id,url:url.href,kind:'detail'},{onConflict:'target_id,url',ignoreDuplicates:true});
  if(written.error)throw new SourceReadError('document_state_unavailable',true);
  const due=await db.from('waouh_collection_targets').update({next_due_at:new Date().toISOString()}).eq('id',destination.id);
  if(due.error)throw new SourceReadError('target_write_failed',true);
  routed++;
 }
 return {status:routed?'succeeded' as const:'empty' as const,reason:routed?'discovery_queued_for_verification':'no_routable_discovery',received:results.length,qualified:0,inserted:0,updated:0,discovered:seen.size,routed};
}
