// Shared helper for NEXUS/Radar provider credentials.
// DB admin configuration takes precedence over environment secrets.
// Daily quotas are enforced per provider and reset every UTC day.

export type RadarProviderConfig = {
  id?: string;
  provider: string;
  source_key?: string | null;
  label?: string | null;
  api_key?: string | null;
  active?: boolean;
  auth_mode?: string | null;
  base_url?: string | null;
  docs_url?: string | null;
  extra_config?: Record<string, unknown> | null;
  daily_quota?: number | null;
  usage_today?: number | null;
  usage_reset_at?: string | null;
};

export async function getRadarProviderConfig(
  sb: any,
  provider: string,
): Promise<RadarProviderConfig | null> {
  const { data } = await sb
    .from("waouh_radar_api_configs")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();
  return data ?? null;
}

async function resetQuotaIfNeeded(sb: any, cfg: RadarProviderConfig | null) {
  if (!cfg?.id || !cfg.usage_reset_at) return cfg;
  const last = new Date(cfg.usage_reset_at);
  const now = new Date();
  const changedDay =
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate();
  if (!changedDay) return cfg;

  await sb.from("waouh_radar_api_configs")
    .update({ usage_today: 0, usage_reset_at: now.toISOString() })
    .eq("id", cfg.id);
  return { ...cfg, usage_today: 0, usage_reset_at: now.toISOString() };
}

export async function getRadarApiKey(
  sb: any,
  provider: string,
  envKeyName?: string,
): Promise<{
  ok: boolean;
  key?: string;
  reason?: string;
  configId?: string;
  usage?: number;
  quota?: number;
  config?: RadarProviderConfig | null;
}> {
  let cfg = await getRadarProviderConfig(sb, provider);
  cfg = await resetQuotaIfNeeded(sb, cfg);

  if (cfg && cfg.active === false) {
    return { ok: false, reason: `provider ${provider} désactivé en BDD`, config: cfg };
  }
  const usage = Number(cfg?.usage_today ?? 0);
  const quota = Number(cfg?.daily_quota ?? 0);
  if (cfg && quota > 0 && usage >= quota) {
    return {
      ok: false,
      reason: `quota quotidien atteint (${usage}/${quota})`,
      config: cfg,
      usage,
      quota,
    };
  }

  const envKey = envKeyName ? Deno.env.get(envKeyName) : "";
  const key = String(cfg?.api_key || envKey || "").trim();
  const authMode = String(cfg?.auth_mode ?? "api_key");
  const keyRequired = !["native", "native_settings", "none", "share"].includes(authMode);
  if (!key && keyRequired) {
    return {
      ok: false,
      reason: `aucune clé ${provider} disponible`,
      config: cfg,
      usage,
      quota,
    };
  }
  return {
    ok: true,
    ...(key ? { key } : {}),
    configId: cfg?.id,
    usage,
    quota,
    config: cfg,
  };
}

export async function incrementRadarUsage(
  sb: any,
  configId: string | undefined,
  delta = 1,
) {
  if (!configId || delta <= 0) return;
  try {
    await sb.rpc("increment_radar_usage" as any, {
      p_config_id: configId,
      p_delta: delta,
    }).catch(() => null);
  } catch {
    // fall through
  }
  try {
    const { data } = await sb.from("waouh_radar_api_configs")
      .select("usage_today").eq("id", configId).maybeSingle();
    if (data) {
      await sb.from("waouh_radar_api_configs")
        .update({ usage_today: Number(data.usage_today ?? 0) + delta })
        .eq("id", configId);
    }
  } catch {
    // Usage accounting must never break discovery.
  }
}

export async function markRadarProviderSync(
  sb: any,
  provider: string,
  status: "ok" | "ko" | "skipped",
  message: string,
) {
  try {
    await sb.from("waouh_radar_api_configs").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_message: message.slice(0, 500),
    }).eq("provider", provider);
  } catch {
    // Best-effort observability only.
  }
}
