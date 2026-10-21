import { guardedWahaFetch } from "../_shared/waouh-waha-egress.ts";

const json = (body: unknown, status=200) => new Response(JSON.stringify(body),{
  status, headers: {"Content-Type":"application/json","Cache-Control":"no-store"}
});
Deno.serve(async (req:Request) => {
  if(req.method !== "POST") return json({ok:false,code:"method_not_allowed"},405);
  const presented = req.headers.get("x-waouh-internal") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  if(!presented || !service || !url) return json({ok:false,code:"not_authorized"},403);
  const verified = await fetch(url.replace(/\/$/, "")+"/rest/v1/rpc/waouh_verify_runtime_internal_token", {
    method:"POST",
    headers:{"Content-Type":"application/json",apikey:service,Authorization:`Bearer ${service}`},
    body:JSON.stringify({p_token:presented}),
  }).catch(()=>null);
  if(!verified?.ok || await verified.json().catch(()=>false) !== true)
    return json({ok:false,code:"not_authorized"},403);
  const rawKey = (Deno.env.get("WAHA_API_KEY") || "").trim();
  const apiKey = (Deno.env.get("WAHA_API_KEY_PLAIN") || "").trim() ||
    (!rawKey.startsWith("sha512:") ? rawKey : "");
  const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "");
  if(!apiKey) return json({ok:false,code:"waha_plain_api_key_missing"},409);
  if(!base) return json({ok:false,code:"waha_url_missing"},409);
  const requestBody=await req.json().catch(()=>({}));
  const combined = requestBody?.mode === "combined";
  const dashboardUser=Deno.env.get("WAHA_DASHBOARD_USERNAME") || "";
  const dashboardPass=Deno.env.get("WAHA_DASHBOARD_PASSWORD") || "";
  if(combined && (!dashboardUser || !dashboardPass))
    return json({ok:false,code:"dashboard_basic_credentials_missing"},409);
  const wahaHeaders:Record<string,string>={"X-Api-Key":apiKey,"Accept":"application/json"};
  if(combined) wahaHeaders["Authorization"]="Basic "+btoa(dashboardUser+":"+dashboardPass);
  try {
    const reply = await guardedWahaFetch(
      base+"/api/sessions/WaouhApp",
      {headers:wahaHeaders},
      "status"
    );
    if(!reply.ok) return json({ok:false,http_status:reply.status,code:"waha_api_refused"},502);
    const data:any=await reply.json().catch(()=>({}));
    const status=String(data.status||data.state||data.engine?.state||"UNKNOWN").toUpperCase();
    const phone=String(data.me?.id||"").split("@")[0].replace(/\D/g,"");
    const matched=["22965653468","2290165653468"].includes(phone);
    return json({ok:status==="WORKING"&&matched,session:"WaouhApp",status,identity_matches:matched,http_status:reply.status});
  } catch(e) { return json({ok:false,code:String(e instanceof Error?e.message:e).slice(0,120)},503); }
});
