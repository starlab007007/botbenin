import { createClient } from "npm:@supabase/supabase-js@2";

type GuardResult =
  | { ok: true; actor: "service" | "internal" | "admin"; userId?: string }
  | { ok: false; response: Response };

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Guard for privileged WAOUH workers deployed with verify_jwt=false.
 *
 * Accepted callers:
 * - exact Supabase service_role bearer (server-to-server);
 * - x-waouh-internal token generated/stored in Vault and verified by a
 *   SECURITY DEFINER RPC;
 * - authenticated admin/super_admin user.
 *
 * Anonymous/public JWTs are explicitly rejected.
 */
export async function requireRuntimeOrAdmin(req: Request, service: any): Promise<GuardResult> {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();

  if (serviceRole && bearer && bearer === serviceRole) {
    return { ok: true, actor: "service" };
  }

  const internal = (req.headers.get("x-waouh-internal") || "").trim();
  if (internal) {
    const { data, error } = await service.rpc("waouh_verify_runtime_internal_token", {
      p_token: internal,
    });
    if (!error && data === true) return { ok: true, actor: "internal" };
  }

  if (bearer) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (!error && user) {
      const [admin, superAdmin] = await Promise.all([
        service.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
        service.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
      ]);
      if (admin.data === true || superAdmin.data === true) {
        return { ok: true, actor: "admin", userId: user.id };
      }
    }
  }

  return { ok: false, response: jsonError(401, "runtime_authorization_required") };
}
