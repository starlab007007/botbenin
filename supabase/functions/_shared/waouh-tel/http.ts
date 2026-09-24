const defaultOrigins = [
  "https://bot.bj",
  "https://www.bot.bj",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
];

export function telCorsHeaders(req?: Request) {
  const configured = (Deno.env.get("WAOUH_TEL_CORS_ORIGINS") || "").split(",")
    .map((value) => value.trim()).filter(Boolean);
  const allowed = new Set(configured.length ? configured : defaultOrigins);
  const origin = req?.headers.get("origin") || "";
  const selected = allowed.has(origin) ? origin : "https://bot.bj";
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-hub-signature, x-hub-timestamp, x-waouh-tel-signature, x-waouh-tel-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

export function telJson(
  payload: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
  req?: Request,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...telCorsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function telOk(data: unknown, status = 200, req?: Request) {
  return telJson({ ok: true, data }, status, {}, req);
}

export function telError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  req?: Request,
) {
  const correlationId = status >= 500 ? crypto.randomUUID() : null;
  if (status >= 500) {
    console.error(
      `[waouh-tel] ${code} correlation=${correlationId}`,
      details ?? message,
    );
  }
  return telJson(
    {
      ok: false,
      error: {
        code,
        message,
        ...(status >= 500
          ? { correlation_id: correlationId }
          : details === undefined
          ? {}
          : { details }),
      },
    },
    status,
    {},
    req,
  );
}

export function methodNotAllowed(req?: Request) {
  return telError(
    405,
    "method_not_allowed",
    "Méthode HTTP non autorisée.",
    undefined,
    req,
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

export function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(min, Math.min(max, Math.trunc(parsed)))
    : fallback;
}
