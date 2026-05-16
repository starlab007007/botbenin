import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, Crown, Phone } from 'lucide-react';

type Pack = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  features: string[];
  cta: { label: string; to: string };
  highlight?: boolean;
};

const packs: Pack[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    tagline: 'Testez toute la puissance de WAOUH, en mode limité.',
    price: 'Gratuit',
    priceSuffix: '· sans carte',
    Icon: Sparkles,
    accent: '#00D4FF',
    features: [
      'Accès à WAOUH (chat + WhatsApp démo)',
      'Kpakpato vocal — 10 minutes / mois',
      'Radar IA — 50 prospects / mois',
      'WhatsApp IA — 100 messages / mois',
      '1 bot personnalisable',
      'Support communautaire',
    ],
    cta: { label: 'Commencer gratuitement', to: '/auth' },
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Le pack complet pour vendre, prospecter et automatiser sans limite raisonnable.',
    price: '6 000 FCFA',
    priceSuffix: '/ mois',
    Icon: Crown,
    accent: '#FFD23F',
    highlight: true,
    features: [
      'WAOUH illimité — chat, WhatsApp, voix',
      'Kpakpato vocal — 500 minutes / mois',
      'Radar IA — prospects illimités (Jiji, FB, IG, WhatsApp)',
      'WhatsApp IA — campagnes & diffusion illimitées',
      'CRM complet + qualification automatique',
      'IA Visual — vidéos & visuels Gemini 2.5',
      'Bots illimités, multi-canaux, multi-langues (Fon, Yoruba, FR)',
      'Mobile Money intégré (Qosic)',
      'Support prioritaire WhatsApp',
    ],
    cta: { label: 'Choisir Premium', to: '/auth?plan=premium' },
  },
  {
    id: 'sur-devis',
    name: 'Sur devis',
    tagline: 'Volume élevé, intégration sur mesure, équipe dédiée.',
    price: 'Nous contacter',
    Icon: Phone,
    accent: '#A855F7',
    features: [
      'Tout le Premium, sans plafond',
      'Numéros WhatsApp Business dédiés',
      'IA Clinique / vertical métier sur mesure',
      'Intégrations API (ERP, CRM, Calendar, Sheets)',
      'Déploiement VPS dédié + SLA',
      'Formation & onboarding équipe',
      'Account manager dédié',
    ],
    cta: { label: 'Demander un devis', to: '/support-technique' },
  },
];

export const PricingSection: React.FC = () => {
  return (
    <section style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
      <div className="text-center mb-10">
        <div
          className="text-[11px] uppercase tracking-[0.25em] mb-2"
          style={{ color: 'hsl(var(--home-accent))' }}
        >
          Nos packs
        </div>
        <h2
          className="text-3xl sm:text-4xl font-bold leading-tight"
          style={{ color: 'hsl(var(--home-text))' }}
        >
          Une offre claire,{' '}
          <span style={{ color: 'hsl(var(--home-text-muted))' }}>
            pour chaque ambition.
          </span>
        </h2>
        <p
          className="mt-4 max-w-2xl mx-auto text-sm sm:text-base"
          style={{ color: 'hsl(var(--home-text-muted))' }}
        >
          Commencez gratuitement, passez Premium quand WAOUH vous rapporte plus
          qu'il ne coûte, ou parlons-nous si votre business a des besoins
          spécifiques.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {packs.map((p) => {
          const Icon = p.Icon;
          return (
            <div
              key={p.id}
              className="relative flex flex-col rounded-2xl p-6 sm:p-7"
              style={{
                background: p.highlight
                  ? 'linear-gradient(160deg, hsl(var(--home-surface-alt)) 0%, hsl(var(--home-surface)) 100%)'
                  : 'hsl(var(--home-surface))',
                border: p.highlight
                  ? `2px solid ${p.accent}`
                  : '1px solid hsl(var(--home-border))',
                boxShadow: p.highlight
                  ? `0 30px 60px -30px ${p.accent}80`
                  : '0 10px 30px -20px hsl(var(--home-accent) / 0.25)',
              }}
            >
              {p.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{
                    background: p.accent,
                    color: 'hsl(var(--home-text))',
                  }}
                >
                  ★ Le plus choisi
                </div>
              )}

              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: `${p.accent}1F`,
                  border: `1px solid ${p.accent}66`,
                }}
              >
                <Icon className="h-5 w-5" style={{ color: p.accent }} />
              </div>

              <h3
                className="mt-4 text-2xl font-bold"
                style={{ color: 'hsl(var(--home-text))' }}
              >
                {p.name}
              </h3>
              <p
                className="mt-1 text-sm leading-snug"
                style={{ color: 'hsl(var(--home-text-muted))' }}
              >
                {p.tagline}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span
                  className="text-3xl sm:text-4xl font-bold"
                  style={{ color: 'hsl(var(--home-text))' }}
                >
                  {p.price}
                </span>
                {p.priceSuffix && (
                  <span
                    className="text-sm"
                    style={{ color: 'hsl(var(--home-text-muted))' }}
                  >
                    {p.priceSuffix}
                  </span>
                )}
              </div>

              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: p.accent }}
                    />
                    <span style={{ color: 'hsl(var(--home-text))' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={p.cta.to}
                className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{
                  background: p.highlight
                    ? p.accent
                    : 'hsl(var(--home-text))',
                  color: p.highlight
                    ? 'hsl(var(--home-text))'
                    : 'hsl(var(--home-surface))',
                }}
              >
                {p.cta.label}
              </Link>
            </div>
          );
        })}
      </div>

      <p
        className="mt-8 text-center text-xs"
        style={{ color: 'hsl(var(--home-text-muted))' }}
      >
        Paiement Mobile Money (MTN, Moov) · Sans engagement · Annulez à tout
        moment
      </p>
    </section>
  );
};

export default PricingSection;
