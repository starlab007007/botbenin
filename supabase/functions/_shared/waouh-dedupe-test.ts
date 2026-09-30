// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { recentDuplicateExists } from "./waouh-dedupe.ts";

const NOW = new Date("2026-09-30T08:00:00Z");
const row = (o: any) => ({ thread_id: "t1", user_id: "u1", direction: "in", text: "Je suis intéressé", intent: "action_open_deal", created_at: new Date(NOW.getTime() - 2000).toISOString(), ...o });
const db = (rows: any[]) => ({
  from: () => {
    const f: Array<(r: any) => boolean> = [];
    const api: any = {
      select: () => api,
      eq: (c: string, v: unknown) => { f.push((r) => (c === "meta->>intent" ? r.intent : r[c]) === v); return api; },
      gte: (c: string, v: string) => { f.push((r) => r[c] >= v); return api; },
      limit: () => Promise.resolve({ data: rows.filter((r) => f.every((x) => x(r))) }),
    };
    return api;
  },
});
const q = { threadId: "t1", userId: "u1", direction: "in" as const, text: "Je suis intéressé", now: NOW };

Deno.test("doublon : même fil, même personne, même texte dans la fenêtre", async () => {
  assertEquals(await recentDuplicateExists(db([row({})]), q), true);
  assertEquals(await recentDuplicateExists(db([row({})]), { ...q, intent: "action_open_deal" }), true);
});

Deno.test("pas un doublon : texte différent, autre personne, autre fil, autre sens, hors fenêtre", async () => {
  assertEquals(await recentDuplicateExists(db([row({ text: "Autre" })]), q), false);
  assertEquals(await recentDuplicateExists(db([row({ user_id: "u2" })]), q), false);
  assertEquals(await recentDuplicateExists(db([row({ thread_id: "t2" })]), q), false);
  assertEquals(await recentDuplicateExists(db([row({ direction: "out" })]), q), false);
  assertEquals(await recentDuplicateExists(db([row({ created_at: new Date(NOW.getTime() - 60_000).toISOString() })]), q), false);
  assertEquals(await recentDuplicateExists(db([row({})]), { ...q, text: null, intent: "action_open_deal" }), true); // l'intention seule décide
  assertEquals(await recentDuplicateExists(db([row({ intent: "autre" })]), { ...q, text: null, intent: "action_open_deal" }), false);
});

Deno.test("sans clé utile ou en cas d'erreur : jamais de blocage (on écrit)", async () => {
  assertEquals(await recentDuplicateExists(db([row({})]), { threadId: null, userId: "u1", text: "x" }), false);
  assertEquals(await recentDuplicateExists(db([row({})]), { threadId: "t1", userId: "u1" }), false);
  assertEquals(await recentDuplicateExists({ from: () => { throw new Error("panne"); } }, q), false);
});

import { recentNotificationExists } from "./waouh-dedupe.ts";
Deno.test("notification déjà écrite pour ce fil, cette personne et ce type", async () => {
  const rows = [{ thread_id: "t1", user_id: "u1", notification_type: "new_buyer", sent_at: new Date(NOW.getTime() - 1000).toISOString() }];
  const nb = (data: any[]) => ({
    from: () => {
      const f: Array<(r: any) => boolean> = [];
      const api: any = {
        select: () => api,
        eq: (c: string, v: unknown) => { f.push((r) => r[c] === v); return api; },
        gte: (c: string, v: string) => { f.push((r) => r[c] >= v); return api; },
        limit: () => Promise.resolve({ data: data.filter((r) => f.every((x) => x(r))) }),
      };
      return api;
    },
  });
  const q = { threadId: "t1", userId: "u1", type: "new_buyer", now: NOW };
  assertEquals(await recentNotificationExists(nb(rows), q), true);
  assertEquals(await recentNotificationExists(nb(rows), { ...q, type: "autre" }), false);
  assertEquals(await recentNotificationExists(nb(rows), { ...q, userId: "u2" }), false);
  assertEquals(await recentNotificationExists(nb(rows), { ...q, now: new Date(NOW.getTime() + 120_000) }), false);
  assertEquals(await recentNotificationExists(nb(rows), { ...q, threadId: null }), false);
  assertEquals(await recentNotificationExists({ from: () => { throw new Error("panne"); } }, q), false);
});
