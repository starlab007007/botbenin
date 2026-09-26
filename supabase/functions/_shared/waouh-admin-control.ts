export type WaouhModuleControl = {
  module_key: string;
  enabled: boolean;
  automation_enabled: boolean;
  maintenance_message?: string | null;
  updated_at?: string | null;
};

export async function getWaouhModuleControl(
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
        enabled: true,
        automation_enabled: true,
      };
    }
    return {
      module_key: moduleKey,
      enabled: data.enabled !== false,
      automation_enabled: data.automation_enabled !== false,
      maintenance_message: data.maintenance_message ?? null,
      updated_at: data.updated_at ?? null,
    };
  } catch {
    return {
      module_key: moduleKey,
      enabled: true,
      automation_enabled: true,
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
