import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const legacy = vi.hoisted(() => ({ open: vi.fn(async () => ({ thread_id: 't1' })) }));
vi.mock('@/lib/waouh/legacyInterest', async (orig) => ({ ...(await orig() as object), openLegacyInterest: legacy.open }));
vi.mock('@/components/waouh/bot/BotLiveAvatar', () => ({ BotLiveAvatar: () => <span>Avatar</span> }));
vi.mock('../WaouhDelegateButton', () => ({
  WaouhDelegateButton: (p: { label?: string; result: { fabric_id: string }; alternates?: { fabric_id: string }[] }) =>
    <button type="button" data-best={p.result.fabric_id} data-alternates={(p.alternates ?? []).map(a => a.fabric_id).join(',')}>{p.label}</button>,
}));
import { WaouhBotBanner, WaouhOfferActions, offerDealRoomPath, offerPrimaryLabel, offerReachable } from '../WaouhOfferActions';

const offer = (id: string, price: number | null = 50000) => ({ fabric_id: id, subject: 'S25', city: 'Abomey-Calavi', price_min: price, price_max: price } as never);
let host: HTMLDivElement, root: Root;
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;

it('names the main action after the kind of search', () => {
  expect(offerPrimaryLabel('purchase')).toBe('Intéressé');
  expect(offerPrimaryLabel('service')).toBe('Demander un devis');
  expect(offerPrimaryLabel('opportunity')).toBe('Postuler');
});

it('opens the existing Deal Room with the price proposal, or the application process for opportunities', () => {
  expect(offerDealRoomPath(offer('article:a'), 'purchase')).toBe('/app/deal-room?fabric_id=article%3Aa&offer=50000');
  expect(offerDealRoomPath(offer('article:b', null), 'purchase')).toBe('/app/deal-room?fabric_id=article%3Ab&propose=1');
  expect(offerDealRoomPath(offer('article:c'), 'opportunity')).toBe('/app/deal-room?fabric_id=article%3Ac');
});

it('“Intéressé” goes to the Deal Room, “Bot” keeps the other offers as fallbacks, “Détails” opens the analysis', async () => {
  const details = vi.fn();
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/nexus']}><Routes>
    <Route path="/app/nexus" element={<WaouhOfferActions result={offer('article:a')} alternates={[offer('article:a'), offer('article:b'), offer('article:c')]} onDetails={details} mode="buy" kind="purchase" requireAuth={() => true} />} />
    <Route path="/app/deal-room" element={<Where />} />
  </Routes></MemoryRouter>));
  expect(button('Bot').dataset.alternates).toBe('article:b,article:c');
  await act(async () => button('Détails').click()); expect(details).toHaveBeenCalledTimes(1);
  await act(async () => button('Intéressé').click());
  expect(host.querySelector('[data-testid=where]')?.textContent).toBe('/app/deal-room?fabric_id=article%3Aa&offer=50000');
});

it('asks to sign in instead of opening the Deal Room when signed out', async () => {
  const auth = vi.fn(() => false);
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/nexus']}><Routes>
    <Route path="/app/nexus" element={<WaouhOfferActions result={offer('article:a')} alternates={[]} mode="buy" kind="purchase" requireAuth={auth} />} />
    <Route path="/app/deal-room" element={<Where />} />
  </Routes></MemoryRouter>));
  await act(async () => button('Intéressé').click());
  expect(auth).toHaveBeenCalledWith('/app/deal-room?fabric_id=article%3Aa&offer=50000');
  expect(host.querySelector('[data-testid=where]')).toBeNull();
});

it('banner hands the best offer and the next three to Bot in one action', async () => {
  await act(async () => root.render(<MemoryRouter><WaouhBotBanner top={[offer('article:a'), offer('article:b'), offer('article:c'), offer('article:d')]} mode="buy" kind="purchase" budgetMax={50000} requireAuth={() => true} /></MemoryRouter>));
  const cta = button('Confier les 4 à Bot');
  expect(cta.dataset.best).toBe('article:a'); expect(cta.dataset.alternates).toBe('article:b,article:c,article:d');
  expect(host.textContent).toContain('4 offres · Bot recommande la n°1');
  expect(host.textContent).toContain('Plafond · 50');
});

