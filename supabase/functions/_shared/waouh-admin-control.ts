export type WaouhModuleControl = {
  module_key: string;
  enabled: boolean;
  automation_enabled: boolean;
  maintenance_message?: string | null;
  updated_at?: string | null;
};

import { createTtlCache } from "./waouh-ttl-cache.ts";

const moduleControlCache = createTtlCache<WaouhModuleControl>(10_000);

/** État d'un module, mémorisé quelques secondes (un échec de lecture n'est jamais mémorisé). */
export async function getWaouhModuleControl(
  sb: any,
  moduleKey: string,
): Promise<WaouhModuleControl> {
  const cached = moduleControlCache.get(moduleKey);
  if (cached) return cached;
  const control = await loadWaouhModuleControl(sb, moduleKey);
  if ("updated_at" in control) moduleControlCache.set(moduleKey, control);
  return control;
}

async function loadWaouhModuleControl(
  sb: any,
  moduleKey: string,
): Promise<WaouhModuleControl> {
  try {
    const { data, error } = await sb
      .from("waouh_admin_module_controls")
      .select("module_key,enabled,automation_enabled,maintenance_message,updated_at")
      .eq("module_key", moduleKey)
      .maybeSingle();
    if (error || !data) {
      return {
        module_key: moduleKey,
        enabled: false,
        automation_enabled: false,
      };
    }
    const linked:Record<string,string>={chat_web:'chat',chat_whatsapp:'whatsapp',avatar_commerce:'avatar',nexus:'nexus',muse_agents:'ia',deals:'ventes',negotiation:'ventes',outbound:'whatsapp'};
    const key=linked[moduleKey];
    const {data:global,error:policyError}=key?await sb.from('waouh_frontend_modules').select('access_enabled,automation_enabled').eq('module_key',key).maybeSingle():{data:null,error:null};
    return {
      module_key: moduleKey,
      enabled: data.enabled !== false&&(!key||(!policyError&&global?.access_enabled===true)),
      automation_enabled: data.automation_enabled !== false&&(!key||(!policyError&&global?.automation_enabled===true)),
      maintenance_message: data.maintenance_message ?? null,
      updated_at: data.updated_at ?? null,
    };
  } catch {
    return {
      module_key: moduleKey,
      enabled: false,
      automation_enabled: false,
    };
  }
}

export async function waouhModuleEnabled(sb: any, moduleKey: string) {
  return (await getWaouhModuleControl(sb, moduleKey)).enabled;
}

export async function waouhAutomationEnabled(sb: any, moduleKey: string) {
  const state = await getWaouhModuleControl(sb, moduleKey);
  return state.enabled && state.automation_enabled;
}
