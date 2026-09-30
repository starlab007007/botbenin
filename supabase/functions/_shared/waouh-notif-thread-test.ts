// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { pickNotifThreadId, resolveNotifThreadId } from "./waouh-notif-thread.ts";

const T = "9dcd8c51-e200-4e30-9ef4-170678104626";
const D = "5730a9c8-dbfa-49f9-b80d-f7e79685ee43";
const db = (threadOfDeal: string | null, calls: string[]) => ({
  from: (t: string) => ({ select: () => ({ eq: (_c: string, v: string) => ({ maybeSingle: () => { calls.push(`${t}:${v}`); return Promise.resolve({ data: { thread_id: threadOfDeal } }); } }) }) }),
});

Deno.test("pickNotifThreadId : premier uuid valide, sinon null", () => {
  assertEquals(pickNotifThreadId(undefined, "pas-un-uuid", T.toUpperCase()), T);
  assertEquals(pickNotifThreadId(null, 42, ""), null);
});

Deno.test("notification de livraison : le thread du deal est repris quand la charge utile n'en a pas ; aucune requête s'il est déjà connu", async () => {
  const calls: string[] = [];
  assertEquals(await resolveNotifThreadId(db(T, calls), { deal_id: D, role: "buyer" }), T);
  assertEquals(calls, [`waouh_deals:${D}`]);
  assertEquals(await resolveNotifThreadId(db(null, calls), { thread_id: T, deal_id: D }), T);
  assertEquals(calls.length, 1, "pas de seconde requête");
  assertEquals(await resolveNotifThreadId(db(null, calls), { deal_id: D }), null);
  assertEquals(await resolveNotifThreadId(db(T, calls), { deal_id: "x'; drop" }), null);
  assertEquals(await resolveNotifThreadId({ from: () => { throw new Error("panne"); } }, { deal_id: D }), null);
});
