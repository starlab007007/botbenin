import {trustedHttps,type SourcePermission,type CollectedCommerce} from './commerce.ts';
import {discoverUrls,extractListing,indexRows} from './adapters.ts';
import {siteReader,SourceReadError} from './network.ts';
import {apiSiteReader} from './providers.ts';
import {runDocumentEngine} from './engines.ts';
type Db={from:(table:string)=>any;rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
export async function managedCatalog(db:Db,job:{id:string;lease_token:string;target_id:string;max_items:number;max_pages?:number},url:URL,p:SourcePermission){
 let read=siteReader(db,url,p);const out:CollectedCommerce[]=[];
 let available:string[]|null=null;
 const check=async(value:PromiseLike<{data:any;error:any}>)=>{const r=await value;if(r.error)throw new SourceReadError('document_state_unavailable',true);return r.data;};
 await check(db.from('waouh_collection_pages').upsert({target_id:job.target_id,url:url.href,kind:'index',last_seen_at:new Date().toISOString()},{onConflict:'target_id,url'}));
 // An index or one pagination URL per pass; detail revalidation continues even after an index 304.
 const indexes=await check(db.from('waouh_collection_pages').select('*').eq('target_id',job.target_id).eq('kind','index').neq('state','removed')
  .lte('next_due_at',new Date().toISOString()).order('last_checked_at',{ascending:true,nullsFirst:true}).limit(1));
 if(p.collection_transport==='apify'||p.collection_transport==='serpapi'){
  const known=await check(db.from('waouh_collection_pages').select('url').eq('target_id',job.target_id).eq('kind','detail').neq('state','removed')
   .lte('next_due_at',new Date().toISOString()).order('last_checked_at',{ascending:true,nullsFirst:true}).limit(2));
  const api=await apiSiteReader(db,job,new URL(indexes[0]?.url??url.href),p,known.map((d:any)=>d.url));
  read=api.read;available=api.available;
 }
 for(const doc of indexes){
  const response=await read(doc.url,doc);
  if(response.status===404||response.status===410)throw new SourceReadError('source_index_removed');
  if(response.status===200){
   const html=await runDocumentEngine(db,job,response.html,doc.url),links=discoverUrls(html,new URL(doc.url));
   const cards=indexRows(html,new URL(doc.url),p);
   links.details.push(...cards.map(r=>r.source_url));
   const discovered=[...new Map([...links.details.map(u=>({url:u,kind:'detail'})),...links.indexes.map(u=>({url:u,kind:'index'}))].map(d=>[d.url,d])).values()];
   for(const d of discovered){
    // Ignore duplicates without resetting their check schedule or validators.
    await check(db.from('waouh_collection_pages').upsert({...d,target_id:job.target_id},{onConflict:'target_id,url',ignoreDuplicates:true}));
   }
   if(!discovered.length)throw new SourceReadError('source_format_changed');
  }
  await check(db.from('waouh_collection_pages').update({last_checked_at:new Date().toISOString(),state:'active',etag:response.etag,last_modified:response.last_modified,
   next_due_at:new Date(Date.now()+(p.discovery_minutes??360)*60000).toISOString(),last_error:null}).eq('id',doc.id));
 }
 let details=db.from('waouh_collection_pages').select('*').eq('target_id',job.target_id).eq('kind','detail').neq('state','removed');
 if(available)details=details.in('url',available);
 const docs=await check(details
  .lte('next_due_at',new Date().toISOString()).order('last_checked_at',{ascending:true,nullsFirst:true}).limit(Math.max(1,Math.min(job.max_items,job.max_pages??3,3))));
 for(const doc of docs){
  try{
   const response=await read(doc.url,doc),checked=new Date().toISOString();
   if(response.status===404||response.status===410){
    const removed=response.status===410||doc.missing_count>=1;
    await check(db.from('waouh_collection_pages').update({state:removed?'removed':'missing',missing_count:doc.missing_count+1,last_checked_at:checked,
     next_due_at:new Date(Date.now()+3600000).toISOString(),last_error:'source_http_'+response.status}).eq('id',doc.id));
    if(removed)await check(db.from('waouh_external_commerce_signals').update({status:'expired'}).eq('source_url',doc.url).eq('source_key','waouh_commercial_web'));
    continue;
   }
   if(response.status===304){
    await check(db.rpc('waouh_collection_touch_document',{p_document:doc.id}));continue;
   }
   const html=await runDocumentEngine(db,job,response.html,doc.url),row=extractListing(html,new URL(doc.url),p);
   if(!row){await check(db.from('waouh_collection_pages').update({state:'quarantine',last_error:'listing_not_qualified',last_checked_at:checked,
    next_due_at:new Date(Date.now()+86400000).toISOString()}).eq('id',doc.id));continue;}
   out.push(row);
   // Validators advance only after the corresponding publication succeeds (worker commits below).
   (row as any).__document={id:doc.id,etag:response.etag,last_modified:response.last_modified};
  }catch(error){
   if(error instanceof Error&&error.message==='listing_closed'){
    await check(db.from('waouh_collection_pages').update({state:'removed',last_error:'listing_closed',last_checked_at:new Date().toISOString()}).eq('id',doc.id));
    await check(db.from('waouh_external_commerce_signals').update({status:'expired'}).eq('source_url',doc.url).eq('source_key','waouh_commercial_web'));continue;
   }
   const reason=error instanceof SourceReadError?error.code:'listing_processing_failed';
   await check(db.from('waouh_collection_pages').update({state:'unreachable',last_error:reason,next_due_at:new Date(Date.now()+3600000).toISOString()}).eq('id',doc.id));
   throw error;
  }
 }
 return out;
}
