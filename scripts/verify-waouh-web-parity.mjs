import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = read("src/App.tsx");
const flutter = read("flutter_waouh_app/lib/live/live_app_production.dart");
const tabs = read("src/app-mobile/layouts/BottomTabBar.tsx");
const shell = read("src/app-mobile/layouts/MobileShell.tsx");
const chat = read("src/app-mobile/screens/WaouhChatScreen.tsx");
const sidebar = read("src/erp/WebErpShell.tsx");
const sw = read("public/sw.js");

const fail = (message) => { throw new Error(`[WAOUH parity] ${message}`); };
const must = (content, token, message = token) => {
  if (!content.includes(token)) fail(message);
};

const flutterRoutes = [...flutter.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
const requiredFlutterRoutes = [
  "/app/chat",
  "/app/chat/waouh",
  "/app/chat/match/:key",
  "/app/chat/:id",
  "/app/notifications",
  "/app/ia",
  "/app/avatar",
  "/app/avatar/acheter",
  "/app/avatar/vendre",
  "/app/avatar/demander",
  "/app/missions",
  "/app/nexus",
  "/app/bots",
  "/app/apresbac",
  "/app/fa-ia",
  "/app/radar-map",
  "/app/whatsapp/conversationnel",
  "/app/whatsapp/bi",
  "/app/whatsapp/select-agent",
  "/app/whatsapp/agent/:agentId/insights",
  "/app/whatsapp/agent/:agentId/catalogue",
  "/app/stock",
  "/app/presence",
  "/app/whatsapp",
  "/app/presence/checkin",
  "/app/partner",
  "/app/partner/businesses",
  "/app/partner/businesses/:businessId/products",
  "/app/profile",
];

for (const route of requiredFlutterRoutes) {
  if (!flutterRoutes.includes(route)) fail(`Flutter reference route disappeared: ${route}`);
}

const webTokens = {
  "/app/chat": 'path="chat"',
  "/app/chat/waouh": 'path="chat/waouh"',
  "/app/chat/match/:key": 'path="chat/match/:key"',
  "/app/chat/:id": 'path="chat/:id"',
  "/app/notifications": 'path="notifications"',
  "/app/ia": 'path="ia"',
  "/app/avatar": 'path="avatar"',
  "/app/avatar/:mode": 'path="avatar/:mode"',
  "/app/missions": 'path="missions"',
  "/app/nexus": 'path="nexus"',
  "/app/bots": 'path="bots"',
  "/app/apresbac": 'path="apresbac"',
  "/app/fa-ia": 'path="fa-ia"',
  "/app/radar-map": 'path="radar-map"',
  "/app/whatsapp/conversationnel": 'path="whatsapp/conversationnel"',
  "/app/whatsapp/bi": 'path="whatsapp/bi"',
  "/app/whatsapp/select-agent": 'path="whatsapp/select-agent"',
  "/app/whatsapp/agent/:agentId/insights": 'path="whatsapp/agent/:agentId/insights"',
  "/app/whatsapp/agent/:agentId/catalogue": 'path="whatsapp/agent/:agentId/catalogue"',
  "/app/stock": 'path="stock"',
  "/app/presence": 'path="presence"',
  "/app/whatsapp": 'path="whatsapp"',
  "/app/presence/checkin": 'path="/app/presence/checkin"',
  "/app/partner": 'path="partner"',
  "/app/partner/businesses": 'path="partner/businesses"',
  "/app/partner/businesses/:businessId/products": 'path="partner/businesses/:businessId/products"',
  "/app/profile": 'path="profile"',
};

for (const [route, token] of Object.entries(webTokens)) {
  must(app, token, `Web route missing for Flutter route ${route}`);
}

must(app, '<Route path="/waouh/nexus" element={<Navigate to="/app/nexus" replace />} />', "/waouh/nexus must target NEXUS");
must(shell, "const ERP_DESKTOP_BREAKPOINT = 1180", "MobileShell desktop breakpoint must remain 1180");
must(chat, "window.innerWidth >= 1180", "WAOUH chat breakpoint must match MobileShell");
if (chat.includes("window.innerWidth >= 768")) fail("Tablet still redirects away from Avatar chat");

const expectedTabs = [
  ["/app/chat", "Chat"],
  ["/app/bots", "Bots"],
  ["/app/ia", "IA"],
  ["/app/avatar", "Avatar"],
  ["/app/partner", "Partenaire"],
];
for (const [route, label] of expectedTabs) {
  must(tabs, `to: '${route}'`, `Bottom tab route missing: ${route}`);
  must(tabs, `label: '${label}'`, `Bottom tab label missing: ${label}`);
}
if (tabs.includes("label: 'WhatsApp IA'") || tabs.includes("label: 'Diffusion'")) {
  fail("Obsolete mobile bottom navigation is still present");
}

for (const label of [
  "Chat Command Center",
  "Radar",
  "WhatsApp IA",
  "Diffusion",
  "Avatar",
  "Missions & veille",
  "Bots",
  "Agents IA",
  "Conversationnel",
  "BI WAOUH IA",
  "Stock WAOUH IA",
  "Présence QR",
  "Boutiques & magasins",
  "Ventes",
  "Partenaires",
  "AprèsBac IA",
  "FA IA",
]) {
  must(sidebar, `label: '${label}'`, `Desktop sidebar changed or missing: ${label}`);
}

const canonicalDesktopRoutes = [
  ["Chat Command Center", "/app/chat"],
  ["Radar", "/app/radar-map"],
  ["WhatsApp IA", "/app/whatsapp"],
  ["Avatar", "/app/avatar"],
  ["Missions & veille", "/app/missions"],
  ["Bots", "/app/bots"],
  ["Agents IA", "/app/whatsapp/select-agent"],
  ["Conversationnel", "/app/whatsapp/conversationnel"],
  ["BI WAOUH IA", "/app/whatsapp/bi"],
  ["Stock WAOUH IA", "/app/stock"],
  ["Présence QR", "/app/presence"],
  ["Boutiques & magasins", "/app/partner/businesses"],
  ["AprèsBac IA", "/app/apresbac"],
  ["FA IA", "/app/fa-ia"],
];
for (const [label, route] of canonicalDesktopRoutes) {
  must(sidebar, `label: '${label}', to: '${route}'`, `Desktop canonical route mismatch: ${label} -> ${route}`);
}

must(sw, "const VERSION = 'v8';", "Service worker cache version must be v8");

console.log("WAOUH Flutter/Web route parity: OK");
console.log(`Flutter reference routes checked: ${requiredFlutterRoutes.length}`);
console.log("Responsive breakpoint parity: desktop >=1180; tablet/mobile use native-style shell");
console.log("Bottom navigation parity: Chat · Bots · IA · Avatar · Partenaire");
