import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/waouh/identityIds', () => ({ fetchAuthIdentityIds: async () => ['buyer'] }));
vi.mock('../waouhCorrelation', () => ({ correlationIdFor: () => 'c', traceUi: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => new Promise(() => {}) }) }) }),
  functions: { invoke: vi.fn() },
} }));
import { useWaouhMatchChats } from '../useWaouhMatchChats';
let root: Root, host: HTMLDivElement;
function Tabs() {
  const { matches, activeKey } = useWaouhMatchChats('s', 'account');
  return <div data-active={activeKey}>{matches.map(m => <p key={m.key} data-key={m.key}>{m.title}</p>)}</div>;
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
it('opens immediately, then reuses the same tab when the counterpart becomes known', async () => {
  await act(async () => root.render(<Tabs />));
  const detail = { article_id: 'article', thread_id: 'existing-thread', title: 'Mercedes', kind: 'buyer' };
  await act(async () => { window.dispatchEvent(new CustomEvent('waouh:open-match-chat', { detail })); });
  expect(host.querySelectorAll('p')).toHaveLength(1);
  const key = host.querySelector('p')!.dataset.key;
  expect(host.querySelector('[data-active]')!.getAttribute('data-active')).toBe(key);
  // The product metadata request above is still pending: it cannot hold the tab closed.
  await act(async () => { window.dispatchEvent(new CustomEvent('waouh:open-match-chat', { detail: { ...detail, seller_user_id: 'seller', counterpart_user_id: 'seller' } })); });
  expect(host.querySelectorAll('p')).toHaveLength(1);
  expect(host.querySelector('p')!.dataset.key).toBe(key);
});
