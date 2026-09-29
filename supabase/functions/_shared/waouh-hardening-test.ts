// E7 (fan-out observable), E8 (gestionnaires retirés), E9 (notify-dispatch réservé aux appels internes).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isServiceCaller, safeEqual } from "./waouh-internal-auth.ts";
import { runFanout } from "./waouh-fanout.ts";
import { legacyHandlerResponse, LEGACY_HANDLER_REPLACEMENT } from "./waouh-legacy-handler.ts";

const req = (auth?: string) => ({ headers: { get: (n: string) => (n.toLowerCase() === "authorization" ? auth ?? null : null) } });

Deno.test("E9 : seule la clé service passe ; anon, vide, préfixe ou clé service vide sont refusés", () => {
  assert(isServiceCaller(req("Bearer SERVICE-KEY"), "SERVICE-KEY"));
  assert(isServiceCaller(req("bearer SERVICE-KEY"), "SERVICE-KEY"));
  assert(!isServiceCaller(req("Bearer anon-key"), "SERVICE-KEY"));
  assert(!isServiceCaller(req("Bearer SERVICE-KE"), "SERVICE-KEY"));
  assert(!isServiceCaller(req("Bearer SERVICE-KEY-plus"), "SERVICE-KEY"));
  assert(!isServiceCaller(req(""), "SERVICE-KEY"));
  assert(!isServiceCaller(req(), "SERVICE-KEY"));
  assert(!isServiceCaller(req("Bearer "), ""), "clé service absente : jamais ouvert");
  assert(!isServiceCaller(req("Bearer x"), undefined));
  assert(safeEqual("abc", "abc") && !safeEqual("abc", "abd") && !safeEqual("abc", "abcd"));
});

Deno.test("E9 : tous les appelants de waouh-notify-dispatch envoient la clé service", () => {
  const root = new URL("../", import.meta.url);
  const callers: string[] = [];
  for (const entry of Deno.readDirSync(root)) {
    if (!entry.isDirectory || entry.name === "_shared" || entry.name === "waouh-notify-dispatch") continue;
    let text = "";
    try { text = Deno.readTextFileSync(new URL(`${entry.name}/index.ts`, root)); } catch { continue; }
    if (text.includes("waouh-notify-dispatch")) callers.push(entry.name);
    const idx = text.indexOf("functions/v1/waouh-notify-dispatch");
    if (idx >= 0) {
      const around = text.slice(idx, idx + 400);
      assert(/Bearer \$\{(SERVICE_ROLE|SERVICE|sbKey)\}/.test(around), `${entry.name} n'envoie pas la clé service à notify-dispatch`);
    }
  }
  const shared = Deno.readTextFileSync(new URL("waouh-deal-open.ts", import.meta.url));
  assert(/Bearer \$\{serviceRole\}/.test(shared.slice(shared.indexOf("waouh-notify-dispatch"))));
  assert(callers.length >= 5, `appelants trouvés : ${callers.join(",")}`);
});

Deno.test("E7 : fan-out réussi → ok:true avec le statut", async () => {
  const fetchImpl = (() => Promise.resolve(new Response(JSON.stringify({ notified: 3 }), { status: 200 }))) as typeof fetch;
  const r = await runFanout("https://x/f", { headers: {}, body: { article_id: "a" } }, { fetchImpl });
  assertEquals([r.ok, r.status], [true, 200]);
  assert(r.detail.includes("notified"));
});

Deno.test("E7 : 500, réseau coupé et délai dépassé → ok:false observable, jamais d'exception", async () => {
  const boom = (() => Promise.resolve(new Response("erreur", { status: 500 }))) as typeof fetch;
  assertEquals((await runFanout("u", { headers: {}, body: {} }, { fetchImpl: boom })).status, 500);
  const down = (() => Promise.reject(new Error("réseau"))) as typeof fetch;
  const d = await runFanout("u", { headers: {}, body: {} }, { fetchImpl: down });
  assertEquals([d.ok, d.status, d.detail], [false, 0, "réseau"]);
  const slow = ((_u: string, init: RequestInit) => new Promise((_, reject) => {
    init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
  })) as unknown as typeof fetch;
  const t = await runFanout("u", { headers: {}, body: {} }, { fetchImpl: slow, timeoutMs: 20 });
  assertEquals([t.ok, t.detail], [false, "timeout"]);
});

Deno.test("E7 : la publication ne masque plus l'échec (plus de .catch vide sur le fan-out)", () => {
  const src = Deno.readTextFileSync(new URL("../waouh-status-publish/index.ts", import.meta.url));
  assert(!/catch\(\(\) => \{\}\)/.test(src));
  assert(src.includes("buyers_notified"));
});

