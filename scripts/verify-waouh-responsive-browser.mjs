import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (message) => { throw new Error(`[WAOUH browser] ${message}`); };

const chrome = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && fs.existsSync(candidate));
if (!chrome) fail("Chrome/Chromium is not available on the CI runner");

const preview = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "preview",
  "--host", "127.0.0.1",
  "--port", "4173",
], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});
preview.stdout.on("data", (chunk) => process.stdout.write(chunk));
preview.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitHttp(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  fail(`Vite preview did not start at ${url}`);
}

const port = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "waouh-chrome-"));
const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let ws;
let nextId = 1;
const pending = new Map();
let runtimeExceptions = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connectCdp() {
  const started = Date.now();
  let pageTarget;
  let lastError = "";

  while (Date.now() - started < 30000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (pageTarget) break;
      }

      // Recent headless Chrome can expose the DevTools browser endpoint before
      // it publishes an initial page target. Create one explicitly instead of
      // failing the whole responsive smoke on runner startup timing.
      const created = await fetch(
        `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
        { method: "PUT" },
      );
      if (created.ok) {
        const target = await created.json();
        if (target?.type === "page" && target?.webSocketDebuggerUrl) {
          pageTarget = target;
          break;
        }
      } else {
        lastError = `json/new HTTP ${created.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }

  if (!pageTarget) {
    const exited = chromeProcess.exitCode !== null ? ` chrome_exit=${chromeProcess.exitCode}` : "";
    fail(`Chrome DevTools page target unavailable after 30s${exited}${lastError ? ` last_error=${lastError}` : ""}`);
  }

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      runtimeExceptions.push(
        message.params?.exceptionDetails?.exception?.description ||
        message.params?.exceptionDetails?.text ||
        "runtime exception",
      );
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) fail(result.exceptionDetails.text || "evaluation failed");
  return result.result?.value;
}

async function navigate(url, viewport) {
  runtimeExceptions = [];
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 1180,
  });
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: viewport.width < 1180,
    maxTouchPoints: 5,
  });
  await send("Page.navigate", { url });
  await sleep(1800);

  const state = await evaluate(`(() => ({
    text: document.body?.innerText || "",
    path: location.pathname + location.search,
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > innerWidth + 3,
    fallback:
      (document.body?.innerText || "").includes("Une erreur s'est produite") ||
      (document.body?.innerText || "").includes("Une erreur s’est produite")
  }))()`);

  if (runtimeExceptions.length) {
    fail(`${viewport.name}: runtime exception at ${url}: ${runtimeExceptions.join(" | ")}`);
  }
  return state;
}

