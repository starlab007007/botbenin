import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {notifyInApp} from '../_shared/waouh-avatar-inapp.ts';
import {getRequestUser,jsonResponse,waouhCorsHeaders} from '../_shared/waouh-auth.ts';
import {productSnapshot} from '../_shared/waouh-product-presentation.ts';
import {resultKind} from '../_shared/waouh-convergence-contract.ts';
import {modulePolicyAllowed} from '../_shared/waouh-module-policy.ts';
import {resolveProductThread} from '../_shared/waouh-thread.ts';
import {assignRoomDeliveries,deliveryCode,handleCourierRequest} from '../_shared/waouh-room-delivery.ts';
import {createShareLink,handleRoomGuestRequest,reachRoomOwner,relayRoomGuests} from '../_shared/waouh-room-guest.ts';
const actions=new Set(['open','adopt','list','get','events','contact','message','delegate','takeover','pause','resume_bot','approve_step','propose','accept','reject','invite','revoke_invite','receipt','payment_report','payment_receive','complete','issue','rating','application_prepare','application_submit','application_outcome','share_link','delivery']);
async function digest(value:unknown):Promise<string>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));
 const hash=await crypto.subtle.digest('SHA-1',bytes);
 return Array.from(new Uint8Array(hash).slice(0,8),n=>n.toString(16).padStart(2,'0')).join('');
}
async function includeOutreachState(sb: any, data: any) {
 const contact = data?.external_contact;
 if (!data?.is_owner || !contact) return;
 const { data: row } = await sb.from("waouh_outbound_queue")
  .select("status,payload").eq("template", "deal_room_guest_outreach")
  .eq("dedupe_key", `dr-first:${data.deal_room_id}`)
  .order("created_at", { ascending: false }).limit(1).maybeSingle();
 const receipt = row?.payload?.room_delivery_status;
 contact.delivery_status = contact.status === "stopped" ? "stopped"
  : contact.last_reply_at ? "replied"
  : receipt === "delivered" || receipt === "read" ? "delivered"
  : receipt === "failed" || row?.status === "failed" ? "failed"
  : row?.status === "sent" ? "sent"
  : row ? "queued"
  : contact.channel === "link" ? "link_shared" : "waiting";
}

