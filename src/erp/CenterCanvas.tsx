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
      {/* Barre supérieure : retour + accès rapides */}
      {view !== 'home' && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card/60 px-4 py-2 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveConvId(null);
              setView('home');
            }}
            aria-label="Revenir aux discussions"
          >
            <ArrowLeft size={18} />
          </Button>
          <span className="text-sm font-semibold text-foreground">
            {view === 'chat' ? 'WAOUH Assistant IA' : view === 'conversation' ? 'Conversation' : view === 'radar' ? 'Radar' : 'Statuts'}
          </span>
          <div className="ml-auto hidden items-center gap-2 xl:flex">
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
      )}

      <div className="relative min-h-0 flex-1">
        {/* HOME — parité Flutter */}
        <div className={cn('absolute inset-0 overflow-y-auto', view !== 'home' && 'hidden')}>
          <CenterChatHome
            sessionId={sid}
            waouhUserIds={waouhUserIds}
            authUserId={user?.id ?? null}
            isGuest={!user}
            onOpenWaouh={openWaouh}
            onNewWaouh={startNewThread}
            onIntent={openIntent}
            onOpenConversation={openConversation}
            onSignIn={() => navigate('/app/auth')}
          />
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

        {/* CONVERSATION Supabase */}
        {view === 'conversation' && activeConvId && (
          <div className="absolute inset-0">
            <ChatScreen embedded convIdOverride={activeConvId} />
          </div>
        )}

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
