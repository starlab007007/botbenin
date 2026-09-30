import { describe, expect, it } from "vitest";
import { fetchAuthIdentityIds, IDENTITY_EDGE } from "../identityIds";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${String(i).padStart(4, "0")}` })); // id-0000 = la plus ancienne
const fake = (all: Array<{ id: string }>) => ({
  from: () => {
    let asc = true;
    const api: any = {
      select: () => api, eq: () => api,
      order: (_c: string, o: { ascending: boolean }) => { asc = o.ascending; return api; },
      limit: (n: number) => Promise.resolve({ data: (asc ? all : [...all].reverse()).slice(0, n) }),
    };
    return api;
  },
});

describe("identités d'un compte (Web)", () => {
  it("compte à 177 lignes : la plus ancienne (canonique) ET la plus récente sont toujours lues", async () => {
    const ids = await fetchAuthIdentityIds(fake(rows(177)), "auth-1");
    expect(ids).toContain("id-0000");
    expect(ids).toContain("id-0176");
    expect(ids.length).toBe(IDENTITY_EDGE * 2);
  });
  it("petit compte : toutes les lignes, sans doublon", async () => {
    const ids = await fetchAuthIdentityIds(fake(rows(10)), "auth-1");
    expect(ids.sort()).toEqual(rows(10).map((r) => r.id).sort());
  });
  it("réponses vides ou en erreur : liste vide, pas d'exception", async () => {
    const empty = { from: () => { const a: any = { select: () => a, eq: () => a, order: () => a, limit: () => Promise.resolve({ data: null }) }; return a; } };
    expect(await fetchAuthIdentityIds(empty, "auth-1")).toEqual([]);
  });
});
