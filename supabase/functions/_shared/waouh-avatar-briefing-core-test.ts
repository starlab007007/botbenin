// deno-lint-ignore-file no-explicit-any
// Livraison des points de l'avatar et tick planifié (base simulée) : cadence, heures calmes, dédoublonnage, isolation des erreurs.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deliverBriefing, loadPrefs, runAvatarBriefingTick, savePrefs } from "./waouh-avatar-briefing-core.ts";

type Row = Record<string, any>;
const AUTH = "auth-1";
// 29/09/2026 10:00 UTC = 11 h au Bénin (hors heures calmes) ; 21:30 UTC = 22 h 30 au Bénin (heures calmes).
const MORNING = new Date(Date.UTC(2026, 8, 29, 10, 0, 0));
const NIGHT = new Date(Date.UTC(2026, 8, 29, 21, 30, 0));
const ago = (from: Date, h: number) => new Date(from.getTime() - h * 3600_000).toISOString();

function fakeDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    waouh_avatar_prefs: [], waouh_users: [{ id: "u1", auth_user_id: AUTH, display_name: "Zime Songbian", created_at: "2026-01-01" }],
    waouh_chat_threads: [], waouh_messages: [], waouh_deals: [], waouh_negotiations: [], waouh_articles: [], ...seed,
  };
  const from = (t: string) => {
    let rows = [...(tables[t] ?? [])];
    let mode: "select" | "insert" | "upsert" = "select";
    let payload: Row | null = null;
    let head = false;
    const api: any = {
      select: (_c?: string, o?: any) => { head = !!o?.head; return api; },
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return api; },
      neq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] !== v); return api; },
      in: () => api, not: () => api, or: () => api, gte: () => api, order: () => api, limit: () => api,
      insert: (p: Row) => { mode = "insert"; payload = p; return api; },
      upsert: (p: Row) => { mode = "upsert"; payload = p; return api; },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      single: () => {
        if (mode === "insert") { const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...payload }; tables[t].push(row); return Promise.resolve({ data: row, error: null }); }
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      then: (res: (v: any) => void) => {
        if (mode === "upsert") {
          const existing = tables[t].find((r) => r.auth_user_id === payload!.auth_user_id);
          if (existing) Object.assign(existing, payload); else tables[t].push({ ...payload });
          return res({ data: null, error: null });
        }
        return res({ data: head ? null : rows, count: head ? rows.length : undefined, error: null });
      },
    };
    return api;
  };
  return { tables, from };
}

Deno.test("premier accueil : point « first » écrit dans le chat, préférences créées, dernier point mémorisé", async () => {
  const db = fakeDb();
  const r = await deliverBriefing(db, { authUserId: AUTH, trigger: "open", now: MORNING, webSessionId: "sess-123456" });
  assertEquals([r.sent, r.briefing?.kind], [true, "first"]);
  const msg = db.tables.waouh_messages[0];
  assertEquals([msg.user_id, msg.direction, msg.web_session_id, msg.meta.intent], ["u1", "out", "sess-123456", "avatar_briefing"]);
  assert(msg.text.includes("Bienvenue Zime"), msg.text);
  assertEquals(db.tables.waouh_avatar_prefs[0].last_briefing_at, MORNING.toISOString());
});

Deno.test("ouvertures rapprochées : un seul accueil (30 min) ; accueil désactivé : aucun ; point manuel toujours possible", async () => {
  const db = fakeDb();
  await deliverBriefing(db, { authUserId: AUTH, trigger: "open", now: MORNING });
  const soon = new Date(MORNING.getTime() + 10 * 60_000);
  assertEquals((await deliverBriefing(db, { authUserId: AUTH, trigger: "open", now: soon })).reason, "too_soon");
  assertEquals(db.tables.waouh_messages.length, 1);
  await savePrefs(db, AUTH, { welcome: false });
  const later = new Date(MORNING.getTime() + 3 * 3600_000);
  assertEquals((await deliverBriefing(db, { authUserId: AUTH, trigger: "open", now: later })).reason, "welcome_off");
  assertEquals((await deliverBriefing(db, { authUserId: AUTH, trigger: "now" as any, now: later })).sent, false, "trigger inconnu : la règle ne s'applique pas comme un manuel");
  assertEquals((await deliverBriefing(db, { authUserId: AUTH, trigger: "manual", now: later })).sent, true);
});

