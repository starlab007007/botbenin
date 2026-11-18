import {assessQuality} from '../waouh-unified-quality.ts';

type Db={from:(table:string)=>any};
const providers=new Set(['public_feed','apify','serpapi','firecrawl','google_places']);

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
  const cutoff=new Date(Date.now()-7*86400000).toISOString(),now=new Date().toISOString();
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
  ];
  const results=await Promise.all(queries);
  if(results.some(r=>r.error))throw new Error('collection_overview_unavailable');
  const [total,recent,old,undated,expired,added,policies,targets,jobs,sample]=results;
  const quality={sample_size:sample.data.length,complete:0,missing_photo:0,missing_price:0,missing_contact:0};
  for(const row of sample.data){const q=assessQuality(row);if(q.present===3)quality.complete++;
    if(!q.has_photo)quality.missing_photo++;if(!q.has_price)quality.missing_price++;if(!q.has_contact)quality.missing_contact++;}
  return {ok:true,checked_at:now,counts:{usable:total.count,recent:recent.count,old:old.count,undated:undated.count,expired:expired.count,added:added.count},
    quality,policies:policies.data,targets:targets.data,jobs:jobs.data};
}
