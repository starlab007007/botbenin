const PRIVATAI_PAGE = "/privatia";
const WINDOWS_DOWNLOAD = "/privatia/downloads/PrivatAI-Windows-x64-Setup.exe";
const MAC_DOWNLOAD = "/privatia/downloads/PrivatAI-Mac-Intel.dmg";
const CARD_ID = "privatai-chat-promo";
const STYLE_ID = "privatai-chat-promo-style";

const isChatHome = () => window.location.pathname.replace(/\/$/, "") === "/app/chat";

const detectPlatform = () => {
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
  if (/win/.test(platform)) return "windows";
  if (/mac/.test(platform)) return "mac";
  return "other";
};

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${CARD_ID}{margin:12px;overflow:hidden;border:1px solid rgba(124,58,237,.22);border-radius:18px;background:linear-gradient(135deg,rgba(245,243,255,.98),rgba(255,255,255,.98) 48%,rgba(236,253,245,.92));box-shadow:0 10px 28px rgba(55,48,163,.08);font-family:inherit;color:hsl(var(--foreground));}
    .pa-chat-promo-inner{padding:13px}.pa-chat-promo-head{display:flex;gap:10px;align-items:flex-start}.pa-chat-promo-logo{width:42px;height:42px;flex:none;display:grid;place-items:center;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;box-shadow:0 8px 18px rgba(124,58,237,.24)}
    .pa-chat-promo-logo svg{width:21px;height:21px}.pa-chat-promo-copy{min-width:0;flex:1}.pa-chat-promo-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pa-chat-promo-title strong{font-size:14px;line-height:18px}.pa-chat-promo-chip{display:inline-flex;padding:2px 6px;border-radius:999px;font-size:8px;line-height:14px;font-weight:800;letter-spacing:.03em}.pa-chat-promo-chip.local{background:#6d28d9;color:#fff}.pa-chat-promo-chip.free{background:#dcfce7;color:#15803d}
    .pa-chat-promo-copy p{margin:4px 0 0;font-size:11.5px;line-height:16px;color:hsl(var(--muted-foreground))}.pa-chat-promo-features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:10px}.pa-chat-promo-feature{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;padding:6px 5px;border:1px solid hsl(var(--border));border-radius:9px;background:hsl(var(--background)/.78);font-size:9px;font-weight:700;white-space:nowrap}.pa-chat-promo-feature svg{width:12px;height:12px;flex:none;color:#6d28d9}.pa-chat-promo-feature.green svg{color:#059669}
    .pa-chat-promo-main{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;margin-top:10px;border-radius:11px;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:white!important;text-decoration:none!important;font-size:11px;font-weight:800;box-shadow:0 7px 16px rgba(109,40,217,.18)}.pa-chat-promo-main:hover{filter:brightness(1.03)}.pa-chat-promo-main svg{width:13px;height:13px}
    .pa-chat-promo-downloads{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.pa-chat-promo-download{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;height:36px;padding:0 7px;border:1px solid hsl(var(--border));border-radius:11px;background:hsl(var(--background));color:hsl(var(--foreground))!important;text-decoration:none!important;font-size:10px;font-weight:750}.pa-chat-promo-download:hover{background:hsl(var(--muted))}.pa-chat-promo-download.recommended{border-color:rgba(124,58,237,.4);box-shadow:inset 0 0 0 1px rgba(124,58,237,.06)}.pa-chat-promo-download svg{width:14px;height:14px}.pa-chat-promo-rec{position:absolute;right:5px;top:-6px;padding:1px 4px;border-radius:999px;background:#7c3aed;color:#fff;font-size:6.5px;font-weight:800;letter-spacing:.02em}
    .pa-chat-promo-foot{margin:7px 2px 0;text-align:center;font-size:8.5px;line-height:13px;color:hsl(var(--muted-foreground))}.pa-chat-promo-foot b{color:#059669;font-weight:800}
    .dark #${CARD_ID}{border-color:rgba(139,92,246,.3);background:linear-gradient(135deg,rgba(46,16,101,.35),rgba(17,24,39,.96) 50%,rgba(6,78,59,.22))}.dark .pa-chat-promo-chip.free{background:rgba(6,95,70,.6);color:#86efac}
    @media(max-width:360px){.pa-chat-promo-features{grid-template-columns:1fr}.pa-chat-promo-feature{justify-content:flex-start;padding-left:9px}}
  `;
  document.head.appendChild(style);
};

const icon = (name: "shield" | "offline" | "file" | "external" | "windows" | "apple") => {
  if (name === "shield") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>`;
  if (name === "offline") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9a13 13 0 0 1 18 0M6.5 12.5a8 8 0 0 1 11 0M10 16a3 3 0 0 1 4 0M3 3l18 18"/></svg>`;
  if (name === "file") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>`;
  if (name === "external") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`;
  if (name === "windows") return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.4 4.3 10.8 3v8.1H2.4V4.3Zm9.5-1.5L21.6 1.4v9.7h-9.7V2.8ZM2.4 12.2h8.4v8.1l-8.4-1.2v-6.9Zm9.5 0h9.7v9.7l-9.7-1.4v-8.3Z"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.7 19.5c-.8 1.2-1.7 2.5-3 2.5s-1.7-.8-3.2-.8-2 .8-3.2.8c-1.3.1-2.3-1.3-3.1-2.6-1.7-2.5-3-7-1.3-10.1.9-1.5 2.5-2.5 4.2-2.5 1.3 0 2.5.9 3.2.9.7 0 2.1-1.1 3.6-.9.6 0 2.3.2 3.4 1.8-.1.1-2 1.2-2 3.6 0 2.9 2.5 3.8 2.5 3.9 0 .1-.4 1.4-1.1 2.4ZM13.7 5.7c.7-.8 1.8-1.5 2.8-1.5.1 1.2-.3 2.3-1 3.2-.7.8-1.7 1.5-2.8 1.4-.1-1.2.4-2.3 1-3.1Z"/></svg>`;
};

const buildCard = () => {
  const detected = detectPlatform();
  const card = document.createElement("section");
  card.id = CARD_ID;
  card.setAttribute("aria-label", "PrivatAI — IA locale pour documents sensibles");
  card.innerHTML = `
    <div class="pa-chat-promo-inner">
      <div class="pa-chat-promo-head">
        <div class="pa-chat-promo-logo">${icon("shield")}</div>
        <div class="pa-chat-promo-copy">
          <div class="pa-chat-promo-title"><strong>PrivatAI</strong><span class="pa-chat-promo-chip local">IA LOCALE</span><span class="pa-chat-promo-chip free">GRATUIT</span></div>
          <p>Votre IA privée pour analyser vos documents sensibles directement sur votre ordinateur.</p>
        </div>
      </div>
      <div class="pa-chat-promo-features">
        <div class="pa-chat-promo-feature">${icon("offline")}<span>Hors ligne</span></div>
        <div class="pa-chat-promo-feature green">${icon("shield")}<span>Données locales</span></div>
        <div class="pa-chat-promo-feature">${icon("file")}<span>Réponses sourcées</span></div>
      </div>
      <a class="pa-chat-promo-main" href="${PRIVATAI_PAGE}" target="_blank" rel="noopener noreferrer">Découvrir PrivatAI ${icon("external")}</a>
      <div class="pa-chat-promo-downloads">
        <a class="pa-chat-promo-download ${detected === "windows" ? "recommended" : ""}" href="${WINDOWS_DOWNLOAD}" download="PrivatAI-Windows-x64-Setup.exe">${detected === "windows" ? '<span class="pa-chat-promo-rec">RECOMMANDÉ</span>' : ""}${icon("windows")}<span>Windows x64</span></a>
        <a class="pa-chat-promo-download ${detected === "mac" ? "recommended" : ""}" href="${MAC_DOWNLOAD}" download="PrivatAI-Mac-Intel.dmg">${detected === "mac" ? '<span class="pa-chat-promo-rec">RECOMMANDÉ</span>' : ""}${icon("apple")}<span>Mac Intel</span></a>
      </div>
      <div class="pa-chat-promo-foot"><b>Vos documents restent sur votre ordinateur.</b> Après installation des modèles locaux, les analyses documentaires peuvent fonctionner sans Internet.</div>
    </div>`;
  return card;
};

const findWaouhPinnedButton = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.find((button) => {
    const text = (button.textContent || "").replace(/\s+/g, " ").trim();
    return text.includes("WAOUH") && text.includes("Toujours actif");
  }) || null;
};

const syncPromo = () => {
  const current = document.getElementById(CARD_ID);
  if (!isChatHome()) {
    current?.remove();
    return;
  }

  const anchor = findWaouhPinnedButton();
  if (!anchor || !anchor.parentElement) return;

  ensureStyle();
  if (current && current.previousElementSibling === anchor) return;
  current?.remove();
  anchor.insertAdjacentElement("afterend", buildCard());
};

let queued = false;
const scheduleSync = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    syncPromo();
  });
};

const observer = new MutationObserver(scheduleSync);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("popstate", scheduleSync);
window.addEventListener("hashchange", scheduleSync);
window.addEventListener("load", scheduleSync);

const originalPushState = history.pushState.bind(history);
history.pushState = (...args) => {
  originalPushState(...args);
  scheduleSync();
};
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (...args) => {
  originalReplaceState(...args);
  scheduleSync();
};

scheduleSync();
