import { classifyAvatarReply, selectReplyJourney, followupDelayHours, planAvatarNegotiation, withinMandateBudget } from './waouh-avatar-lifecycle.ts';
import { routeOpportunityChannel } from './waouh-channel-router.ts';
import { boundedFollowUpDecision } from './waouh-opportunity-os.ts';
const equal = (actual: unknown, expected: unknown) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); };
Deno.test('Refus, STOP, prix isolé et salutation ne constituent pas une réponse positive', () => {
  equal(classifyAvatarReply('Non merci'), 'negative'); equal(classifyAvatarReply('STOP'), 'stop');
  equal(classifyAvatarReply('Bonjour'), 'ambiguous'); equal(classifyAvatarReply('25000'), 'ambiguous');
  equal(classifyAvatarReply('Oui disponible'), 'positive'); equal(classifyAvatarReply('Oui mais déjà vendu'), 'negative');
});
Deno.test('Deux missions vers un numéro exigent une référence ; un message non livré est exclu', () => {
  const rows = [{ status: 'sent', payload: { journey_id: 'aaaaaaaa-1111' } }, { status: 'sent', payload: { journey_id: 'bbbbbbbb-2222' } }];
  equal(selectReplyJourney(rows, 'oui'), null);
  equal(selectReplyJourney(rows, 'oui WA-BBBBBBBB')?.payload?.journey_id, 'bbbbbbbb-2222');
  equal(selectReplyJourney([{ status: 'failed', payload: { journey_id: 'aaaaaaaa-1111' } }], 'oui'), null);
});
Deno.test('Une relance de mandat 24h intervient avant son expiration', () => {
  const hours = followupDelayHours(24, 1); equal(hours, 8);
  equal(boundedFollowUpDecision({ autonomyMode: 'autonomous', stage: 'waiting_reply', lastActivityAt: new Date(Date.now()-9*3600000).toISOString(), maxFollowups: 1, followupsSent: 0, delayHours: hours }).due, true);
});
const mandate = { mode: 'buy', status: 'active', autonomy_mode: 'autonomous', expires_at: new Date(Date.now()+86400000).toISOString(), budget_max: 25000, metadata: { max_negotiation_rounds: 2 } };
Deno.test('Contre-offre limitée ; accord soumis au propriétaire ; aucune auto-acceptation de sa propre offre', () => {
  equal(planAvatarNegotiation(mandate, { state: 'countered', last_actor: 'seller', last_offer_price: 30000 }, 0).kind, 'counter');
  equal(planAvatarNegotiation(mandate, { state: 'countered', last_actor: 'seller', last_offer_price: 23000 }, 0).kind, 'approval');
  equal(planAvatarNegotiation(mandate, { state: 'countered', last_actor: 'buyer', last_offer_price: 23000 }, 0).kind, 'wait');
  equal(planAvatarNegotiation(mandate, { state: 'countered', last_actor: 'seller', last_offer_price: 30000 }, 2).kind, 'approval');
});
Deno.test('Budget maximal ferme et refus du canal WhatsApp respectés', () => {
  equal(withinMandateBudget(mandate, { price_min: 30000 }), false);
  equal(routeOpportunityChannel({ channels: [{ channel: 'phone', public_business: true }], contactability: 'C1', allowWhatsapp: false }).can_dispatch, false);
});
Deno.test('Une approbation C3 est nécessaire avant le dispatch', () => {
  const route = { channels: [{ channel: 'whatsapp', reachable: true }], contactability: 'C3' };
  equal(routeOpportunityChannel(route).can_dispatch, false);
  equal(routeOpportunityChannel({ ...route, approvalGranted: true }).can_dispatch, true);
});
