import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), external: vi.fn(), commerce: vi.fn(), open: vi.fn(), user: 'u' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: mocks.user } } } }) }, functions: { invoke: mocks.invoke } } }));
vi.mock('@/app-mobile/hooks/useWaouhIdentity', () => ({ getWaouhSessionId: () => 'interest-session' }));
vi.mock('../discussionNavigation', () => ({ openCommerceDiscussion: mocks.open }));
vi.mock('../commerceAction', () => ({ sendCommerceAction: mocks.commerce }));
vi.mock('../nexusDeal', async original => ({ ...await original() as object, openExternalDeal: mocks.external }));
import { openInterestedDiscussion } from '../interestNavigation';
const offer = (fabric_id: string) => ({ fabric_id, source_key: 'source', subject: 'Mercedes', raw_text: '', price_min: 5000000, price_max: null, city: 'Abomey-Calavi', evidence: {} });
beforeEach(() => { vi.resetAllMocks(); mocks.user = 'u'; });

describe('Interest enters the existing chat negotiation', () => {
  it.each(['article:a', 'catalog:c'])('reuses the canonical thread returned for %s', async fabric => {
    mocks.invoke.mockResolvedValue({ data: { ok: true, article_id: 'a', thread_id: 'existing', negotiation_id: 'n' } });
    const navigate = vi.fn();
    await openInterestedDiscussion(offer(fabric), navigate);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls[0][0]).toBe('waouh-buyer-interest');
    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ thread_id: 'existing', negotiation_id: 'n', article_id: 'a', title: 'Mercedes', kind: 'buyer' }), navigate);
    expect(mocks.commerce).not.toHaveBeenCalled();
  });
  it('deduplicates simultaneous requests while allowing the active caller to open the result', async () => {
    let resolve!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise(r => { resolve = r; }));
    const obsolete = vi.fn(), current = vi.fn();
    const a = openInterestedDiscussion(offer('article:concurrent'), obsolete, () => false);
    const b = openInterestedDiscussion(offer('article:concurrent'), current);
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    resolve({ data: { ok: true, article_id: 'a', thread_id: 'same' } });
    await Promise.all([a, b]);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.open.mock.calls[0][1]).toBe(current);
  });
  it('external offers open the same chat using the materialized article and thread', async () => {
    mocks.external.mockResolvedValue({ status: 'opened', response: { ok: true, article_id: 'promoted', thread_id: 'external-thread', negotiation_id: 'n' } });
    await openInterestedDiscussion(offer('external:e'), vi.fn());
    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ article_id: 'promoted', thread_id: 'external-thread', title: 'Mercedes' }), expect.any(Function));
  });
  it.each([
    { data: { ok: true, skipped: 'self' } },
    { data: { ok: true, article_id: 'a', thread_id: null } },
    { error: new Error('offline') },
  ])('does not invent a room when the opening is refused or incomplete', async response => {
    mocks.invoke.mockResolvedValue(response);
    await expect(openInterestedDiscussion(offer('article:refused'), vi.fn())).rejects.toThrow();
    expect(mocks.open).not.toHaveBeenCalled();
  });
  it('does not open a private thread after the account changes', async () => {
    mocks.invoke.mockImplementation(async () => { mocks.user = 'other'; return { data: { ok: true, article_id: 'a', thread_id: 'private' } }; });
    await expect(openInterestedDiscussion(offer('article:private'), vi.fn())).rejects.toThrow();
    expect(mocks.open).not.toHaveBeenCalled();
  });
  it('does not fall back to a second room when external discovery is disabled', async () => {
    mocks.external.mockResolvedValue({ status: 'fallback' });
    await expect(openInterestedDiscussion(offer('external:disabled'), vi.fn())).rejects.toThrow();
    expect(mocks.open).not.toHaveBeenCalled();
  });
});
