import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create table waouh_opportunity_journeys(id uuid primary key,owner_id uuid,fabric_id text,mode text,stage text,mandate_id uuid,thread_id uuid,article_id uuid,next_best_action text,contactability_level text default 'C0',timeline jsonb default '[]',metadata jsonb default '{}',last_action text,next_action text,last_message text,updated_at timestamptz,last_response_at timestamptz,last_activity_at timestamptz,completed_at timestamptz);
create table waouh_outbound_queue(id uuid primary key,template text,payload jsonb,status text);
create table waouh_conversation_bus_events(id uuid primary key default gen_random_uuid(),owner_id uuid,journey_id uuid,fabric_id text,mandate_id uuid,thread_id uuid,article_id uuid,channel text,direction text,event_type text,external_ref text,payload jsonb,created_at timestamptz default now());
create unique index bus_dedupe on waouh_conversation_bus_events(event_type,external_ref) where external_ref is not null;
create function waouh_append_conversation_bus_event(p_owner_id uuid,p_event_type text,p_channel text default 'waouh',p_direction text default 'system',p_fabric_id text default null,p_journey_id uuid default null,p_mandate_id uuid default null,p_article_id uuid default null,p_thread_id uuid default null,p_negotiation_id uuid default null,p_deal_id uuid default null,p_external_ref text default null,p_payload jsonb default '{}') returns uuid language plpgsql as $$ declare result uuid; begin insert into waouh_conversation_bus_events(owner_id,event_type,channel,direction,fabric_id,journey_id,external_ref,payload) values(p_owner_id,p_event_type,p_channel,p_direction,p_fabric_id,p_journey_id,p_external_ref,p_payload) on conflict(event_type,external_ref) where external_ref is not null do update set payload=excluded.payload returning id into result; return result; end $$;`);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261008213000_waouh_external_exchange.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(migration);
await db.exec(migration); // Reapplication must preserve agreements and access restrictions.
const owner = randomUUID(),
  journey = randomUUID(),
  invite = randomUUID();
await db.query(
  `insert into waouh_opportunity_journeys(id,owner_id,fabric_id,mode,stage) values($1,$2,'external:signal','buy','waiting_reply')`,
  [journey, owner],
);
await db.query(
  `insert into waouh_external_invites(id,journey_id,token_hash,expires_at) values($1,$2,$3,now()+interval '7 days')`,
  [invite, journey, "a".repeat(64)],
);
const mutate = async (role, op, options = {}) =>
  (
    await db.query(
      "select waouh_external_exchange_mutate($1,$2,$3,$4,$5,$6,$7,$8) result",
      [
        journey,
        role,
        op,
        options.request || randomUUID(),
        options.text || "",
        options.terms || {},
        options.agreement || null,
        options.invite === undefined ? invite : options.invite,
      ],
    )
  ).rows[0].result;
const terms = {
  amount: 25000,
  quantity: 1,
  delivery: "Cotonou · vendredi",
  payment: "Après réception",
  currency: "XOF",
};
await assert.rejects(
  mutate("counterparty", "message", { text: "Bonjour", invite: randomUUID() }),
  /invite_unavailable/,
);
const request = randomUUID();
await mutate("counterparty", "message", {
  request,
  text: "Disponible. Livraison vendredi.",
});
assert.equal(
  (await mutate("counterparty", "message", { request, text: "Duplicate" }))
    .reused,
  true,
);
assert.equal(
  (await db.query("select count(*)::int n from waouh_conversation_bus_events"))
    .rows[0].n,
  1,
);
await mutate("owner", "message", { request, text: "Owner response" });
assert.equal((await db.query("select count(*)::int n from waouh_conversation_bus_events")).rows[0].n, 2);
const first = (await mutate("owner", "propose", { terms })).agreement.id;
const current = (
  await mutate("counterparty", "propose", {
    terms: { ...terms, amount: 24000 },
  })
).agreement.id;
await assert.rejects(
  mutate("owner", "accept", { agreement: first }),
  /agreement_changed/,
);
await assert.rejects(
  mutate("owner", "receipt", { agreement: current }),
  /agreement_not_confirmed/,
);
await mutate("owner", "accept", { agreement: current });
assert.equal(
  (await db.query("select stage from waouh_opportunity_journeys")).rows[0]
    .stage,
  "agreed",
);
await assert.rejects(
  mutate("owner", "propose", { terms }),
  /agreement_already_confirmed/,
);
await assert.rejects(
  mutate("counterparty", "receipt", { agreement: current }),
  /participant_role_required/,
);
await assert.rejects(
  mutate("counterparty", "payment_received", { agreement: current }),
  /payment_not_reported/,
);
await mutate("counterparty", "shipment", { agreement: current });
await mutate("owner", "payment", { agreement: current });
await mutate("counterparty", "payment_received", { agreement: current });
assert.equal(
  (await db.query("select stage from waouh_opportunity_journeys")).rows[0]
    .stage,
  "executing",
);
await mutate("owner", "receipt", { agreement: current });
assert.equal(
  (await db.query("select stage from waouh_opportunity_journeys")).rows[0]
    .stage,
  "completed",
);
await assert.rejects(
  mutate("counterparty", "message", { text: "After completion" }),
  /journey_closed/,
);
await db.query(
  "update waouh_opportunity_journeys set stage='waiting_reply' where id=$1",
  [journey],
);
await db.query(
  "update waouh_external_invites set expires_at=now()-interval '1 minute' where id=$1",
  [invite],
);
await assert.rejects(
  mutate("counterparty", "message", { text: "Expired link" }),
  /invite_unavailable/,
);
await db.query(
  "update waouh_external_invites set expires_at=now()+interval '7 days',revoked_at=now() where id=$1",
  [invite],
);
await assert.rejects(
  mutate("counterparty", "message", { text: "Revoked link" }),
  /invite_unavailable/,
);
await db.query(
  "update waouh_external_invites set revoked_at=null where id=$1",
  [invite],
);
await db.exec("delete from waouh_conversation_bus_events");
for (let i = 0; i < 12; i++)
  await mutate("counterparty", "message", { text: "Test " + i });
await assert.rejects(
  mutate("counterparty", "message", { text: "Too many" }),
  /exchange_rate_limited/,
);
await db.exec("delete from waouh_conversation_bus_events");
await mutate("counterparty", "stop");
assert.equal(
  (await db.query("select stage from waouh_opportunity_journeys")).rows[0]
    .stage,
  "cancelled",
);
assert.ok(
  (await db.query("select revoked_at from waouh_external_invites")).rows[0]
    .revoked_at,
);
const queue = randomUUID();
await db.query(
  "insert into waouh_outbound_queue values($1,'nexus_discovery_outreach',$2,'sent')",
  [queue, { journey_id: journey, provider_message_id: "provider-1" }],
);
for (const status of ["read", "sent", "delivered"])
  await db.query("select waouh_external_ack('provider-1',$1)", [status]);
assert.equal(
  (
    await db.query(
      "select payload->>'delivery_status' status from waouh_conversation_bus_events where event_type='nexus.external.delivery'",
    )
  ).rows[0].status,
  "read",
);
await db.exec("set role anon");
await assert.rejects(
  db.query("select * from waouh_external_invites"),
  /permission denied/,
);
await assert.rejects(
  db.query(
    "select waouh_external_exchange_mutate($1,'owner','message',$2,'forged')",
    [journey, randomUUID()],
  ),
  /permission denied/,
);
await db.exec("reset role");
await db.close();
console.log(
  "External exchange SQL passed: guest scope, expiry, revocation, idempotency, stale offers, bilateral agreement, participant roles, delivery/payment completion, rate limit and monotonic receipts.",
);
