import { describe, expect, it } from 'vitest';
import { joinableFirst } from '../WaouhOfferActions';

const item = (fabric_id: string, extra: Record<string, unknown> = {}) => ({ fabric_id, evidence: {}, contact_policy: null, ...extra }) as never;

describe('joinableFirst', () => {
  it('met les vendeurs joignables devant et garde l’ordre dans chaque groupe', () => {
    const list = [item('external:a'), item('article:b'), item('external:c', { contact_policy: { can_auto_contact: true } }), item('external:d')];
    expect(joinableFirst(list).map((r: { fabric_id: string }) => r.fabric_id)).toEqual(['article:b', 'external:c', 'external:a', 'external:d']);
  });
});
