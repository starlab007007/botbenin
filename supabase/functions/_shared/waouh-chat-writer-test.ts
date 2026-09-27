// Tests de l'enveloppe TS de l'écrivain unique, avec un client Supabase
// simulé (aucun réseau). La fonction SQL elle-même est testée sur Postgres
// (scripts/waouh-chat/sql-tests.sql).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  __resetChatWriterFlagCache,
  chatRouterV2Enabled,
  chatWriterV2Enabled,
  deriveWaouhChannel,
  recordChatMessage,
  resolveThreadIdForEvent,
} from "./waouh-chat-writer.ts";

type Row = Record<string, unknown>;

/** Client simulé : `tables[name]` = lignes renvoyées par select, `rpc` = réponse RPC. */
function fakeSb(opts: { tables?: Record<string, Row[] | Error>; rpc?: { data?: unknown; error?: unknown } }) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const builder = (table: string) => {
    const filters: Array<(row: Row) => boolean> = [];
    let limitN = Infinity;
    const rows = () => {
      const source = opts.tables?.[table];
      if (source instanceof Error) throw source;
      return (source ?? []).filter((row) => filters.every((f) => f(row))).slice(0, limitN);
    };
    const chain: any = {
      select: () => chain,
      eq: (col: string, v: unknown) => { filters.push((r) => r[col] === v); return chain; },
      in: (col: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[col])); return chain; },
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain; },
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
    };
    return chain;
  };
  return {
    calls,
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return opts.rpc ?? { data: null, error: null };
    },
  };
}

Deno.test("deriveWaouhChannel", () => {
  assertEquals(deriveWaouhChannel({ web_session_id: "s", auth_user_id: "u", phone_number: "229" }), "web");
  assertEquals(deriveWaouhChannel({ auth_user_id: "u", phone_number: "229" }), "app");
  assertEquals(deriveWaouhChannel({ phone_number: "229" }), "whatsapp");
  assertEquals(deriveWaouhChannel({}), "system");
});

Deno.test("interrupteur fermé par défaut : ligne absente", async () => {
  __resetChatWriterFlagCache();
  assertEquals(await chatWriterV2Enabled(fakeSb({ tables: { waouh_admin_module_controls: [] } })), false);
});

Deno.test("interrupteur fermé par défaut : erreur de lecture", async () => {
  __resetChatWriterFlagCache();
  assertEquals(await chatWriterV2Enabled(fakeSb({ tables: { waouh_admin_module_controls: new Error("boom") } })), false);
});

Deno.test("interrupteur : module actif mais automatisation coupée => fermé", async () => {
  __resetChatWriterFlagCache();
  const sb = fakeSb({ tables: { waouh_admin_module_controls: [{ module_key: "chat_writer_v2", enabled: true, automation_enabled: false }] } });
  assertEquals(await chatWriterV2Enabled(sb), false);
});

Deno.test("interrupteur : module + automatisation => ouvert", async () => {
  __resetChatWriterFlagCache();
  const sb = fakeSb({ tables: { waouh_admin_module_controls: [{ module_key: "chat_writer_v2", enabled: true, automation_enabled: true }] } });
  assertEquals(await chatWriterV2Enabled(sb), true);
  __resetChatWriterFlagCache();
});

Deno.test("routeur v2 : interrupteur indépendant de l'écrivain", async () => {
  __resetChatWriterFlagCache();
  const sb = fakeSb({ tables: { waouh_admin_module_controls: [
    { module_key: "chat_writer_v2", enabled: true, automation_enabled: true },
    { module_key: "chat_router_v2", enabled: false, automation_enabled: false },
  ] } });
  assertEquals(await chatWriterV2Enabled(sb), true);
  assertEquals(await chatRouterV2Enabled(sb), false);
  __resetChatWriterFlagCache();
});

Deno.test("recordChatMessage : refus sans thread, sans appel RPC", async () => {
  const sb = fakeSb({});
  const res = await recordChatMessage({ sb, threadId: "", text: "x" });
  assertEquals(res.ok, false);
  assertEquals(res.error, "thread_id_required");
  assertEquals(sb.calls.length, 0);
});

Deno.test("recordChatMessage : erreur RPC => ok:false (l'appelant garde l'ancien chemin)", async () => {
  const sb = fakeSb({ rpc: { data: null, error: { message: "recipient_not_in_thread" } } });
  const res = await recordChatMessage({ sb, threadId: "t1", recipientUserId: "u9", text: "x", enqueueWhatsapp: false });
  assertEquals(res.ok, false);
  assertEquals(res.error, "recipient_not_in_thread");
});

Deno.test("recordChatMessage : paramètres transmis et résultat décodé", async () => {
  const sb = fakeSb({ rpc: { data: { ok: true, thread_id: "t1", sender_role: "system", recipient_message_id: "m2", buyer_message_id: "m2", queue_ids: [] }, error: null } });
  const res = await recordChatMessage({ sb, threadId: "t1", recipientUserId: "u1", text: "Livré", intent: "delivered", enqueueWhatsapp: false });
  assertEquals(res.ok, true);
  assertEquals(res.recipientMessageId, "m2");
  const args = sb.calls[0].args as Record<string, unknown>;
  assertEquals(sb.calls[0].fn, "waouh_record_chat_message");
  assertEquals(args.p_thread_id, "t1");
  assertEquals(args.p_recipient_user_id, "u1");
  assertEquals(args.p_enqueue_whatsapp, false);
  assertEquals(args.p_intent, "delivered");
});

Deno.test("resolveThreadIdForEvent : thread explicite puis deal puis négociation", async () => {
  const sb = fakeSb({
    tables: {
      waouh_deals: [{ id: "d1", thread_id: "t-deal" }],
      waouh_negotiations: [{ id: "n1", thread_id: "t-neg" }],
    },
  });
  assertEquals(await resolveThreadIdForEvent({ sb, threadId: "t-explicit", dealId: "d1" }), "t-explicit");
  assertEquals(await resolveThreadIdForEvent({ sb, dealId: "d1", negotiationId: "n1" }), "t-deal");
  assertEquals(await resolveThreadIdForEvent({ sb, negotiationId: "n1" }), "t-neg");
  assertEquals(await resolveThreadIdForEvent({ sb, dealId: "absent" }), null);
});

Deno.test("resolveThreadIdForEvent : ambigu (2 threads actifs) => null", async () => {
  const sb = fakeSb({
    tables: {
      waouh_users: [{ id: "u1", auth_user_id: null, phone_number: null, web_session_id: "s" }],
      waouh_chat_threads: [
        { id: "t1", thread_type: "product_meet", article_id: "a1", buyer_user_id: "u1" },
        { id: "t2", thread_type: "product_meet", article_id: "a1", buyer_user_id: "u1" },
      ],
    },
  });
  const user = { id: "u1", web_session_id: "s" };
  assertEquals(await resolveThreadIdForEvent({ sb, articleId: "a1", user, role: "buyer" }), null);
});

Deno.test("resolveThreadIdForEvent : un seul thread actif => trouvé", async () => {
  const sb = fakeSb({
    tables: {
      waouh_users: [{ id: "u1", auth_user_id: null, phone_number: null, web_session_id: "s" }],
      waouh_chat_threads: [{ id: "t1", thread_type: "product_meet", article_id: "a1", buyer_user_id: "u1" }],
    },
  });
  assertEquals(await resolveThreadIdForEvent({ sb, articleId: "a1", user: { id: "u1", web_session_id: "s" }, role: "buyer" }), "t1");
});
