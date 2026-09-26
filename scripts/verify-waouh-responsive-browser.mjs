import { spawn } from "node:child_process";
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

const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
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
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connectCdp() {
  const started = Date.now();
  let pageTarget;
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (pageTarget) break;
      }
    } catch {}
    await sleep(200);
  }
  if (!pageTarget) fail("Chrome DevTools page target unavailable");

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
  if (!state.text.includes("Votre Avatar WAOUH") && !state.fallback) {
    const waited = await waitForText("Votre Avatar WAOUH");
    state = { ...state, ...waited };
  }
  if (state.fallback) fail(`${viewport.name}: root rendered the ErrorBoundary fallback`);
  if (!state.text.includes("Votre Avatar WAOUH")) {
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
    const expected = [
      ["Chat", "/app/chat"],
      ["Bots", "/app/bots"],
      ["IA", "/app/ia"],
      ["Avatar", "/app/avatar"],
      ["Partenaire", "/app/partner"],
    ];
    for (const [label, href] of expected) {
      const item = nav.find((entry) => entry.text === label);
      if (!item || item.href !== href) fail(`${viewport.name}: bottom tab ${label} -> ${href} missing`);
    }
    const avatar = nav.find((entry) => entry.text === "Avatar");
    if (!String(avatar?.cls || "").includes("font-medium")) {
      fail(`${viewport.name}: root must visually select Avatar tab`);
    }
  }

  const actionPaths = {
    acheter: "/app/avatar/acheter",
    vendre: "/app/avatar/vendre",
    trouver: "/app/nexus",
  };
  for (const [action, expectedPath] of Object.entries(actionPaths)) {
    await navigate("http://127.0.0.1:4173/", viewport);
    const clicked = await evaluate(`(() => {
      const element = document.querySelector('[data-waouh-action="${action}"]');
      if (!element) return false;
      element.click();
      return true;
    })()`);
    if (!clicked) fail(`${viewport.name}: Avatar action ${action} is not clickable`);
    await sleep(450);
    const pathNow = await evaluate("location.pathname");
    if (pathNow !== expectedPath) {
      fail(`${viewport.name}: ${action} navigated to ${pathNow}; expected ${expectedPath}`);
    }
  }

  await navigate("http://127.0.0.1:4173/", viewport);
  const asked = await evaluate(`(() => {
    const input = [...document.querySelectorAll("input")]
      .find((element) => (element.placeholder || "").includes("Dites à"));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Je cherche un téléphone à Cotonou");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const button = [...input.parentElement.querySelectorAll("button")]
      .find((element) => (element.innerText || "").trim() === "Demander");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!asked) fail(`${viewport.name}: Ayo command composer is not operable`);
  await sleep(700);
  const afterAsk = await evaluate(`({ path: location.pathname, text: document.body.innerText })`);
  if (viewport.width >= 1180) {
    if (afterAsk.path !== "/") fail(`desktop: Ayo command should stay on /, got ${afterAsk.path}`);
    if (!afterAsk.text.includes("WAOUH Assistant IA")) {
      fail("desktop: Ayo command did not open embedded WAOUH chat");
    }
  } else if (afterAsk.path !== "/app/chat/waouh") {
    fail(`${viewport.name}: Ayo command lost tablet/mobile chat route: ${afterAsk.path}`);
  }
}

async function testRoutes(viewport) {
  const routes = [
    ["/app/chat", null],
    ["/app/avatar", "Votre Avatar WAOUH"],
    ["/app/avatar/acheter", "Acheter avec mon Avatar"],
    ["/app/avatar/vendre", "Vendre avec mon Avatar"],
    ["/app/avatar/demander", "Demander à mon Avatar"],
    ["/app/nexus", "WAOUH NEXUS"],
    ["/app/missions", "Missions"],
    ["/app/ia", "Bots & IA WAOUH"],
    ["/app/bots", "Bots WAOUH"],
    ["/app/radar-map", null],
    ["/app/auth", "WaouhApp"],
  ];

  for (const [route, marker] of routes) {
    const state = await navigate(`http://127.0.0.1:4173${route}`, viewport);
    if (state.fallback) fail(`${viewport.name}: ${route} rendered ErrorBoundary fallback`);
    if (state.overflowX) fail(`${viewport.name}: horizontal overflow on ${route}`);
    if (marker && !state.text.includes(marker) && !state.fallback) {
      const waited = await waitForText(marker);
      state.text = waited.text;
      state.path = waited.path;
      state.fallback = waited.fallback;
    }
    if (marker && !state.text.includes(marker)) {
      fail(`${viewport.name}: ${route} missing marker "${marker}" at ${state.path}; body=${state.text.slice(0, 300)}`);
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
    await testRoutes(viewport);
    console.log(`WAOUH responsive smoke: ${viewport.name} OK`);
  }

  console.log("WAOUH browser smoke: desktop + tablet + mobile OK");
} finally {
  try { ws?.close(); } catch {}
  chromeProcess.kill("SIGTERM");
  preview.kill("SIGTERM");
}
