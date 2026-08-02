import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const migration = read('supabase/migrations/20260801180000_waouh_chat_meet_threads.sql');
const performanceMigration = read('supabase/migrations/20260801213000_waouh_chat_meet_performance.sql');
const channel = read('supabase/functions/waouh-channel-in/index.ts');
const history = read('supabase/functions/waouh-match-history/index.ts');
const threadHelper = read('supabase/functions/_shared/waouh-thread.ts');
const workflow = read('supabase/functions/waouh-commerce-workflow/index.ts');
const notifications = read('supabase/functions/waouh-notify-dispatch/index.ts');
const webhook = read('supabase/functions/waouh-webhook/index.ts');
const flutterHistory = read('flutter_waouh_app/lib/live/live_match_history_service.dart');
const flutterNotifications = read('flutter_waouh_app/lib/live/live_notification_service.dart');
const flutterThreads = read('flutter_waouh_app/lib/live/live_controller_extensions.dart');
const flutterWidgets = read('flutter_waouh_app/lib/live/live_widgets.dart');
const flutterMatch = read('flutter_waouh_app/lib/live/live_match_chat_v2.dart');
const flutterController = read('flutter_waouh_app/lib/live/live_controller.dart');
const flutterRadar = read('flutter_waouh_app/lib/live/live_radar_service.dart');
const flutterStatus = read('flutter_waouh_app/lib/live/live_status_service.dart');
const integrityMigration = read('supabase/migrations/20260802010000_waouh_chat_status_radar_integrity.sql');
const negotiation = read('supabase/functions/waouh-negotiation-router/index.ts');
const buyerInterest = read('supabase/functions/waouh-buyer-interest/index.ts');
const flutterRadarScreen = read('flutter_waouh_app/lib/live/live_radar_screen.dart');
const flutterRadarMap = read('flutter_waouh_app/lib/live/live_radar_map_screen.dart');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.waouh_chat_threads/);
for (const table of ['waouh_messages', 'waouh_notifications', 'waouh_negotiations', 'waouh_deals', 'waouh_transactions', 'waouh_interests', 'waouh_radar_matches']) {
  assert.match(migration, new RegExp(`ALTER TABLE IF EXISTS public\\.${table}[\\s\\S]*?thread_id`));
}
for (const status of ['active', 'negotiating', 'accepted', 'paid', 'concluded', 'cancelled']) {
  assert.match(migration, new RegExp(`['\"]${status}['\"]`));
}

