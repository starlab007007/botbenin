import {assessQuality} from '../waouh-unified-quality.ts';
import {trustedHttps} from './commerce.ts';

type Db={from:(table:string)=>any};
const providers=new Set(['public_feed','apify','serpapi','firecrawl','google_places']);

export function publicSourceConfiguration(body:Record<string,unknown>,current:Record<string,any>,extraHosts:string[]=[]){
  const url=trustedHttps(body.url),prior=trustedHttps(current.identifier);
  const hosts=['bot.bj','www.bot.bj','bj.coinafrique.com','www.coinafrique.com','www.goafricaonline.com','bourses.enseignementsuperieur.gouv.bj','t.me',...extraHosts];
  const formats=['rss_atom','schema_org','catalog_json','directory','coinafrique','goafrica','telegram_public'];
  if(!url||!prior||url.origin!==prior.origin||!hosts.includes(url.hostname)||!formats.includes(String(body.format))||
    body.authorized!==true||typeof body.attribution!=='string'||body.attribution.trim().length<5)throw new Error('invalid_collection_source');
  if((body.format==='coinafrique'&&!['bj.coinafrique.com','www.coinafrique.com'].includes(url.hostname))||
    (body.format==='goafrica'&&url.hostname!=='www.goafricaonline.com')||
    (body.format==='telegram_public'&&(url.hostname!=='t.me'||!/^\/s\/[a-zA-Z0-9_]+\/?$/.test(url.pathname))))throw new Error('invalid_collection_source');
  return {...current.config,collection_transport:'direct',collection_format:body.format,canonical_url:url.href,
    automation_authorized:true,attribution:body.attribution.trim().slice(0,240),
    category:typeof body.category==='string'?body.category.trim().slice(0,120):'',country_scope:'BJ',collection_status:'pending',last_error:null};
}

/** Strict mutation whitelist: credentials, reservations and leases are never client writable. */
export function collectionControlPatch(body:Record<string,unknown>) {
  if(body.action==='collection.policy') {
    if(!providers.has(String(body.provider))||typeof body.paused!=='boolean')throw new Error('invalid_collection_policy');
    return {table:'waouh_collection_policies',key:'provider',value:String(body.provider),patch:{paused:body.paused}};
  }
  if(body.action==='collection.cadence') {
    if(typeof body.target_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.target_id)||
      !Number.isInteger(body.minutes)||Number(body.minutes)<30||Number(body.minutes)>10080)throw new Error('invalid_collection_cadence');
    return {table:'waouh_collection_targets',key:'id',value:body.target_id,patch:{interval_minutes:Number(body.minutes),adaptive:false}};
  }
  throw new Error('unknown_collection_control');
}

export async function collectionOverview(db:Db) {
  const cutoff=new Date(Date.now()-7*86400000).toISOString(),now=new Date().toISOString(),day=now.slice(0,10);
  const count=(table:string)=>db.from(table).select('*',{head:true,count:'exact'});
  const queries=[
    count('waouh_signal_fabric'),count('waouh_signal_fabric').gte('observed_at',cutoff),
    count('waouh_signal_fabric').lt('observed_at',cutoff),count('waouh_signal_fabric').is('observed_at',null),
    count('waouh_external_commerce_signals').or(`status.eq.expired,expires_at.lte.${now}`),
    count('waouh_external_commerce_signals').gte('created_at',cutoff),
    db.from('waouh_collection_policies').select('provider,paused,cooldown_until,last_block_reason,daily_page_limit,daily_item_limit,estimated_daily_cost_limit,cost_currency'),
    db.from('waouh_collection_targets').select('id,label,provider,enabled,adaptive,interval_minutes,next_due_at,last_success_at,last_outcome,error_streak,empty_streak').order('label').limit(200),
    db.from('waouh_collection_jobs').select('id,provider,status,created_at,finished_at,report').order('created_at',{ascending:false}).limit(30),
    db.from('waouh_signal_fabric').select('fabric_id,price_min,price_max,contactability_level,evidence,actor_type,intent').order('observed_at',{ascending:false,nullsFirst:false}).limit(500),
    db.from('waouh_collection_usage').select('provider,lane,units,reserved_pages,reserved_items,estimated_cost').eq('day',day),
    db.from('waouh_radar_api_configs').select('provider,active,daily_quota,usage_today,usage_reset_at'),
  ];
  const results=await Promise.all(queries);
  const failures=results.flatMap((r,i)=>r.error?[{query:i,code:String(r.error.code??'unknown')}]:[]);
  if(failures.length){console.error('[collection-overview] failed queries',JSON.stringify(failures));throw new Error('collection_overview_unavailable');}
  const [total,recent,old,undated,expired,added,policies,targets,jobs,sample,usage,configs]=results;
  const quality={sample_size:sample.data.length,complete:0,missing_photo:0,missing_price:0,missing_contact:0};
  for(const row of sample.data){const q=assessQuality(row);if(q.present===3)quality.complete++;
    if(!q.has_photo)quality.missing_photo++;if(!q.has_price)quality.missing_price++;if(!q.has_contact)quality.missing_contact++;}
  return {ok:true,checked_at:now,counts:{usable:total.count,recent:recent.count,old:old.count,undated:undated.count,expired:expired.count,added:added.count},
    quality,policies:policies.data,targets:targets.data,jobs:jobs.data,usage:usage.data,provider_configs:configs.data};
}
