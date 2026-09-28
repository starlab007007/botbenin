import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://bot.bj";
const SUPABASE = "https://mvynepqulhflxtyymtzs.supabase.co";
const ARTICLE_ID = "6b8f773b-b823-4d63-9507-2fdd1c85858d";
const SELLER_ID = "ecf71aac-c70a-46b1-bc7f-7deab21b02c7";
const BUYER_ID = "11859fd7-cdbf-41d8-9fa5-13b73fa1a5be";
const SELLER_SESSION = "e2e-bic100-seller-a-20260928";
const BUYER_SESSION = "e2e-bic100-buyer-b-20260928";
const TITLE = "Bic bleu — Test WAOUH";
const OUT = path.resolve("e2e-artifacts/bic100");
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const screenshots = [];
let seq = 0;

function record(name, response) {
  results.push({ name, at: new Date().toISOString(), response });
  return response;
}

async function commerce(session, body, name) {
  const res = await fetch(SUPABASE + "/functions/v1/waouh-commerce-action", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-waouh-session": session },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  record(name, Object.assign({ http: res.status }, data));
  if (res.status >= 500) throw new Error(name + ": HTTP " + res.status + ": " + text);
  return data;
}

async function channel(session, text, name) {
  const res = await fetch(SUPABASE + "/functions/v1/waouh-channel-in-secure", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-waouh-session": session },
    body: JSON.stringify({
      channel: "web",
      sessionId: session,
      text,
      meta: { source: "e2e_bic100_screenshots", correlation_id: "bic100-" + Date.now() },
    }),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  record(name, Object.assign({ http: res.status }, data));
  return data;
}

const chrome = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && fs.existsSync(candidate));
if (!chrome) throw new Error("Chrome/Chromium absent");

const port = 9444;
const profile = fs.mkdtempSync("/tmp/waouh-bic100-chrome-");
const chromeProcess = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--window-size=1440,900", "--remote-debugging-port=" + port,
  "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (err) => { clearTimeout(timer); reject(err); },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connect() {
  let target;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch("http://127.0.0.1:" + port + "/json/list");
      const list = await res.json();
      target = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
    await sleep(200);
  }
  if (!target) throw new Error("CDP target absent");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return;
    const waiter = pending.get(msg.id);
    if (!waiter) return;
    pending.delete(msg.id);
    if (msg.error) waiter.reject(new Error(msg.error.message));
    else waiter.resolve(msg.result);
  });
  await send("Page.enable");
  await send("Runtime.enable");
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "evaluate failed");
  return r.result && r.result.value;
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 900,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: width < 900, maxTouchPoints: 5 });
}

async function go(url, waitMs) {
  await send("Page.navigate", { url });
  await sleep(waitMs || 2600);
}

async function ensureOrigin() {
  await go(BASE + "/", 2200);
}

async function screenshot(name) {
  const safe = String(++seq).padStart(2, "0") + "_" + name + ".png";
  const file = path.join(OUT, safe);
  const shot = await send("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: false,
  });
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  const state = await evaluate("({path:location.pathname+location.search,text:(document.body&&document.body.innerText||'').slice(0,10000),width:innerWidth,height:innerHeight})");
  screenshots.push(Object.assign({ file: safe }, state));
  console.log("SCREENSHOT " + safe + " @ " + state.path);
  return state;
}

async function setSession(session) {
  const code = "localStorage.setItem('waouh_web_session_id'," + JSON.stringify(session) + ");"
    + "localStorage.removeItem('waouh_pending_open');"
    + "localStorage.removeItem('waouh_main_thread_started_at');true;";
  await evaluate(code);
}

async function waitMarker(marker) {
  if (!marker) return;
  for (let i = 0; i < 24; i++) {
    const text = await evaluate("document.body&&document.body.innerText||''");
    if (text.includes(marker)) return;
    await sleep(300);
  }
}

async function showMainChat(session, name, marker) {
  await setViewport(390, 844);
  await ensureOrigin();
  await setSession(session);
  await go(BASE + "/app/chat/waouh", 3300);
  await waitMarker(marker);
  return screenshot(name);
}