Deno.test("E8 : gestionnaires retirés → 410 explicite avec le chemin de remplacement", async () => {
  const res = legacyHandlerResponse("waouh-sell-handler", { "Access-Control-Allow-Origin": "*" });
  assertEquals(res.status, 410);
  const body = await res.json();
  assertEquals([body.code, body.use, body.handler], ["handler_retired", LEGACY_HANDLER_REPLACEMENT, "waouh-sell-handler"]);
  for (const n of ["sell", "buy", "negotiate"]) {
    const src = Deno.readTextFileSync(new URL(`../waouh-${n}-handler/index.ts`, import.meta.url));
    assert(src.includes("legacyHandlerResponse") && !src.includes("LOVABLE_API_KEY"), n);
  }
});

Deno.test("chaîne du chat : aucun import supabase-js flottant (@2) — versions épinglées", () => {
  const critical = [
    "waouh-match-history", "waouh-negotiation-router", "waouh-deal-ops", "waouh-buyer-interest", "waouh-payment", "waouh-deal-dispatch",
    "waouh-notify-dispatch", "waouh-webhook", "waouh-channel-in", "waouh-commerce-action", "waouh-status-publish", "waouh-notify-buyers",
    "waouh-presence-public-page", "waouh-stock-ingest", "waouh-nexus-followup", "waouh-avatar-briefing",
  ];
  const floating = /from ['"](https:\/\/esm\.sh\/|npm:)@supabase\/supabase-js@2['"]/;
  for (const name of critical) {
    const text = Deno.readTextFileSync(new URL(`../${name}/index.ts`, import.meta.url));
    assert(!floating.test(text), `${name} importe supabase-js@2 sans version précise`);
  }
  assert(!floating.test(Deno.readTextFileSync(new URL("./waouh-deal.ts", import.meta.url))));
});

Deno.test("suivi de l'avatar : appel réservé à la clé service et jamais d'envoi automatique au tiers", () => {
  const fn = Deno.readTextFileSync(new URL("../waouh-nexus-followup/index.ts", import.meta.url));
  assert(fn.includes("isServiceCaller") && fn.includes("nexusDirectDealEnabled"));
  const core = Deno.readTextFileSync(new URL("./waouh-nexus-followup-core.ts", import.meta.url));
  assert(!core.includes("transmitExternalOffer") && !core.includes("nexus.contact.send"), "le suivi n'envoie rien : il écrit des notes");
});

Deno.test("le double de test du cœur agentique n'est pas dans les fonctions déployables", () => {
  let found = false;
  try { Deno.statSync(new URL("../waouh-studio-e2e-v21465/index.ts", import.meta.url)); found = true; } catch { /* attendu */ }
  // waouh-studio-e2e-v21465 est l'alias de production du cœur agentique : il ne doit contenir aucune trace du double.
  if (found) assert(!Deno.readTextFileSync(new URL("../waouh-studio-e2e-v21465/index.ts", import.meta.url)).includes("DOUBLE DE TEST"));
});

Deno.test("avatar guide : identité issue du jeton uniquement, tick réservé au service, aucun envoi à un tiers", () => {
  const fn = Deno.readTextFileSync(new URL("../waouh-avatar-briefing/index.ts", import.meta.url));
  assert(fn.includes("getRequestUser") && fn.includes("isServiceCaller"));
  assert(!/body\??\.(auth_user_id|user_id)/.test(fn), "aucun identifiant d'utilisateur lu dans le corps de la requête");
  const core = Deno.readTextFileSync(new URL("./waouh-avatar-briefing-core.ts", import.meta.url));
  assert(!core.includes("transmitExternalOffer") && !core.includes("nexus.contact.send") && !core.includes("waouh-outbound"), "le guide écrit dans le chat, il n'envoie rien à un tiers");
});

Deno.test("pointage public : bcryptjs importé en espace de noms (l'import nommé a provoqué un BOOT_ERROR au redéploiement)", () => {
  const src = Deno.readTextFileSync(new URL("../waouh-presence-public-page/index.ts", import.meta.url));
  assert(!/import\s*\{[^}]*compareSync[^}]*\}\s*from\s*["']https:\/\/esm\.sh\/bcryptjs/.test(src), "import nommé de compareSync interdit");
  assert(/import \* as bcryptModule from "https:\/\/esm\.sh\/bcryptjs@2\.4\.3"/.test(src));
});
