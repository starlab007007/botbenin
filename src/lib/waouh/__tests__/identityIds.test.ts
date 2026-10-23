import { describe, expect, it } from "vitest";
import { fetchAuthIdentityIds, IDENTITY_PAGE_SIZE } from "../identityIds";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${String(i).padStart(4, "0")}` }));
const fake = (all: Array<{ id: string }>) => ({
  from: () => {
    const api: any = {
      select: () => api, eq: () => api, order: () => api,
      range: (from: number, to: number) => Promise.resolve({ data: all.slice(from, to + 1) }),
    };
    return api;
  },
});

describe("identités d'un compte (Web)", () => {
  it.each([0, 10, IDENTITY_PAGE_SIZE, 177, 211, 1001])("lit les %i identités, y compris celles au milieu", async (count) => {
    expect(await fetchAuthIdentityIds(fake(rows(count)), "auth-1")).toEqual(rows(count).map(r => r.id));
  });
  it("déduplique les identités aux frontières des pages", async () => {
    const all = rows(101); all[100] = all[99];
    expect(await fetchAuthIdentityIds(fake(all), "auth-1")).toHaveLength(100);
  });
  it("réponse vide : liste vide, pas d'exception", async () => {
    const empty = { from: () => { const a: any = { select: () => a, eq: () => a, order: () => a, range: () => Promise.resolve({ data: null }) }; return a; } };
    expect(await fetchAuthIdentityIds(empty, "auth-1")).toEqual([]);
  });
});
