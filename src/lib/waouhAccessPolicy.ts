/**
 * Canonical WAOUH access policy.
 * Principle: browsing is public; personal/business actions require authentication.
 */

export const WAOUH_PUBLIC_APP_PATHS = [
  "/",
  "/app/chat",
  "/app/avatar",
  "/app/nexus",
  "/app/radar-map",
  "/app/presence/checkin",
  "/app/apresbac",
  "/app/fa-ia",
] as const;

export const WAOUH_AUTH_REQUIRED_PREFIXES = [
  "/app/chat/",
  "/app/avatar/",
  "/app/missions",
  "/app/ia",
  "/app/bots",
  "/app/agents",
  "/app/whatsapp",
  "/app/stock",
  "/app/presence",
  "/app/diffusion",
  "/app/partner",
  "/app/profile",
  "/app/notifications",
] as const;

export const DEFAULT_PUBLIC_APP_PATH = "/app/chat";

const isSafeInternalPath = (value: string) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  !/^\/\/(?:[^/]|$)/.test(value);

export function normalizeWaouhRedirect(
  target: string | null | undefined,
  fallback = DEFAULT_PUBLIC_APP_PATH,
): string {
  if (!target || !isSafeInternalPath(target)) return fallback;

  try {
    const url = new URL(target, "https://waouh.local");
    if (url.origin !== "https://waouh.local") return fallback;
    if (url.pathname.startsWith("/app/auth") || url.pathname === "/auth") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildWaouhAuthRedirect(
  target: string,
  authPath = "/app/auth",
): string {
  const safe = normalizeWaouhRedirect(target);
  return `${authPath}?next=${encodeURIComponent(safe)}`;
}

export function requiresWaouhAuthentication(pathname: string): boolean {
  if (pathname === "/app/chat" || pathname === "/app/presence/checkin") return false;
  return WAOUH_AUTH_REQUIRED_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
