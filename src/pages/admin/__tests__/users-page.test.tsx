import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { AdminUsersManagementPage } from '../AdminUsersManagementPage';
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/admin/users', () => ({ loadAdminUsers: mocks.load }));
vi.mock('@/components/auth/PermissionGuard', () => ({ PermissionGuard: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/admin/UserProfileModal', () => ({ UserProfileModal: () => null }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ order: async () => ({ data: [] }) }) }) } }));

it('distinguishes a failed load from an empty list, allows retry and retains the list on refresh failure', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  mocks.load.mockRejectedValueOnce(new Error('raw internal failure'))
    .mockResolvedValueOnce([{ id: 'a', email: 'fixture@example.invalid', created_at: '2026-01-01' }])
    .mockRejectedValueOnce(new Error('offline'));
  try {
    await act(async () => root.render(<AdminUsersManagementPage />));
    expect(host.textContent).toContain('La liste n’a pas pu être chargée.');
    expect(host.textContent).not.toContain('Aucun utilisateur trouvé');
    expect(host.textContent).not.toContain('raw internal failure');
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Réessayer'))!.click());
    expect(host.textContent).toContain('fixture@example.invalid');
    expect(host.textContent).not.toContain('Chargement interrompu');
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Actualiser'))!.click());
    expect(host.textContent).toContain('fixture@example.invalid');
    expect(host.textContent).toContain('Chargement interrompu');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
