import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, MessagesSquare, Mic } from 'lucide-react';

const channels = [
  {
    href: '/waouh-chat',
    badge: 'CHAT WEB',
    title: 'Discutez sur bot.bj',
    desc: 'Cherchez, négociez et payez sans compte. Le navigateur suffit.',
    color: 'hsl(var(--waouh-primary))',
    icon: MessageSquare,
    cta: 'Ouvrir le chat',
    span: 'lg:col-span-5',
  },
  {
    href: 'https://wa.me/22965653468',
    external: true,
    badge: 'WHATSAPP',
    title: '+229 65 65 34 68',
    desc: 'Écrivez à WaouhApp comme à un ami. Aucune installation, aucun compte.',
    color: '#25D366',
    icon: MessagesSquare,
    cta: 'Écrire sur WhatsApp',
    span: 'lg:col-span-4',
  },
  {
    href: '/kpakpato',
    badge: 'VOIX · KPAKPATO',
    title: 'Parlez, on écoute',
    desc: 'Marché parlé en Fon, Yoruba, Français. Pensé pour tous.',
    color: 'hsl(var(--waouh-ai))',
    icon: Mic,
    cta: 'Découvrir la voix',
    span: 'lg:col-span-3',
  },
];

export const WaouhChannels: React.FC = () => {
  return (
    <section className="relative" style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--waouh-primary))] mb-2">03 canaux</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Une seule conversation. <span className="text-white/40">Trois manières d’y entrer.</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {channels.map((c, i) => {
          const Icon = c.icon;
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: `${c.color}66`, color: c.color, background: `${c.color}14` }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: c.color }} />
                  {c.badge}
                </div>
                <span className="text-white/30 text-xs font-mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>0{i + 1}</span>
              </div>

              <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${c.color}1A`, border: `1px solid ${c.color}40` }}>
                <Icon className="h-6 w-6" style={{ color: c.color }} />
              </div>

              <h3 className="mt-5 text-2xl font-semibold text-white leading-tight">{c.title}</h3>
              <p className="mt-2 text-white/60 text-sm leading-relaxed">{c.desc}</p>

              <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium" style={{ color: c.color }}>
                {c.cta}
                <span aria-hidden>→</span>
              </div>

              <div
                className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
                style={{ background: c.color }}
              />
            </>
          );

          const cls = `group relative overflow-hidden rounded-2xl border border-[hsl(var(--waouh-border))] bg-[hsl(var(--waouh-bg))] p-6 sm:p-8 transition hover:border-[${c.color}] ${c.span}`;
          return c.external ? (
            <a key={i} href={c.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
          ) : (
            <Link key={i} to={c.href} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </section>
  );
};