Deno.test("tick : point régulier à l'échéance, hors heures calmes, une seule fois ; cadence coupée exclue", async () => {
  const db = fakeDb({ waouh_avatar_prefs: [{ auth_user_id: AUTH, welcome: true, cadence: "every_4h", quiet_start: 21, quiet_end: 7, last_briefing_at: ago(MORNING, 5), last_digest: "obsolète" }] });
  const first = await runAvatarBriefingTick(db, { now: MORNING });
  assertEquals([first.scanned, first.sent, first.errors], [1, 1, 0]);
  assertEquals(db.tables.waouh_messages[0].meta.avatar_briefing.kind, "digest");
  const again = await runAvatarBriefingTick(db, { now: new Date(MORNING.getTime() + 60_000) });
  assertEquals([again.sent, again.skipped], [0, 1]);
  const off = fakeDb({ waouh_avatar_prefs: [{ auth_user_id: AUTH, cadence: "off", welcome: true, quiet_start: 21, quiet_end: 7, last_briefing_at: null }] });
  assertEquals((await runAvatarBriefingTick(off, { now: MORNING })).scanned, 0);
});

Deno.test("tick : heures calmes (22 h 30 au Bénin) → aucun message ; rien de nouveau depuis le dernier point → aucun message", async () => {
  const seed = { waouh_avatar_prefs: [{ auth_user_id: AUTH, welcome: true, cadence: "hourly", quiet_start: 21, quiet_end: 7, last_briefing_at: ago(NIGHT, 3), last_digest: "obsolète" }] };
  const night = fakeDb(seed);
  const n = await runAvatarBriefingTick(night, { now: NIGHT });
  assertEquals([n.sent, n.skipped], [0, 1]);
  assertEquals(night.tables.waouh_messages.length, 0);
  // Même empreinte que la dernière fois et rien d'actionnable : pas de point vide répété.
  const first = fakeDb({ waouh_avatar_prefs: [{ ...seed.waouh_avatar_prefs[0], last_briefing_at: ago(MORNING, 3), last_digest: null }] });
  await deliverBriefing(first, { authUserId: AUTH, trigger: "manual", now: new Date(MORNING.getTime() - 2 * 3600_000) });
  const digest = first.tables.waouh_avatar_prefs[0].last_digest;
  first.tables.waouh_avatar_prefs[0].last_briefing_at = ago(MORNING, 2);
  const quiet = await runAvatarBriefingTick(first, { now: MORNING });
  assertEquals(quiet.sent, 0, `digest inchangé (${digest}) : rien à dire`);
});

Deno.test("une erreur sur un utilisateur n'arrête pas les autres", async () => {
  const db = fakeDb({
    waouh_avatar_prefs: [
      { auth_user_id: "bad", cadence: "daily", welcome: true, quiet_start: 21, quiet_end: 7, last_briefing_at: null },
      { auth_user_id: AUTH, cadence: "daily", welcome: true, quiet_start: 21, quiet_end: 7, last_briefing_at: null },
    ],
  });
  const realFrom = db.from;
  (db as any).from = (t: string) => {
    if (t === "waouh_users") {
      const api = realFrom(t);
      const eq = api.eq;
      api.eq = (c: string, v: unknown) => { if (v === "bad") throw new Error("panne"); return eq(c, v); };
      return api;
    }
    return realFrom(t);
  };
  const r = await runAvatarBriefingTick(db, { now: MORNING });
  assertEquals([r.scanned, r.sent, r.errors], [2, 1, 1]);
});

Deno.test("réglages : valeurs invalides ignorées, relecture cohérente", async () => {
  const db = fakeDb();
  await savePrefs(db, AUTH, { cadence: "weekly", quiet_start: 22, quiet_end: 6, welcome: false });
  const p = await savePrefs(db, AUTH, { cadence: "toutes-les-secondes", quiet_start: 99, welcome: "oui" });
  assertEquals([p.cadence, p.quietStart, p.quietEnd, p.welcome], ["weekly", 22, 6, false]);
  assertEquals((await loadPrefs(db, "inconnu")).exists, false);
});
