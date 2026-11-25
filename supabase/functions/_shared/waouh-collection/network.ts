import robotsParserModule from 'npm:robots-parser@3.0.1';
import {trustedHttps,type SourcePermission} from './commerce.ts';
const robotsParser=robotsParserModule as unknown as (url:string,body:string)=>{isAllowed:(url:string,agent:string)=>boolean|undefined};
type Db={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
export class SourceReadError extends Error{constructor(readonly code:string,readonly retryable=false){super(code);}}
export async function boundedBody(response:Response,limit=1200000){
 if(Number(response.headers.get('content-length'))>limit||!response.body){await response.body?.cancel();throw new SourceReadError('source_body_too_large');}
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 try{for(;;){const {done,value}=await reader.read();if(done)return text+decoder.decode();size+=value.byteLength;
  if(size>limit)throw new SourceReadError('source_body_too_large');text+=decoder.decode(value,{stream:true});}}
 finally{await reader.cancel().catch(()=>{});}
}
export function siteReader(db:Db,root:URL,permission:SourcePermission){
 const robots=new Map<string,ReturnType<typeof robotsParser>|null>();
 let requests=0;
 const request=async(url:string,headers:Record<string,string>={})=>{
  if(++requests>8)throw new SourceReadError('source_request_budget_exhausted');
  const host=new URL(url).hostname.replace(/^www\./,'');
  const budget=await db.rpc('waouh_collection_reserve_page',{p_host:host,p_limit:permission.daily_page_limit??100});
  if(budget.error||budget.data!==true)throw new SourceReadError('source_daily_page_limit');
  const global=await db.rpc('waouh_collection_reserve_page',{p_host:'catalog-global',p_limit:300});
  if(global.error||global.data!==true)throw new SourceReadError('collection_daily_page_limit');
  let response:Response;
  try{response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(9000),headers:{'user-agent':'WAOUHBot/1.0 (+https://bot.bj/)',...headers}});}
  catch{throw new SourceReadError('source_network_unavailable',true);}
  return response;
 };
 return async(url:string,validators:{etag?:string|null;last_modified?:string|null}={})=>{
  const parsed=trustedHttps(url);
  if(!parsed||parsed.origin!==root.origin)throw new SourceReadError('source_scope_invalid');
  if(!robots.has(root.origin)){
   const robotsUrl=new URL('/robots.txt',root).href,response=await request(robotsUrl);
   if([404,410].includes(response.status)){await response.body?.cancel();robots.set(root.origin,null);}
   else if(response.ok)robots.set(root.origin,robotsParser(robotsUrl,await boundedBody(response)));
   else{await response.body?.cancel();throw new SourceReadError('source_robots_unavailable',response.status===429||response.status>=500);}
  }
  if(robots.get(root.origin)?.isAllowed(parsed.href,'WAOUHBot')===false)throw new SourceReadError('source_robots_disallowed');
  const xml=permission.collection_format==='rss_atom';
  const headers:Record<string,string>={accept:xml?'application/rss+xml, application/atom+xml, application/xml':'text/html'};
  if(validators.etag)headers['if-none-match']=validators.etag;
  if(validators.last_modified)headers['if-modified-since']=validators.last_modified;
  const response=await request(parsed.href,headers);
  if([304,404,410].includes(response.status)){await response.body?.cancel();return {status:response.status,html:'',etag:validators.etag,last_modified:validators.last_modified};}
  if(!response.ok){await response.body?.cancel();throw new SourceReadError('source_http_'+response.status,response.status===429||response.status>=500);}
  if(xml?!/(xml|rss|atom)/i.test(response.headers.get('content-type')??''):!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();throw new SourceReadError('source_media_invalid');}
  return {status:200,html:await boundedBody(response),etag:response.headers.get('etag'),last_modified:response.headers.get('last-modified')};
 };
}
