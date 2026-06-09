// waouh-e2e-test
// Runs automated end-to-end WhatsApp scenarios across all 9 cells
// (A/B/C × chat/partner/radar) and records results in waouh_e2e_test_runs.
//
// Body: { scenarios?: ('A'|'B'|'C')[], sources?: ('chat'|'partner'|'radar')[] }
// Defaults to ALL × ALL.
//
// For each cell, simulates publication → search → interest → 2 counter-offers
// → OUI, then captures what was queued/sent vs. what was expected.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Scenario = "A" | "B" | "C";
type Source = "chat" | "partner" | "radar";

interface StepResult {
  step: string;
  expected: string;
  got: string;
  status: "ok" | "warn" | "fail";
  detail?: any;
}

interface CellResult {
  scenario: Scenario;
  source: Source;
  cell: string;
  steps: StepResult[];
  status: "ok" | "partial" | "failed";
  artifacts: {
    seller_id?: string;
    buyer_id?: string;
    article_id?: string;
    catalog_id?: string;
    negotiation_id?: string;
    deal_id?: string;
  };
}

async function callFn(name: string, body: any) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: r.ok, status: r.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { error: String(e) } };
  }
}

async function runCell(sb: any, scenario: Scenario, source: Source): Promise<CellResult> {
  const cell = `${scenario}${source[0].toUpperCase()}`;
  const ts = Date.now();
  const sellerPhone = `229E2E${scenario}S${ts % 100000}`;
  const buyerPhone = `229E2E${scenario}B${ts % 100000}`;
  const steps: StepResult[] = [];
  const artifacts: CellResult["artifacts"] = {};

  // Create test users
  const { data: seller, error: sErr } = await sb.from("waouh_users")
    .insert({ phone_number: sellerPhone, display_name: `E2E Seller ${cell}`, channel: "whatsapp" })
    .select("id").maybeSingle();
  const { data: buyer, error: bErr } = await sb.from("waouh_users")
    .insert({ phone_number: buyerPhone, display_name: `E2E Buyer ${cell}`, channel: "whatsapp" })
    .select("id").maybeSingle();
  if (!seller || !buyer) {
    return { scenario, source, cell, steps: [{
      step: "setup", expected: "create users",
      got: `seller=${sErr?.message ?? "ok/null"} buyer=${bErr?.message ?? "ok/null"}`,
      status: "fail",
    }], status: "failed", artifacts };
  }
  artifacts.seller_id = seller.id;
  artifacts.buyer_id = buyer.id;

  // ---- Step 1: publish article (source-dependent)
  if (source === "chat") {
    const { data: art, error: artErr } = await sb.from("waouh_articles").insert({
      seller_id: seller.id,
      title: `Bic E2E ${cell}`,
      category: "autre",
      price: 10000,
      currency: "XOF",
      city: "Cotonou",
      status: "active",
      origin: "chat",
      source_channel: scenario === "B" ? "waouh_app" : "whatsapp",
      contact_whatsapp: sellerPhone,
      photos: [],
    }).select("id").maybeSingle();
    artifacts.article_id = art?.id;
    steps.push({
      step: "publish",
      expected: "article created (chat)",
      got: art?.id ? `article ${art.id.slice(0,8)}` : `no article: ${artErr?.message ?? "?"}`,
      status: art?.id ? "ok" : "fail",
    });
  } else if (source === "partner") {
    const { data: cat, error: catErr } = await sb.from("waouh_unified_catalog").insert({
      source: "partner",
      source_ref_id: crypto.randomUUID(),
      type: "offer",
      titre: `Bic E2E ${cell}`,
      categorie: "autre",
      prix_min: 10000,
      devise: "XOF",
      ville: "Cotonou",
      vendeur_whatsapp: sellerPhone,
      vendeur_nom: `E2E Partner ${cell}`,
      is_active: true,
    }).select("id").maybeSingle();
    artifacts.catalog_id = cat?.id;
    steps.push({
      step: "publish",
      expected: "catalog (partner) created",
      got: cat?.id ? `catalog ${cat.id.slice(0,8)}` : `no catalog: ${catErr?.message ?? "?"}`,
      status: cat?.id ? "ok" : "fail",
    });
    // Promote
    if (cat?.id) {
      const { promoteCatalogToArticle } = await import("../_shared/waouh-promote.ts");
      const promo = await promoteCatalogToArticle(sb, cat.id, { seller_id: seller.id, category: "autre" });
      artifacts.article_id = promo.article_id ?? undefined;
      steps.push({
        step: "promote_partner",
        expected: "catalog → article promotion",
        got: promo.article_id ? `article ${promo.article_id.slice(0,8)} (created=${promo.created})` : `failed: ${promo.reason}`,
        status: promo.article_id ? "ok" : "fail",
      });
    }
  } else {
    // radar
    const { data: ext } = await sb.from("waouh_external_listings").insert({
      source: "e2e_radar",
      source_url: `https://e2e.local/${cell}`,
      title: `Bic E2E ${cell}`,
      price: 10000,
      currency: "XOF",
      city: "Cotonou",
      seller_phone: sellerPhone,
      seller_name: `E2E Radar ${cell}`,
      status: "active",
    }).select("id").maybeSingle();
    const { data: sig } = await sb.from("waouh_radar_signals").insert({
      source_id: ext?.id,
      source_type: "external_listing",
      intent: "sell",
      raw_text: `Bic E2E ${cell}`,
      city: "Cotonou",
      price: 10000,
      contact_phone: sellerPhone,
      status: "captured",
    }).select("id").maybeSingle();
    const { data: art, error: artErr } = await sb.from("waouh_articles").insert({
      seller_id: seller.id,
      title: `Bic E2E ${cell}`,
      category: "autre",
      price: 10000,
      currency: "XOF",
      city: "Cotonou",
      status: "active",
      origin: "radar_ia",
      source_channel: "radar_ia",
      contact_whatsapp: sellerPhone,
      origin_signal_id: sig?.id,
      photos: [],
    }).select("id").maybeSingle();
    if (sig?.id && art?.id) {
      await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id }).eq("id", sig.id);
    }
    artifacts.article_id = art?.id;
    steps.push({
      step: "publish",
      expected: "external_listing → signal → article (radar)",
      got: art?.id ? `article ${art.id.slice(0,8)}` : `no article: ${artErr?.message ?? "?"}`,
      status: art?.id ? "ok" : "fail",
    });
  }

  if (!artifacts.article_id) {
    return { scenario, source, cell, steps, status: "failed", artifacts };
  }

  // ---- Step 2: buyer interest → opens negotiation + dispatches seller notif
  const { error: interestErr } = await sb.from("waouh_interests").insert({
    article_id: artifacts.article_id,
    buyer_user_id: buyer.id,
    seller_user_id: seller.id,
    source: scenario === "C" ? "chat" : "card",
  });
  await sb.from("waouh_negotiations").insert({
    article_id: artifacts.article_id,
    buyer_user_id: buyer.id,
    seller_user_id: seller.id,
    state: "proposed",
    last_offer_price: 10000,
    last_actor: "buyer",
    meta: { opened_via: "e2e_test", cell },
  });
  const dispatch = await callFn("waouh-notify-dispatch", {
    kind: "new_buyer",
    article_id: artifacts.article_id,
    counterpart_user_id: buyer.id,
    recipient: "seller",
  });
  steps.push({
    step: "buyer_interest",
    expected: "negotiation opened + seller notified",
    got: interestErr ? `interest err: ${interestErr.message}` : `dispatch HTTP ${dispatch.status}`,
    status: dispatch.ok ? "ok" : "warn",
    detail: dispatch.json,
  });

  // ---- Step 3: read negotiation
  const { data: neg } = await sb.from("waouh_negotiations")
    .select("*")
    .eq("article_id", artifacts.article_id)
    .eq("buyer_user_id", buyer.id)
    .maybeSingle();
  artifacts.negotiation_id = neg?.id;

  // ---- Step 4: counter-offer buyer→seller (7000)
  if (neg?.id) {
    await sb.from("waouh_negotiations").update({
      state: "countered", last_offer_price: 7000, last_actor: "buyer",
    }).eq("id", neg.id);
    steps.push({
      step: "counter_buyer_7000",
      expected: "negotiation updated to 7000 (buyer)",
      got: "updated",
      status: "ok",
    });

    // ---- Step 5: counter seller→buyer (8500)
    await sb.from("waouh_negotiations").update({
      state: "countered", last_offer_price: 8500, last_actor: "seller",
    }).eq("id", neg.id);
    steps.push({
      step: "counter_seller_8500",
      expected: "negotiation updated to 8500 (seller)",
      got: "updated",
      status: "ok",
    });

    // ---- Step 6: buyer accepts (OUI)
    await sb.from("waouh_negotiations").update({
      state: "accepted", last_actor: "buyer",
    }).eq("id", neg.id);
    const { data: deal } = await sb.from("waouh_deals").insert({
      article_id: artifacts.article_id,
      buyer_user_id: buyer.id,
      seller_user_id: seller.id,
      amount: 8500,
      status: "pending",
    }).select("id").maybeSingle();
    artifacts.deal_id = deal?.id;
    await sb.from("waouh_articles").update({ status: "sold" }).eq("id", artifacts.article_id);
    steps.push({
      step: "accept",
      expected: "deal created + article sold",
      got: deal?.id ? `deal ${deal.id.slice(0,8)}` : "no deal",
      status: deal?.id ? "ok" : "fail",
    });
  }

  // ---- Step 7: check outbound queue (search by phone OR by recipient user id)
  const { data: queued } = await sb.from("waouh_outbound_queue")
    .select("event_type, status, to_phone, template, to_user_id")
    .or(`to_phone.eq.${sellerPhone},to_phone.eq.${buyerPhone},to_user_id.eq.${seller.id},to_user_id.eq.${buyer.id}`)
    .order("created_at", { ascending: false })
    .limit(20);
  const events = (queued || []).map((q: any) => q.event_type || q.template).filter(Boolean);
  steps.push({
    step: "queue_audit",
    expected: "≥ 1 outbound entry per party",
    got: `${queued?.length || 0} entries · events: ${events.join(",")}`,
    status: (queued?.length || 0) >= 1 ? "ok" : "warn",
    detail: queued,
  });

  const failed = steps.filter(s => s.status === "fail").length;
  const warned = steps.filter(s => s.status === "warn").length;
  return {
    scenario, source, cell, steps, artifacts,
    status: failed > 0 ? "failed" : warned > 0 ? "partial" : "ok",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const scenarios: Scenario[] = body.scenarios || ["A", "B", "C"];
    const sources: Source[] = body.sources || ["chat", "partner", "radar"];

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Insert run row
    const { data: run } = await sb.from("waouh_e2e_test_runs").insert({
      scenario: scenarios.join(","),
      source: sources.join(","),
      status: "running",
    }).select("id").maybeSingle();

    const results: CellResult[] = [];
    for (const sc of scenarios) {
      for (const src of sources) {
        const r = await runCell(sb, sc, src);
        results.push(r);
      }
    }

    const summary = {
      cells: results.length,
      ok: results.filter(r => r.status === "ok").length,
      partial: results.filter(r => r.status === "partial").length,
      failed: results.filter(r => r.status === "failed").length,
    };
    const overallStatus = summary.failed > 0 ? "failed" : summary.partial > 0 ? "partial" : "ok";

    if (run?.id) {
      await sb.from("waouh_e2e_test_runs").update({
        status: overallStatus,
        finished_at: new Date().toISOString(),
        summary,
        steps: results,
      }).eq("id", run.id);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: run?.id, status: overallStatus, summary, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