async function deliveryFor(sb:any,userId:string,roomId:string){
 const {data:view,error}=await sb.rpc('waouh_room_delivery_view',{p_actor:userId,p_room:roomId});
 if(error)return {error};
 if(view?.is_buyer&&['assigned','picked_up'].includes(view.status))view.code=await deliveryCode(roomId,Number(view.version));
 return {view};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:waouhCorsHeaders});
 if(req.method!=='POST')return jsonResponse({ok:false,error:'method_not_allowed'},405);
 const raw=await req.text();if(raw.length>32000)return jsonResponse({ok:false,error:'payload_too_large'},413);
 let input:any;try{input=JSON.parse(raw);}catch{return jsonResponse({ok:false,error:'request_failed'},400);}
 // Livreur : accès par lien sans compte, limité à sa livraison.
 if(typeof input?.courier_token==='string'){
  const sbCourier=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  try{const r=await handleCourierRequest(sbCourier,input.courier_token,String(input.action||''),{...(input.payload||{})});return jsonResponse(r.body,r.status);}
  catch(error){console.error('[deal-room] courier',error instanceof Error?error.message:'failed');return jsonResponse({ok:false,error:'request_failed'},400);}
 }
 // Propriétaire sans compte : accès par lien, limité à son propre échange.
 if(typeof input?.guest_token==='string'){
  const sbGuest=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  try{const r=await handleRoomGuestRequest(sbGuest,input.guest_token,String(input.action||''),{...(input.payload||{})});if(input.action==='accept'&&r.status===200)await assignRoomDeliveries(sbGuest).catch(()=>undefined);return jsonResponse(r.body,r.status);}
  catch(error){console.error('[deal-room] guest',error instanceof Error?error.message:'failed');return jsonResponse({ok:false,error:'request_failed'},400);}
 }
 const user=await getRequestUser(req);if(!user)return jsonResponse({ok:false,error:'authentication_required'},401);
 try {
 const action=String(input.action||'').replace(/^room\./,''),p={...(input.payload||{})};
 if(!actions.has(action))return jsonResponse({ok:false,error:'unknown_action'},400);
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const automatic=['delegate','resume_bot','approve_step'].includes(action);
 if(!await modulePolicyAllowed(sb,automatic?['nexus','missions','avatar']:['nexus'],user.id,automatic))return jsonResponse({ok:false,error:'module_unavailable'},403);
 if (action === "open") {
  let fabric = String(p.fabric_id || p.source?.source_ref || "");
  const saleArticleId = typeof p.sale_article_id === "string" ? p.sale_article_id : "";
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if (saleArticleId && !uuid.test(saleArticleId)) return jsonResponse({ ok: false, error: "article_unavailable" }, 422);
  const [family, reference] = fabric.split(":");
  if (uuid.test(reference ?? "") && fabric === `${family}:${reference}`) {
   if (family === "catalog") {
    const { data: catalog } = await sb.from("waouh_unified_catalog")
     .select("source,source_ref_id,promoted_article_id").eq("id", reference).eq("is_active", true).maybeSingle();
    const linkedArticle = catalog?.promoted_article_id || (catalog?.source === "chat" ? catalog.source_ref_id : null);
    if (linkedArticle) {
     const { data: article } = await sb.from("waouh_articles").select("id").eq("id", linkedArticle).maybeSingle();
     if (article) fabric = `article:${article.id}`;
    }
   } else if (family === "legacy_external") {
    const { data: listing } = await sb.from("waouh_external_listings")
     .select("promoted_article_id").eq("id", reference).neq("status", "ignored").maybeSingle();
    if (listing?.promoted_article_id) fabric = `article:${listing.promoted_article_id}`;
   }
  }
  const { data: signal, error } = await sb.from("waouh_signal_fabric").select("*").eq("fabric_id", fabric).maybeSingle();
  if (error || (!signal && !fabric.startsWith("article:"))) return jsonResponse({ ok: false, error: "offer_not_found" }, 404);
  if (signal?.is_active === false || (signal?.expires_at && Date.parse(signal.expires_at) <= Date.now())) {
   return jsonResponse({ ok: false, error: "article_unavailable" }, 409);
  }
  const buyer = ["BUY", "RFQ"].includes(String(signal?.intent));
  if (buyer !== Boolean(saleArticleId) || (buyer && !/^(buyer|external):[0-9a-f-]{36}$/i.test(fabric))) {
   return jsonResponse({ ok: false, error: buyer ? "sale_article_required" : "offer_not_found" }, 422);
  }
  let record = signal;
  const articleId = saleArticleId || (fabric.startsWith("article:") ? fabric.slice(8) : "");
  if (articleId) {
   if (!uuid.test(articleId)) return jsonResponse({ ok: false, error: "offer_not_found" }, 404);
   const { data: article } = await sb.from("waouh_articles").select("*").eq("id", articleId).eq("status", "active").maybeSingle();
   if (!article || (article.expires_at && Date.parse(article.expires_at) <= Date.now())) {
    return jsonResponse({ ok: false, error: "article_unavailable" }, 409);
   }
   const { data: seller } = await sb.from("waouh_users").select("auth_user_id").eq("id", article.seller_id).maybeSingle();
   if (saleArticleId ? seller?.auth_user_id !== user.id : seller?.auth_user_id === user.id) {
    return jsonResponse({ ok: false, error: saleArticleId ? "forbidden" : "own_offer" }, 403);
   }
   if (saleArticleId && fabric.startsWith("buyer:")) {
    const { data: profile } = await sb.from("waouh_buyer_profiles").select("waouh_users!inner(auth_user_id)")
     .eq("id", fabric.slice(6)).eq("is_active", true).maybeSingle();
    const counterpart = Array.isArray(profile?.waouh_users) ? profile?.waouh_users[0] : profile?.waouh_users;
    if (counterpart?.auth_user_id === user.id) return jsonResponse({ ok: false, error: "own_offer" }, 403);
   }
   record = { ...signal, ...article };
  }
  const product = productSnapshot(record);
  if (!product) return jsonResponse({ ok: false, error: "offer_not_found" }, 404);
  const kind = resultKind(saleArticleId ? record : signal ?? record);
  if (kind !== "announcement" && product.currency !== "XOF") return jsonResponse({ ok: false, error: "quote_in_xof_required" }, 422);
  const sourceRef = saleArticleId ? `sale:${saleArticleId}:${fabric}` : fabric;
  p.source = { title: product.title, kind, source_ref: sourceRef, source_url: signal?.source_url,
   amount: product.price_min, extra_cost: null, source_snapshot: { product } };
  p.city = signal?.city || record?.city || p.city || "À préciser";
 }

 if(action==='delivery'){
  const id=String(p.deal_room_id||'');if(!/^[0-9a-f-]{36}$/.test(id))return jsonResponse({ok:false,error:'invalid_request'},400);
  const {view,error:viewError}=await deliveryFor(sb,user.id,id) as any;
  if(viewError)return jsonResponse({ok:false,error:viewError.code==='42501'?'forbidden':'request_failed'},viewError.code==='42501'?403:400);
  return jsonResponse({ok:true,data:view});
 }
 if(action==='propose'&&p.terms?.delivery_mode==='delivery'&&String(p.terms.delivery_address||'').trim().length<5)return jsonResponse({ok:false,error:'delivery_address_required'},422);
 if(action==='share_link'){
  const id=String(p.deal_room_id||'');if(!/^[0-9a-f-]{36}$/.test(id))return jsonResponse({ok:false,error:'invalid_request'},400);
  try{const shared=await createShareLink(sb,id,user.id);if(!shared)return jsonResponse({ok:false,error:'link_unavailable'},409);return jsonResponse({ok:true,data:shared});}
  catch(e){console.error('[deal-room] share',e instanceof Error?e.message:'failed');return jsonResponse({ok:false,error:'request_failed'},400);}
 }
 const since=typeof p.since==='string'?p.since:'';delete p.since;
 const {data,error}=await sb.rpc('waouh_room_command',{p_actor:user.id,p_action:action,p});
 if(error)return jsonResponse({ok:false,error:error.code==='42501'?'forbidden':error.message},error.code==='42501'?403:409);
 // Prise en charge de bout en bout : l'utilisateur est prévenu dans l'application dès que Bot reprend la démarche.
 if(action==='delegate'&&data?.deal_room_id&&p.confirmed===true){
  try{await notifyInApp(sb,{userId:user.id,title:'Bot prend en charge votre démarche',text:`Bot s’occupe de « ${String(data.title||'votre recherche').slice(0,80)} » de bout en bout : contact, négociation et accord. Vous êtes prévenu à chaque étape et vous gardez la main.`,actions:[{id:'open_room',label:'Suivre'}],dedupeKey:`bot-takeover:${data.deal_room_id}:${Number(data.mandate_revision??0)}`});}catch(_e){/* la prise en charge ne dépend pas de la notification */}
 }
 // Propriétaire hors WAOUH : Bot le joint (WhatsApp + lien sans compte) dès que l'échange lui est confié ou que l'utilisateur se déclare intéressé.
 if(data?.deal_room_id&&data.is_owner&&(action==='delegate'||action==='contact'||(!data.provider_joined&&action==='open'&&p.confirmed===true))){
  try{const reached=await reachRoomOwner(sb,data.deal_room_id);if(reached==='contacted'||reached==='joined'||reached==='pending'){const fresh=await sb.rpc('waouh_room_snapshot',{p_actor:user.id,p_room:data.deal_room_id});if(!fresh.error)Object.assign(data,fresh.data);}}
  catch(e){console.warn('[deal-room] reach',e instanceof Error?e.message:'failed');}
 }
 // Link the existing canonical thread without creating an offer or sending another opener.
 if(data?.deal_room_id&&!data.thread_id&&data.provider_joined&&['open','contact','delegate','adopt'].includes(action)){
  const {data:component}=await sb.from('waouh_convergence_components').select('source_ref,provider_id').eq('id',data.deal_room_id).single();
  if(component?.source_ref?.startsWith('article:')&&data.is_owner){
   const {data:actor}=await sb.from('waouh_users').select('*').eq('auth_user_id',user.id).order('created_at').limit(1).maybeSingle();
   if(actor){const thread=await resolveProductThread({sb,articleId:component.source_ref.slice(8),actorUser:actor,role:'buyer',source:'unified_room'});
    if(thread){
     // Historical accepted deals must not be silently converted into a second agreement.
     if(thread.deal_id||thread.negotiation_id){await sb.from('waouh_deal_room_links').update({thread_id:thread.id,blocked_reason:'legacy_room_requires_reconciliation',control_mode:'paused',next_run_at:null}).eq('id',data.deal_room_id).eq('owner_id',user.id);return jsonResponse({ok:false,error:'legacy_room_requires_reconciliation',thread_id:thread.id,deal_room_id:data.deal_room_id},409);}
     const saved=await sb.from('waouh_deal_room_links').update({thread_id:thread.id}).eq('id',data.deal_room_id).eq('owner_id',user.id);
     if(saved.error)throw saved.error;data.thread_id=thread.id;
    }
   }
  }
 }
 if(data?.deal_room_id&&['delegate','resume_bot','approve_step','propose','contact','message'].includes(action)){
 const tick=await sb.rpc('waouh_room_tick',{p_limit:1,p_room_id:data.deal_room_id});
 if(tick.error)console.warn('[deal-room] scheduled retry',tick.error.code);
 await relayRoomGuests(sb,data.deal_room_id).catch(()=>undefined);
 const fresh=await sb.rpc('waouh_room_snapshot',{p_actor:user.id,p_room:data.deal_room_id});
 if(!fresh.error){await includeOutreachState(sb,fresh.data);return jsonResponse({ok:true,data:fresh.data});}
 }
 if(data?.deal_room_id&&!['get','list','events','open','adopt'].includes(action))await relayRoomGuests(sb,data.deal_room_id).catch(()=>undefined);
 if(action==='accept')await assignRoomDeliveries(sb).catch(()=>undefined);
 await includeOutreachState(sb,data);
 // Lecture légère : la livraison voyage avec le salon et rien n'est renvoyé tant que rien n'a changé.
 if(action==='get'&&data?.deal_room_id){
  if(data.agreement?.status==='accepted'&&data.agreement?.terms?.delivery_mode==='delivery'){const {view}=await deliveryFor(sb,user.id,String(data.deal_room_id)) as any;if(view)data.delivery=view;}
  const hash=await digest(data);
  if(since&&since===hash)return jsonResponse({ok:true,data:{unchanged:true,hash,deal_room_id:data.deal_room_id}});
  data.hash=hash;
 }
 return jsonResponse({ok:true,data});
 }catch(error){console.error('[deal-room]',error instanceof Error?error.message:'request_failed');return jsonResponse({ok:false,error:'request_failed'},400);}
});
