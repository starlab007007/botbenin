const envByName: Record<string, string> = {
  phone_encryption_key: "WAOUH_TEL_PHONE_ENCRYPTION_KEY",
  phone_hash_key: "WAOUH_TEL_PHONE_HASH_KEY",
  webhook_secret: "WAOUH_TEL_WEBHOOK_SECRET",
  internal_secret: "WAOUH_TEL_INTERNAL_SECRET",
  infobip_base_url: "WAOUH_TEL_INFOBIP_BASE_URL",
  infobip_api_key: "WAOUH_TEL_INFOBIP_API_KEY",
};

async function readVaultSecret(name: string): Promise<string> {
  const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceRole) return "";
  const response = await fetch(`${url}/rest/v1/rpc/waouh_tel_runtime_secret`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_name: name }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return "";
  const value = await response.json().catch(() => "");
  return typeof value === "string" ? value : "";
}

export function telRuntimeSecret(name: string): Promise<string> {
  const envName = envByName[name];
  const fromEnv = envName ? (Deno.env.get(envName) || "") : "";
  if (fromEnv) return Promise.resolve(fromEnv);
  return readVaultSecret(name);
}

export async function requireTelRuntimeSecret(
  name: string,
  minimumLength = 1,
): Promise<string> {
  const value = await telRuntimeSecret(name);
  if (value.length < minimumLength) {
    throw new Error(`waouh_tel_secret_missing:${name}`);
  }
  return value;
}