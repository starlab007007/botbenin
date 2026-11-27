import { StrictMode, act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' }, isLoading: false }) }));
vi.mock('@/lib/waouh/interestNavigation', () => ({ openInterestedDiscussion: mocks.open }));
vi.mock('@/pages/waouh/WaouhDealRoomPage', () => ({ default: () => <div>Parcours de candidature</div> }));
import { WaouhChatRoomWindow } from '../WaouhChatRoomWindow';
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  mocks.open.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
function Chat() { const l = useLocation(); return <p>{l.pathname + l.search}</p>; }
it('resumes a result/authentication URL into the existing chat, without an overlay', async () => {
  mocks.open.mockImplementation(async (_item, navigate, current) => { await Promise.resolve(); if (current()) navigate('/app/chat'); });
  await act(async () => root.render(<StrictMode><MemoryRouter initialEntries={['/app/chat?fabric_id=article%3Aa&offer=50000']}><WaouhChatRoomWindow><Chat /></WaouhChatRoomWindow></MemoryRouter></StrictMode>));
  expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ fabric_id: 'article:a' }), expect.any(Function), expect.any(Function));
  expect(host.textContent).toBe('/app/chat');
  expect(host.querySelector('[role=dialog]')).toBeNull();
});
it('keeps an opening error visible and permits a retry without manufacturing a room URL', async () => {
  mocks.open.mockRejectedValue(new Error('Réessayez.'));
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/chat?fabric_id=external%3Ax']}><WaouhChatRoomWindow><Chat /></WaouhChatRoomWindow></MemoryRouter>));
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Réessayez.');
  expect(host.querySelector('[role=dialog]')).toBeNull();
  await act(async () => host.querySelector('button')!.click());
  expect(mocks.open).toHaveBeenCalledTimes(2);
});

it('routes an explicit opportunity to the Deal Room without buyer interest', async () => {
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/chat?fabric_id=article%3Ao&kind=opportunity']}><WaouhChatRoomWindow><Chat /></WaouhChatRoomWindow></MemoryRouter>));
  expect(mocks.open).not.toHaveBeenCalled();
  expect(host.querySelector('[role=dialog]')).not.toBeNull();
});
