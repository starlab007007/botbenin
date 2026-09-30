// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveSiblingUserIds, SIBLING_PAGE } from "./waouh-identity.ts";

// Base simulée : un compte avec `n` identités (une par session Web), servies par pages comme PostgREST.
const db = (n: number) => {
  const all = Array.from({ length: n }, (_, i) => ({ id: `id-${String(i).padStart(5, "0")}` }));
  let calls = 0;
  return {
    get calls() { return calls; },
    all,
    from: (_t: string) => {
      let from = 0, to = all.length - 1;
      const api: any = {
        select: () => api, eq: () => api, order: () => api, in: () => api, limit: (m: number) => { to = Math.min(to, from + m - 1); return api; },
        range: (a: number, b: number) => { from = a; to = b; return api; },
        maybeSingle: () => Promise.resolve({ data: null }),
        then: (res: (v: any) => void) => { calls++; return res({ data: all.slice(from, to + 1), error: null }); },
      };
      return api;
    },
  };
};

Deno.test("compte avec 96 / 177 identités (cas de production) : toutes sont retrouvées, dont la plus récente", async () => {
  for (const n of [96, 177]) {
    const d = db(n);
    const ids = await resolveSiblingUserIds(d, { id: d.all[0].id, auth_user_id: "auth-1" });
    assertEquals(ids.length, n);
    assert(ids.includes(d.all[n - 1].id), "la dernière identité (ex. la ligne vendeur d'un fil récent) est incluse");
  }
});

Deno.test("plus d'une page : lecture page par page, 3 pages au plus", async () => {
  const d = db(SIBLING_PAGE + 250);
  const ids = await resolveSiblingUserIds(d, { id: d.all[0].id, auth_user_id: "auth-1" });
  assertEquals(ids.length, SIBLING_PAGE + 250);
  assertEquals(d.calls, 2);
  const huge = db(SIBLING_PAGE * 5);
  assertEquals((await resolveSiblingUserIds(huge, { id: huge.all[0].id, auth_user_id: "auth-1" })).length, SIBLING_PAGE * 3);
});

Deno.test("sans compte authentifié : aucune lecture paginée", async () => {
  const d = db(10);
  assertEquals(await resolveSiblingUserIds(d, { id: "solo" }), ["solo"]);
  assertEquals(d.calls, 0);
});
