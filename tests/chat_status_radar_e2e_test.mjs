import assert from 'node:assert/strict';

class CommerceHarness {
  constructor() {
    this.active = new Map();
    this.threads = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.idempotency = new Map();
    this.sequence = 0;
  }

  relation(article, buyer, seller) {
    return `${article}:${buyer}:${seller}`;
  }

  interest({ source, article, buyer, seller, product, key }) {
    if (this.idempotency.has(key)) return this.idempotency.get(key);
    const relation = this.relation(article, buyer, seller);
    let threadId = this.active.get(relation);
    if (!threadId) {
      threadId = `thread-${++this.sequence}`;
      this.active.set(relation, threadId);
      this.threads.set(threadId, {
        id: threadId, article, buyer, seller, source,
        state: 'negotiating', cycle: this.sequence,
      });
      this.messages.set(threadId, []);
    }
    const result = { threadId, article, buyer, seller };
    this.idempotency.set(key, result);
    this.append(threadId, buyer, 'interested', product);
    this.notify(threadId, seller, 'new_buyer', product);
    this.notify(threadId, buyer, source === 'radar' ? 'radar_match' : 'match_buyer', product);
    return result;
  }

  append(threadId, actor, action, product) {
    const thread = this.threads.get(threadId);
    assert.ok(thread, 'thread obligatoire');
    assert.ok([thread.buyer, thread.seller].includes(actor), 'participant obligatoire');
    assert.equal(product.article_id, thread.article, 'article exact obligatoire');
    assert.ok(Array.isArray(product.photos), 'photos structurées obligatoires');
    this.messages.get(threadId).push({ actor, action, product: structuredClone(product) });
  }

  notify(threadId, user, type, product) {
    const id = `${threadId}:${user}:${type}`;
    if (!this.notifications.has(id)) {
      this.notifications.set(id, { threadId, user, type, article: product.article_id });
    }
  }

  transition(threadId, actor, action, referenceThread = threadId) {
    const thread = this.threads.get(threadId);
    assert.ok(thread);
    assert.equal(referenceThread, threadId, 'deal/négociation d’un autre thread refusé');
    assert.ok([thread.buyer, thread.seller].includes(actor), 'intrus refusé');
    const role = actor === thread.buyer ? 'buyer' : 'seller';
    const allowed = {
      negotiating: { buyer: ['propose', 'accept', 'refuse'], seller: ['counter', 'accept', 'refuse'] },
      accepted: { buyer: ['pay_mobile', 'cash_on_delivery', 'cancel'], seller: ['confirm_available', 'cancel'] },
      seller_confirmed: { buyer: ['pay_mobile', 'cash_on_delivery', 'cancel'], seller: ['prepare', 'cancel'] },
      paid: { buyer: ['track', 'dispute'], seller: ['prepare', 'cancel'] },
      ready_for_pickup: { buyer: ['track', 'dispute'], seller: ['cancel'] },
      delivered: { buyer: ['confirm_receipt', 'dispute'], seller: [] },
    };
    assert.ok(allowed[thread.state]?.[role]?.includes(action), `${role}/${action} interdit depuis ${thread.state}`);
    thread.state = ({
      accept: 'accepted',
      confirm_available: 'seller_confirmed',
      pay_mobile: 'paid',
      cash_on_delivery: 'seller_confirmed',
      prepare: 'ready_for_pickup',
      confirm_receipt: 'concluded',
      refuse: 'cancelled',
      cancel: 'cancelled',
      dispute: 'disputed',
    })[action] ?? thread.state;
    if (['concluded', 'cancelled'].includes(thread.state)) {
      this.active.delete(this.relation(thread.article, thread.buyer, thread.seller));
    }
  }

  history(threadId) {
    return this.messages.get(threadId) ?? [];
  }
}

const product = (id, photos = [`https://img.waouh.test/${id}-1.jpg`]) => ({
  article_id: id,
  title: `Produit ${id}`,
  price: 100000,
  photos,
  details: 'État vérifié',
  market_comparison: 'Médiane 115 000 FCFA',
  comparative_analysis: 'Prix sous la médiane',
  recommendation: 'Vérifier les accessoires avant achat',
  actions: [{ id: `interesse:${id}`, label: 'Je suis intéressé' }],
});

for (const source of ['chat', 'radar', 'status', 'partner']) {
  const h = new CommerceHarness();
  const opened = h.interest({ source, article: `a-${source}`, buyer: 'b1', seller: 's1', product: product(`a-${source}`), key: `k-${source}` });
  assert.equal(h.history(opened.threadId)[0].product.photos.length, 1);
  assert.equal([...h.notifications.values()].every(n => n.threadId === opened.threadId), true);
}

const h = new CommerceHarness();
const a1b1 = h.interest({ source: 'chat', article: 'a1', buyer: 'b1', seller: 's1', product: product('a1', ['p1', 'p2']), key: 'k1' });
const retry = h.interest({ source: 'radar', article: 'a1', buyer: 'b1', seller: 's1', product: product('a1'), key: 'k1' });
assert.equal(retry.threadId, a1b1.threadId, 'retry idempotent');
const sameRelationRadar = h.interest({ source: 'radar', article: 'a1', buyer: 'b1', seller: 's1', product: product('a1'), key: 'k2' });
assert.equal(sameRelationRadar.threadId, a1b1.threadId, 'sources convergent vers le Meet actif');
const a1b2 = h.interest({ source: 'status', article: 'a1', buyer: 'b2', seller: 's1', product: product('a1'), key: 'k3' });
const a2b1 = h.interest({ source: 'partner', article: 'a2', buyer: 'b1', seller: 's1', product: product('a2'), key: 'k4' });
const a1s2 = h.interest({ source: 'radar', article: 'a1', buyer: 'b1', seller: 's2', product: product('a1'), key: 'k5' });
assert.equal(new Set([a1b1.threadId, a1b2.threadId, a2b1.threadId, a1s2.threadId]).size, 4);
assert.equal(h.history(a1b2.threadId).every(m => m.product.article_id === 'a1'), true);
assert.equal(h.history(a2b1.threadId).every(m => m.product.article_id === 'a2'), true);
assert.throws(() => h.append(a1b1.threadId, 'intruder', 'message', product('a1')));
assert.throws(() => h.append(a1b1.threadId, 'b1', 'message', product('a2')));
assert.throws(() => h.transition(a1b1.threadId, 'b1', 'accept', a2b1.threadId));
h.transition(a1b1.threadId, 'b1', 'accept');
h.transition(a1b1.threadId, 's1', 'confirm_available');
h.transition(a1b1.threadId, 'b1', 'pay_mobile');
h.transition(a1b1.threadId, 's1', 'prepare');
h.threads.get(a1b1.threadId).state = 'delivered';
h.transition(a1b1.threadId, 'b1', 'confirm_receipt');
assert.equal(h.threads.get(a1b1.threadId).state, 'concluded');
const newCycle = h.interest({ source: 'chat', article: 'a1', buyer: 'b1', seller: 's1', product: product('a1'), key: 'k6' });
assert.notEqual(newCycle.threadId, a1b1.threadId, 'nouveau cycle après clôture');
assert.ok(h.history(a1b1.threadId).length > 0, 'ancien historique conservé');
assert.equal(h.notifications.size, new Set(h.notifications.keys()).size, 'notifications dédupliquées');

console.log('WAOUH Chat/Status/Radar/Partner E2E scenarios: OK');
