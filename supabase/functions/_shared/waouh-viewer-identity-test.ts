// E5 — l'identité du lecteur vient du jeton, jamais du corps de la requête.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveViewerIdentity } from "./waouh-viewer-identity.ts";

const ALICE = "22222222-2222-4222-8222-222222222222";
const BOB = "11111111-1111-4111-8111-111111111111";
const SESSION = "web_1790000000000_abc123";

Deno.test("jeton valide : identité = jeton, l'identifiant déclaré identique est accepté", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: ALICE, claimedAuthUserId: ALICE, sessionId: SESSION }),
    { ok: true, authUserId: ALICE, sessionId: SESSION, mode: "jwt" },
  );
  assertEquals(
    resolveViewerIdentity({ jwtUserId: ALICE, claimedAuthUserId: null, sessionId: null }),
    { ok: true, authUserId: ALICE, sessionId: null, mode: "jwt" },
  );
});

Deno.test("E5 : jeton d'Alice + authUserId de Bob = 403 (usurpation refusée)", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: ALICE, claimedAuthUserId: BOB, sessionId: SESSION }),
    { ok: false, status: 403, error: "auth_user_mismatch" },
  );
});

Deno.test("E5 : sans jeton, authUserId seul = 401 (l'identifiant déclaré ne suffit plus)", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: BOB, sessionId: null }),
    { ok: false, status: 401, error: "auth_required" },
  );
});

Deno.test("E5 : sans jeton, authUserId + session = mode invité, authUserId ignoré", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: BOB, sessionId: SESSION }),
    { ok: true, authUserId: null, sessionId: SESSION, mode: "guest" },
  );
});

Deno.test("invité : session seule acceptée (Web et Flutter sans compte)", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: null, sessionId: SESSION }),
    { ok: true, authUserId: null, sessionId: SESSION, mode: "guest" },
  );
});

Deno.test("aucune identité = 400", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: null, sessionId: null }),
    { ok: false, status: 400, error: "missing viewer identity" },
  );
});

Deno.test("injection de filtre : sessionId ou authUserId hors format = 400", () => {
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: null, sessionId: "x,user_id.neq.0" }),
    { ok: false, status: 400, error: "invalid_session_id" },
  );
  assertEquals(
    resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: null, sessionId: "abc123),(id.neq.0" }),
    { ok: false, status: 400, error: "invalid_session_id" },
  );
  assertEquals(
    resolveViewerIdentity({ jwtUserId: ALICE, claimedAuthUserId: `${BOB},id.neq.0`, sessionId: null }),
    { ok: false, status: 400, error: "invalid_auth_user_id" },
  );
});

Deno.test("formats de session réels acceptés (Flutter web_<ms>_<base36>, uuid Web)", () => {
  for (const sid of ["web_1790000000000_1x2y3z", "0b9a5f0e-1c2d-4e3f-8a4b-5c6d7e8f9a0b", "sess-A.1:2"]) {
    assertEquals(resolveViewerIdentity({ jwtUserId: null, claimedAuthUserId: null, sessionId: sid }).ok, true);
  }
});
