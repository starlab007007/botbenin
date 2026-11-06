import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) }, auth: { getSession: async () => ({ data: { session: null } }) } } }));
vi.mock('@/components/waouh/WaouhProductPresentation', () => ({ ProductGallery: () => <span>Photos</span> }));
import WaouhDealRoomGuestPage from '@/pages/waouh/WaouhDealRoomGuestPage';
import { externalContactText } from '@/pages/waouh/WaouhDealRoomPage';

const TOKEN = 'a'.repeat(64);
const room = (over: Record<string, unknown> = {}) => ({ deal_room_id: 'r1', title: 'iPhone 13', price: 250000, city: 'Cotonou', messages: [{ id: 'm1', author_kind: 'bot', text: 'Bonjour, toujours disponible ?', mine: false }], allowed_actions: ['message', 'propose'], current_offer_version: 0, ...over });
let host: HTMLDivElement, root: Root;
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; invoke.mockReset(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); window.location.hash = ''; });
const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

it('opens the exchange from the link alone and replies as the owner', async () => {
  window.location.hash = TOKEN;
  invoke.mockResolvedValue({ data: { ok: true, data: room() }, error: null });
  await act(async () => root.render(<WaouhDealRoomGuestPage />)); await flush();
  expect(invoke).toHaveBeenCalledWith('waouh-deal-room', { body: { guest_token: TOKEN, action: 'get', payload: {} } });
  expect(host.textContent).toContain('Assistant du client');
  expect(host.textContent).toContain('Proposer un prix');
  const area = host.querySelector('textarea')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(area, 'Oui, disponible'); area.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => button('Envoyer').click()); await flush();
  const call = invoke.mock.calls.at(-1)![1].body;
  expect(call.action).toBe('message'); expect(call.payload.text).toBe('Oui, disponible'); expect(call.payload.request_id).toBeTruthy();
});

it('expired links and refusals stay generic', async () => {
  window.location.hash = TOKEN;
  invoke.mockResolvedValue({ data: { ok: false, error: 'invitation_unavailable' }, error: null });
  await act(async () => root.render(<WaouhDealRoomGuestPage />)); await flush();
  expect(host.textContent).toContain('Ce lien n’est plus valide');
  expect(host.textContent).not.toContain('invitation_unavailable');
});

it('STOP ends contact for this request', async () => {
  window.location.hash = TOKEN;
  invoke.mockResolvedValueOnce({ data: { ok: true, data: room() }, error: null }).mockResolvedValueOnce({ data: { ok: true, data: { stopped: true } }, error: null });
  await act(async () => root.render(<WaouhDealRoomGuestPage />)); await flush();
  await act(async () => button('Ne plus être contacté').click()); await flush();
  expect(invoke.mock.calls.at(-1)![1].body.action).toBe('stop');
  expect(host.textContent).toContain('vous ne serez plus contacté');
});

it('a malformed link never calls the server', async () => {
  window.location.hash = 'abc';
  await act(async () => root.render(<WaouhDealRoomGuestPage />));
  expect(invoke).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Lien incomplet');
});

it('owner sees how the external seller was reached, never the full number', () => {
  expect(externalContactText({ status: 'contacted', last4: '1234' })).toBe('Contacté par WhatsApp · •••• 1234 · réponse attendue');
  expect(externalContactText({ status: 'joined', last4: '1234' })).toBe('A répondu par WhatsApp · •••• 1234');
  expect(externalContactText({ status: 'stopped' })).toBe('Ne souhaite pas être contacté');
  expect(externalContactText(null)).toBe('');
});
