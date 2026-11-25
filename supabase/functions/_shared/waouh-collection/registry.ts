import {engineKey,runPreviewDocumentEngine} from './engines.ts';
import {trustedHttps,type SourcePermission} from './commerce.ts';
import {discoverUrls,extractListing,indexRows} from './adapters.ts';
import {apiSiteReader} from './providers.ts';
import {siteReader,SourceReadError} from './network.ts';
import {sha256Hex} from '../waouh-tel/crypto.ts';
import {rssAtomListings,goAfricaProviders} from './public.ts';
import {productSnapshot} from '../waouh-product-presentation.ts';
type Db={from:(table:string)=>any;rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
const adapters=['none','classifieds','coinafrique','goafrica','schema_org','rss_atom'];
const states=['review','authorized','paused','unverified','partner_only'];
export function registryPatch(body:Record<string,unknown>){
 if(!['direct','apify','serpapi'].includes(String(body.transport))||!states.includes(String(body.access_state))||!adapters.includes(String(body.adapter_key))||
  typeof body.rights_reference!=='string'||body.rights_reference.length>1000||typeof body.attribution!=='string'||body.attribution.length>240||
  typeof body.media_authorized!=='boolean'||!Array.isArray(body.media_hosts)||body.media_hosts.length>20||
  body.media_hosts.some(h=>typeof h!=='string'||!/^[a-z0-9.-]+$/.test(h))||
  !Number.isInteger(body.discovery_minutes)||Number(body.discovery_minutes)<30||Number(body.discovery_minutes)>10080||
  !Number.isInteger(body.recheck_minutes)||Number(body.recheck_minutes)<60||Number(body.recheck_minutes)>43200||
  !Number.isInteger(body.daily_page_limit)||Number(body.daily_page_limit)<1||Number(body.daily_page_limit)>1000)throw Error('invalid_platform_settings');
 if(body.access_state==='authorized'&&(body.rights_reference.trim().length<5||body.attribution.trim().length<5))throw Error('source_rights_reference_required');
 return {transport:body.transport,access_state:body.access_state,adapter_key:body.adapter_key,engine_key:engineKey(body.engine_key),rights_reference:body.rights_reference.trim(),
  attribution:body.attribution.trim(),media_authorized:body.media_authorized,media_hosts:body.media_hosts,discovery_minutes:body.discovery_minutes,
  recheck_minutes:body.recheck_minutes,daily_page_limit:body.daily_page_limit,updated_at:new Date().toISOString()};
}
async function checked(value:PromiseLike<{data:any;error:any}>){const r=await value;if(r.error)throw Error('catalog_database_unavailable');return r.data;}
async function configurationHash(entry:any,platform:any){return sha256Hex(JSON.stringify({url:entry.url,platform}));}
async function event(db:Db,actor:{userId?:string},action:string,details:any){await checked(db.from('waouh_collection_admin_events').insert({actor_id:actor.userId??null,action,details}));}
export async function catalogAdmin(db:Db,body:Record<string,unknown>,actor:{actor:string;userId?:string}){
 if(!['admin','service'].includes(actor.actor))throw Error('catalog_admin_required');
 if(body.action==='collection.catalog.overview'){
  const [platforms,entries,documents,index,targets]=await Promise.all([
   checked(db.from('waouh_collection_platforms').select('*').order('label')),
   checked(db.from('waouh_collection_entries').select('*').order('entry_no')),
   checked(db.from('waouh_collection_pages').select('id,target_id,url,state,last_checked_at,last_error,next_due_at').order('last_checked_at',{ascending:false,nullsFirst:false}).limit(50)),
   db.from('waouh_search_documents').select('*',{head:true,count:'exact'}),
   checked(db.from('waouh_collection_targets').select('id,enabled,label,provider,last_success_at,last_outcome,next_due_at').limit(200)),
  ]);
  if(index.error)throw Error('catalog_database_unavailable');return {ok:true,platforms,entries,documents,targets,indexed_documents:index.count};
 }
 if(body.action==='collection.catalog.search'){
  if(typeof body.query!=='string'||body.query.length>1000)throw Error('invalid_catalog_query');
  const result=await checked(db.rpc('waouh_search_unified',{p_query:body.query,p_mode:'find_sellers',p_limit:20,p_offset:Number.isInteger(body.offset)?body.offset:0}));
  return {ok:true,...result,records:result.records.map((r:any)=>({...productSnapshot(r),fabric_id:r.fabric_id,source_key:r.source_key,source_url:r.source_url,evidence:r.evidence}))};
 }
 if(body.action==='collection.catalog.group'){
  if(typeof body.keep!=='string'||typeof body.alias!=='string'||typeof body.reason!=='string'||body.same_offer!==true)throw Error('invalid_reference_group');
  await checked(db.rpc('waouh_search_group',{p_keep:body.keep,p_alias:body.alias,p_reason:body.reason,p_same_offer:true}));
  await event(db,actor,'catalog.group',{keep:body.keep,alias:body.alias,reason:body.reason});return {ok:true};
 }
 if(body.action==='collection.catalog.ungroup'){
  if(typeof body.alias!=='string'||!/^external:[0-9a-f-]{36}$/i.test(body.alias))throw Error('invalid_reference_group');
  await checked(db.from('waouh_search_aliases').delete().eq('alias_id',body.alias));
  await event(db,actor,'catalog.ungroup',{alias:body.alias});return {ok:true};
 }
 if(body.action==='collection.catalog.configure'){
  if(typeof body.platform_key!=='string')throw Error('invalid_platform');
  const patch=registryPatch(body);
  await checked(db.from('waouh_collection_platforms').update(patch).eq('platform_key',body.platform_key));
  if(patch.access_state==='paused'){
    const entries=await checked(db.from('waouh_collection_entries').select('target_id').eq('platform_key',body.platform_key));
    const ids=entries.map((e:any)=>e.target_id).filter(Boolean);if(ids.length)await checked(db.from('waouh_collection_targets').update({enabled:false}).in('id',ids));
  }
  await event(db,actor,'catalog.configure',{platform_key:body.platform_key,...patch});
  // A changed setup must be retested before connecting another target.
  await checked(db.from('waouh_collection_entries').update({test_status:null,test_config_hash:null}).eq('platform_key',body.platform_key));
  return {ok:true};
 }
 if(!Number.isInteger(body.entry_no))throw Error('invalid_catalog_entry');
 const entry=await checked(db.from('waouh_collection_entries').select('*').eq('entry_no',body.entry_no).single());
 if(!entry||entry.alias_of)throw Error('invalid_catalog_entry');
 const platform=await checked(db.from('waouh_collection_platforms').select('*').eq('platform_key',entry.platform_key).single());
 if(body.action==='collection.catalog.url'){
  const u=trustedHttps(body.url);
  if(!u||u.hostname.replace(/^www\./,'')!==platform.hostname)throw Error('invalid_catalog_url');
  await checked(db.from('waouh_collection_entries').update({url:u.href,test_status:null,test_config_hash:null}).eq('entry_no',entry.entry_no));
  await event(db,actor,'catalog.url',{entry_no:entry.entry_no,url:u.href});return {ok:true};
 }
 if(body.action==='collection.catalog.pause'){
  if(!entry.target_id)throw Error('invalid_catalog_target');
  await checked(db.rpc('waouh_collection_pause_entry',{p_entry:entry.entry_no}));
  await event(db,actor,'catalog.pause',{entry_no:entry.entry_no});return {ok:true};
 }
 if(body.action==='collection.catalog.recheck'){
  if(!entry.target_id)throw Error('invalid_catalog_target');
  await checked(db.from('waouh_collection_pages').update({next_due_at:new Date().toISOString()}).eq('target_id',entry.target_id));
  await checked(db.from('waouh_collection_targets').update({next_due_at:new Date().toISOString()}).eq('id',entry.target_id));
  await event(db,actor,'catalog.recheck',{entry_no:entry.entry_no});return {ok:true};
 }
 const hash=await configurationHash(entry,platform);
 if(body.action==='collection.catalog.connect'){
  const target_id=await checked(db.rpc('waouh_collection_connect_entry',{p_entry:entry.entry_no,p_hash:hash}));
  await event(db,actor,'catalog.connect',{entry_no:entry.entry_no,target_id});return {ok:true,target_id};
 }
 if(body.action!=='collection.catalog.test')throw Error('invalid_catalog_action');
 const root=trustedHttps(entry.url);
 const apiTransport=platform.transport==='apify'||platform.transport==='serpapi';
 if(!root||root.hostname.replace(/^www\./,'')!==platform.hostname||platform.adapter_key==='none'||['paused','unverified'].includes(platform.access_state)||
  (!apiTransport&&(platform.access_state!=='authorized'||platform.rights_reference.trim().length<5)))throw Error('source_not_ready');
 const permission:SourcePermission={collection_transport:platform.transport,automation_authorized:true,attribution:platform.attribution,media_reuse_authorized:platform.media_authorized,
  api_browser:['playwright','crawl4ai'].includes(platform.engine_key),media_hosts:platform.media_hosts,collection_format:platform.adapter_key,category:'',country_scope:'BJ',daily_page_limit:platform.daily_page_limit};
 let records:any[]=[],reason:string|undefined,previewJob:any=null,discoveryOnly=false;
 try{
  let read=siteReader(db,root,permission);
  if(platform.transport==='apify'||platform.transport==='serpapi'){
   previewJob=await checked(db.rpc('waouh_collection_api_preview',{p_entry:entry.entry_no,p_provider:platform.transport}));
   const api=await apiSiteReader(db,previewJob,root,permission);read=api.read;discoveryOnly=api.discovery_only;
  }
  const first=await read(root.href);
  if(first.status!==200)throw new SourceReadError('source_index_unavailable');
  if(platform.adapter_key==='rss_atom'){records=rssAtomListings(first.html,root,permission);if(!records.length)throw new SourceReadError('source_format_changed');}
  else if(platform.adapter_key==='goafrica'){records=goAfricaProviders(first.html,root,permission);}
  else{
  let html=await runPreviewDocumentEngine(db,platform.engine_key,first.html,root.href,actor.userId);
  let urls=discoverUrls(html,root);
  if(!urls.details.length&&urls.indexes.length){
   const next=await read(urls.indexes[0]);
   if(next.status!==200)throw new SourceReadError('source_index_unavailable');
   html=await runPreviewDocumentEngine(db,platform.engine_key,next.html,urls.indexes[0],actor.userId);urls=discoverUrls(html,new URL(urls.indexes[0]));
  }
  records=indexRows(html,root,permission);
  if(discoveryOnly&&urls.details.length)records=urls.details.map(url=>({product_name:'Lien à enrichir',source_url:url,evidence:{discovery_only:true}}));
  if(urls.details.length&&!discoveryOnly){const detail=await read(urls.details[0]);if(detail.status!==200)throw new SourceReadError('listing_detail_unavailable');
   const rendered=await runPreviewDocumentEngine(db,platform.engine_key,detail.html,urls.details[0],actor.userId);
   const row=extractListing(rendered,new URL(urls.details[0]),permission);records=row?[row]:[];}
  if(!records.length)throw new SourceReadError('source_format_changed');
  }
 }catch(error){reason=error instanceof Error&&/^[a-z0-9_]+$/.test(error.message)?error.message:'source_test_failed';}
 const passed=!reason&&records.length>0;
 if(previewJob)await checked(db.from('waouh_collection_jobs').update({status:reason?'failed':'succeeded',finished_at:new Date().toISOString(),report:{status:reason?'failed':'succeeded',reason,published:0}}).eq('id',previewJob.id));
 const report={passed,reason,discovery_only:discoveryOnly,published:0,records:records.length,preview:records.slice(0,3).map(r=>productSnapshot({...r,title:r.product_name}))};
 await checked(db.from('waouh_collection_entries').update({test_status:passed?'passed':'failed',test_at:new Date().toISOString(),test_config_hash:hash,test_report:report}).eq('entry_no',entry.entry_no));
 await event(db,actor,'catalog.test',{entry_no:entry.entry_no,passed,reason});
 return {ok:true,...report};
}
