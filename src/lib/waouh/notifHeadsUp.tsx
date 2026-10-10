import { useState } from "react";
import { toast } from "sonner";
import { Send, X } from "lucide-react";
import type { WaouhNotification } from "@/hooks/waouhNotificationTypes";

/** Types de notifications auxquels on peut répondre directement (achat, vente, négociation…). */
const REPLYABLE = new Set([
  "match_seller", "match_buyer", "match", "new_buyer", "radar_match",
  "negotiation_open", "contact_reply", "deal_created", "deal_seller", "deal_buyer",
  "deal_payment_request", "contact_exchange",
]);

export const isReplyableNotif = (n: Pick<WaouhNotification, "template" | "payload">) =>
  REPLYABLE.has(n.template) || n.payload?.reply_enabled === true;

export function emitQuickReply(text: string, notif: WaouhNotification) {
  window.dispatchEvent(new CustomEvent("waouh:quick-reply", {
    detail: { text, about: notif.body || notif.title, notificationId: notif.id, journeyId: notif.payload?.journey_id ?? null },
  }));
}

export function emitOpenNotif(notif: WaouhNotification, route: string | null) {
  window.dispatchEvent(new CustomEvent("waouh:open-notif", { detail: { route, id: notif.id } }));
}

function HeadsUp({ id, notif, route }: { id: string | number; notif: WaouhNotification; route: string | null }) {
  const [text, setText] = useState("");
  const send = () => {
    const value = text.trim();
    if (!value) return;
    emitQuickReply(value, notif);
    toast.dismiss(id);
  };
  return (
    <div className="w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" role="alert">
      <div className="flex items-start gap-3">
        {notif.image_url ? (
          <img src={notif.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-100 text-lg">🤖</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{notif.title}</p>
          <p className="line-clamp-2 text-xs text-slate-600">{notif.body}</p>
        </div>
        <button type="button" aria-label="Fermer" onClick={() => toast.dismiss(id)} className="text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Répondre…"
          aria-label="Répondre"
          className="h-9 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-400"
        />
        <button type="button" onClick={send} disabled={!text.trim()} aria-label="Envoyer"
          className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-white disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => { emitOpenNotif(notif, route); toast.dismiss(id); }}
          className="h-9 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700">
          Ouvrir
        </button>
      </div>
    </div>
  );
}

/** Notification flottante façon Messenger : lecture, réponse rapide, ouverture. */
export function showNotifHeadsUp(notif: WaouhNotification, route: string | null) {
  toast.custom((id) => <HeadsUp id={id} notif={notif} route={route} />, { duration: 12000, position: "top-center" });
}
