// Run only against the isolated Bot.BJ E2E project; never production.
const base = (process.env.SB_URL || "").replace(/\/$/, "");
const key = process.env.SB_ANON_KEY || "";
if (base !== "https://ljzwqyzaovnandpyfpgc.supabase.co" || !key) {
  throw new Error("Set SB_URL to the isolated E2E project and provide SB_ANON_KEY.");
}
const checks = [];
async function history(name, sid, scope, expected, fn = "waouh-history") {
  const response = await fetch(base + "/functions/v1/" + fn, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", "x-waouh-session": sid },
    body: JSON.stringify({
      sessionId: sid, scope, limit: 200, includeMeta: false,
      ...(fn === "waouh-match-history" ? {
        thread_id: "0c61cded-1d8f-42b5-ad76-3a29e23c8c33",
        article_id: "a0231023-0000-4000-8000-000000000101", role: "buyer",
      } : {}),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  let pass = response.status === expected;
  if (expected === 200) pass &&= body.ok === true && body.messages.length > 0;
  if (scope === "main" && expected === 200) pass &&= body.messages.every(m => !m.thread_id);
  checks.push({ name, pass, status: response.status, count: body.messages?.length });
}
await history("Claimed session is not an anonymous identity", "qa-owned-20261023", "main", 403);
await history("Message-only ownership is checked", "qa-owned-message-only-20261023", "main", 403);
await history("Legitimate guest main history", "qa-20261023-acheteur-a", "main", 200);
await history("Legacy full history still works", "qa-20261023-acheteur-a", null, 200);
await history("Deal Room rejects a claimed session", "qa-owned-20261023", null, 403, "waouh-match-history");
await history("Deal Room keeps legitimate access", "qa-20261023-acheteur-a", null, 200, "waouh-match-history");
for (const [sid, expectedEmpty] of [["qa-owned-20261023", true], ["qa-owned-message-only-20261023", true], ["qa-20261023-acheteur-a", false]]) {
  const response = await fetch(base + "/rest/v1/waouh_messages?select=id&web_session_id=eq." + sid,
    { headers: { apikey: key, "x-waouh-session": sid }, signal: AbortSignal.timeout(20000) });
  const body = await response.json();
  checks.push({ name: "RLS " + sid, pass: response.status === 200 && Array.isArray(body) && (expectedEmpty ? body.length === 0 : body.length > 0), status: response.status });
}
console.log(JSON.stringify({ checks, passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length }, null, 2));
process.exit(checks.every(x => x.pass) ? 0 : 1);