async function showMatch(session, role, scope, name, mobile, marker) {
  await setViewport(mobile ? 390 : 1440, mobile ? 844 : 900);
  await ensureOrigin();
  const counterpart = role === "buyer" ? SELLER_ID : BUYER_ID;
  const detail = {
    article_id: ARTICLE_ID,
    kind: role,
    counterpart_user_id: counterpart,
    seller_user_id: SELLER_ID,
    buyer_user_id: BUYER_ID,
    title: TITLE,
    price: 100,
    city: "Cotonou",
    source: "e2e_bic100_capture",
    thread_id: scope && scope.thread_id || null,
    negotiation_id: scope && scope.negotiation_id || null,
    deal_id: scope && scope.deal_id || null,
  };
  const code = "(()=>{const sid=" + JSON.stringify(session) + ";"
    + "localStorage.setItem('waouh_web_session_id',sid);"
    + "localStorage.setItem('waouh_pending_open',JSON.stringify([" + JSON.stringify(detail) + "]));"
    + "localStorage.setItem('waouh_open_matches_'+sid,'[]');"
    + "localStorage.removeItem('waouh_active_match_'+sid);return true;})()";
  await evaluate(code);
  await go(mobile ? BASE + "/app/chat/waouh" : BASE + "/", 3800);
  await waitMarker(marker);
  return screenshot(name);
}

function scopeFrom(data, fallback) {
  fallback = fallback || {};
  return {
    thread_id: data && data.thread_id || fallback.thread_id || null,
    negotiation_id: data && data.negotiation_id || fallback.negotiation_id || null,
    deal_id: data && data.deal_id || fallback.deal_id || null,
  };
}

