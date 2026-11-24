import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";
import { buildWaouhAuthRedirect } from '@/lib/waouhAccessPolicy';
import { useAuth } from '@/contexts/AuthContext';
import { openInterestedDiscussion } from '@/lib/waouh/interestNavigation';

const WaouhDealRoomPage = lazy(() => import("@/pages/waouh/WaouhDealRoomPage"));

/** Paramètres qui ouvrent un échange existant dans une fenêtre du Chat. */
export const hasRoomParams = (search: string) => {
  const p = new URLSearchParams(search);
  return p.has("room_id") || p.has("fabric_id") || p.has("component_id");
};

/**
 * Fenêtre « Deal Room » du Chat : le Chat reste la référence, l'échange s'ouvre
 * dans une fenêtre au-dessus de la conversation (même écran, même adresse).
 */
export function WaouhChatRoomWindow({ children }: { children: ReactNode }) {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const p = new URLSearchParams(search);
  const fabric = p.get('fabric_id');
  const amount = p.has('offer') ? Number(p.get('offer')) : null;
  const userId = user?.id;
  // Resume old result links and sign-in returns through the same chat tab.
  const interested = !!fabric && !p.has('sale_article_id') && p.get('delegate') !== '1' && !p.has('room_id') && !p.has('component_id');
  useEffect(() => {
    if (!interested || isLoading || !fabric) return;
    if (!userId) { navigate(buildWaouhAuthRedirect(pathname + search), { replace: true }); return; }
    let alive = true;
    setError('');
    void openInterestedDiscussion({
      fabric_id: fabric, source_key: 'chat_entry', subject: 'Annonce', raw_text: '', evidence: {},
      price_min: amount, price_max: null, city: null,
    }, path => navigate(path, { replace: true }), () => alive).catch(e => {
      if (alive) setError(e instanceof Error ? e.message : 'Cet échange n’a pas pu être ouvert. Réessayez.');
    });
    return () => { alive = false; };
  }, [interested, fabric, amount, userId, isLoading, retry, navigate, pathname, search]);
  const open = hasRoomParams(search) && !interested;
  return (
    <>
      {children}
      {interested && <div className="fixed bottom-20 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-2xl border bg-white p-3 shadow-lg" role={error ? 'alert' : 'status'}>
        {error || 'Ouverture de votre échange…'}
        {error && <button className="ml-2 font-semibold text-emerald-700" onClick={() => setRetry(v => v + 1)}>Réessayer</button>}
      </div>}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-label="Deal Room">
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <button
              type="button"
              onClick={() => navigate(pathname, { replace: true })}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> Retour au chat
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-700">
              <Handshake className="h-4 w-4" /> Deal Room
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<p className="p-4 text-sm text-slate-500">Chargement…</p>}>
              <WaouhDealRoomPage />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

export default WaouhChatRoomWindow;
