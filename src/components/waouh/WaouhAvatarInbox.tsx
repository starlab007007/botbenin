import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MessageCircle, Send } from "lucide-react";
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { emitQuickReply, isReplyableNotif } from "@/lib/waouh/notifHeadsUp";
import { waouhSmartRoute } from "@/lib/waouh/smartPayload";
import type { WaouhNotification } from "@/hooks/waouhNotificationTypes";

function lastBotMessage(sessionId: string): string {
  try {
    const raw = localStorage.getItem(`waouh_main_msgs_${sessionId}`);
    const list = raw ? (JSON.parse(raw) as Array<{ direction?: string; text?: string }>) : [];
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.direction === "in" && m.text && m.text !== "(image)") return m.text.replace(/[*_`#>]/g, "").slice(0, 140);
    }
  } catch { /* stockage indisponible */ }
  return "";
}

function Row({ n, onOpen }: { n: WaouhNotification; onOpen: () => void }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const send = () => {
    const v = text.trim();
    if (!v) return;
    emitQuickReply(v, n);
    setSent(true);
    setText("");
  };
  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-3">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 text-left">
        {n.image_url
          ? <img src={n.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100">🤖</span>}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{n.title}</span>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Non lu" />}
          </span>
          <span className="line-clamp-2 text-xs text-slate-600">{n.body}</span>
        </span>
      </button>
      {isReplyableNotif(n) && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={e => { setText(e.target.value); setSent(false); }}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder={sent ? "Envoyé à Bot ✓" : "Répondre…"}
            aria-label="Répondre"
            className="h-9 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-400"
          />
          <button type="button" onClick={send} disabled={!text.trim()} aria-label="Envoyer"
            className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

/** Messagerie de Bot, en tête de l'accueil Avatar : conversation + nouveautés avec réponse rapide. */
export function WaouhAvatarInbox({ authUserId, botName }: { authUserId?: string | null; botName: string }) {
  const navigate = useNavigate();
  const sessionId = useMemo(() => getWaouhSessionId(), []);
  const { notifications, unreadCount, markRead } = useWaouhMatchNotifications(sessionId, authUserId ?? null);
  const preview = useMemo(() => lastBotMessage(sessionId), [sessionId, notifications.length]);
  const items = notifications.filter(n => !n.read).concat(notifications.filter(n => n.read)).slice(0, 3);

  return (
    <section aria-label={`Messages de ${botName}`} className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
      <button type="button" onClick={() => navigate("/app/chat/waouh")}
        className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 p-3 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-600 text-white"><MessageCircle className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-black text-slate-900">
            Discuter avec {botName}
            {unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}
          </span>
          <span className="line-clamp-1 text-xs text-slate-600">{preview || "Votre assistant est prêt à vous répondre."}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-violet-500" />
      </button>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map(n => (
            <Row key={n.id} n={n} onOpen={() => { markRead(n.id); navigate(waouhSmartRoute(n.payload) || "/app/chat/waouh"); }} />
          ))}
        </ul>
      )}
    </section>
  );
}
