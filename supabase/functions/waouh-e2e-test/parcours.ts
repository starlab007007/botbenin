// Parcours réels A / B / C — pilote les vrais handlers (waouh-channel-in → waouh-webhook
// → waouh-negotiation-router) au lieu d'insérer directement en base.
//
//  A — Vendeur WhatsApp + Acheteur WhatsApp
//  B — Vendeur App (web)  + Acheteur WhatsApp
//  C — Vendeur WhatsApp   + Acheteur App (web)
//
// Chaque parcours : publication → recherche → "intéressé 1" → contre-offres → accord.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type Parcours = "A" | "B" | "C";

export interface PStep {
  step: string;
  expected: string;
  got: string;
  status: "ok" | "warn" | "fail";
  detail?: unknown;
}

export interface PResult {
  parcours: Parcours;
  label: string;
  status: "ok" | "partial" | "failed";
  steps: PStep[];
  artifacts: Record<string, unknown>;
}

async function callFn(name: string, body: unknown) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }
    return { ok: r.ok, status: r.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { error: String(e) } };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randPhone(prefix: string) {
  // Plage de test 2299000xxxx (jamais un vrai abonné actif du parc WAOUH)
  return `2299000${prefix}${Math.floor(Math.random() * 90 + 10)}`;
}

const LABELS: Record<Parcours, string> = {
  A: "Vendeur WA + Acheteur WA",
  B: "Vendeur App + Acheteur WA",
  C: "Vendeur WA + Acheteur App",
};

export interface PState {
  token?: string; sellerPhone?: string | null; buyerPhone?: string | null;
  sellerSession?: string | null; buyerSession?: string | null;
}

