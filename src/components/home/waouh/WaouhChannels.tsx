import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, MessagesSquare, Mic } from 'lucide-react';

const channels = [
  {
    href: '/waouh-chat',
    badge: 'CHAT WEB',
    title: 'Discutez sur bot.bj',
    desc: 'Cherchez, négociez et payez sans compte. Le navigateur suffit.',
    color: '#00D4FF',
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
    color: '#FFD23F',
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
          <div className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: 'hsl(var(--home-accent))' }}>
            03 canaux
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: 'hsl(var(--home-text))' }}>
            Une seule conversation.{' '}
            <span style={{ color: 'hsl(var(--home-text-muted))' }}>Trois manières d’y entrer.</span>
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
                  style={{ borderColor: `${c.color}80`, color: c.color, background: `${c.color}1F` }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: c.color }} />
                  {c.badge}
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: 'hsl(var(--home-text-muted))' }}
                >
                  0{i + 1}
                </span>
              </div>

              <div
                className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: `${c.color}1F`, border: `1px solid ${c.color}66` }}
              >
                <Icon className="h-6 w-6" style={{ color: c.color }} />
              </div>

              <h3 className="mt-5 text-2xl font-semibold leading-tight" style={{ color: 'hsl(var(--home-text))' }}>
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'hsl(var(--home-text-muted))' }}>
                {c.desc}
              </p>

              <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium" style={{ color: c.color }}>
                {c.cta}
                <span aria-hidden>→</span>
              </div>

              <div
                className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-3xl"
                style={{ background: c.color }}
              />
            </>
          );

          const cls = `group relative overflow-hidden rounded-2xl p-6 sm:p-8 transition ${c.span}`;
          const style: React.CSSProperties = {
            background: 'hsl(var(--home-surface))',
            border: '1px solid hsl(var(--home-border))',
            boxShadow: '0 10px 30px -20px hsl(var(--home-accent) / 0.25)',
          };
          return c.external ? (
            <a key={i} href={c.href} target="_blank" rel="noreferrer" className={cls} style={style}>
              {inner}
            </a>
          ) : (
            <Link key={i} to={c.href} className={cls} style={style}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
};
