import { useEffect, useMemo, useState } from 'react';
import { Archive, MessageSquare, Plus, Radar as RadarIcon, Search, Sparkles, Store, Handshake, ShoppingBag } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WaouhMatchChatList } from '@/components/waouh/WaouhMatchChatList';
import { StatusesPanel } from '@/components/waouh/statuses/StatusesPanel';
import { RadarPanel } from '@/app-mobile/components/radar/RadarPanel';
import { useUnreadCounts } from '@/app-mobile/hooks/useUnreadCounts';
import { channelBadge, convInitials, formatConvLabel, type WaouhUserLike } from '@/app-mobile/utils/chatLabel';
import { cn } from '@/lib/utils';

type Conv = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  last_message: string | null;
  updated_at: string;
  user_id: string | null;
};

type Tab = 'chats' | 'statuses' | 'radar';

const ARCHIVE_KEY = (sid: string | null) => `waouh_archived_matches_${sid ?? 'anon'}`;

function readArchivedCount(sid: string | null): number {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY(sid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Aujourd'hui · ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Hier · ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${time}`;
}

export type CenterChatHomeProps = {
  sessionId: string;
  waouhUserIds: string[];
  authUserId: string | null;
  isGuest: boolean;
  onOpenWaouh: () => void;
  onNewWaouh: () => void;
  onIntent: (prompt: string) => void;
  onOpenConversation: (id: string) => void;
  onSignIn: () => void;
};

const INTENTS = [
  { label: 'Vendre', prompt: 'Je veux vendre ', icon: Store },
  { label: 'Acheter', prompt: 'Je veux acheter ', icon: Search },
  { label: 'Négocier', prompt: 'Je veux négocier le prix de ', icon: Handshake },
];

/**
 * Accueil du cadre central web — réplique 1:1 de l'écran Chat de l'app Flutter :
 * recherche, onglets Discussions/Statuts/Radar, carte WAOUH, section CONVERSATIONS
 * (fenêtres par article + conversations) et état vide.
 */
export const CenterChatHome = ({
  sessionId,
  waouhUserIds,
  authUserId,
  isGuest,
  onOpenWaouh,
  onNewWaouh,
  onIntent,
  onOpenConversation,
  onSignIn,
}: CenterChatHomeProps) => {
  const [tab, setTab] = useState<Tab>('chats');
  const [q, setQ] = useState('');
  const [convs, setConvs] = useState<Conv[]>([]);
  const [users, setUsers] = useState<Record<string, WaouhUserLike>>({});
  const [loading, setLoading] = useState(true);
  const [archivedCount, setArchivedCount] = useState(() => readArchivedCount(sessionId || null));

  useEffect(() => {
    const sync = () => setArchivedCount(readArchivedCount(sessionId || null));
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('waouh:match-updated', sync as EventListener);
    const t = window.setInterval(sync, 3000);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('waouh:match-updated', sync as EventListener);
      window.clearInterval(t);
    };
  }, [sessionId]);

  useEffect(() => {
    if (isGuest) {
      setConvs([]);
      setUsers({});
      setLoading(false);
      return;
    }
    let mounted = true;
    const fields = 'id,phone_number,channel,last_message,updated_at,user_id';

    const load = async () => {
      const all: Record<string, Conv> = {};
      if (waouhUserIds.length) {
        const { data } = await supabase
          .from('waouh_conversations')
          .select(fields)
          .in('user_id', waouhUserIds)
          .order('updated_at', { ascending: false })
          .limit(200);
        (data ?? []).forEach((c: any) => {
          all[c.id] = c;
        });
      }
      if (sessionId) {
        const { data: msgs } = await supabase
          .from('waouh_messages')
          .select('conversation_id')
          .eq('web_session_id', sessionId)
          .not('conversation_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);
        const ids = Array.from(new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean)));
        const missing = ids.filter((id) => !all[id]);
        if (missing.length) {
          const { data: extra } = await supabase.from('waouh_conversations').select(fields).in('id', missing).limit(200);
          (extra ?? []).forEach((c: any) => {
            all[c.id] = c;
          });
        }
      }
      const list = Object.values(all).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

      const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean))) as string[];
      const userMap: Record<string, WaouhUserLike> = {};
      if (userIds.length) {
        const { data: us } = await supabase
          .from('waouh_users')
          .select('id,display_name,phone_number,channel,auth_user_id')
          .in('id', userIds);
        (us ?? []).forEach((u: any) => {
          userMap[u.id] = u;
        });
      }
      if (!mounted) return;
      setConvs(list);
      setUsers(userMap);
      setLoading(false);
    };

    load();
    const channels = waouhUserIds.map((uid) =>
      supabase
        .channel(`erp-conv-list-${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'waouh_conversations', filter: `user_id=eq.${uid}` },
          load,
        )
        .subscribe(),
    );
    return () => {
      mounted = false;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [isGuest, waouhUserIds.join('|'), sessionId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return convs
      .map((c) => {
        const u = c.user_id ? users[c.user_id] : null;
        return { ...c, _label: formatConvLabel(c, u), _badge: channelBadge(c.channel ?? u?.channel) };
      })
      .filter((c) =>
        !needle
          ? true
          : c._label.toLowerCase().includes(needle) ||
            (c.last_message ?? '').toLowerCase().includes(needle) ||
            (c.phone_number ?? '').toLowerCase().includes(needle),
      );
  }, [convs, users, q]);

  const convIds = useMemo(() => convs.map((c) => c.id), [convs]);
  const unread = useUnreadCounts(convIds, authUserId ?? undefined);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
      {/* Recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une discussion…"
          className="h-11 rounded-xl pl-9"
          aria-label="Rechercher une discussion"
        />
      </div>

      {/* Onglets */}
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-border">
        {(
          [
            { k: 'chats', label: 'Discussions', icon: MessageSquare },
            { k: 'statuses', label: 'Statuts', icon: Sparkles },
            { k: 'radar', label: 'Radar', icon: RadarIcon },
          ] as { k: Tab; label: string; icon: typeof MessageSquare }[]
        ).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              'flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors',
              tab === k ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'statuses' ? (
        <div className="mt-4">
          <StatusesPanel variant="mobile" query={q} />
        </div>
      ) : tab === 'radar' ? (
        <div className="mt-4">
          <RadarPanel query={q} />
        </div>
      ) : (
        <>
          {/* Carte WAOUH */}
          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">WAOUH</div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    En ligne
                  </div>
                  <div className="text-xs text-muted-foreground">Assistant IA</div>
                </div>
              </div>
              <Button onClick={onOpenWaouh} className="rounded-xl">
                <MessageSquare size={16} />
                Discuter
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {INTENTS.map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onIntent(prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Conversations</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => window.dispatchEvent(new CustomEvent('waouh:show-archived'))}
            >
              <Archive size={15} />
              Archives ({archivedCount})
            </Button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            <WaouhMatchChatList sessionId={sessionId || null} authUserId={authUserId} query={q} />

            {loading && !isGuest && (
              <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-semibold text-foreground">Aucune conversation</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Démarrez une recherche, une vente ou une négociation avec WAOUH.
                </p>
                {isGuest ? (
                  <Button className="mt-4 rounded-xl" onClick={onSignIn}>
                    Se connecter
                  </Button>
                ) : (
                  <Button className="mt-4 rounded-xl" onClick={onNewWaouh}>
                    <Plus size={16} />
                    Nouveau chat WAOUH
                  </Button>
                )}
              </div>
            )}

            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const n = unread[c.id] ?? 0;
                return (
                  <li
                    key={c.id}
                    onClick={() => onOpenConversation(c.id)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-muted/60"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {convInitials(c._label)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn('flex items-center gap-1.5 truncate', n > 0 ? 'font-bold' : 'font-semibold')}>
                          {c._label}
                          <Badge className={`${c._badge.tint} h-4 border-0 px-1.5 py-0 text-[9px]`}>
                            {c._badge.label}
                          </Badge>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatStamp(c.updated_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-muted-foreground">{c.last_message ?? '—'}</p>
                        {n > 0 && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                            {n}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default CenterChatHome;