assert.match(channel, /resolveProductThread/);
assert.match(channel, /thread_id:\s*threadId/);
assert.match(channel, /\.eq\("thread_id", threadId\)/);
assert.match(channel, /preferredThreadId:\s*clientMeta\?\.thread_id/);
assert.doesNotMatch(
  channel,
  /meet\?\.id\s*\?\?\s*clientMeta\?\.thread_id/,
  'un thread fourni par le client ne doit jamais contourner la validation serveur',
);
assert.match(threadHelper, /Accès refusé à cette discussion Chat Meet/);
assert.match(threadHelper, /Rôle Chat Meet incompatible avec l'article/);
assert.match(threadHelper, /resolveSearchThread/);
assert.match(threadHelper, /search:\$\{ownerUserId\}:\$\{searchRequestId\}/);
assert.doesNotMatch(
  channel,
  /if \(metaArticleId\)[\s\S]{0,350}\.eq\("article_id", metaArticleId\)[\s\S]{0,200}\.limit\(1\)/,
  'une négociation Chat Meet ne doit jamais être choisie par article seul',
);

assert.match(history, /\.eq\("thread_id", threadId\)/);
assert.match(history, /thread access denied/);
assert.match(workflow, /Ce paiement appartient à une autre discussion/);
assert.match(workflow, /\.eq\("thread_id", requestedThreadId\)/);
assert.doesNotMatch(
  workflow,
  /\.from\("waouh_deals"\)[\s\S]{0,240}\.order\("updated_at"[\s\S]{0,120}candidates/,
  'le workflow ne doit jamais sélectionner le dernier deal actif',
);
assert.match(notifications, /participants\/thread mismatch/);
assert.match(channel, /idempotency_key/);
assert.match(channel, /error: inboundError/);
assert.match(channel, /auth identity mismatch/);
assert.match(channel, /promoteCatalogToArticle/);
assert.match(channel, /radar_promotion_failed/);
assert.match(channel, /code: "waouh_core_rejected"/);
assert.match(channel, /\(\?:\[:#-\]\\s\*\)\?/);

assert.match(webhook, /const alreadyOnArticle = false/);
assert.match(webhook, /\.eq\("thread_id", interestThreadId\)/);
assert.match(webhook, /buyer_interest:\$\{neg\?\.id \?\? interestThreadId\}/);
assert.match(webhook, /notification_type: "match_buyer"/);
assert.match(webhook, /clientAction === "interested"/);
assert.match(webhook, /returnedProducts = \[interestProduct\]/);
assert.match(webhook, /waouh_interests/);
assert.match(webhook, /thread_id: interestThreadId, updated_at/);
assert.match(performanceMigration, /waouh_messages_thread_latest_idx/);
assert.match(performanceMigration, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.waouh_messages/);

assert.match(flutterHistory, /\.eq\('thread_id', match\.threadId!\)/);
assert.doesNotMatch(
  flutterHistory,
  /\.eq\('article_id', match\.articleId\)/,
  'le fallback Flutter ne doit jamais charger un historique par article seul',
);
assert.match(flutterNotifications, /select\('id,thread_id,notification_type/);
assert.match(flutterNotifications, /_matchesInFlight/);
assert.match(flutterNotifications, /Map<String, Future<List<LiveMatch>>>/);
assert.match(flutterNotifications, /storageKey: 'auth_\$authUserId'/);
assert.match(
  flutterNotifications,
  /if \(authUserId != null && authUserId\.isNotEmpty\) \{[\s\S]{0,500}unifiedOrClause: clause,[\s\S]{0,200}storageKey: 'auth_\$authUserId'/,
  'la portée authentifiée doit être liée au compte et non à la session appareil',
);
assert.match(flutterThreads, /PostgresChangeEvent\.all/);
assert.match(flutterThreads, /_waouhThreadMessageCache/);
assert.match(flutterWidgets, /liveCommercePayloadText/);
assert.match(flutterWidgets, /'action': 'interested'/);
assert.doesNotMatch(flutterWidgets, /params\['action'\]\s*=\s*'interested'/);
assert.doesNotMatch(flutterMatch, /LiveSmartProductPreview/);
assert.match(flutterMatch, /LiveSmartTimeline/);
assert.match(flutterMatch, /Commencez ou poursuivez cette recherche/);
assert.match(flutterController, /newIdempotencyKey/);
assert.match(flutterController, /'auto_send': status\.type == 'sell'/);
assert.match(flutterRadar, /Duration\(seconds: 20\)/);
assert.match(flutterRadar, /_inFlight\.putIfAbsent/);
assert.match(flutterRadarScreen, /'action': 'interested'/);
assert.match(flutterRadarMap, /'action': 'interested'/);
assert.match(flutterStatus, /photos\.take\(4\)/);
assert.match(flutterStatus, /data\['ok'\] != true/);
assert.match(integrityMigration, /waouh_interests_thread_dedupe_uidx/);
assert.match(integrityMigration, /waouh_statuses_idempotency_uidx/);
assert.match(negotiation, /\.eq\("thread_id", activeThreadId\)/);
assert.match(workflow, /String\(deal\.status\) !== "delivered"/);
assert.match(buyerInterest, /resolveProductThread/);
assert.match(buyerInterest, /\.eq\("thread_id", threadId\)/);
assert.match(buyerInterest, /thread_id: threadId/);
assert.doesNotMatch(
  buyerInterest,
  /\.eq\("article_id", article_id\)[\s\S]{0,180}\.order\("updated_at"/,
  'un intérêt direct ne doit jamais récupérer la dernière négociation par article',
);

const interestSelection = /(?:int[ée]ress[ée]|interesse)\s*(?:[:#-]\s*)?(?:n[°o]?\s*)?(?:x|\d+)/i;
for (const payload of ['interesse:1', 'intéressé 2', 'interesse-3', 'intéressé #4']) {
  assert.equal(interestSelection.test(payload), true, `${payload} doit rester dans le moteur de sélection`);
}
assert.equal(interestSelection.test('contre-proposition:100000'), false);

const routeKey = (article, role, counterpart, thread) =>
  thread ? `meet_${thread}` : `art_${article}_${role}${counterpart ? `_${counterpart}` : ''}`;

assert.notEqual(
  routeKey('article-a', 'seller', 'buyer-1', 'thread-1'),
  routeKey('article-a', 'seller', 'buyer-2', 'thread-2'),
);
assert.notEqual(
  routeKey('article-a', 'buyer', 'seller-1', null),
  routeKey('article-a', 'buyer', 'seller-2', null),
);
assert.equal(
  routeKey('article-a', 'buyer', 'seller-1', 'thread-1'),
  routeKey('article-a', 'buyer', 'seller-1', 'thread-1'),
);

const activeThreads = new Map();
const threadHistory = new Map();
const relationKey = (article, buyer, seller) => `${article}:${buyer}:${seller}`;
const openMeet = (article, buyer, seller, cycle) => {
  const relation = relationKey(article, buyer, seller);
  if (activeThreads.has(relation)) return activeThreads.get(relation);
  const id = `meet:${article}:${buyer}:${seller}:${cycle}`;
  activeThreads.set(relation, id);
  threadHistory.set(id, []);
  return id;
};
const closeMeet = (id) => {
  for (const [key, value] of activeThreads) if (value === id) activeThreads.delete(key);
};

const sellerBuyer1 = openMeet('article-a', 'buyer-1', 'seller-1', 'cycle-1');
const sellerBuyer2 = openMeet('article-a', 'buyer-2', 'seller-1', 'cycle-1');
assert.notEqual(sellerBuyer1, sellerBuyer2, 'deux acheteurs doivent rester étanches');

const buyerArticle2 = openMeet('article-b', 'buyer-1', 'seller-1', 'cycle-1');
assert.notEqual(sellerBuyer1, buyerArticle2, 'deux produits doivent rester étanches');

const otherSeller = openMeet('article-a', 'buyer-1', 'seller-2', 'cycle-1');
assert.notEqual(sellerBuyer1, otherSeller, 'deux vendeurs doivent rester étanches');

assert.equal(
  openMeet('article-a', 'buyer-1', 'seller-1', 'notification-retry'),
  sellerBuyer1,
  'Radar et notification doivent réutiliser le Meet actif',
);
for (const source of ['chat', 'radar', 'partner']) {
  assert.equal(
    openMeet('article-a', 'buyer-1', 'seller-1', source),
    sellerBuyer1,
    `la source ${source} doit réutiliser la relation active exacte`,
  );
}

const negotiations = new Map();
const openNegotiation = (thread) => {
  if (!negotiations.has(thread)) negotiations.set(thread, `neg:${thread}`);
  return negotiations.get(thread);
};
assert.equal(openNegotiation(sellerBuyer1), openNegotiation(sellerBuyer1));
assert.equal(negotiations.size, 1, 'un intérêt répété ne doit pas dupliquer la négociation');

threadHistory.get(sellerBuyer1).push({ action: 'accepted', article: 'article-a' });
assert.equal(threadHistory.get(buyerArticle2).length, 0, 'Accepter A ne doit jamais modifier B');

closeMeet(sellerBuyer1);
const newCycle = openMeet('article-a', 'buyer-1', 'seller-1', 'cycle-2');
assert.notEqual(newCycle, sellerBuyer1, 'un cycle conclu doit produire un nouveau Meet');
assert.equal(threadHistory.get(sellerBuyer1).length, 1, 'l’ancien historique doit être conservé');

const searchKey = (user, request) => `search:${user}:${request}`;
assert.notEqual(searchKey('buyer-1', 'request-1'), searchKey('buyer-1', 'request-2'));

const canAct = (thread, actor, article, deal) =>
  thread.article === article &&
  [thread.buyer, thread.seller].includes(actor) &&
  (!deal || deal.thread === thread.id);
const secureThread = { id: newCycle, article: 'article-a', buyer: 'buyer-1', seller: 'seller-1' };
assert.equal(canAct(secureThread, 'buyer-1', 'article-a', { thread: newCycle }), true);
assert.equal(canAct(secureThread, 'intruder', 'article-a', { thread: newCycle }), false);
assert.equal(canAct(secureThread, 'buyer-1', 'article-b', { thread: newCycle }), false);
assert.equal(canAct(secureThread, 'buyer-1', 'article-a', { thread: buyerArticle2 }), false);

console.log('WAOUH Chat Meet contract tests: OK');
