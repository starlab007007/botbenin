export const observerComponents = {
  host: ["web_public", "web_origin", "host_monitor"],
  external: ["web_public", "web_render", "runtime", "external_monitor"],
} as const;
const causes = [
  "OK",
  "HTTP_UNAVAILABLE",
  "INVALID_RESPONSE",
  "RENDER_FAILED",
  "HOST_UNAVAILABLE",
  "CONTROL_UNAVAILABLE",
  "DEGRADED",
  "AWAITING_OBSERVATION",
];
export type Probe = {
  component: string;
  status: string;
  cause: string;
  observed_at: string;
  latency_ms: number | null;
  details: Record<string, boolean>;
};
export function validateProbes(
  body: Record<string, unknown>,
  actor: "host" | "external",
): Probe[] {
  if (
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      String(body.report_id),
    ) || !Array.isArray(body.observations) || !body.observations.length ||
    body.observations.length > 4
  ) throw Error("invalid");
  const seen = new Set<string>();
  return body.observations.map((value): Probe => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw Error("invalid");
    }
    const p = value as Record<string, unknown>;
    if (
      !(observerComponents[actor] as readonly unknown[]).includes(
        p.component,
      ) || seen.has(String(p.component))
    ) throw Error("invalid");
    seen.add(String(p.component));
    if (
      !["healthy", "down", "degraded", "unknown"].includes(String(p.status)) ||
      !causes.includes(String(p.cause))
    ) throw Error("invalid");
    const time = Date.parse(String(p.observed_at));
    if (
      !Number.isFinite(time) || time > Date.now() + 60000 ||
      time < Date.now() - 600000
    ) throw Error("invalid");
    if (
      p.latency_ms != null &&
      (!Number.isInteger(p.latency_ms) || Number(p.latency_ms) < 0 ||
        Number(p.latency_ms) > 120000)
    ) throw Error("invalid");
    const details: Record<string, boolean> = {};
    if (actor === "host" && p.component === "web_origin") {
      details.restart_safe =
        (p.details as Record<string, unknown>)?.restart_safe === true;
    }
    return {
      component: String(p.component),
      status: String(p.status),
      cause: String(p.cause),
      observed_at: new Date(time).toISOString(),
      latency_ms: p.latency_ms == null ? null : Number(p.latency_ms),
      details,
    };
  });
}
export function effectiveStatus(
  c: { last_seen_at: string | null; fresh_for_seconds: number; status: string },
  now = Date.now(),
): string {
  return !c.last_seen_at || !Number.isFinite(Date.parse(c.last_seen_at)) ||
      now - Date.parse(c.last_seen_at) > c.fresh_for_seconds * 1000
    ? "unknown"
    : c.status;
}
export const componentLabels: Record<string, string> = {
  web_public: "Accès au site",
  web_origin: "Affichage local",
  web_render: "Ouverture de l’application",
  runtime: "Services en ligne",
  database: "Données",
  discovery: "Recherche",
  users_access: "Accès utilisateurs",
  whatsapp: "Connexion WhatsApp",
  queues: "Suivi des envois",
  collectors: "Collecte des offres",
  client_errors: "Stabilité des écrans",
  observer_health: "Continuité des contrôles",
  host_monitor: "Surveillance du site",
  external_monitor: "Surveillance extérieure",
  internal_monitor: "Surveillance des services",
};
export function guidance(component: string): string {
  if (component === "web_public") {
    return "GUARDIAN vérifie si une relance sûre peut rétablir l’accès.";
  }
  if (component === "whatsapp") {
    return "Vérifier la connexion centrale. Une reconnexion peut être nécessaire.";
  }
  if (component === "collectors") {
    return "Vérifier la disponibilité des sources et les limites de collecte.";
  }
  if (component.includes("monitor") || component === "observer_health") {
    return "Rétablir les contrôles pour confirmer l’état des services.";
  }
  if (component === "client_errors" || component === "web_render") {
    return "Des erreurs d’affichage nécessitent une analyse. Les saisies ne sont pas rechargées automatiquement.";
  }
  return "Vérifier le service concerné. Aucune donnée utilisateur n’est modifiée automatiquement.";
}
