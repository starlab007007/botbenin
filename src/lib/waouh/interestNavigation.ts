import type { NexusDiscoveryResult } from './nexus';
import { LegacyInterestError } from './legacyInterest';
import { sendCommerceAction } from './commerceAction';
import { openCommerceDiscussion } from './discussionNavigation';
import { openExternalDeal, openMatchDetail } from './nexusDeal';
import { getWaouhSessionId } from '@/app-mobile/hooks/useWaouhIdentity';
import { supabase } from '@/integrations/supabase/client';
import { productPhotos } from '../../../supabase/functions/_shared/waouh-product-presentation';

type Offer = Pick<NexusDiscoveryResult, 'fabric_id' | 'source_key' | 'subject' | 'raw_text' | 'price_min' | 'price_max' | 'city' | 'evidence'>;
const pending = new Map<string, Promise<Record<string, unknown>>>();
const unavailable = () => new LegacyInterestError('Cet échange n’a pas pu être ouvert. Réessayez.');

async function resolveInterest(item: Offer): Promise<Record<string, unknown>> {
  const evidence = item.evidence || {};
  const family = item.fabric_id.split(':')[0];
  const article = family === 'article' ? item.fabric_id.slice(8) : ['catalog', 'external'].includes(family) ? '' : String(evidence.article_id || evidence.promoted_article_id || '');
  const catalog = family === 'catalog' ? item.fabric_id.slice(8) : family === 'external' ? '' : String(evidence.catalog_id || '');
  const presentation = {
    title: item.subject || item.raw_text || 'Annonce', price: item.price_min ?? item.price_max ?? null,
    city: item.city ?? null, photos: productPhotos(item), kind: 'buyer', source: 'results_interested',
  };
  if (article || catalog) {
    const { data, error } = await supabase.functions.invoke('waouh-buyer-interest', {
      headers: { 'x-waouh-session': getWaouhSessionId() },
      body: { ...(article ? { article_id: article } : { catalog_id: catalog }), source: 'results_interested' },
    });
    if (data?.skipped === 'self') throw new LegacyInterestError('C’est votre propre annonce : aucune négociation n’est ouverte.');
    if (error) {
      const body = await (error as { context?: Response }).context?.clone?.().json?.().catch(() => null);
      if (body?.code === 'price_missing') throw new LegacyInterestError('Cette offre n’a pas encore de prix. Confiez-la à Bot pour qu’il le demande au vendeur.');
    }
    if (error || data?.error || data?.ok !== true || !data?.thread_id || !data?.article_id) throw unavailable();
    return { ...presentation, article_id: data.article_id, thread_id: data.thread_id, negotiation_id: data.negotiation_id ?? null };
  }
  const response = item.fabric_id.startsWith('external:')
    ? await (async () => {
        const outcome = await openExternalDeal(item.fabric_id, null, getWaouhSessionId());
        if (outcome.status !== 'opened') throw unavailable();
        return outcome.response;
      })()
    : await sendCommerceAction({ action: 'open_deal', source_id: item.fabric_id.split(':')[1], source: 'results_interested' }, getWaouhSessionId());
  if (!response?.ok || !response.thread_id || !response.article_id) throw unavailable();
  return openMatchDetail(response, { ...presentation, photo: presentation.photos[0] ?? null });
}

/** Every interest opens the existing product chat; never create a second room workflow. */
export async function openInterestedDiscussion(item: Offer, navigate: (path: string) => void, isCurrent: () => boolean = () => true): Promise<void> {
  const owner = (await supabase.auth.getSession()).data.session?.user.id ?? '';
  const key = `${owner}:${getWaouhSessionId()}:${item.fabric_id}`;
  let request = pending.get(key);
  if (!request) {
    request = resolveInterest(item);
    pending.set(key, request);
    void request.finally(() => pending.delete(key)).catch(() => {});
  }
  const detail = await request;
  if ((await supabase.auth.getSession()).data.session?.user.id !== (owner || undefined)) throw unavailable();
  if (isCurrent()) openCommerceDiscussion(detail, navigate);
}
