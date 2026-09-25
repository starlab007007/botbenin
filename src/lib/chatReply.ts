import type { WaouhResultCard } from '@/components/waouh/WaouhProductCard';
import { normalizeAgenticBlocks, normalizeWaouhProductV1, type WaouhMessageBlock } from '@/lib/waouh/agenticContracts';

type RecordValue = Record<string, any>;
export type ChatAttachment = { url: string; type: string; caption?: string };
export type ChatReply = { text: string; results: WaouhResultCard[]; attachments: ChatAttachment[]; actions: RecordValue[]; blocks: WaouhMessageBlock[] };
const object = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const label = (...values: unknown[]) => values.find((v): v is string => typeof v === 'string' && !!v.trim())?.trim() || '';
const number = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(/(?:FCFA|XOF|F)$/i, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const mediaUrl = (value: unknown): string => {
  const url = typeof value === 'string' ? value.trim() : label(object(value).url, object(value).src);
  return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : '';
};

export function normalizeResultCards(value: unknown, catalogue = false): WaouhResultCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, i) => {
    const canonical = normalizeWaouhProductV1(item);
    const r = canonical ? {
      ...object(item),
      id: canonical.product_id,
      title: canonical.title,
      price: canonical.price_amount,
      price_min: canonical.price_min_amount,
      price_max: canonical.price_max_amount,
      photos: canonical.photos,
      city: canonical.city,
      condition: canonical.condition,
      source: canonical.source,
      seller_id: canonical.seller_id,
    } : object(item);
    const title = label(r.title, r.nom, r.name);
    if (!title) return [];
    const rawPhotos = r.photos ?? r.images ?? r.media ?? r.photo ?? r.image ?? r.image_url;
    const photos = (Array.isArray(rawPhotos) ? rawPhotos : [rawPhotos]).map(mediaUrl).filter(Boolean);
    const index = number(r.index);
    return [{
      ...r, id: label(r.id, r.article_id) || `result-${i + 1}`, title,
      index: index && index > 0 ? index : i + 1,
      source: label(r.source) || (catalogue ? 'catalogue' : 'waouh'),
      price: number(r.price ?? r.prix), price_min: number(r.price_min ?? r.prix_min), price_max: number(r.price_max ?? r.prix_max),
      city: label(r.city, r.ville), photos: [...new Set(photos)],
      source_url: label(r.source_url, r.url, r.sourceUrl) || null,
      fabric_id: label(r.fabric_id, r.fabricId) || null,
      intent: label(r.intent, r.signal_intent) || null,
      actor_type: label(r.actor_type, r.actor_role, r.role) || null,
      contactability_level: label(r.contactability_level, r.contactability, object(r.evidence).contactability_level) || null,
      total_score: number(r.total_score ?? object(r.scores).total_score ?? r.match_score ?? r.score),
      relevance_score: number(r.relevance_score ?? object(r.scores).relevance_score),
      trust_score: number(r.trust_score ?? object(r.scores).trust_score),
      price_score: number(r.price_score ?? object(r.scores).price_score),
      location_score: number(r.location_score ?? object(r.scores).location_score),
      freshness_score: number(r.freshness_score ?? object(r.scores).freshness_score),
      details: label(r.details, r.description, r.summary) || null,
      market_comparison: label(r.market_comparison, r.market, r.marche_reel, r.market_line) || null,
      comparative_analysis: label(r.comparative_analysis, r.market_analysis, r.analyse_comparative, r.deal_label) || null,
      recommendation: label(r.recommendation, r.recommandation, r.ai_note, r.advice, r.conseil) || null,
      market_price_min: number(r.market_price_min ?? r.prix_marche_min),
      market_price_median: number(r.market_price_median ?? r.median_price),
      market_price_max: number(r.market_price_max ?? r.prix_marche_max),
      source_mix: object(r.source_mix),
      evidence: object(r.evidence),
      scores: object(r.scores),
      reasons: Array.isArray(r.reasons) ? r.reasons : Array.isArray(object(r.scores).reasons) ? object(r.scores).reasons : null,
      action: r.action === null || (catalogue && r.action == null) ? null : typeof r.action === 'string' ? r.action : undefined,
    }];
  });
}