async function clickExact(label) {
  return evaluate(`(() => {
    const nodes = [...document.querySelectorAll("button,a")];
    const element = nodes.find((node) => (node.innerText || "").trim() === ${JSON.stringify(label)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
}

async function waitForText(marker, timeoutMs = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(`({
      text: document.body?.innerText || "",
      path: location.pathname + location.search,
      fallback:
        (document.body?.innerText || "").includes("Une erreur s'est produite") ||
        (document.body?.innerText || "").includes("Une erreur s’est produite")
    })`);
    if (state.fallback) return state;
    if (state.text.includes(marker)) return state;
    await sleep(200);
  }
  return evaluate(`({
    text: document.body?.innerText || "",
    path: location.pathname + location.search,
    fallback:
      (document.body?.innerText || "").includes("Une erreur s'est produite") ||
      (document.body?.innerText || "").includes("Une erreur s’est produite")
  })`);
}

async function testRoot(viewport) {
  let state = await navigate("http://127.0.0.1:4173/", viewport);
  if (!state.text.includes("Votre assistant personnel") && !state.fallback) {
    const waited = await waitForText("Votre assistant personnel");
    state = { ...state, ...waited };
  }
  if (state.fallback) fail(`${viewport.name}: root rendered the ErrorBoundary fallback`);
  if (!state.text.includes("Votre assistant personnel")) {
    fail(`${viewport.name}: Avatar home is missing at ${state.path}; body=${state.text.slice(0, 300)}`);
  }
  for (const label of ["Acheter", "Vendre", "Trouver", "Demander"]) {
    if (!state.text.includes(label)) fail(`${viewport.name}: missing Avatar action ${label}`);
  }
  if (state.overflowX) fail(`${viewport.name}: horizontal overflow on root (${state.scrollWidth} > ${state.width})`);

  if (viewport.width >= 1180) {
    for (const label of ["Chat Command Center", "Radar", "WhatsApp IA", "Diffusion", "Avatar", "Missions & veille"]) {
      if (!state.text.includes(label)) fail(`desktop: sidebar missing ${label}`);
    }
  } else {
    const nav = await evaluate(`[...document.querySelectorAll("nav a")].map((a) => ({
      text: (a.innerText || "").trim(),
      href: a.getAttribute("href"),
      cls: a.className
    }))`);
    const tablet = viewport.width >= 640;
    const expected = tablet
      ? [
          ["Chat", "/app/chat"],
          ["Radar", "/app/radar-map"],
          ["Avatar", "/app/avatar"],
          ["Missions", "/app/missions"],
          ["IA", "/app/ia"],
          ["Bots", "/app/bots"],
        ]
      : [
          ["Chat", "/app/chat"],
          ["Missions", "/app/missions"],
          ["IA", "/app/ia"],
          ["Avatar", "/app/avatar"],
        ];
    for (const [label, href] of expected) {
      const item = nav.find((entry) => entry.text === label);
      if (!item || item.href !== href) fail(`${viewport.name}: nav ${label} -> ${href} missing`);
    }
    const avatar = nav.find((entry) => entry.text === "Avatar");
    const selected = tablet ? "bg-[hsl(var(--wa-green))]" : "font-medium";
    if (!String(avatar?.cls || "").includes(selected)) {
      fail(`${viewport.name}: root must visually select Avatar tab`);
    }
    const hasMenu = await evaluate(`[...document.querySelectorAll("button")].some((b) => /Menu|Modules/.test((b.innerText || "").trim()))`);
    if (!hasMenu) fail(`${viewport.name}: full modules menu button missing`);
  }

  const actionPaths = {
    acheter: { path: "/app/avatar/acheter", auth: true },
    vendre: { path: "/app/avatar/vendre", auth: true },
    trouver: { path: "/app/nexus", auth: false },
    demander: { path: "/app/avatar/demander", auth: true },
  };
  for (const [action, expected] of Object.entries(actionPaths)) {
    await navigate("http://127.0.0.1:4173/", viewport);
    const clicked = await evaluate(`(() => {
      const element = document.querySelector('[data-waouh-action="${action}"]');
      if (!element) return false;
      element.click();
      return true;
    })()`);
    if (!clicked) fail(`${viewport.name}: Avatar action ${action} is not clickable`);
    await sleep(450);
    const target = await evaluate(`({ path: location.pathname, search: location.search })`);
    if (expected.auth) {
      const next = new URLSearchParams(target.search).get("next");
      if (!target.path.startsWith("/app/auth") || next !== expected.path) {
        fail(`${viewport.name}: ${action} should require auth and preserve ${expected.path}; got ${target.path}${target.search}`);
      }
    } else if (target.path !== expected.path) {
      fail(`${viewport.name}: ${action} navigated to ${target.path}; expected ${expected.path}`);
    }
  }

  await navigate("http://127.0.0.1:4173/", viewport);
  const asked = await evaluate(`(() => {
    const input = [...document.querySelectorAll("input")]
      .find((element) => element.getAttribute("aria-label") === "Votre demande à Bot");
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Je cherche un téléphone à Cotonou");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const button = [...input.parentElement.querySelectorAll("button")]
      .find((element) => (element.innerText || "").trim() === "Demander" || element.getAttribute("aria-label") === "Demander");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!asked) fail(`${viewport.name}: Bot command composer is not operable`);
  await sleep(700);
  const afterAsk = await evaluate(`({ path: location.pathname, search: location.search, text: document.body.innerText })`);
  if (!afterAsk.path.startsWith("/app/auth")) {
    fail(`${viewport.name}: Bot command should require authentication, got ${afterAsk.path}`);
  }
  const askNext = new URLSearchParams(afterAsk.search).get("next");
  if (!askNext || !askNext.startsWith("/app/chat/waouh")) {
    fail(`${viewport.name}: Bot command did not preserve the intended WAOUH chat destination`);
  }
}

async function testDesktopSidebar(viewport) {
  if (viewport.width < 1180) return;
  const expected = [
    ["Chat Command Center", "/app/chat", false],
    ["Radar", "/app/radar-map", false],
    ["WhatsApp IA", "/app/whatsapp", true],
    ["Avatar", "/app/avatar", false],
    ["Missions & veille", "/app/missions", true],
    ["Bots", "/app/bots", true],
    ["Agents IA", "/app/whatsapp/select-agent", true],
    ["Conversationnel", "/app/whatsapp/conversationnel", true],
    ["BI WAOUH IA", "/app/whatsapp/bi", true],
    ["Stock WAOUH IA", "/app/stock", true],
    ["Présence QR", "/app/presence", true],
    ["Boutiques & magasins", "/app/partner/businesses", true],
    ["AprèsBac IA", "/app/apresbac", false],
    ["FA IA", "/app/fa-ia", false],
  ];

  for (const [label, expectedPath, authProtected] of expected) {
    console.log(`WAOUH responsive smoke: ${viewport.name} sidebar -> ${label}`);
    await navigate("http://127.0.0.1:4173/", viewport);
    const clicked = await clickExact(label);
    if (!clicked) fail(`desktop: sidebar item ${label} is not clickable`);
    await sleep(350);
    const state = await evaluate(`({
      path: location.pathname,
      text: document.body?.innerText || "",
      fallback:
        (document.body?.innerText || "").includes("Une erreur s'est produite") ||
        (document.body?.innerText || "").includes("Une erreur s’est produite"),
      overflowX: document.documentElement.scrollWidth > innerWidth + 3
    })`);
    const authRedirect = authProtected && (
      state.path === "/app/auth" ||
      state.path.startsWith("/app/auth/") ||
      state.path.startsWith("/app/auth?")
    );
    if (state.path !== expectedPath && !authRedirect) {
      fail(`desktop: sidebar ${label} navigated to ${state.path}; expected ${expectedPath}${authProtected ? " or authentication" : ""}`);
    }
    if (state.fallback) fail(`desktop: sidebar ${label} rendered ErrorBoundary fallback`);
    if (state.overflowX) fail(`desktop: horizontal overflow after sidebar ${label}`);
  }
}

async function testRoutes(viewport) {
  const routes = [
    ["/app/chat", "Demandez à Bot", false],
    ["/app/avatar", "Votre assistant personnel", false],
    ["/app/avatar/acheter", "Acheter avec mon Avatar", true],
    ["/app/avatar/vendre", "Vendre avec mon Avatar", true],
    ["/app/avatar/demander", "Demander à mon Avatar", true],
    ["/app/nexus", "WAOUH NEXUS", false],
    ["/app/missions", "Missions", true],
    ["/app/ia", "Bots & IA WAOUH", true],
    ["/app/bots", "Bots WAOUH", true],
    ["/app/radar-map", null, false],
    ["/app/whatsapp", null, true],
    ["/app/whatsapp/conversationnel", null, true],
    ["/app/whatsapp/bi", null, true],
    ["/app/whatsapp/select-agent", null, true],
    ["/app/stock", null, true],
    ["/app/presence", null, true],
    ["/app/partner/businesses", null, true],
    ["/app/apresbac", null, false],
    ["/app/fa-ia", null, false],
    ["/app/auth", "WaouhApp", false],
  ];

  for (const [route, marker, authProtected] of routes) {
    console.log(`WAOUH responsive smoke: ${viewport.name} route -> ${route}`);
    const state = await navigate(`http://127.0.0.1:4173${route}`, viewport);
    if (state.fallback) fail(`${viewport.name}: ${route} rendered ErrorBoundary fallback`);
    if (state.overflowX) fail(`${viewport.name}: horizontal overflow on ${route}`);
    const authRedirect = authProtected && (
      state.path === "/app/auth" ||
      state.path.startsWith("/app/auth/") ||
      state.path.startsWith("/app/auth?")
    );
    if (authRedirect) continue;
    if (marker && !state.text.includes(marker) && !state.fallback) {
      const waited = await waitForText(marker);
      state.text = waited.text;
      state.path = waited.path;
      state.fallback = waited.fallback;
    }
    if (marker && !state.text.includes(marker)) {
      fail(`${viewport.name}: ${route} missing marker "${marker}" at ${state.path}; body=${state.text.slice(0, 300)}`);
    }
    if (route === "/app/chat") {
      const hasBotV2 = await evaluate(`Boolean(document.querySelector('[data-waouh-ui="bot-avatar-v3"]'))`);
      if (!hasBotV2) fail(`${viewport.name}: /app/chat is not rendering the Bot avatar V2 home`);
    }
    if (route === "/app/auth" && state.text.includes("Comment fonctionne WAOUH")) {
      fail(`${viewport.name}: removed login explainer returned`);
    }
  }
}

try {
  await waitHttp("http://127.0.0.1:4173/");
  await connectCdp();

  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 834, height: 1112 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    await testRoot(viewport);
    await testDesktopSidebar(viewport);
    await testRoutes(viewport);
    console.log(`WAOUH responsive smoke: ${viewport.name} OK`);
  }

  console.log("WAOUH browser smoke: desktop + tablet + mobile OK");
} finally {
  try {
    if (ws && ws.readyState < 2) {
      ws.close();
      await Promise.race([
        new Promise((resolve) => ws.addEventListener("close", resolve, { once: true })),
        sleep(1000),
      ]);
    }
  } catch {}

  const stopChild = async (child) => {
    if (!child || child.exitCode !== null || child.signalCode) return;
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(1500)]).catch(() => {});
    if (child.exitCode === null && !child.signalCode) {
      child.kill("SIGKILL");
      await Promise.race([once(child, "exit"), sleep(750)]).catch(() => {});
    }
  };

  await stopChild(chromeProcess);
  await stopChild(preview);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
