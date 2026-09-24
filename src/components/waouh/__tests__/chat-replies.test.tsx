import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { assertChatResponse, mergeChatRows, normalizeChatReply, normalizeResultCards, reconcileChatResponse, serializeChatReply, type ChatRow } from '@/lib/chatReply';
import { WaouhProductResults } from '../WaouhProductCard';
import { readWaouhEngineResponse } from '../../../../supabase/functions/_shared/waouh-response';

const card = { id: 'article-a', index: 1, title: 'Stylo bleu', price: 0, photos: ['/a.jpg', '/b.jpg'] };
const now = new Date().toISOString();
const input: ChatRow = { id: 'temp-in-query', direction: 'in', text: 'Je cherche un stylo', created_at: now };
const response = { ok: true, inbound_message_id: 'in-query', outbound_message_id: 'out-query', reply: 'Voici les articles', results: [card], actions: [{ id: 'search', label: 'Autre recherche' }] };

describe('réponses WAOUH et bots', () => {
  it('conserve deux réponses distinctes reçues dans les mêmes 15 secondes', () => {
    const help: ChatRow = { id: 'help', direction: 'out', text: 'Aide', created_at: now };
    const messages = reconcileChatResponse([help, input], response, input);
    expect(messages.map((m) => m.id)).toEqual(['help', 'in-query', 'out-query']);
    expect(messages.at(-1)?.meta.results[0].title).toBe('Stylo bleu');
  });
  it.each(['http-first', 'realtime-first'])('fusionne HTTP et temps réel sans doublon ni perte des cartes (%s)', (order) => {
    const persisted: ChatRow = { id: 'out-query', direction: 'out', text: response.reply, created_at: now, meta: {} };
    const messages = order === 'http-first' ? mergeChatRows(reconcileChatResponse([input], response, input), [persisted]) : reconcileChatResponse([input, persisted], response, input);
    expect(messages.filter((m) => m.id === 'out-query')).toHaveLength(1);
    expect(messages.find((m) => m.id === 'out-query')?.meta.results).toHaveLength(1);
    expect(messages.find((m) => m.id === 'out-query')?.meta.actions).toHaveLength(1);
  });
  it('conserve le message local quand un ancien moteur ne renvoie pas son identifiant', () => {
    expect(reconcileChatResponse([input], { reply: 'Bonjour' }, input).some((m) => m.id === input.id)).toBe(true);
  });
  it('affiche une réponse composée uniquement de cartes', () => {
    const messages = reconcileChatResponse([input], { ...response, reply: '' }, input);
    expect(messages.at(-1)?.meta.results).toHaveLength(1);
  });
  it.each([{ ok: false }, { error: 'failed' }, { success: false }, {}, null])('refuse une réponse en échec ou vide (%j)', (payload) => {
    expect(() => assertChatResponse(payload)).toThrow();
  });
  it('ne masque pas les erreurs renvoyées par Supabase', () => {
    expect(() => assertChatResponse(response, new Error('network'))).toThrow('network');
  });
  it('ne fabrique pas de réponse OK quand le routeur annonce un envoi séparé', () => {
    const messages = reconcileChatResponse([input], { ok: true, inbound_message_id: 'in-query', suppress_direct_reply: true }, input);
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('in-query');
  });
  it('ne supprime qu’un seul message optimiste lors du rapprochement', () => {
    const second = { ...input, id: 'temp-in-second' };
    const messages = mergeChatRows([input, second], [{ ...input, id: 'server-first' }]);
    expect(messages).toHaveLength(2);
  });
  it('respecte les corrélations différentes malgré un texte identique', () => {
    const messages = mergeChatRows([{ ...input, meta: { correlation_id: 'a' } }], [{ ...input, id: 'server', meta: { correlation_id: 'b' } }]);
    expect(messages).toHaveLength(2);
  });
  it.each([
    { reply: 'Résultats', results: [card] },
    { text: 'Résultats', meta: { results: [card] } },
    { output: { text: 'Résultats', cards: [card] } },
    [{ output: JSON.stringify({ text: 'Résultats', carousel: { items: [card] } }) }],
  ])('comprend les formats de réponses et l’historique (%j)', (payload) => {
    const reply = normalizeChatReply(payload);
    expect(reply.text).toBe('Résultats');
    expect(reply.results[0].photos).toEqual(['/a.jpg', '/b.jpg']);
  });
  it('ne perd pas le catalogue quand results est vide', () => {
    const reply = normalizeChatReply({ results: [], products: [{ nom: 'Stylo', prix_min: '0', photo: '/a.jpg' }] });
    expect(reply.results[0]).toMatchObject({ title: 'Stylo', price_min: 0, action: null, source: 'catalogue' });
  });
  it('conserve les cartes après sauvegarde et rechargement de l’historique des bots', () => {
    const reply = normalizeChatReply(serializeChatReply({ output: { text: 'Voici', products: [card] } }));
    expect(reply.results).toHaveLength(1);
    expect(reply.text).toBe('Voici');
  });
  it('conserve les réponses texte normales sans JSON supplémentaire', () => {
    expect(serializeChatReply({ output: 'Bonjour' })).toBe('Bonjour');
  });
  it('tolère les cartes mal formées et les photos sous forme d’objets', () => {
    expect(normalizeResultCards([null, { title: 'Bic', photos: [null, { url: '/bic.jpg' }, 'javascript:alert(1)'] }])[0]).toMatchObject({ index: 2, photos: ['/bic.jpg'] });
  });
  it('rend les cartes, les contrôles du carrousel et le prix zéro', () => {
    const html = renderToStaticMarkup(<WaouhProductResults results={[card, { ...card, id: 'b', index: 2, title: 'Stylo noir' }]} />);
    expect(html).toContain('Articles suivants');
    expect(html).toContain('aria-roledescription="carrousel"');
    expect(html).toContain('Stylo noir');
    expect(html).toContain('0 FCFA');
    expect(html).toContain('overflow-x-auto');
  });
});

describe('contrat du moteur serveur', () => {
  it.each([500, 502, 401])('propage une erreur HTTP %i', async (status) => {
    await expect(readWaouhEngineResponse(new Response(JSON.stringify({ reply: 'Erreur' }), { status }))).rejects.toThrow();
  });
  it.each([{ ok: false }, { error: 'service indisponible' }, {}])('refuse un faux succès HTTP 200 (%j)', async (payload) => {
    await expect(readWaouhEngineResponse(new Response(JSON.stringify(payload)))).rejects.toThrow();
  });
  it('accepte un catalogue sans texte et conserve les actions', async () => {
    const payload = { products: [card], actions: response.actions };
    await expect(readWaouhEngineResponse(new Response(JSON.stringify(payload)))).resolves.toEqual(payload);
  });
});
