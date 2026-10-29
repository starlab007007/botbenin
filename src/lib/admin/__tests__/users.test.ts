import { beforeEach, describe, it, expect, vi } from 'vitest';
import { loadAdminUsers } from '../users';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke } } }));
const session = { access_token: 'fixture', user: { id: 'admin' } };
const user = (id: string) => ({ id, email: `${id}@example.invalid`, created_at: '2026-01-01' });
beforeEach(() => { vi.resetAllMocks(); mocks.getSession.mockResolvedValue({ data: { session }, error: null }); });
describe('admin list loading', () => {
  it('loads all pages and deduplicates an account appearing across page boundaries', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { users: [user('a')], next_page: 2 } });
    mocks.invoke.mockResolvedValueOnce({ data: { users: [user('a'), user('b')], next_page: null } });
    expect((await loadAdminUsers(new AbortController().signal)).map(u => u.id)).toEqual(['a', 'b']);
    expect(mocks.invoke.mock.calls[1][1].body).toEqual({ page: 2 });
  });
  it('does not publish a partial list when a later page fails', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { users: [user('a')], next_page: 2 } });
    mocks.invoke.mockResolvedValueOnce({ error: new Error('Failed to send a request to the Edge Function') });
    await expect(loadAdminUsers(new AbortController().signal)).rejects.toThrow('Impossible de charger les utilisateurs. Réessayez.');
  });
  it('handles a missing session and never requests private accounts', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error('expired') });
    await expect(loadAdminUsers(new AbortController().signal)).rejects.toThrow('Reconnectez-vous');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('discards data if the account changes while loading', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null }).mockResolvedValueOnce({ data: { session: { ...session, user: { id: 'someone-else' } } } });
    mocks.invoke.mockResolvedValue({ data: { users: [user('a')] } });
    await expect(loadAdminUsers(new AbortController().signal)).rejects.toThrow('Reconnectez-vous');
  });
  it('stops loading after cancellation and rejects a malformed response', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(loadAdminUsers(controller.signal)).rejects.toThrow();
    expect(mocks.invoke).not.toHaveBeenCalled();
    mocks.invoke.mockResolvedValue({ data: { users: {} } });
    await expect(loadAdminUsers(new AbortController().signal)).rejects.toThrow('Impossible de charger');
  });
});
