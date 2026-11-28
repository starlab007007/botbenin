import { WAOUH_RUNTIME_ENDPOINTS } from "./runtimeEndpoints";

/** Discovery includes AI planning and external providers; ordinary requests stay short. */
export function waouhRequestTimeout(url: string, init?: RequestInit): number {
  const defaultTimeout = 12_000;
  // Un message du chat lance la recherche complète (souvent 15 à 30 s) : le serveur s'autorise 55 s.
  if (url.includes("/functions/v1/waouh-channel-in") && (init?.method || "GET").toUpperCase() === "POST") return 60_000;
  if (!url.includes(`/functions/v1/${WAOUH_RUNTIME_ENDPOINTS.agenticCore}`) ||
      (init?.method || "GET").toUpperCase() !== "POST" || typeof init?.body !== "string") {
    return defaultTimeout;
  }
  try {
    const { action } = JSON.parse(init.body);
    if (action === "nexus.global_discovery" || action === "nexus.mandate.create" || action === "nexus.mandate.start_guided") return 120_000;
  } catch { /* Keep the default for malformed requests. */ }
  return defaultTimeout;
}
