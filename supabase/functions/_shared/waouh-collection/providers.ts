import {getRadarApiKey} from '../radar-api-config.ts';
import {boundedBody,SourceReadError} from './network.ts';
import {trustedHttps,type SourcePermission} from './commerce.ts';
import {detailUrl} from './adapters.ts';
type Db={from:(table:string)=>any;rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
type ApiJob={id:string;lease_token:string;target_id?:string};
async function payload(response:Response,limit=1200000){
 if(!response.ok){await response.body?.cancel();throw new SourceReadError([401,402,403].includes(response.status)?'provider_access_or_billing_blocked':'provider_execution_unconfirmed');}
 try{return JSON.parse(await boundedBody(response,limit));}catch(error){if(error instanceof SourceReadError)throw error;throw new SourceReadError('provider_output_invalid');}
}
export function apiActorInput(root:URL,known:string[],browser=false){
 const allowed=known.map(url=>trustedHttps(url)).filter((u):u is URL=>!!u&&u.origin===root.origin).slice(0,2);
 return {startUrls:[{url:root.href},...allowed.map(u=>({url:u.href}))],linkSelector:'a[href]',
  globs:[{glob:root.origin+'/**/annonce/**'},{glob:root.origin+'/**/annonces/**'},{glob:root.origin+'/annonce/**'},{glob:root.origin+'/annonces/**'}],
  respectRobotsTxtFile:true,maxPagesPerCrawl:3,maxResultsPerCrawl:3,maxConcurrency:1,maxRequestRetries:0,
  pageLoadTimeoutSecs:12,pageFunctionTimeoutSecs:3,proxyConfiguration:{useApifyProxy:false},
  pageFunction:browser?`async function(context){const u=new URL(context.page.url());if(u.origin!==${JSON.stringify(root.origin)})throw new Error('source_scope_invalid');const html=await context.page.content();if(Buffer.byteLength(html,'utf8')>1200000)throw new Error('source_body_too_large');return {url:u.href,html,status:context.response?context.response.status():200};}`:`async function(context){const u=new URL(context.request.loadedUrl||context.request.url);if(u.origin!==${JSON.stringify(root.origin)})throw new Error('source_scope_invalid');const html=context.$.html();if(Buffer.byteLength(html,'utf8')>1200000)throw new Error('source_body_too_large');return {url:u.href,html,status:context.response.statusCode};}`};
}
/** Only server-owned provider credentials; one reservation and a bounded API run per job. */
export async function apiSiteReader(db:Db,job:ApiJob,root:URL,p:SourcePermission,known:string[]=[]){
 const provider=p.collection_transport==='serpapi'?'serpapi':'apify';
 const key=await getRadarApiKey(db,provider,provider==='apify'?'APIFY_TOKEN':'SERPAPI_KEY');
 if(!key.ok||!key.key||!key.configId)throw new SourceReadError('provider_credentials_unavailable');
 const pages=provider==='apify'?3:1;
 const budget=await db.from('waouh_collection_policies').select('paused,estimated_daily_cost_limit,estimated_call_cost,cost_currency').eq('provider',provider).single();
 if(budget.error||budget.data?.paused)throw new SourceReadError('provider_paused');
 const cap=Number(budget.data?.estimated_call_cost);
 if(provider==='apify'){
  if(budget.data?.estimated_daily_cost_limit==null||budget.data.cost_currency!=='USD'||!Number.isFinite(cap)||cap<=0)throw new SourceReadError('provider_budget_not_configured');
  const headers={Authorization:'Bearer '+key.key};
  const account=await payload(await fetch('https://api.apify.com/v2/users/me',{headers,redirect:'error',signal:AbortSignal.timeout(9000)}));
  const limits=await payload(await fetch('https://api.apify.com/v2/users/me/limits',{headers,redirect:'error',signal:AbortSignal.timeout(9000)}));
  const included=Number(account.data?.plan?.monthlyUsageCreditsUsd),used=Number(limits.data?.current?.monthlyUsageUsd);
  if(!Number.isFinite(included)||!Number.isFinite(used)||included-used<cap)throw new SourceReadError('provider_included_credits_exhausted');
 }
 const reserved=await db.rpc('waouh_collection_reserve_api_site',{p_job:job.id,p_token:job.lease_token,p_config:key.configId,p_pages:pages});
 if(reserved.error||reserved.data!==true)throw new SourceReadError('provider_quota_exhausted');
 for(let i=0;i<pages;i++){
  const usage=await db.rpc('waouh_collection_reserve_page',{p_host:root.hostname.replace(/^www\./,''),p_limit:p.daily_page_limit??100});
  if(usage.error||usage.data!==true)throw new SourceReadError('source_daily_page_limit');
  const global=await db.rpc('waouh_collection_reserve_page',{p_host:'catalog-global',p_limit:300});
  if(global.error||global.data!==true)throw new SourceReadError('collection_daily_page_limit');
 }
 const documents=new Map<string,{status:number;html:string;etag:null;last_modified:null}>();
 if(provider==='serpapi'){
  const endpoint=new URL('https://serpapi.com/search.json');
  endpoint.search=new URLSearchParams({engine:'google',q:'site:'+root.hostname+root.pathname+' Bénin',gl:'bj',hl:'fr',num:'10',api_key:key.key}).toString();
  const result=await payload(await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(12000)}));
  if(result.error)throw new SourceReadError('provider_search_failed');
  const links=(Array.isArray(result.organic_results)?result.organic_results:[]).map((r:any)=>trustedHttps(r.link)).filter((u:any)=>u?.origin===root.origin&&detailUrl(u)) as URL[];
  // Search snippets and thumbnails are discovery evidence, never a fabricated complete listing.
  const html='<html><body>'+links.map(u=>'<a href="'+u.href.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">Annonce</a>').join('')+'</body></html>';
  documents.set(root.href,{status:200,html,etag:null,last_modified:null});
 }else{
  const browser=(p as any).api_browser===true;
  const endpoint=new URL('https://api.apify.com/v2/acts/apify~'+(browser?'playwright-scraper':'cheerio-scraper')+'/run-sync-get-dataset-items');
  endpoint.search=new URLSearchParams({timeout:'45',memory:browser?'512':'256',limit:'3',maxTotalChargeUsd:String(cap),restartOnError:'false'}).toString();
  let response:Response;
  try{response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key.key,'Content-Type':'application/json'},
   body:JSON.stringify(apiActorInput(root,known,browser)),signal:AbortSignal.timeout(55000)});}
  catch{throw new SourceReadError('provider_execution_unconfirmed');}
  const result=await payload(response,4500000);
  if(!Array.isArray(result)||result.length>3)throw new SourceReadError('provider_output_invalid');
  for(const item of result){
   const u=trustedHttps(item.url);
   if(!u||u.origin!==root.origin||typeof item.html!=='string'||new TextEncoder().encode(item.html).length>1200000||
    (u.href!==root.href&&!detailUrl(u)))throw new SourceReadError('provider_scope_invalid');
   const status=Number(item.status);
   if(![200,404,410].includes(status))throw new SourceReadError('provider_source_unavailable');
   documents.set(u.href,{status,html:item.html,etag:null,last_modified:null});
  }
 }
 const read=async(url:string,_validators?:unknown)=>{
  const doc=documents.get(url);if(!doc)throw new SourceReadError('provider_document_not_returned');return doc;
 };
 return {read,available:[...documents.keys()],discovery_only:provider==='serpapi'};
}
