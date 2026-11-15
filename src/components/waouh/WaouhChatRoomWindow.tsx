import { lazy, Suspense, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";

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
  const open = hasRoomParams(search);
  return (
    <>
      {children}
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
