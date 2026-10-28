import { productSnapshot } from './waouh-product-presentation.ts';

export const MISSION_JOURNEY_LIMIT = 100;
export function missionJourneyLimit(value?: unknown): number {
  if (value == null) return 20;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MISSION_JOURNEY_LIMIT) throw new RangeError('invalid_limit');
  return limit;
}
/** Called only with journeys already scoped to the authenticated owner. */
export async function withJourneyProducts(sb: any, journeys: any[], ownerId?: string): Promise<any[]> {
  if (!journeys.length) return journeys;
  const ids = [...new Set(journeys.map(j => j.fabric_id).filter((id): id is string => typeof id === 'string' && !!id))];
  // Fetch only presentation fields, never contact or ownership data.
  try {
    const {data, error} = ids.length ? await sb.from('waouh_signal_fabric')
      .select('fabric_id,subject,category,brand,model,condition,price_min,price_max,currency,city,raw_text,evidence').in('fabric_id', ids) : {data: [], error: null};
    if (error) return journeys;
    const products = new Map((data ?? []).map((p: any) => [p.fabric_id, productSnapshot(p)]));
    const ownArticles = new Map<string, unknown>();
    const articleIds = [...new Set(journeys.filter(j => j.mode === 'sell' && j.article_id).map(j => j.article_id))];
    if (ownerId && articleIds.length) {
      const result = await sb.from('waouh_articles').select('id,title,description,brand,model,condition,price,currency,city,photos,seller:waouh_users!seller_id(auth_user_id)').in('id', articleIds);
      if (!result.error) for (const article of result.data ?? []) {
        const seller = Array.isArray(article.seller) ? article.seller[0] : article.seller;
        if (seller?.auth_user_id === ownerId) ownArticles.set(article.id, productSnapshot(article));
      }
    }
    return journeys.map(j => {
      // Buyer demand photos must never be presented as the seller's own product.
      const product = j.mode === 'sell' ? ownArticles.get(j.article_id) : products.get(j.fabric_id);
      return product ? {...j, metadata: {...j.metadata, product_snapshot: product}} : j;
    });
  } catch { return journeys; }
}

export async function withMandateProducts(sb: any, mandates: any[], ownerId: string): Promise<any[]> {
  const sales = mandates.filter(m => m.mode === 'sell' && m.metadata?.article_id);
  if (!sales.length) return mandates;
  const hydrated = await withJourneyProducts(sb, sales.map(m => ({...m, article_id: m.metadata.article_id})), ownerId);
  const byId = new Map(hydrated.map(m => [m.id, m.metadata?.product_snapshot]));
  return mandates.map(m => byId.get(m.id) ? {...m, metadata: {...m.metadata, article_snapshot: byId.get(m.id)}} : m);
}
