import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Stethoscope, MessageCircle, Wand2, Users, ArrowUpRight } from 'lucide-react';

const modules = [
  { to: '/kpakpato',           name: 'Kpakpato',    desc: 'Agent vocal IA temps réel',           Icon: Mic,           color: '#A855F7' },
  { to: '/automations',        name: 'IA Clinique', desc: 'Santé, RDV, WhatsApp + Calendar',     Icon: Stethoscope,   color: '#22c55e' },
  { to: '/whatsapp-diffusion', name: 'WhatsApp IA', desc: 'Campagnes & diffusion intelligentes', Icon: MessageCircle, color: '#25D366' },
  { to: '/video-generation',   name: 'IA Visual',   desc: 'Vidéos & visuels Gemini 2.5',         Icon: Wand2,         color: '#FFD23F' },
  { to: '/prospects',          name: 'CRM',         desc: 'Prospects & qualification',           Icon: Users,         color: '#3B82F6' },
];

export const BotBjEcosystem: React.FC = () => (
  <section style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
    <div className="mb-6 sm:mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: 'hsl(var(--home-accent))' }}>
          L’écosystème bot.bj
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* WAOUH flagship */}
      <Link
        to="/waouh-chat"
        className="group lg:col-span-7 relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10 min-h-[220px] sm:min-h-[260px]"
        style={{
          background:
            'radial-gradient(700px 300px at 80% 0%, hsl(var(--home-accent) / 0.35), transparent 60%),' +
            'linear-gradient(135deg, hsl(var(--home-surface-alt)) 0%, hsl(var(--home-surface)) 70%)',
          border: '1px solid hsl(var(--home-accent) / 0.5)',
          boxShadow: '0 30px 60px -30px hsl(var(--home-accent) / 0.4)',
        }}
      >
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]"
          style={{
            border: '1px solid hsl(var(--home-accent))',
            background: 'hsl(var(--home-accent) / 0.15)',
            color: 'hsl(var(--home-text))',
          }}
        >
          ★ Produit phare
        </div>
        <h3
          className="mt-4 sm:mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-none"
          style={{ color: 'hsl(var(--home-text))' }}
        >
          WAOUH
        </h3>
        <p className="mt-4 max-w-md" style={{ color: 'hsl(var(--home-text-muted))' }}>
          Le marché conversationnel — chat, WhatsApp, voix.
        </p>
        <div
          className="mt-8 inline-flex items-center gap-2 font-medium"
          style={{ color: 'hsl(var(--home-text))' }}
        >
          Ouvrir WAOUH{' '}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>

      {/* Secondary modules */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map(({ to, name, desc, Icon, color }) => (
          <Link
            key={name}
            to={to}
            className="group relative overflow-hidden rounded-2xl p-5 transition"
            style={{
              background: 'hsl(var(--home-surface))',
              border: '1px solid hsl(var(--home-border))',
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${color}1F`, border: `1px solid ${color}66` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <h4 className="mt-4 text-base font-semibold" style={{ color: 'hsl(var(--home-text))' }}>
              {name}
            </h4>
            <p
              className="text-xs mt-1 leading-snug"
              style={{ color: 'hsl(var(--home-text-muted))' }}
            >
              {desc}
            </p>
            <ArrowUpRight
              className="absolute top-4 right-4 h-4 w-4 transition"
              style={{ color: 'hsl(var(--home-text-muted))' }}
            />
          </Link>
        ))}
      </div>
    </div>
  </section>
);
