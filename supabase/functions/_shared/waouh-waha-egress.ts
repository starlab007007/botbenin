// WAOUH / WAHA - fail-closed egress gate, enforced before each WAHA API request.
export type WahaScope = "status"|"transactional"|"inbound_reply"|"contact_sync"|"cold_outreach"|"campaign"|"management";
export async function guardedWahaFetch(
  url: string, init: RequestInit = {}, forcedScope?: WahaScope
): Promise<Response> {
  const project = Deno.env.get("SUPABASE_URL") || "";
  const token = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!project || !token) throw new Error("waha_guard:missing_service_identity");
  const path = new URL(url).pathname;
  const method = String(init.method || "GET").toUpperCase();
  const scope: WahaScope = forcedScope || (
    path.includes("/api/send") ? "transactional" :
    path.includes("/api/contacts") ? "contact_sync" :
    method === "GET" ? "status" : "management"
  );
  const headers = { "Content-Type": "application/json", apikey: token, Authorization: `Bearer ${token}` };
  const grantResponse = await fetch(project.replace(/\/$/, "") + "/rest/v1/rpc/waouh_waha_take", {
    method:"POST", headers, body:JSON.stringify({p_scope:scope}),
    signal:AbortSignal.timeout(5000),
  });
  if (!grantResponse.ok) throw new Error("waha_guard:authorization_backend_" + grantResponse.status);
  const grant = await grantResponse.json();
  if (grant?.allowed !== true) throw new Error("waha_guard:" + (grant?.reason || "denied"));
  const report = async (code: number) => {
    try {
      await fetch(project.replace(/\/$/, "") + "/rest/v1/rpc/waouh_waha_report", {
        method:"POST", headers, body:JSON.stringify({p_audit_id:grant.audit_id,p_status:code}),
        signal:AbortSignal.timeout(5000),
      });
    } catch (_) { /* preserve original WAHA result */ }
  };
  try {
    const response = await fetch(url, { ...init, signal: init.signal || AbortSignal.timeout(8000) });
    await report(response.status);
    return response;
  } catch (error) {
    await report(599);
    throw error;
  }
}
