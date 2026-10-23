// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaouhAvatarGuideBar } from '../WaouhAvatarGuideBar';
vi.mock('@/lib/waouh/avatarGuide', () => ({
  boardChips: () => [], CADENCE_OPTIONS: [], hourLabel: (h: number) => String(h),
  nextPointLabel: () => 'Demain', fetchAvatarPrefs: async () => null,
  fetchMissionBoard: async () => ({ board: {} }), saveAvatarPrefs: vi.fn(),
}));
vi.mock('../WaouhAvatarBriefingCard', () => ({ WaouhAvatarOrb: () => <span /> }));
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); });
describe('Avatar mission details', () => {
  it('keeps mobile details collapsed until the user opens them, and allows closing', async () => {
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<WaouhAvatarGuideBar prefs={null} busy={false} onPoint={() => {}} />));
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    const board = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(board.classList.contains('hidden')).toBe(true);
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(board.classList.contains('hidden')).toBe(false);
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(board.classList.contains('hidden')).toBe(true);
  });
});
