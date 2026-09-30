// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { linkPartnerSellerAccount } from "./waouh-deal-open.ts";

function fakeDb(state: { users: any[]; partners: any[]; articles: any[] }) {
  return {
    from: (table: string) => {
      const rows = table === "waouh_users" ? state.users : table === "waouh_partners" ? state.partners : state.articles;
      const filters: Array<(r: any) => boolean> = [];
      let patch: any = null;
      let order: { c: string; asc: boolean } | null = null;
      const pick = () => {
        let r = rows.filter((x) => filters.every((f) => f(x)));
        if (order) r = [...r].sort((a, b) => (String(a[order!.c]) < String(b[order!.c]) ? -1 : 1) * (order!.asc ? 1 : -1));
        return r;
      };
      const api: any = {
        select: () => api,
        update: (p: any) => { patch = p; return api; },
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
        order: (c: string, o: any) => { order = { c, asc: o?.ascending !== false }; return api; },
        limit: () => api,
        maybeSingle: () => Promise.resolve({ data: pick()[0] ?? null }),
        then: (res: any) => {
          if (patch) pick().forEach((r) => Object.assign(r, patch));
          return Promise.resolve({ data: null }).then(res);
        },
      };
      return api;
    },
  };
}

const base = () => ({
  users: [
    { id: "phone-row", auth_user_id: null, created_at: "2026-05-01" },
    { id: "owner-old", auth_user_id: "owner", created_at: "2026-01-01" },
    { id: "owner-new", auth_user_id: "owner", created_at: "2026-09-01" },
  ],
  partners: [{ id: "p1", user_id: "owner" }],
  articles: [{ id: "a1", seller_id: "phone-row", partner_id: "p1" }],
});

Deno.test("catalogue partenaire : le vendeur devient la ligne canonique du compte propriétaire", async () => {
  const state = base();
  const article: any = { id: "a1", seller_id: "phone-row", partner_id: "p1" };
  assertEquals(await linkPartnerSellerAccount(fakeDb(state), article), "owner");
  assertEquals(article.seller_id, "owner-old");
  assertEquals(state.articles[0].seller_id, "owner-old");
  assertEquals(state.users[0].auth_user_id, null); // la ligne téléphone (éventuellement partagée) n'est jamais liée
});

Deno.test("déjà au nom du propriétaire : rien ne change", async () => {
  const state = base();
  state.articles[0].seller_id = "owner-new";
  const article: any = { id: "a1", seller_id: "owner-new", partner_id: "p1" };
  assertEquals(await linkPartnerSellerAccount(fakeDb(state), article), "owner");
  assertEquals(state.articles[0].seller_id, "owner-new");
});

Deno.test("sans partenaire, propriétaire inconnu ou panne : aucune modification", async () => {
  const state = base();
  state.partners = [];
  const article: any = { id: "a1", seller_id: "phone-row", partner_id: "p1" };
  assertEquals(await linkPartnerSellerAccount(fakeDb(state), article), null);
  assertEquals(await linkPartnerSellerAccount(fakeDb(base()), { id: "a1", seller_id: "phone-row" }), null);
  assertEquals(await linkPartnerSellerAccount(fakeDb(base()), null), null);
  assertEquals(await linkPartnerSellerAccount({ from: () => { throw new Error("panne"); } }, article), null);
  assertEquals(article.seller_id, "phone-row");
});