try {
  await connect();
  await setViewport(390, 844);
  await ensureOrigin();

  await channel(BUYER_SESSION, "Je cherche un bic à Cotonou", "buyer_search_bic");
  await showMainChat(BUYER_SESSION, "acheteur_recherche_bic", "bic");

  const open1 = await commerce(BUYER_SESSION, {
    action: "open_deal", idem: "bic100-c1-open", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, source: "e2e_bic100",
  }, "cycle1_open_deal");
  let s1 = scopeFrom(open1);
  await showMatch(BUYER_SESSION, "buyer", s1, "cycle1_acheteur_interet_100", false, TITLE);
  await showMatch(SELLER_SESSION, "seller", s1, "cycle1_vendeur_recoit_interet", false, TITLE);

  const ask1 = await commerce(BUYER_SESSION, {
    action: "ask", idem: "bic100-c1-ask", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    text: "Le bic écrit-il en bleu ?", source: "e2e_bic100",
  }, "cycle1_question");
  s1 = scopeFrom(ask1, s1);
  await showMatch(SELLER_SESSION, "seller", s1, "cycle1_vendeur_question_acheteur", false, "bleu");

  const pending80 = await commerce(BUYER_SESSION, {
    action: "text", idem: "bic100-c1-text80", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    text: "Je propose 80 FCFA", source: "e2e_bic100",
  }, "cycle1_typed_offer_80_pending");
  s1 = scopeFrom(pending80, s1);
  await showMatch(BUYER_SESSION, "buyer", s1, "cycle1_acheteur_offre80_a_confirmer", false, "Confirmer");

  const offer80 = await commerce(BUYER_SESSION, {
    action: "offer", idem: "bic100-c1-offer80", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    amount: 80, source: "e2e_bic100",
  }, "cycle1_offer_80_confirmed");
  s1 = scopeFrom(offer80, s1);
  await showMatch(SELLER_SESSION, "seller", s1, "cycle1_vendeur_recoit_offre80", false, "80");

  const counter90 = await commerce(SELLER_SESSION, {
    action: "offer", idem: "bic100-c1-counter90", session_id: SELLER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    amount: 90, source: "e2e_bic100",
  }, "cycle1_seller_counter_90");
  s1 = scopeFrom(counter90, s1);
  await showMatch(BUYER_SESSION, "buyer", s1, "cycle1_acheteur_recoit_contreoffre90", false, "90");

  const reject1 = await commerce(BUYER_SESSION, {
    action: "reject", idem: "bic100-c1-reject", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    source: "e2e_bic100",
  }, "cycle1_buyer_reject");
  s1 = scopeFrom(reject1, s1);
  await showMatch(SELLER_SESSION, "seller", s1, "cycle1_refus_acheteur", false, "refus");

  await commerce(BUYER_SESSION, {
    action: "reject", idem: "bic100-c1-reject", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s1.thread_id, negotiation_id: s1.negotiation_id,
    source: "e2e_bic100",
  }, "cycle1_replay_same_idem");

  const open2 = await commerce(BUYER_SESSION, {
    action: "open_deal", idem: "bic100-c2-open", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, source: "e2e_bic100",
  }, "cycle2_open_new_cycle");
  let s2 = scopeFrom(open2);
  await showMatch(BUYER_SESSION, "buyer", s2, "cycle2_nouveau_cycle_meme_bic", false, TITLE);

  const accept2 = await commerce(SELLER_SESSION, {
    action: "accept", idem: "bic100-c2-seller-accept", session_id: SELLER_SESSION,
    article_id: ARTICLE_ID, thread_id: s2.thread_id, negotiation_id: s2.negotiation_id,
    source: "e2e_bic100",
  }, "cycle2_seller_accept_100");
  s2 = scopeFrom(accept2, s2);
  await showMatch(BUYER_SESSION, "buyer", s2, "cycle2_accord_acheteur_100", false, "accord");
  await showMatch(SELLER_SESSION, "seller", s2, "cycle2_accord_vendeur_100", false, "accord");

  const prep2 = await commerce(SELLER_SESSION, {
    action: "seller_confirm", idem: "bic100-c2-seller-confirm", session_id: SELLER_SESSION,
    article_id: ARTICLE_ID, thread_id: s2.thread_id, negotiation_id: s2.negotiation_id,
    deal_id: s2.deal_id, source: "e2e_bic100",
  }, "cycle2_seller_prepares");
  s2 = scopeFrom(prep2, s2);
  await showMatch(SELLER_SESSION, "seller", s2, "cycle2_vendeur_prepare_bic", false, "Préparation");
  await showMatch(BUYER_SESSION, "buyer", s2, "cycle2_acheteur_choix_paiement_avant_clic", false, "Cash");
  await showMatch(BUYER_SESSION, "buyer", s2, "cycle2_mobile_acheteur", true, TITLE);
  await showMatch(SELLER_SESSION, "seller", s2, "cycle2_mobile_vendeur", true, TITLE);

  const cancel2 = await commerce(BUYER_SESSION, {
    action: "cancel", idem: "bic100-c2-cancel", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, thread_id: s2.thread_id, negotiation_id: s2.negotiation_id,
    deal_id: s2.deal_id, source: "e2e_bic100",
  }, "cycle2_cancel_before_payment");
  s2 = scopeFrom(cancel2, s2);
  await showMatch(BUYER_SESSION, "buyer", s2, "cycle2_annulation_acheteur", false, "annul");

  const open3 = await commerce(BUYER_SESSION, {
    action: "open_deal", idem: "bic100-c3-open", session_id: BUYER_SESSION,
    article_id: ARTICLE_ID, source: "e2e_bic100",
  }, "cycle3_open_for_seller_reject");
  let s3 = scopeFrom(open3);
  const reject3 = await commerce(SELLER_SESSION, {
    action: "reject", idem: "bic100-c3-seller-reject", session_id: SELLER_SESSION,
    article_id: ARTICLE_ID, thread_id: s3.thread_id, negotiation_id: s3.negotiation_id,
    source: "e2e_bic100",
  }, "cycle3_seller_reject_100");
  s3 = scopeFrom(reject3, s3);
  await showMatch(BUYER_SESSION, "buyer", s3, "cycle3_refus_vendeur", false, "refus");

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({
    title: "WAOUH Chat E2E — Bic 100 FCFA — Vendeur A / Acheteur B",
    generated_at: new Date().toISOString(),
    production_url: BASE,
    article_id: ARTICLE_ID,
    seller_id: SELLER_ID,
    buyer_id: BUYER_ID,
    scenarios: results,
    screenshots,
    note: "Aucun pay_mode/confirm_payment ni affectation livreur n'a été déclenché.",
  }, null, 2));
} finally {
  try { if (ws) ws.close(); } catch {}
  try { chromeProcess.kill("SIGTERM"); } catch {}
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