/** Preserve structured webhook replies, including n8n output envelopes and saved JSON history. */
export function normalizeChatReply(value: unknown, depth = 0): ChatReply {
  const empty: ChatReply = { text: '', results: [], attachments: [], actions: [], blocks: [] };
  if (depth > 5) return empty;
  if (typeof value === 'string') {
    const text = value.trim();
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    if (/^[\[{]/.test(json)) {
      try { return normalizeChatReply(JSON.parse(json), depth + 1); } catch { /* Ordinary prose. */ }
    }
    return { ...empty, text };
  }
  if (Array.isArray(value)) {
    if (value.some((v) => label(object(v).title, object(v).nom, object(v).name))) {
      return { ...empty, results: normalizeResultCards(value, true) };
    }
    const replies = value.map((v) => normalizeChatReply(v, depth + 1));
    return { text: replies.map((r) => r.text).filter(Boolean).join('\n\n'), results: replies.flatMap((r) => r.results), attachments: replies.flatMap((r) => r.attachments), actions: replies.flatMap((r) => r.actions), blocks: replies.flatMap((r) => r.blocks) };
  }
  const r = object(value);
  const meta = object(r.meta);
  const nested = r.reply ?? r.output ?? r.message ?? r.response ?? r.text ?? r.content ?? r.data;
  const inner = nested == null ? empty : normalizeChatReply(nested, depth + 1);
  const results = normalizeResultCards(r.results ?? meta.results);
  const products = normalizeResultCards(r.products ?? meta.products, true);
  const cards = normalizeResultCards(r.cards ?? meta.cards ?? (Array.isArray(r.carousel) ? r.carousel : r.carousel?.items), true);
  const rawAttachments = r.attachments ?? meta.attachments ?? r.media;
  const blocks = normalizeAgenticBlocks(r.blocks ?? meta.blocks);
  const blockProducts = blocks.flatMap((block) => {
    if (block.type !== 'product_carousel') return [];
    const embedded = [...(block.items ?? []), ...(block.offers ?? []).filter((offer) => typeof offer === 'object')];
    return normalizeResultCards(embedded, true);
  });
  const attachments = Array.isArray(rawAttachments) ? rawAttachments.flatMap((a) => {
    const url = mediaUrl(a);
    return url ? [{ url, type: label(object(a).type, object(a).mime_type) || 'image', caption: label(object(a).caption, object(a).filename) }] : [];
  }) : [];
  return {
    text: inner.text,
    results: results.length ? results : products.length ? products : cards.length ? cards : blockProducts.length ? blockProducts : inner.results,
    attachments: attachments.length ? attachments : inner.attachments,
    actions: Array.isArray(r.actions ?? meta.actions) ? (r.actions ?? meta.actions).filter((a: unknown) => label(object(a).id) && label(object(a).label)) : inner.actions,
    blocks: blocks.length ? blocks : inner.blocks,
  };
}

export function assertChatResponse(data: any, error?: unknown): ChatReply {
  if (error) throw error;
  if (!data || data.ok === false || data.success === false || data.error) throw new Error('Le moteur du chat n’a pas pu répondre. Réessayez.');
  const reply = normalizeChatReply(data);
  if (!reply.text && !reply.results.length && !reply.attachments.length && !reply.blocks.length && !reply.actions.length && !data.suppress_direct_reply) throw new Error('Le moteur a renvoyé une réponse vide. Réessayez.');
  return reply;
}

/** Text-only storage remains compatible; structured responses survive history reloads. */
export function serializeChatReply(value: unknown): string {
  const reply = assertChatResponse(value);
  return reply.results.length || reply.attachments.length || reply.actions.length || reply.blocks.length
    ? JSON.stringify({ schema: 'waouh.message.v1', text: reply.text, results: reply.results, attachments: reply.attachments, actions: reply.actions, blocks: reply.blocks })
    : reply.text;
}

export type ChatRow = { id: string; direction: 'in' | 'out'; text: string; created_at: string; attachments?: any; meta?: any };
export function mergeChatRows<T extends ChatRow>(previous: T[], incoming: T[]): T[] {
  const merged = [...previous];
  for (const row of incoming) {
    let index = merged.findIndex((m) => m.id === row.id);
    if (index < 0 && !row.id.startsWith('temp-')) index = merged.findIndex((m) =>
      m.id.startsWith('temp-') && m.direction === row.direction && m.text === row.text &&
      (m.meta?.correlation_id && row.meta?.correlation_id ? m.meta.correlation_id === row.meta.correlation_id : Math.abs(Date.parse(m.created_at) - Date.parse(row.created_at)) < 30000));
    if (index < 0) { merged.push(row); continue; }
    const old = merged[index];
    const meta = { ...old.meta, ...row.meta };
    for (const key of ['results', 'products', 'actions', 'blocks']) {
      if (!meta[key]?.length && old.meta?.[key]?.length) meta[key] = old.meta[key];
    }
    merged[index] = { ...old, ...row, meta, attachments: row.attachments?.length ? row.attachments : old.attachments };
  }
  return merged.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

export function reconcileChatResponse<T extends ChatRow>(previous: T[], data: any, input: T): T[] {
  const reply = assertChatResponse(data);
  let messages = previous;
  if (data.inbound_message_id) {
    messages = mergeChatRows(previous.filter((m) => m.id !== input.id), [{ ...input, id: data.inbound_message_id }]);
  }
  if (data.suppress_direct_reply) return messages;
  const meta = {
    ...data.meta,
    ...reply,
    intent: data.intent,
    transaction_id: data.transaction_id,
    article_id: data.article_id,
    counterpart_user_id: data.counterpart_user_id,
    correlation_id: data.correlation_id,
    intelligence: data.intelligence ?? data.meta?.intelligence ?? null,
    source_mix: data.source_mix ?? data.meta?.source_mix ?? null,
    signal_fabric: data.signal_fabric ?? data.meta?.signal_fabric ?? null,
    contactability_level: data.contactability_level ?? data.meta?.contactability_level ?? null,
  };
  const outgoing = { id: data.outbound_message_id || input.id.replace('temp-in-', 'temp-out-'), direction: 'out', text: reply.text, created_at: new Date().toISOString(), attachments: reply.attachments, meta } as T;
  return mergeChatRows(messages, [outgoing]);
}
