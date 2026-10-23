// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProfileScreen from '../ProfileScreen';
const mocks = vi.hoisted(() => ({ update: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../hooks/useMobileAuth', () => ({ useMobileAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('../../hooks/useMobileProfile', () => ({ useMobileProfile: () => ({
 profile: {id:'qa',full_name:'Nom de recette',email:'qa@example.invalid',phone:null,avatar_url:null}, loading:false, update:mocks.update
}) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('sonner', () => ({ toast: { success:mocks.success, error:mocks.error } }));
let root: Root | undefined; let container: HTMLDivElement;
beforeEach(() => { mocks.update.mockReset(); mocks.success.mockClear(); mocks.error.mockClear(); });
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); });
async function render() {
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 await act(async () => root!.render(<ProfileScreen />));
 return [...container.querySelectorAll('button')].find(x=>x.textContent==='Enregistrer')!;
}
it('does not claim success when the server refuses the profile and keeps the entered name', async () => {
 mocks.update.mockRejectedValue(new Error('denied'));const button=await render();
 await act(async () => button.click());
 expect(mocks.success).not.toHaveBeenCalled();expect(mocks.error).toHaveBeenCalledOnce();
 expect(container.querySelector('input')?.value).toBe('Nom de recette');expect(button.disabled).toBe(false);
});
it('disables repeated saving until the server acknowledges the update', async () => {
 let finish!: () => void;mocks.update.mockReturnValue(new Promise<void>(resolve=>{finish=resolve;}));
 const button=await render();await act(async () => button.click());
 expect(button.disabled).toBe(true);expect(mocks.success).not.toHaveBeenCalled();
 await act(async () => finish());
 expect(mocks.update).toHaveBeenCalledOnce();expect(mocks.success).toHaveBeenCalledOnce();expect(button.disabled).toBe(false);
});