const ad = (id: string, extra: Record<string, unknown> = {}) => ({ ...offer(id) as object, contact_policy: { can_auto_contact: false }, ...extra } as never);

it('only members, partners and allowed public businesses are reachable', () => {
  expect(offerReachable(ad('article:a'))).toBe(true);
  expect(offerReachable(ad('catalog:p', { evidence: { source: 'partner' } }))).toBe(true);
  expect(offerReachable(ad('external:x', { contact_policy: { can_auto_contact: true } }))).toBe(true);
  expect(offerReachable(ad('external:y'))).toBe(false);
  expect(offerReachable(ad('catalog:z'))).toBe(false);
});

it('an ad without reachable contact shows the original listing and never offers Bot', async () => {
  await act(async () => root.render(<MemoryRouter><WaouhOfferActions result={ad('external:y', { source_url: 'https://example.org/annonce' })} alternates={[]} onDetails={() => undefined} mode="buy" kind="purchase" requireAuth={() => true} /></MemoryRouter>));
  expect(host.querySelector('a')?.textContent).toContain('Voir l’annonce d’origine');
  expect(host.textContent).toContain('Contact non disponible');
  expect(host.textContent).not.toContain('Bot');
  expect(host.textContent).not.toContain('Intéressé');
});

it('the banner hands Bot only reachable offers, and says so when none is', async () => {
  await act(async () => root.render(<MemoryRouter><WaouhBotBanner top={[ad('external:y'), ad('article:a'), ad('external:z'), ad('article:b')]} mode="buy" kind="purchase" requireAuth={() => true} /></MemoryRouter>));
  expect(button('Confier les 2 à Bot').dataset.best).toBe('article:a');
  expect(button('Confier les 2 à Bot').dataset.alternates).toBe('article:b');
  await act(async () => root.render(<MemoryRouter><WaouhBotBanner top={[ad('external:y')]} mode="buy" kind="purchase" requireAuth={() => true} /></MemoryRouter>));
  expect(host.textContent).toContain('Aucun vendeur joignable');
  expect(host.querySelector('button')).toBeNull();
});

it('“Intéressé” on a WAOUH seller’s offer opens the historical negotiation, not the new Deal Room', async () => {
  const auth = vi.fn(() => true);
  const member = { ...(offer('article:m') as object), source_key: 'waouh_app' } as never;
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/nexus']}><Routes>
    <Route path="/app/nexus" element={<WaouhOfferActions result={member} alternates={[]} mode="buy" kind="purchase" requireAuth={auth} />} />
    <Route path="/app/deal-room" element={<Where />} />
  </Routes></MemoryRouter>));
  await act(async () => button('Intéressé').click());
  expect(auth).toHaveBeenCalledWith('/app/chat');
  expect(legacy.open).toHaveBeenCalledTimes(1);
  expect((legacy.open.mock.calls[0] as unknown[])[0]).toMatchObject({ fabric_id: 'article:m' });
  expect(host.querySelector('[data-testid=where]')).toBeNull();
});

it('an opportunity keeps its application process in the Deal Room', async () => {
  legacy.open.mockClear();
  const member = { ...(offer('article:o') as object), source_key: 'waouh_app' } as never;
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/nexus']}><Routes>
    <Route path="/app/nexus" element={<WaouhOfferActions result={member} alternates={[]} mode="buy" kind="opportunity" requireAuth={() => true} />} />
    <Route path="/app/deal-room" element={<Where />} />
  </Routes></MemoryRouter>));
  await act(async () => button('Postuler').click());
  expect(legacy.open).not.toHaveBeenCalled();
  expect(host.querySelector('[data-testid=where]')?.textContent).toBe('/app/deal-room?fabric_id=article%3Ao');
});

describe("offre d'un site marchand sans contact", () => {
  it("n'est pas joignable : pas d'« Intéressé » possible", () => {
    expect(offerReachable({ fabric_id: "external:58e486ad-cf6f-4dad-b0b1-d5f39d9fe006", evidence: { has_whatsapp: false }, contact_policy: undefined } as never)).toBe(false);
  });
});
