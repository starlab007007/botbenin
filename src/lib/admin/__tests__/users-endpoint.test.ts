import { describe, it, expect, vi } from 'vitest';
import { createAdminUsersHandler } from '../../../../supabase/functions/_shared/admin-users';

function setup({ allowed = true, authError = null as unknown, listError = null as unknown, count = 1 } = {}) {
  const users = Array.from({ length: count }, (_, n) => ({ id: `user-${n}`, email: `fixture-${n}@example.invalid`, created_at: '2026-01-01' }));
  const listUsers = vi.fn().mockResolvedValue({ data: { users }, error: listError });
  const roles = vi.fn().mockResolvedValue({ data: [{ user_id: 'user-0', roles: null }], error: null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: authError ? null : { id: 'admin' } }, error: authError }), admin: { listUsers } },
    rpc: vi.fn().mockResolvedValue({ data: allowed, error: null }),
    from: vi.fn(() => ({ select: () => ({ in: roles }) })),
  };
  return { handler: createAdminUsersHandler(client as any), client, listUsers, roles };
}
const request = (body: unknown = {}) => new Request('https://example.invalid/users', {
  method: 'POST', headers: { Authorization: 'Bearer fixture', 'x-waouh-session': 'guest-fixture' }, body: JSON.stringify(body),
});

describe('user administration endpoint', () => {
  it('accepts the web session and SDK headers during browser preflight without listing accounts', async () => {
    const { handler, listUsers } = setup();
    const headers = ['authorization', 'apikey', 'content-type', 'x-client-info', 'x-waouh-session', 'x-supabase-client-platform', 'x-supabase-client-platform-version', 'x-supabase-client-runtime', 'x-supabase-client-runtime-version'];
    const response = await handler(new Request('https://example.invalid/users', { method: 'OPTIONS', headers: { 'Access-Control-Request-Headers': headers.join(', ') } }));
    expect(response.status).toBe(204);
    for (const name of headers) expect(response.headers.get('Access-Control-Allow-Headers')?.split(', ')).toContain(name);
    expect(listUsers).not.toHaveBeenCalled();
  });
  it('requires both authentication and the viewing permission', async () => {
    for (const config of [{ allowed: false }, { authError: new Error('expired') }]) {
      const { handler, listUsers } = setup(config);
      expect((await handler(request())).status).toBe(config.allowed === false ? 403 : 401);
      expect(listUsers).not.toHaveBeenCalled();
    }
    const { handler, listUsers } = setup();
    expect((await handler(new Request('https://example.invalid/users', { method: 'POST' }))).status).toBe(401);
    expect(listUsers).not.toHaveBeenCalled();
  });
  it('paginates beyond the first accounts, batches roles and tolerates a deleted role', async () => {
    const { handler, listUsers, roles } = setup({ count: 200 });
    const response = await handler(request({ page: 2 }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(listUsers).toHaveBeenCalledWith({ page: 2, perPage: 200 });
    expect(roles).toHaveBeenCalledTimes(1);
    expect(data.users).toHaveLength(200);
    expect(data.users[0].roles).toEqual([]);
    expect(data.next_page).toBe(3);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects invalid pages and hides internal server failures', async () => {
    const a = setup();
    expect((await a.handler(request({ page: -1 }))).status).toBe(400);
    expect(a.listUsers).not.toHaveBeenCalled();
    const b = setup({ listError: new Error('private backend detail') });
    const response = await b.handler(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private backend detail');
  });
  it('keeps the current account list accessible to already-open older web tabs', async () => {
    const { handler, listUsers } = setup({ count: 250 });
    const response = await handler(request());
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
    expect((await response.json()).users).toHaveLength(250);
  });
});
