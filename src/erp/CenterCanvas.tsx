import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radar, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import WaouhWebChat, { type WaouhWebChatHandle } from '@/components/waouh/WaouhWebChat';
import { WaouhMatchChatWindow } from '@/components/waouh/WaouhMatchChatWindow';
import { useWaouhMatchChats } from '@/components/waouh/useWaouhMatchChats';
import { useWaouhIdentity } from '@/app-mobile/hooks/useWaouhIdentity';
import { useMobileAuth } from '@/app-mobile/hooks/useMobileAuth';
import { RadarPanel } from '@/app-mobile/components/radar/RadarPanel';
import { StatusesPanel } from '@/components/waouh/statuses/StatusesPanel';
import ChatScreen from '@/app-mobile/screens/ChatScreen';
import CenterChatHome from './CenterChatHome';
import { cn } from '@/lib/utils';

type CanvasView = 'home' | 'chat' | 'conversation' | 'statuses' | 'radar';

/**
 * Mono-page central canvas of the WaouhApp AI ERP.
 * The chat engine stays mounted so switching states never reloads a page.
 * L'accueil réplique l'écran Chat de l'app Flutter (parité 1:1).
 */
export const CenterCanvas = () => {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { sessionId, waouhUserIds } = useWaouhIdentity();
  const sid = sessionId ?? '';

  const [view, setView] = useState<CanvasView>('home');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const chatRef = useRef<WaouhWebChatHandle>(null);

  const matchChats = useWaouhMatchChats(sid, user?.id ?? null);
  const { matches, waouhIds, activeKey, setActiveKey, getCached, setCached, getHasMore, setHasMoreCached } =
    matchChats;

  // A dedicated product window opened anywhere → bring the chat state forward.
  useEffect(() => {
    const onOpen = () => {
      setActiveConvId(null);
      setView('chat');
    };
    window.addEventListener('waouh:open-match-chat', onOpen as EventListener);
    return () => window.removeEventListener('waouh:open-match-chat', onOpen as EventListener);
  }, []);

  const requireAuth = useCallback(
    (target: string) => {
      if (user) return true;
      try {
        sessionStorage.setItem('waouh_post_auth_redirect', target);
      } catch {
        /* noop */
      }
      navigate('/app/auth');
      return false;
    },
    [navigate, user],
  );

  const openWaouh = useCallback(() => {
    if (!requireAuth('/app/chat')) return;
    setActiveConvId(null);
    setActiveKey('main');
    setView('chat');
  }, [requireAuth, setActiveKey]);

  const openIntent = useCallback(
    (prompt: string) => {
      if (!requireAuth('/app/chat')) return;
      setActiveConvId(null);
      setActiveKey('main');
      setView('chat');
      setTimeout(() => chatRef.current?.prefill(prompt), 60);
    },
    [requireAuth, setActiveKey],
  );

  const startNewThread = useCallback(() => {
    if (!requireAuth('/app/chat')) return;
    setActiveConvId(null);
    setActiveKey('main');
    setView('chat');
    setTimeout(() => chatRef.current?.startNewThread(), 60);
  }, [requireAuth, setActiveKey]);

  const openConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setView('conversation');
  }, []);

  const activeMatch = activeKey && activeKey !== 'main' ? matches.find((m) => m.key === activeKey) : null;


  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Persistent command bar */}
      <div className="shrink-0 border-b border-border bg-card/60 px-6 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          {view !== 'home' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setView('home')}
              aria-label="Revenir à l’accueil du centre de commande"
            >
              <ArrowLeft size={18} />
            </Button>
          )}
          <form
            className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 shadow-sm focus-within:border-primary"
            onSubmit={(e) => {
              e.preventDefault();
              runPrompt(draft);
            }}
          >
            <Search size={18} className="text-muted-foreground" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Demandez à WAOUH : acheter, vendre, négocier, analyser…"
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Commande WAOUH"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Envoyer à WAOUH">
              <Send size={16} />
            </Button>
          </form>

          <div className="hidden items-center gap-2 xl:flex">
            {(['statuses', 'radar'] as const).map((key) => (
              <Button
                key={key}
                type="button"
                variant={view === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView(view === key ? 'home' : key)}
              >
                {key === 'radar' ? <Radar size={15} /> : <Sparkles size={15} />}
                {key === 'radar' ? 'Radar' : 'Statuts'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* HOME */}
        <div className={cn('absolute inset-0 overflow-y-auto', view !== 'home' && 'hidden')}>
          <div className="mx-auto w-full max-w-4xl px-6 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Centre de commande WAOUH
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              Tout se pilote ici, sans changer de page
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lancez une intention, reprenez une négociation ou ouvrez une brique ERP : le centre reste le même.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {INTENTS.map((intent) => {
                const Icon = intent.icon;
                return (
                  <button
                    key={intent.label}
                    type="button"
                    onClick={() => openIntent(intent.prompt)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Icon size={15} />
                    {intent.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth('/app/chat')) return;
                  setActiveKey('main');
                  setView('chat');
                  setTimeout(() => chatRef.current?.startNewThread(), 60);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Plus size={15} />
                Nouveau chat WAOUH
              </button>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runPrompt(s)}
                  className="rounded-xl border border-border bg-card p-3 text-left text-xs leading-relaxed text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Négociations par article</h3>
              <div className="rounded-2xl border border-border bg-card p-2">
                <WaouhMatchChatList sessionId={sid || null} authUserId={user?.id ?? null} />
              </div>
            </div>
          </div>
        </div>

        {/* CHAT — always mounted so the engine and its cache never reload */}
        <div className={cn('absolute inset-0 flex flex-col', view !== 'chat' && 'hidden')}>
          {activeMatch ? (
            <WaouhMatchChatWindow
              match={activeMatch}
              sessionId={sid}
              authUserId={user?.id ?? null}
              waouhIds={waouhIds}
              active
              getCached={getCached}
              setCached={setCached}
              getHasMore={getHasMore}
              setHasMoreCached={setHasMoreCached}
            />
          ) : null}
          <div className={cn('flex h-full w-full flex-col', activeMatch && 'hidden')}>
            <WaouhWebChat ref={chatRef} fullscreen />
          </div>
        </div>

        {/* STATUSES */}
        {view === 'statuses' && (
          <div className="absolute inset-0 overflow-y-auto">
            <StatusesPanel />
          </div>
        )}

        {/* RADAR */}
        {view === 'radar' && (
          <div className="absolute inset-0 overflow-y-auto">
            <RadarPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterCanvas;
