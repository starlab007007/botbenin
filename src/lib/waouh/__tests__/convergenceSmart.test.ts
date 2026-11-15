import { describe, expect, it } from 'vitest';
import { detectBudget, detectNeedKind } from '../convergenceSmart';

describe('saisie intelligente du besoin', () => {
  it('devine la nature du besoin', () => {
    expect(detectNeedKind('plombier à Cotonou demain')).toBe('service');
    expect(detectNeedKind('Réparer une fuite')).toBe('service');
    expect(detectNeedKind('stage en comptabilité')).toBe('announcement');
    expect(detectNeedKind('téléphone Android de marque soloking')).toBe('product');
    expect(detectNeedKind('riz parfumé')).toBe('product');
  });

  it('lit le budget écrit dans la phrase', () => {
    expect(detectBudget('téléphone à 80 000 F')).toBe(80000);
    expect(detectBudget('un frigo max 150000 fcfa')).toBe(150000);
    expect(detectBudget('moto 500k cfa')).toBe(500000);
    expect(detectBudget('riz parfumé')).toBeNull();
    expect(detectBudget('5 f')).toBeNull();
  });
});
