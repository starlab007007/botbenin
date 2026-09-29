// WAOUH — Identité du lecteur d'un historique de chat (module pur, aucun accès base).
//
// waouh-match-history lit avec la clé service : il doit décider lui-même qui est
// le lecteur. Avant ce module, l'identité venait du corps de la requête
// (`authUserId`) : n'importe quel client connaissant l'identifiant Auth d'un
// autre utilisateur pouvait lire son historique. Règles :
//   - jeton (JWT) valide            → identité = celle du jeton ; un `authUserId`
//     déclaré différent est refusé (403) ;
//   - pas de jeton valide           → un `authUserId` déclaré n'est plus accepté
//     (401) ; seule la session invitée (`sessionId`) donne accès ;
//   - `sessionId` : jeton porteur des invités, jamais interpolé tel quel dans un
//     filtre PostgREST (injection) — format strict.
// Testé par waouh-viewer-identity-test.ts.

const SESSION_RE = /^[A-Za-z0-9_.:-]{6,200}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ViewerIdentity =
  | { ok: true; authUserId: string | null; sessionId: string | null; mode: "jwt" | "guest" }
  | { ok: false; status: number; error: string };

export function resolveViewerIdentity(input: {
  jwtUserId: string | null;
  claimedAuthUserId: string | null;
  sessionId: string | null;
}): ViewerIdentity {
  const claimed = input.claimedAuthUserId?.trim() || null;
  const session = input.sessionId?.trim() || null;

  if (claimed && !UUID_RE.test(claimed)) return { ok: false, status: 400, error: "invalid_auth_user_id" };
  if (session && !SESSION_RE.test(session)) return { ok: false, status: 400, error: "invalid_session_id" };

  if (input.jwtUserId) {
    if (claimed && claimed.toLowerCase() !== input.jwtUserId.toLowerCase()) {
      return { ok: false, status: 403, error: "auth_user_mismatch" };
    }
    return { ok: true, authUserId: input.jwtUserId, sessionId: session, mode: "jwt" };
  }
  if (session) return { ok: true, authUserId: null, sessionId: session, mode: "guest" };
  if (claimed) return { ok: false, status: 401, error: "auth_required" };
  return { ok: false, status: 400, error: "missing viewer identity" };
}
