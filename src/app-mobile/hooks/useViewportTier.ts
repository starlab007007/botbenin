import { useEffect, useState } from 'react';

/**
 * Paliers de présentation du web WAOUH. Le CONTENU est identique partout
 * (source unique : src/erp/navigation.ts) ; seule la présentation change.
 *
 *  phone   < 640 px      barre du bas + menu complet
 *  tablet  640–1179 px   rail d'icônes + menu complet en tiroir
 *  desktop ≥ 1180 px     espace de travail complet (barre latérale ; repliée en rail sous 1440 px)
 */
export type ViewportTier = 'phone' | 'tablet' | 'desktop';

export const PHONE_MAX_WIDTH = 639;
export const DESKTOP_MIN_WIDTH = 1180;
export const WIDE_DESKTOP_MIN_WIDTH = 1440;

export const tierForWidth = (width: number): ViewportTier =>
  width <= PHONE_MAX_WIDTH ? 'phone' : width >= DESKTOP_MIN_WIDTH ? 'desktop' : 'tablet';

const currentWidth = () => (typeof window === 'undefined' ? 1280 : window.innerWidth);

export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(() => tierForWidth(currentWidth()));

  useEffect(() => {
    const sync = () => setTier(tierForWidth(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return tier;
}
