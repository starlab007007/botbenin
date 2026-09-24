import { constantTimeEqual } from "./crypto.ts";

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function requiresNativeEngineAuthorization(
  body: Record<string, unknown>,
) {
  const session = stringValue(body.web_session_id);
  return body.source === "native_messaging" ||
    body.channel === "native_messaging" || session.startsWith("tel:");
}

export function nativeEngineRequestAuthorized(
  body: Record<string, unknown>,
  authorization: string,
  expectedSecret: string,
) {
  if (!requiresNativeEngineAuthorization(body)) return true;
  const session = stringValue(body.web_session_id);
  const phone = stringValue(body.phone_number);
  const supplied = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const validSession =
    /^tel:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(session);
  const validSyntheticPhone = !phone || phone === `web:${session}`;
  return expectedSecret.length >= 24 && supplied.length > 0 && validSession &&
    validSyntheticPhone && !body.user_id &&
    constantTimeEqual(supplied, expectedSecret);
}
