import { createClient } from "npm:@supabase/supabase-js@2";
import { moduleRequestGate } from "../_shared/waouh-module-request.ts";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";
import { waouhCorsHeaders } from "../_shared/waouh-auth.ts";
import { inspectCollectionProvider, runCollectionTick } from "../_shared/waouh-collection/worker.ts";

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
    if (body?.action === "collection.inspect") {
      return Response.json(await inspectCollectionProvider(db),{headers:waouhCorsHeaders});
    }
    if (body?.action==="collection.tick") {
      const report=await runCollectionTick(db);
      return Response.json({ok:true,...report},{headers:waouhCorsHeaders});
    }
    const {data,error}=await db.rpc("waouh_collection_schedule",{p_handler:"site"});
    if (error) throw error;
    return Response.json({ok:true,scheduled:data},{status:202,headers:waouhCorsHeaders});
  } catch (error) {
    console.error("[waouh-radar-site-scraper] collection unavailable",error);
    return Response.json({ok:false,message:"Collecte momentanément indisponible.",
      code:error instanceof Error&&/^[a-z_]+$/.test(error.message)?error.message:"collection_tick_failed"},
      {status:503,headers:waouhCorsHeaders});
  }
});
