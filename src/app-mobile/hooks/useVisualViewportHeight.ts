import { useEffect } from 'react';

/**
 * Suit la hauteur VISIBLE de l'écran (clavier virtuel exclu) dans la variable CSS
 * `--vvh`. Sur iOS Safari, 100dvh ne rétrécit pas quand le clavier s'ouvre : le champ
 * de message passait sous le clavier. Usage : `height: var(--vvh, 100dvh)`.
 */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      // Quand le clavier pousse la page, on la recale en haut pour garder l'en-tête visible.
      if (vv.offsetTop > 0) window.scrollTo(0, 0);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      root.style.removeProperty('--vvh');
    };
  }, [enabled]);
}
