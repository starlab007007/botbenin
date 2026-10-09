import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { filterNavigationSections, navigation, navigationSections } from '../navigation';
import { DESKTOP_MIN_WIDTH, PHONE_MAX_WIDTH, tierForWidth } from '../../app-mobile/hooks/useViewportTier';

const appSource = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');

describe('parité de contenu PC / tablette / mobile', () => {
  it('le menu complet (mobile et tablette) expose les mêmes modules que la barre latérale PC', () => {
    const menuItems = filterNavigationSections('').flatMap((section) => section.items);
    expect(menuItems.map((item) => item.label)).toEqual(navigation.map((item) => item.label));
    expect(menuItems.length).toBeGreaterThanOrEqual(19);
  });

  it('chaque module est retrouvable par la recherche du menu (sans accents ni casse)', () => {
    for (const item of navigation) {
      const found = filterNavigationSections(item.label.toUpperCase()).flatMap((section) => section.items);
      expect(found.map((entry) => entry.label), item.label).toContain(item.label);
    }
    expect(filterNavigationSections('apresbac').flatMap((s) => s.items).map((i) => i.label)).toContain('AprèsBac IA');
    expect(filterNavigationSections('diffusion')).toHaveLength(1);
    expect(filterNavigationSections('zzzz')).toHaveLength(0);
  });

  it('chaque module interne pointe vers une route existante de l\'application', () => {
    for (const item of navigation.filter((entry) => !entry.external)) {
      const path = item.to.split('?')[0];
      const relative = path.replace(/^\/app\//, '');
      const declared =
        appSource.includes(`path="${path}"`) || appSource.includes(`path="${relative}"`);
      expect(declared, `route manquante pour ${item.label} (${item.to})`).toBe(true);
    }
  });

  it('les sections et les libellés sont uniques', () => {
    const titles = navigationSections.map((section) => section.title);
    expect(new Set(titles).size).toBe(titles.length);
    const labels = navigation.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('paliers de présentation', () => {
  it('découpe phone / tablette / desktop aux bons seuils', () => {
    expect(tierForWidth(360)).toBe('phone');
    expect(tierForWidth(PHONE_MAX_WIDTH)).toBe('phone');
    expect(tierForWidth(PHONE_MAX_WIDTH + 1)).toBe('tablet');
    expect(tierForWidth(820)).toBe('tablet');
    expect(tierForWidth(1024)).toBe('tablet');
    expect(tierForWidth(DESKTOP_MIN_WIDTH - 1)).toBe('tablet');
    expect(tierForWidth(DESKTOP_MIN_WIDTH)).toBe('desktop');
    expect(tierForWidth(1920)).toBe('desktop');
  });
});
