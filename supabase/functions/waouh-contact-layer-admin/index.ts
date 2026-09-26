import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { contactabilityPolicy } from "../_shared/waouh-signal-fabric.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const levels = new Set(["C0", "C1", "C2", "C3", "C4"]);

function headers(req?: Request) {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = new Set(["https://bot.bj", "https://www.bot.bj", "http://localhost:8080", "http://127.0.0.1:5173"]);
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://bot.bj",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}
function json(body: unknown, status=200, req?: Request) { return new Response(JSON.stringify(body), {status, headers: headers(req)}); }

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { ok:false as const, response:json({ok:false,error:"Authentification requise."},401,req) };
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
  const { data, error } = await admin.auth.getUser(auth.slice(7));
  if (error || !data.user) return { ok:false as const, response:json({ok:false,error:"Session invalide."},401,req) };
  const [a,s] = await Promise.all([
    admin.rpc("has_role", {_user_id:data.user.id,_role_name:"admin"}),
    admin.rpc("has_role", {_user_id:data.user.id,_role_name:"super_admin"}),
  ]);
  if (a.error || s.error) return {ok:false as const,response:json({ok:false,error:"Vérification du rôle impossible."},500,req)};
  if (!a.data && !s.data) return {ok:false as const,response:json({ok:false,error:"Accès administrateur requis."},403,req)};
  return {ok:true as const, admin, userId:data.user.id};
}

function permittedLevel(source: any, level: string) {
  if (!levels.has(level)) return false;
  if (level === "C4") return source.source_key === "partner" || source.family === "partner";
  if (level === "C3") return source.supports_contact === true && ["partner","telephony","messaging","internal"].includes(source.family);
  if (level === "C2") return source.supports_contact === true;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:headers(req)});
  const access = await requireAdmin(req); if (!access.ok) return access.response;
  const {admin,userId}=access;
  const body = await req.json().catch(()=>({})) as Record<string,unknown>;
  const action = String(body.action ?? "get");
  try {
    if (action === "get") {
      const [sources, contacts, fabric] = await Promise.all([
        admin.from("waouh_discovery_sources").select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at").order("label"),
        admin.from("waouh_entity_contacts").select("contactability_level,consent_state").limit(10000),
        admin.from("waouh_signal_fabric").select("contactability_level,source_key").limit(10000),
      ]);
      if (sources.error) throw sources.error; if (contacts.error) throw contacts.error; if (fabric.error) throw fabric.error;
      const count=(rows:any[]|null,key:string)=>{const out:Record<string,number>={C0:0,C1:0,C2:0,C3:0,C4:0}; for(const r of rows??[]) {const v=String(r?.[key]??"C0"); out[v]=(out[v]??0)+1;} return out;};
      const policy = ["C0","C1","C2","C3","C4"].map(level=>contactabilityPolicy(level));
      return json({ok:true,sources:sources.data??[],counts:{contacts:count(contacts.data,"contactability_level"),fabric:count(fabric.data,"contactability_level")},policy},200,req);
    }
    if (action === "update_source_policy") {
      const sourceKey=String(body.source_key??""); const level=String(body.default_contactability??"");
      const trust=Number(body.trust_weight);
      const {data:source,error:sourceError}=await admin.from("waouh_discovery_sources").select("*").eq("source_key",sourceKey).maybeSingle();
      if (sourceError) throw sourceError; if (!source) return json({ok:false,error:"Source inconnue."},404,req);
      if (!permittedLevel(source,level)) return json({ok:false,error:`Le niveau ${level} n’est pas autorisé pour cette source.`},400,req);
      if (!Number.isFinite(trust) || trust < 0 || trust > 1) return json({ok:false,error:"Le poids de confiance doit être compris entre 0 et 1."},400,req);
      const {data,error}=await admin.from("waouh_discovery_sources").update({default_contactability:level,trust_weight:trust,updated_at:new Date().toISOString()}).eq("source_key",sourceKey).select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at").single();
      if (error) throw error;
      try {
        await admin.from("waouh_admin_control_audit").insert({module_key:"contact_layer",action:"update_source_policy",changed_by:userId,before_state:{default_contactability:source.default_contactability,trust_weight:source.trust_weight},after_state:{default_contactability:level,trust_weight:trust},metadata:{source_key:sourceKey}});
      } catch {}
      return json({ok:true,data},200,req);
    }
    return json({ok:false,error:"Action inconnue."},400,req);
  } catch (error:any) { return json({ok:false,error:error?.message||"Erreur Contact Layer."},500,req); }
});