export async function runParcours(
  sb: any,
  p: Parcours,
  opts: { phase?: "publish" | "negotiate" | "all"; state?: PState } = {},
): Promise<PResult> {
  const phase = opts.phase ?? "all";
  const st = opts.state ?? {};
  const steps: PStep[] = [];
  const artifacts: Record<string, unknown> = {};
  const token = st.token || `Zorblax${Math.floor(Math.random() * 9000 + 1000)}`;
  const title = `Téléphone ${token}`;
  const price = 25000;

  const sellerIsWA = p !== "B";
  const buyerIsWA = p !== "C";

  const sellerPhone = sellerIsWA ? (st.sellerPhone || randPhone("1")) : null;
  const buyerPhone = buyerIsWA ? (st.buyerPhone || randPhone("2")) : null;
  const sellerSession = sellerIsWA ? null : (st.sellerSession || crypto.randomUUID());
  const buyerSession = buyerIsWA ? null : (st.buyerSession || crypto.randomUUID());
  artifacts.seller = sellerPhone ?? `web:${sellerSession}`;
  artifacts.buyer = buyerPhone ?? `web:${buyerSession}`;
  artifacts.token = token;
  artifacts.state = { token, sellerPhone, buyerPhone, sellerSession, buyerSession };

  const push = (s: PStep) => steps.push(s);

  // ── 1. Publication vendeur ────────────────────────────────────────────────
  const sellBody = sellerIsWA
    ? { channel: "whatsapp", phone: sellerPhone, text: `Je vends un ${title} à ${price} FCFA à Cotonou` }
    : { channel: "web", sessionId: sellerSession, text: `Je vends : ${title}\nPrix : ${price} FCFA\nVille : Cotonou` };
  const sell = phase === "negotiate" ? { json: {} } as any : await callFn("waouh-channel-in", sellBody);
  if (phase !== "negotiate") await sleep(400);

  const { data: article } = await sb
    .from("waouh_articles")
    .select("id, title, seller_id, status, source_channel, price, city")
    .ilike("title", `%${token}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  artifacts.article_id = article?.id ?? null;
  push({
    step: "1_publication",
    expected: `article "${token}" créé (canal ${sellerIsWA ? "whatsapp" : "waouh_app"})`,
    got: article?.id
      ? `article ${article.id.slice(0, 8)} · canal=${article.source_channel} · prix=${article.price} · statut=${article.status}`
      : `aucun article — reply="${String(sell.json?.reply ?? "").slice(0, 140)}"`,
    status: article?.id ? "ok" : "fail",
  });
  if (!article?.id) {
    return { parcours: p, label: LABELS[p], status: "failed", steps, artifacts };
  }

  // Le vendeur doit être rattaché au bon canal d'origine
  const { data: sellerUser } = await sb
    .from("waouh_users").select("id, phone_number, web_session_id, channel").eq("id", article.seller_id).maybeSingle();
  artifacts.seller_id = sellerUser?.id ?? null;
  const sellerOk = sellerIsWA
    ? !!sellerUser?.phone_number && sellerUser.phone_number.includes(String(sellerPhone).slice(-8))
    : sellerUser?.web_session_id === sellerSession;
  push({
    step: "1b_identite_vendeur",
    expected: sellerIsWA ? "vendeur lié au numéro WhatsApp" : "vendeur lié à la session web",
    got: `phone=${sellerUser?.phone_number ?? "—"} · web_session=${sellerUser?.web_session_id ? "oui" : "non"} · channel=${sellerUser?.channel}`,
    status: sellerOk ? "ok" : "fail",
  });

  // ── 2. Recherche acheteur ─────────────────────────────────────────────────
  const searchBody = buyerIsWA
    ? { channel: "whatsapp", phone: buyerPhone, text: `Je cherche ${token}` }
    : { channel: "web", sessionId: buyerSession, text: `Je cherche ${token}` };
  const search = phase === "negotiate" ? { json: {} } as any : await callFn("waouh-channel-in", searchBody);
  if (phase !== "negotiate") await sleep(400);
  const reply: string = String(search.json?.reply ?? "");

  const { data: buyerUser } = await sb
    .from("waouh_users")
    .select("id, phone_number, web_session_id")
    .or(buyerIsWA ? `phone_number.eq.${buyerPhone}` : `web_session_id.eq.${buyerSession}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  artifacts.buyer_id = buyerUser?.id ?? null;

  const { data: conv } = await sb
    .from("waouh_conversations")
    .select("id, context")
    .eq("user_id", buyerUser?.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastMatches: any[] = Array.isArray(conv?.context?.last_matches) ? conv!.context.last_matches : [];
  const firstIsTarget = lastMatches[0]?.id === article.id || lastMatches[0]?.article_id === article.id;
  const noiseCount = lastMatches.filter((m: any) => !String(m?.title ?? "").toLowerCase().includes(token.toLowerCase())).length;
  push({
    step: "2_recherche",
    expected: "l'article publié est le résultat n°1, sans bruit hors-sujet",
    got: `${lastMatches.length} résultat(s) · n°1=${lastMatches[0]?.title ?? "—"} · hors-sujet=${noiseCount} · reply contient token=${reply.includes(token)}`,
    status: firstIsTarget && noiseCount === 0 ? "ok" : lastMatches.length ? "fail" : "fail",
    detail: lastMatches.slice(0, 5),
  });

  // ── 3. « intéressé 1 » ────────────────────────────────────────────────────
  const interestBody = buyerIsWA
    ? { channel: "whatsapp", phone: buyerPhone, text: "intéressé 1" }
    : { channel: "web", sessionId: buyerSession, text: "intéressé 1" };
  const interest = phase === "negotiate" ? { json: {} } as any : await callFn("waouh-channel-in", interestBody);
  if (phase !== "negotiate") await sleep(800);

  const { data: neg } = await sb
    .from("waouh_negotiations")
    .select("id, state, last_offer_price, buyer_user_id, seller_user_id, article_id")
    .eq("article_id", article.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  artifacts.negotiation_id = neg?.id ?? null;
  push({
    step: "3_interet",
    expected: "négociation ouverte sur le bon article + bon acheteur",
    got: neg?.id
      ? `neg ${neg.id.slice(0, 8)} · state=${neg.state} · acheteur_ok=${neg.buyer_user_id === buyerUser?.id} · vendeur_ok=${neg.seller_user_id === article.seller_id}`
      : `aucune négociation — reply="${String(interest.json?.reply ?? "").slice(0, 140)}"`,
    status: neg?.id && neg.buyer_user_id === buyerUser?.id && neg.seller_user_id === article.seller_id ? "ok" : "fail",
  });

  // Notification vendeur (in-app + file WhatsApp selon canal)
  const { data: sellerNotifs } = await sb
    .from("waouh_notifications")
    .select("id, notification_type, article_id")
    .eq("user_id", article.seller_id)
    .eq("article_id", article.id)
    .limit(5);
  const { data: sellerQueue } = await sb
    .from("waouh_outbound_queue")
    .select("id, channel, event_type, status")
    .eq("to_user_id", article.seller_id)
    .order("created_at", { ascending: false })
    .limit(5);
  const hasWebPush = (sellerQueue || []).some((q: any) => q.channel === "web");
  const hasWaPush = (sellerQueue || []).some((q: any) => q.channel === "whatsapp");
  const notifOk = sellerIsWA ? hasWaPush || (sellerNotifs || []).length > 0 : hasWebPush || (sellerNotifs || []).length > 0;
  push({
    step: "3b_notification_vendeur",
    expected: sellerIsWA ? "alerte poussée vers WhatsApp vendeur" : "alerte poussée vers la session App vendeur",
    got: `notifs=${sellerNotifs?.length ?? 0} · queue web=${hasWebPush} · queue wa=${hasWaPush}`,
    status: notifOk ? "ok" : "fail",
    detail: sellerQueue,
  });

  if (!neg?.id) {
    const failed = steps.filter((s) => s.status === "fail").length;
    return { parcours: p, label: LABELS[p], status: failed ? "failed" : "partial", steps, artifacts };
  }

  if (phase === "publish") {
    const f = steps.filter((s) => s.status === "fail").length;
    return { parcours: p, label: LABELS[p], status: f ? "failed" : "ok", steps, artifacts };
  }

  // ── 4. Contre-offre acheteur ──────────────────────────────────────────────
  const buyerOffer = await callFn("waouh-channel-in",
    buyerIsWA ? { channel: "whatsapp", phone: buyerPhone, text: "20000" }
              : { channel: "web", sessionId: buyerSession, text: "20000" });
  await sleep(600);
  const { data: neg2 } = await sb.from("waouh_negotiations")
    .select("state, last_offer_price, last_actor").eq("id", neg.id).maybeSingle();
  push({
    step: "4_contre_offre_acheteur",
    expected: "offre acheteur 20000 enregistrée",
    got: `state=${neg2?.state} · prix=${neg2?.last_offer_price} · acteur=${neg2?.last_actor} · reply="${String(buyerOffer.json?.reply ?? "").slice(0, 90)}"`,
    status: Number(neg2?.last_offer_price) === 20000 && neg2?.last_actor === "buyer" ? "ok" : "fail",
  });

  // ── 5. Contre-offre vendeur ───────────────────────────────────────────────
  const sellerOffer = await callFn("waouh-channel-in",
    sellerIsWA ? { channel: "whatsapp", phone: sellerPhone, text: "22000" }
               : { channel: "web", sessionId: sellerSession, text: "22000" });
  await sleep(600);
  const { data: neg3 } = await sb.from("waouh_negotiations")
    .select("state, last_offer_price, last_actor").eq("id", neg.id).maybeSingle();
  push({
    step: "5_contre_offre_vendeur",
    expected: "offre vendeur 22000 enregistrée",
    got: `state=${neg3?.state} · prix=${neg3?.last_offer_price} · acteur=${neg3?.last_actor} · reply="${String(sellerOffer.json?.reply ?? "").slice(0, 90)}"`,
    status: Number(neg3?.last_offer_price) === 22000 && neg3?.last_actor === "seller" ? "ok" : "fail",
  });

  // ── 6. Accord acheteur ────────────────────────────────────────────────────
  const accept = await callFn("waouh-channel-in",
    buyerIsWA ? { channel: "whatsapp", phone: buyerPhone, text: "oui" }
              : { channel: "web", sessionId: buyerSession, text: "oui" });
  await sleep(800);
  const { data: neg4 } = await sb.from("waouh_negotiations").select("state").eq("id", neg.id).maybeSingle();
  const { data: deal } = await sb
    .from("waouh_deals")
    .select("id, status, amount, buyer_user_id, seller_user_id")
    .eq("article_id", article.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  artifacts.deal_id = deal?.id ?? null;
  push({
    step: "6_accord",
    expected: "deal créé (montant 22000) + négociation acceptée",
    got: deal?.id
      ? `deal ${deal.id.slice(0, 8)} · montant=${deal.amount} · statut=${deal.status} · neg=${neg4?.state}`
      : `aucun deal — neg=${neg4?.state} · reply="${String(accept.json?.reply ?? "").slice(0, 140)}"`,
    status: deal?.id ? "ok" : "fail",
  });

  // ── 7. Visibilité admin /admin/waouh/deals ────────────────────────────────
  if (deal?.id) {
    const { data: adminDeal } = await sb
      .from("waouh_deals")
      .select("id, status, article_id, buyer_user_id, seller_user_id, amount")
      .eq("id", deal.id)
      .maybeSingle();
    push({
      step: "7_admin_deal",
      expected: "deal exploitable côté admin (article + parties renseignés)",
      got: `article=${!!adminDeal?.article_id} · acheteur=${!!adminDeal?.buyer_user_id} · vendeur=${!!adminDeal?.seller_user_id}`,
      status: adminDeal?.article_id && adminDeal?.buyer_user_id && adminDeal?.seller_user_id ? "ok" : "fail",
    });
  }

  const failed = steps.filter((s) => s.status === "fail").length;
  const warned = steps.filter((s) => s.status === "warn").length;
  return {
    parcours: p,
    label: LABELS[p],
    status: failed ? "failed" : warned ? "partial" : "ok",
    steps,
    artifacts,
  };
}

// Nettoyage : évite que les faux numéros de test polluent la file d'envoi WhatsApp.
export async function cleanupParcours(sb: any, results: PResult[]) {
  const userIds = results.flatMap((r) => [r.artifacts.seller_id, r.artifacts.buyer_id]).filter(Boolean) as string[];
  if (!userIds.length) return;
  try {
    await sb.from("waouh_outbound_queue")
      .update({ status: "cancelled", last_error: "e2e parcours test" })
      .in("to_user_id", userIds)
      .in("status", ["pending", "queued", "retry"]);
  } catch (e) { console.warn("[parcours] cleanup", e); }
}
