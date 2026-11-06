import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/components/waouh/bot/BotLiveAvatar', () => ({ BotLiveAvatar: () => <span>Avatar</span> }));
vi.mock('../WaouhDelegateButton', () => ({
  WaouhDelegateButton: (p: { label?: string; result: { fabric_id: string }; alternates?: { fabric_id: string }[] }) =>
    <button type="button" data-best={p.result.fabric_id} data-alternates={(p.alternates ?? []).map(a => a.fabric_id).join(',')}>{p.label}</button>,
}));
import { WaouhBotBanner, WaouhOfferActions, offerDealRoomPath, offerPrimaryLabel } from '../WaouhOfferActions';

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
  await act(async () => root.render(<MemoryRouter><WaouhBotBanner top={[offer('a'), offer('b'), offer('c'), offer('d')]} mode="buy" kind="purchase" budgetMax={50000} requireAuth={() => true} /></MemoryRouter>));
  const cta = button('Confier les 4 à Bot');
  expect(cta.dataset.best).toBe('a'); expect(cta.dataset.alternates).toBe('b,c,d');
  expect(host.textContent).toContain('4 offres · Bot recommande la n°1');
  expect(host.textContent).toContain('Plafond · 50');
});
