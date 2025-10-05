import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics 4 Measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // À remplacer par votre ID GA4

export const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Charger le script GA4
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID);
    }
  }, []);

  useEffect(() => {
    // Tracker les changements de page
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

// Fonctions utilitaires pour tracker les conversions
export const trackConversion = (eventName: string, params?: Record<string, any>) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};

export const trackSignup = (method: string) => {
  trackConversion('sign_up', { method });
};

export const trackLogin = (method: string) => {
  trackConversion('login', { method });
};

export const trackPurchase = (planName: string, value: number) => {
  trackConversion('purchase', {
    transaction_id: `${Date.now()}_${planName}`,
    value,
    currency: 'XOF',
    items: [{
      item_name: planName,
      price: value
    }]
  });
};

export const trackTrialStart = (planName: string) => {
  trackConversion('begin_trial', { plan: planName });
};

export const trackCTAClick = (ctaName: string, location: string) => {
  trackConversion('cta_click', { cta_name: ctaName, location });
};

// Déclarations TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
