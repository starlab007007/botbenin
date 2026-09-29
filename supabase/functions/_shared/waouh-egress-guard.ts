// WAOUH — Garde de sortie réseau (SSRF) pour les sources de données saisies par l'utilisateur
// (waouh-stock-ingest : URL Supabase, hôte PostgreSQL). Refuse tout ce qui vise le réseau interne
// ou les métadonnées du fournisseur, et empêche l'envoi de la clé API vers un hôte arbitraire.

const PRIVATE_V4: Array<[number, number]> = [
  [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8], [0xa9fe0000, 16],
  [0xac100000, 12], [0xc0000000, 24], [0xc0a80000, 16], [0xc6120000, 15], [0xe0000000, 4], [0xf0000000, 4],
];

function ipv4ToInt(host: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function isPrivateIpv4(host: string): boolean {
  const value = ipv4ToInt(host);
  if (value == null) return false;
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((value & mask) >>> 0) === ((base & mask) >>> 0);
  });
}

export function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(":")) return false;
  if (h === "::" || h === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("ff");
}

/** Nom d'hôte public plausible : ni littéral IP privé, ni entier/hex déguisé, ni nom interne. */
export function isPublicHostname(raw: string): boolean {
  const host = String(raw || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.length > 253) return false;
  if (host.includes(":") || host.startsWith("[")) return !isPrivateIpv6(host);
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return false; // 2130706433, 0x7f000001
  if (/^[\d.]+$/.test(host)) return ipv4ToInt(host) != null && !isPrivateIpv4(host);
  if (host === "localhost" || !host.includes(".")) return false;
  if (/\.(local|localhost|internal|intranet|lan|home|corp|localdomain)$/.test(host)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host);
}

export class EgressError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** URL de l'API d'un projet Supabase : https, `<ref 20 car.>.supabase.co|in`, sans identifiants ni port. */
export function assertSupabaseApiUrl(raw: string): string {
  let url: URL;
  try { url = new URL(String(raw || "").trim()); } catch { throw new EgressError("invalid_url", "URL Supabase invalide."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new EgressError("unsafe_url", "L'URL Supabase doit être en https, sans identifiants ni port.");
  }
  if (!/^[a-z0-9]{20}\.supabase\.(co|in)$/.test(url.hostname.toLowerCase())) {
    throw new EgressError("unsafe_host", "Seuls les projets *.supabase.co sont acceptés.");
  }
  return `${url.protocol}//${url.hostname.toLowerCase()}`;
}

const POSTGRES_PORTS = new Set([5432, 6543]);

/** Hôte + port PostgreSQL distants : hôte public, ports 5432/6543 uniquement. */
export function assertPostgresTarget(host: string, port: number): void {
  if (!isPublicHostname(host)) throw new EgressError("unsafe_host", "Hôte PostgreSQL non autorisé.");
  if (!POSTGRES_PORTS.has(port)) throw new EgressError("unsafe_port", "Ports PostgreSQL autorisés : 5432 et 6543.");
}

/** Le nom résout-il uniquement vers des adresses publiques ? (résolveur injectable pour les tests) */
export async function assertResolvesPublic(
  host: string,
  resolve: (name: string, type: "A" | "AAAA") => Promise<string[]> = (n, t) => Deno.resolveDns(n, t),
): Promise<void> {
  if (isPublicHostname(host) && (host.includes(":") || /^[\d.]+$/.test(host))) return; // littéral IP public déjà validé
  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try { addresses.push(...await resolve(host, type)); } catch { /* type absent */ }
  }
  if (!addresses.length) throw new EgressError("unresolvable", "Hôte introuvable.");
  if (addresses.some((a) => isPrivateIpv4(a) || isPrivateIpv6(a))) {
    throw new EgressError("unsafe_host", "Hôte résolu vers une adresse interne.");
  }
}
