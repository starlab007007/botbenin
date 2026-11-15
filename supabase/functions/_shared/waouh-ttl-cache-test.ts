import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createTtlCache, dedupeInflight } from "./waouh-ttl-cache.ts";

Deno.test("mémoire courte : lecture, éviction et expiration", async () => {
  const c = createTtlCache<number>(30, 2);
  c.set("a", 1); c.set("b", 2); c.set("c", 3);
  assertEquals(c.get("a"), undefined);
  assertEquals(c.get("c"), 3);
  await new Promise((r) => setTimeout(r, 50));
  assertEquals(c.get("c"), undefined);
});

Deno.test("deux demandes identiques simultanées ne font qu'un appel", async () => {
  let calls = 0;
  const running = new Map<string, Promise<number>>();
  const run = () => dedupeInflight(running, "k", async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return 7; });
  const [x, y] = await Promise.all([run(), run()]);
  assertEquals([x, y, calls], [7, 7, 1]);
});
