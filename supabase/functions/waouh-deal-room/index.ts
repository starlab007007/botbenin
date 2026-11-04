import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {getRequestUser,jsonResponse,waouhCorsHeaders} from '../_shared/waouh-auth.ts';
import {productSnapshot} from '../_shared/waouh-product-presentation.ts';
import {resultKind} from '../_shared/waouh-convergence-contract.ts';
import {resolveProductThread} from '../_shared/waouh-thread.ts';
const actions=new Set(['open','adopt','list','get','events','contact','message','delegate','takeover','pause','resume_bot','approve_step','propose','accept','reject','invite','receipt','payment_report','payment_receive','complete','issue','rating']);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:waouhCorsHeaders});
 if(req.method!=='POST')return jsonResponse({ok:false,error:'method_not_allowed'},405);
 const user=await getRequestUser(req);if(!user)return jsonResponse({ok:false,error:'authentication_required'},401);
 try {
 const raw=await req.text();if(raw.length>32000)return jsonResponse({ok:false,error:'payload_too_large'},413);
 const input=JSON.parse(raw),action=String(input.action||'').replace(/^room\./,''),p={...(input.payload||{})};
 if(!actions.has(action))return jsonResponse({ok:false,error:'unknown_action'},400);
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 if(action==='open'){
  const fabric=String(p.fabric_id||p.source?.source_ref||'');
  const {data:signal,error}=await sb.from('waouh_signal_fabric').select('*').eq('fabric_id',fabric).maybeSingle();
  if(error||!signal)return jsonResponse({ok:false,error:'offer_not_found'},404);
  let record=signal;
  if(fabric.startsWith('article:')){const {data:article}=await sb.from('waouh_articles').select('*').eq('id',fabric.slice(8)).eq('status','active').maybeSingle();if(!article)return jsonResponse({ok:false,error:'article_unavailable'},409);record={...signal,...article};}
  const product=productSnapshot(record);if(!product||product.currency!=='XOF')return jsonResponse({ok:false,error:'quote_in_xof_required'},422);
  p.source={title:product.title,kind:resultKind(signal),source_ref:fabric,source_url:signal.source_url,amount:product.price_min,extra_cost:null,source_snapshot:{product}};
  p.city=signal.city||p.city||'À préciser';
 }
 const {data,error}=await sb.rpc('waouh_room_command',{p_actor:user.id,p_action:action,p});
 if(error)return jsonResponse({ok:false,error:error.code==='42501'?'forbidden':error.message},error.code==='42501'?403:409);
 // Link the existing canonical thread without creating an offer or sending another opener.
 if(data?.deal_room_id&&!data.thread_id&&data.provider_joined&&['open','contact','delegate','adopt'].includes(action)){
  const {data:component}=await sb.from('waouh_convergence_components').select('source_ref,provider_id').eq('id',data.deal_room_id).single();
  if(component?.source_ref?.startsWith('article:')&&data.is_owner){
   const {data:actor}=await sb.from('waouh_users').select('*').eq('auth_user_id',user.id).order('created_at').limit(1).maybeSingle();
   if(actor){const thread=await resolveProductThread({sb,articleId:component.source_ref.slice(8),actorUser:actor,role:'buyer',source:'unified_room'});
    if(thread){
     // Historical accepted deals must not be silently converted into a second agreement.
     if(thread.deal_id||thread.negotiation_id)return jsonResponse({ok:false,error:'legacy_room_requires_reconciliation',thread_id:thread.id,deal_room_id:data.deal_room_id},409);
     const saved=await sb.from('waouh_deal_room_links').update({thread_id:thread.id}).eq('id',data.deal_room_id).eq('owner_id',user.id);
     if(saved.error)throw saved.error;data.thread_id=thread.id;
    }
   }
  }
 }
 if(data?.deal_room_id&&['delegate','resume_bot','approve_step','propose','contact'].includes(action)){
 const tick=await sb.rpc('waouh_room_tick',{p_limit:1,p_room_id:data.deal_room_id});
 if(tick.error)console.warn('[deal-room] scheduled retry',tick.error.code);
 const fresh=await sb.rpc('waouh_room_snapshot',{p_actor:user.id,p_room:data.deal_room_id});
 if(!fresh.error)return jsonResponse({ok:true,data:fresh.data});
 }
 return jsonResponse({ok:true,data});
 }catch(error){console.error('[deal-room]',error instanceof Error?error.message:'request_failed');return jsonResponse({ok:false,error:'request_failed'},400);}
});
