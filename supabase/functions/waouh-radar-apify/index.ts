import { createClient } from "npm:@supabase/supabase-js@2";
import { moduleRequestGate } from "../_shared/waouh-module-request.ts";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";
import { waouhCorsHeaders } from "../_shared/waouh-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:waouhCorsHeaders});
  if (req.method !== "POST") return Response.json({ok:false}, {status:405,headers:waouhCorsHeaders});
  const gate=await moduleRequestGate(req,["nexus"],true);
  if (gate) return gate;
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const guard=await requireRuntimeOrAdmin(req,db);
  if (!guard.ok) return guard.response;
  const body=await req.json().catch(()=>({}));
  if (body.verify_only === true || typeof body.source_id === "string") {
    return Response.json({ok:false,message:"Vérifiez cette source dans le suivi des collectes."},
      {status:422,headers:waouhCorsHeaders});
  }
  const {data,error}=await db.rpc("waouh_collection_schedule",{p_handler:"apify"});
  return error
    ? Response.json({ok:false,message:"Collecte momentanément indisponible."},{status:503,headers:waouhCorsHeaders})
    : Response.json({ok:true,scheduled:data},{status:202,headers:waouhCorsHeaders});
});
