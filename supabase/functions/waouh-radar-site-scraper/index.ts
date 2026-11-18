import { createClient } from "npm:@supabase/supabase-js@2";
import { moduleRequestGate } from "../_shared/waouh-module-request.ts";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";
import { waouhCorsHeaders } from "../_shared/waouh-auth.ts";
import { inspectCollectionProvider, runCollectionTick } from "../_shared/waouh-collection/worker.ts";
import {collectionOverview,collectionControlPatch,publicSourceConfiguration} from '../_shared/waouh-collection/control.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:waouhCorsHeaders});
  if (req.method !== "POST") return Response.json({ok:false},{status:405,headers:waouhCorsHeaders});
  const gate=await moduleRequestGate(req,["nexus"],true);
  if (gate) return gate;
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const guard=await requireRuntimeOrAdmin(req,db);
  if (!guard.ok) return guard.response;
  const body=await req.json().catch(()=>({}));
  try {
    if(body?.action==='collection.source.configure') {
      if(typeof body.source_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.source_id))throw new Error('invalid_collection_source');
      const {data:source,error:readError}=await db.from('waouh_radar_sources').select('identifier,config').eq('id',body.source_id).eq('type','site').single();
      if(readError||!source)throw new Error('invalid_collection_source');
      const config=publicSourceConfiguration(body,source,(Deno.env.get('WAOUH_COLLECTION_SITE_HOSTS')??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
      const {data,error}=await db.from('waouh_radar_sources').update({config}).eq('id',body.source_id).eq('type','site').select('id');
      if(error)throw error;
      return Response.json({ok:true,updated:data?.length??0},{headers:waouhCorsHeaders});
    }
    if(body?.action==='collection.overview')return Response.json(await collectionOverview(db),{headers:waouhCorsHeaders});
    if(['collection.policy','collection.cadence'].includes(body?.action)) {
      const change=collectionControlPatch(body);
      const {data,error}=await db.from(change.table).update(change.patch).eq(change.key,change.value).select(change.key);
      if(error)throw error;
      return Response.json({ok:true,updated:data?.length??0},{headers:waouhCorsHeaders});
    }
    if (body?.action === "collection.inspect") {
      return Response.json(await inspectCollectionProvider(db),{headers:waouhCorsHeaders});
    }
    if (body?.action==="collection.tick") {
      const report=await runCollectionTick(db);
      return Response.json({ok:true,...report},{headers:waouhCorsHeaders});
    }
    if(body?.action!=null)throw new Error("invalid_collection_action");
    const {data,error}=await db.rpc("waouh_collection_schedule",{p_handler:"site"});
    if (error) throw error;
    return Response.json({ok:true,scheduled:data},{status:202,headers:waouhCorsHeaders});
  } catch (error) {
    console.error("[waouh-radar-site-scraper] collection unavailable",error);
    return Response.json({ok:false,message:"Collecte momentanément indisponible.",
      code:error instanceof Error&&/^[a-z_]+$/.test(error.message)?error.message:"collection_tick_failed"},
      {status:error instanceof Error&&error.message.startsWith("invalid_collection_")?400:503,headers:waouhCorsHeaders});
  }
});
