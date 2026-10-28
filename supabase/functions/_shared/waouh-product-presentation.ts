import {redactPublicContacts} from './waouh-signal-fabric.ts';
/** Public product information only. A gallery always belongs to one product. */
export const PRODUCT_PHOTO_LIMIT = 4;
type Row = Record<string, any>;
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const text = (...values: unknown[]) => values.find((v): v is string => typeof v === 'string' && !!v.trim())?.trim() ?? '';
const amount = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};
export function productPhotos(value: unknown): string[] {
  const p = row(value), e = row(p.evidence);
  const candidates = [p.primary_photo_url, e.primary_photo_url, p.photos, p.photo_urls, p.images, e.photos, e.photo_urls, e.images, p.image_url, e.image_url, p.image, p.photo, e.photo, e.thumbnail, p.media];
  const photos: string[] = [];
  for (const candidate of candidates.flat()) {
    const o = row(candidate), url = typeof candidate === 'string' ? candidate.trim() : text(o.url, o.src, o.public_url);
    // Local, same-origin assets are supported; executable and protocol-relative URLs are not.
    if (!/^(https?:\/\/|\/(?!\/))/i.test(url) || photos.includes(url)) continue;
    photos.push(url);
    if (photos.length === PRODUCT_PHOTO_LIMIT) break;
  }
  return photos;
}
export type ProductSnapshot = {
  id: string; title: string; photos: string[]; description: string;
  price_min: number | null; price_max: number | null; currency: string; city: string;
  attributes: {label: string; value: string}[];
};
export function productSnapshot(value: unknown): ProductSnapshot | null {
  const p = row(value), e = row(p.evidence), metadata = row(p.metadata);
  if (metadata.product_snapshot) return productSnapshot({...row(metadata.product_snapshot), metadata: undefined});
  const title = text(p.title, p.subject, p.nom, p.name);
  if (!title) return null;
  const attributes = [
    ['Marque', text(p.brand, e.brand)], ['Modèle', text(p.model, e.model)],
    ['État', text(p.condition, e.condition, p.etat)], ['Capacité', text(p.storage, e.storage, e.capacity)],
    ['Couleur', text(p.color, e.color)], ['Unité', text(p.unit, p.unite, e.unit, e.price_unit)],
    ['Garantie annoncée', text(p.warranty, e.warranty)], ['Livraison', text(p.delivery, e.delivery)],
  ].filter((v) => v[1]).map(([label, value]) => ({label, value: redactPublicContacts(value).slice(0, 160)}));
  if (Array.isArray(p.attributes)) for (const a of p.attributes) {
    if (typeof a?.label === 'string' && typeof a?.value === 'string' && !attributes.some(v => v.label === a.label)) attributes.push({label: a.label.slice(0, 80), value: redactPublicContacts(a.value).slice(0, 160)});
  }
  return {
    id: text(p.id, p.article_id, p.product_id, p.fabric_id), title: redactPublicContacts(title).slice(0, 300),
    photos: productPhotos(p), description: redactPublicContacts(text(p.description, e.description, p.raw_text)).slice(0, 3000),
    price_min: amount(p.price_min, p.prix_min, p.price_amount, p.price, p.prix),
    price_max: amount(p.price_max, p.prix_max, p.price_amount, p.price, p.prix),
    currency: text(p.currency, p.devise) || 'XOF', city: text(p.city, p.ville), attributes: attributes.slice(0, 8),
  };
}
