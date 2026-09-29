// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  clearPinFailures, clientAddress, currentPinLock, decidePinLock, PIN_MAX_FAILS_CLIENT, PIN_MAX_FAILS_IDENTITY, PIN_WINDOW_MS, recordPinFailure,
} from "./waouh-pin-throttle.ts";

const NOW = 1_800_000_000_000;
const ago = (ms: number) => NOW - ms;

Deno.test("sous le seuil : pas de verrou", () => {
  assertEquals(decidePinLock({ identityFailures: [ago(1000), ago(2000), ago(3000), ago(4000)], clientFailures: [], now: NOW }).locked, false);
});

Deno.test("5 échecs sur le matricule : verrou, durée = jusqu'à sortie de fenêtre du plus ancien décisif", () => {
  const d = decidePinLock({ identityFailures: [ago(600_000), ago(500_000), ago(400_000), ago(300_000), ago(200_000)], clientFailures: [], now: NOW });
  assertEquals([d.locked, d.reason], [true, "identity"]);
  assertEquals(d.retryAfterSec, Math.ceil((PIN_WINDOW_MS - 600_000) / 1000)); // 300 s
});

Deno.test("les échecs hors fenêtre ne comptent plus : le verrou se lève", () => {
  const old = Array.from({ length: 9 }, (_, i) => ago(PIN_WINDOW_MS + 1000 + i));
  assertEquals(decidePinLock({ identityFailures: old, clientFailures: old, now: NOW }).locked, false);
});

Deno.test("20 échecs d'un même client sur des matricules différents : verrou client", () => {
  const many = Array.from({ length: PIN_MAX_FAILS_CLIENT }, (_, i) => ago(1000 * (i + 1)));
  const d = decidePinLock({ identityFailures: [], clientFailures: many, now: NOW });
  assertEquals([d.locked, d.reason], [true, "client"]);
  assert(d.retryAfterSec > 0 && d.retryAfterSec <= PIN_WINDOW_MS / 1000);
});

Deno.test("adresse du client : première valeur de x-forwarded-for", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n.toLowerCase()] ?? null });
  assertEquals(clientAddress(h({ "x-forwarded-for": "41.0.0.1, 10.0.0.2" })), "41.0.0.1");
  assertEquals(clientAddress(h({ "cf-connecting-ip": "41.0.0.9" })), "41.0.0.9");
  assertEquals(clientAddress(h({})), "unknown");
});

// Base simulée de la table d'essais.
function fakeAdmin(rows: any[], failing = false) {
  return {
    from: () => {
      let filters: Array<(r: any) => boolean> = [];
      let mode: "select" | "delete" | "insert" = "select";
      let payload: any = null;
      const api: any = {
        select: () => api,
        insert: (p: any) => { mode = "insert"; payload = p; return api; },
        delete: () => { mode = "delete"; return api; },
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
        gte: (c: string, v: string) => { filters.push((r) => r[c] >= v); return api; },
        lt: (c: string, v: string) => { filters.push((r) => r[c] < v); return api; },
        limit: () => api,
        then: (resolve: (v: any) => void) => {
          if (failing) return resolve({ data: null, error: { message: "relation does not exist" } });
          const match = rows.filter((r) => filters.every((f) => f(r)));
          if (mode === "insert") rows.push({ failed_at: new Date().toISOString(), ...payload });
          if (mode === "delete") for (const r of match) rows.splice(rows.indexOf(r), 1);
          return resolve({ data: mode === "select" ? match : null, error: null });
        },
      };
      return api;
    },
  };
}

Deno.test("cycle complet : 5 échecs → verrou ; un autre matricule et un autre client ne sont pas touchés ; succès → purge", async () => {
  const rows: any[] = [];
  const admin: any = fakeAdmin(rows);
  for (let i = 0; i < PIN_MAX_FAILS_IDENTITY; i++) {
    assertEquals((await currentPinLock(admin, "site1", "EMP1", `client${i}`)).locked, false, `essai ${i}`);
    await recordPinFailure(admin, "site1", "EMP1", `client${i}`);
  }
  assertEquals((await currentPinLock(admin, "site1", "EMP1", "clientX")).locked, true, "même matricule, autre client : verrouillé");
  assertEquals((await currentPinLock(admin, "site1", "EMP2", "clientX")).locked, false, "autre matricule : libre");
  assertEquals((await currentPinLock(admin, "site2", "EMP1", "clientX")).locked, false, "autre site : libre");
  await clearPinFailures(admin, "site1", "EMP1");
  assertEquals((await currentPinLock(admin, "site1", "EMP1", "clientX")).locked, false);
});

Deno.test("table absente : le pointage n'est pas bloqué mais l'échec est journalisé (protection inactive)", async () => {
  const admin: any = fakeAdmin([], true);
  assertEquals((await currentPinLock(admin, "s", "E", "c")).locked, false);
  await recordPinFailure(admin, "s", "E", "c"); // ne lève pas
});
