// Shared helper to load a radar API key (DB override + env fallback)
// and enforce per-provider daily quota with auto-reset.

export async function getRadarApiKey(
  sb: any,
  provider: "serpapi" | "apify",
  envKeyName: string,
): Promise<{ ok: boolean; key?: string; reason?: string; configId?: string; usage?: number; quota?: number }> {
  const { data: cfg } = await sb
    .from("waouh_radar_api_configs")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();

  // Auto reset quota on new UTC day
  if (cfg?.usage_reset_at) {
    const last = new Date(cfg.usage_reset_at);
    const now = new Date();
    if (last.getUTCFullYear() !== now.getUTCFullYear() || last.getUTCMonth() !== now.getUTCMonth() || last.getUTCDate() !== now.getUTCDate()) {
      await sb.from("waouh_radar_api_configs")
        .update({ usage_today: 0, usage_reset_at: now.toISOString() })
        .eq("id", cfg.id);
      cfg.usage_today = 0;
    }
  }

  if (cfg && cfg.active === false) {
    return { ok: false, reason: `provider ${provider} désactivé en BDD` };
  }
  if (cfg && cfg.daily_quota > 0 && cfg.usage_today >= cfg.daily_quota) {
    return { ok: false, reason: `quota quotidien atteint (${cfg.usage_today}/${cfg.daily_quota})` };
  }

  const key = cfg?.api_key || Deno.env.get(envKeyName) || "";
  if (!key) return { ok: false, reason: `aucune clé ${provider} disponible` };
  return { ok: true, key, configId: cfg?.id, usage: cfg?.usage_today, quota: cfg?.daily_quota };
}

export async function incrementRadarUsage(sb: any, configId: string | undefined, delta = 1) {
  if (!configId) return;
  try {
    await sb.rpc("increment_radar_usage" as any, { p_config_id: configId, p_delta: delta }).catch(() => null);
  } catch { /* ignore */ }
  // Fallback if RPC missing
  try {
    const { data } = await sb.from("waouh_radar_api_configs").select("usage_today").eq("id", configId).maybeSingle();
    if (data) {
      await sb.from("waouh_radar_api_configs")
        .update({ usage_today: (data.usage_today || 0) + delta })
        .eq("id", configId);
    }
  } catch { /* ignore */ }
}
