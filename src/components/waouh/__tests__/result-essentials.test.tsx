import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { WaouhResultEssentials } from '../WaouhResultEssentials';

const ref = (n: number, price: number) => ({ title: `Offre ${n}`, seller: `Vendeur ${n}`, price, source_url: `https://exemple.test/${n}`, model: 'x', unit: 'forfait', currency: 'XOF', comparable: false });
const base = { id: 'a', title: 'Riz parfumé', price: 400, kind: 'product', recommendation: 'Même zone · Signal récent' } as any;

async function html(result: any) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<WaouhResultEssentials result={result} />));
    return host.textContent ?? '';
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
}

it('fiche : pastilles et verdict de prix quand des offres de la recherche existent', async () => {
  const text = await html({ ...base, market_references: [ref(1, 600), ref(2, 700), ref(3, 800)] });
  expect(text).toContain('Même zone');
  expect(text).toContain('Signal récent');
  expect(text).toContain('sous la médiane');
  expect(text).not.toMatch(/insuffisantes/i);
});

it("fiche : aucun encart de marché quand il n'y a rien à comparer", async () => {
  const text = await html({ ...base, market_references: [] });
  expect(text).toContain('Même zone');
  expect(text).not.toContain('Repère marché');
  expect(text).not.toMatch(/insuffisantes/i);
});
