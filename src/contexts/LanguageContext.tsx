import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.pricing': 'Tarifs',
    'nav.faq': 'FAQ',
    'nav.blog': 'Blog',
    'nav.testimonials': 'Témoignages',
    'nav.contact': 'Contact',
    'nav.login': 'Connexion',
    'nav.signup': 'Inscription',
    
    // Hero
    'hero.title': 'Chatbot WhatsApp IA au Bénin',
    'hero.subtitle': 'Automatisez votre service client avec l\'intelligence artificielle',
    'hero.cta.start': 'Commencer gratuitement',
    'hero.cta.demo': 'Voir une démo',
    
    // Features
    'features.title': 'Fonctionnalités puissantes',
    'features.whatsapp': 'Intégration WhatsApp',
    'features.ai': 'Intelligence Artificielle',
    'features.analytics': 'Analyses détaillées',
    
    // Pricing
    'pricing.title': 'Tarifs transparents',
    'pricing.free': 'Gratuit',
    'pricing.pro': 'Professionnel',
    'pricing.enterprise': 'Entreprise',
    'pricing.month': 'mois',
    
    // CTA
    'cta.get_started': 'Commencer maintenant',
    'cta.contact': 'Nous contacter',
    'cta.learn_more': 'En savoir plus',
    
    // Footer
    'footer.product': 'Produit',
    'footer.company': 'Entreprise',
    'footer.resources': 'Ressources',
    'footer.legal': 'Légal',
    'footer.copyright': '© 2025 Bot.BJ. Tous droits réservés.',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.pricing': 'Pricing',
    'nav.faq': 'FAQ',
    'nav.blog': 'Blog',
    'nav.testimonials': 'Testimonials',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    
    // Hero
    'hero.title': 'AI WhatsApp Chatbot in Benin',
    'hero.subtitle': 'Automate your customer service with artificial intelligence',
    'hero.cta.start': 'Start for free',
    'hero.cta.demo': 'See a demo',
    
    // Features
    'features.title': 'Powerful features',
    'features.whatsapp': 'WhatsApp Integration',
    'features.ai': 'Artificial Intelligence',
    'features.analytics': 'Detailed Analytics',
    
    // Pricing
    'pricing.title': 'Transparent pricing',
    'pricing.free': 'Free',
    'pricing.pro': 'Professional',
    'pricing.enterprise': 'Enterprise',
    'pricing.month': 'month',
    
    // CTA
    'cta.get_started': 'Get started now',
    'cta.contact': 'Contact us',
    'cta.learn_more': 'Learn more',
    
    // Footer
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.resources': 'Resources',
    'footer.legal': 'Legal',
    'footer.copyright': '© 2025 Bot.BJ. All rights reserved.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    
    // Update alternate links for SEO
    const existingAlternate = document.querySelector('link[rel="alternate"]');
    if (existingAlternate) {
      existingAlternate.remove();
    }
    
    const alternateLink = document.createElement('link');
    alternateLink.rel = 'alternate';
    alternateLink.hreflang = language === 'fr' ? 'en' : 'fr';
    alternateLink.href = `${window.location.origin}${window.location.pathname}?lang=${language === 'fr' ? 'en' : 'fr'}`;
    document.head.appendChild(alternateLink);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
