import { describe, expect, it } from 'vitest';
import { sellerBrief, sellerPriceVerdict } from '../sellerBrief';

const buyer = (id: string, title: string, extra: Record<string, unknown> = {}) =>
  ({ id, fabric_id: id, title, city: 'Cotonou', intent: 'BUY', ...extra }) as never;

describe('vente : prix face au marché', () => {
  it('situe le prix demandé et conseille le vendeur', () => {
    const high = sellerPriceVerdict({ asking_price: 30000, comparable_count: 5, low: 18000, median: 20000, high: 26000 });
    expect(high?.tone).toBe('high');
    expect(high?.label).toContain('au-dessus du marché');
    expect(high?.advice).toContain('négocier');

    const low = sellerPriceVerdict({ asking_price: 12000, comparable_count: 4, low: 12000, median: 20000, high: 26000 });
    expect(low?.tone).toBe('low');
    expect(low?.label).toContain('sous le marché');

    expect(sellerPriceVerdict({ asking_price: 21000, comparable_count: 3, low: 18000, median: 20000, high: 26000 })?.tone).toBe('fair');
  });

  it('ne situe rien sans repère suffisant, et le dit', () => {
    expect(sellerPriceVerdict({ asking_price: 12000, comparable_count: 1, median: 12000 })).toBeNull();
    expect(sellerBrief([], { reference: { asking_price: 12000, comparable_count: 1, median: 12000 } }).priceNote)
      .toContain('ne peut pas encore être situé');
    expect(sellerBrief([], { reference: { asking_price: null, comparable_count: 0 } }).priceNote)
      .toContain('Ajoutez un prix');
  });
});

describe('vente : acheteurs proposés', () => {
  it('ne retient que les acheteurs qui correspondent à l’annonce', () => {
    const brief = sellerBrief(
      [
        buyer('a', 'Je cherche un ventilateur', { contactability_level: 'C3' }),
        buyer('b', 'gommage corps et visage'),
        buyer('c', 'Je cherche une opportunité : un travail de secrétaire'),
      ],
      { query: 'Je vends : ventilateur', city: 'Cotonou' },
    );
    expect(brief.buyers.map((b) => b.id)).toEqual(['a']);
    expect(brief.reachable).toBe(1);
    expect(brief.inZone).toBe(1);
  });
});
