// WAOUH — Authentification des appels internes (fonction → fonction) par la clé service.
// E9 : waouh-notify-dispatch acceptait n'importe quel appelant (envoi WhatsApp/notification à des tiers).

/** Comparaison à temps constant de deux chaînes. */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** L'appel porte-t-il `Authorization: Bearer <clé service>` ? Clé service vide => toujours refusé. */
export function isServiceCaller(req: { headers: { get(name: string): string | null } }, serviceKey: string | null | undefined): boolean {
  if (!serviceKey) return false;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return bearer.length > 0 && safeEqual(bearer, serviceKey);
}
