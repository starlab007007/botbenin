import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Loader2, MessageSquareText, Workflow } from "lucide-react";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { pollDelay, roomCall, type DealRoom } from "@/lib/waouh/dealRoom";

type Step = { label: string; state: "done" | "active" | "todo" };

const EVENT_TEXT: Record<string, string> = {
  open: "Échange ouvert",
  adopt: "Historique relié",
  delegate: "Vous avez confié l’échange à Bot",
  bot_step: "Bot a avancé sur l’échange",
  takeover: "Vous avez repris la main",
  pause: "Bot mis en pause",
  resume_bot: "Bot a repris l’échange",
  propose: "Une proposition a été faite",
  accept: "Une partie a confirmé les conditions",
  complete: "Échange clôturé",
  retry_required: "Nouvelle tentative prévue",
  guest_contacted: "Vendeur contacté par WhatsApp",
  guest_stopped: "Le vendeur ne souhaite pas être contacté",
  seller_pending: "Recherche d’un moyen de joindre le vendeur",
};

/** « il y a 5 min » : lisible d'un coup d'œil, jamais une date brute. */
export function sinceText(iso?: string | null, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "à l’instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function untilText(iso?: string | null, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const m = Math.round((t - now) / 60000);
  if (m <= 1) return "dans un instant";
  if (m < 60) return `dans ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `dans ${h} h` : `dans ${Math.round(h / 24)} j`;
}

/** Étapes et message d'état tirés de l'échange : on décrit où en est Bot, pas comment il fonctionne. */
export function followUpView(room: DealRoom | null) {
  const status = String(room?.agreement?.status ?? "");
  const events: Array<{ event_type?: string; created_at?: string; id?: string }> = Array.isArray(room?.events) ? room!.events : [];
  const closed = Boolean(room?.closed) || status === "completed";
  const agreed = closed || status === "accepted";
  const paused = room?.control_mode === "paused";
  const contacted = Boolean(room?.provider_joined || room?.external_contact) ||
    events.some((e) => e.event_type === "guest_contacted" || e.event_type === "bot_step") ||
    (Array.isArray(room?.messages) && room!.messages.length > 0);
  const negotiating = agreed || Number(room?.current_offer_version ?? 0) > 0 || Boolean(room?.agreement);
  const done = [true, contacted, negotiating, agreed];
  const labels = ["Mission confiée", "Vendeur contacté", "Négociation", "Accord"];
  const firstOpen = done.findIndex((d) => !d);
  const steps: Step[] = labels.map((label, i) => ({
    label,
    state: done[i] ? "done" : i === firstOpen && !paused ? "active" : "todo",
  }));
  const headline = agreed ? (closed ? "Échange conclu" : "Accord trouvé")
    : paused ? "Bot est en pause"
    : !contacted ? "Bot prépare le premier contact"
    : !negotiating ? "En attente de la réponse du vendeur"
    : "Bot négocie pour vous";
  const hint = agreed ? "Il ne reste qu’à finaliser ensemble."
    : paused ? "Reprenez-le quand vous voulez."
    : "Vous serez prévenu à chaque avancée importante.";
  const activity = events.filter((e) => e.event_type && EVENT_TEXT[e.event_type]).slice(-3).reverse()
    .map((e) => ({ id: e.id ?? `${e.event_type}-${e.created_at}`, text: EVENT_TEXT[e.event_type as string], at: e.created_at ?? null }));
  const cascade = room?.mandate?.cascade_max_steps > 1 && room?.mandate?.cascade_step
    ? `Piste ${room.mandate.cascade_step} sur ${room.mandate.cascade_max_steps}` : "";
  return { steps, headline, hint, activity, cascade, agreed, paused, closed };
}

/** Suivi affiché dès que l'on confie à Bot : où il en est, ce qu'il a fait, ce qu'il fera ensuite. */
export function WaouhBotFollowUp({ roomId, title, onOpen }: { roomId: string; title?: string | null; onOpen?: () => void }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let timer: number | undefined;
    const load = async () => {
      let next = 10000;
      try {
        const data = await roomCall("get", { deal_room_id: roomId });
        if (!alive.current) return;
        setRoom(data);
        setFailed(false);
        next = pollDelay(data);
      } catch {
        if (alive.current) setFailed(true);
        next = 15000;
      }
      if (alive.current && document.visibilityState !== "hidden") timer = window.setTimeout(() => void load(), next);
      else if (alive.current) timer = window.setTimeout(() => void load(), 30000);
    };
    void load();
    const tick = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { alive.current = false; window.clearTimeout(timer); window.clearInterval(tick); };
  }, [roomId]);

  const view = useMemo(() => followUpView(room), [room]);
  const nextCheck = room?.next_run_at && !view.agreed && !view.paused ? untilText(room.next_run_at, now) : "";
  const open = () => { onOpen?.(); navigate(`/app/chat?room_id=${roomId}`); };

  return (
    <section aria-live="polite" className="w-full overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-slate-800 shadow-sm dark:border-emerald-900 dark:from-emerald-950 dark:to-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-3 p-3">
        <BotLiveAvatar size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight">{room ? view.headline : "Bot prend le relais…"}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-300">{title ? `${title} · ` : ""}{room ? view.hint : "Mise en place du suivi"}</p>
        </div>
        {!room && !failed && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
      </div>

      <ol className="grid grid-cols-4 gap-1 px-3 pb-3" aria-label="Avancement">
        {view.steps.map((s) => (
          <li key={s.label} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <span className={`h-1.5 w-full rounded-full ${s.state === "done" ? "bg-emerald-500" : s.state === "active" ? "animate-pulse bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />
            <span className={`flex items-center gap-1 text-[11px] leading-tight ${s.state === "todo" ? "text-slate-400" : "font-semibold text-slate-700 dark:text-slate-100"}`}>
              {s.state === "done" ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> : s.state === "active" ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-emerald-600" /> : <Circle className="h-3 w-3 shrink-0" />}
              <span className="truncate">{s.label}</span>
            </span>
          </li>
        ))}
      </ol>

      {(view.activity.length > 0 || nextCheck || view.cascade) && (
        <div className="space-y-1 border-t border-emerald-100 px-3 py-2 text-xs dark:border-emerald-900">
          {view.activity.map((a) => (
            <p key={a.id} className="flex items-center justify-between gap-2"><span className="truncate">{a.text}</span><span className="shrink-0 text-slate-400">{sinceText(a.at, now)}</span></p>
          ))}
          {nextCheck && <p className="text-slate-500 dark:text-slate-300">Prochain point de Bot : {nextCheck}</p>}
          {view.cascade && <p className="text-slate-500 dark:text-slate-300">{view.cascade} · Bot passe à la suivante si le vendeur ne répond pas.</p>}
        </div>
      )}
      {failed && !room && <p role="status" className="px-3 pb-2 text-xs text-slate-500">Le suivi se met en place, un instant…</p>}

      <div className="grid grid-cols-2 gap-2 border-t border-emerald-100 p-2 dark:border-emerald-900">
        <button type="button" onClick={open} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-black text-white active:scale-[.98]"><MessageSquareText className="h-4 w-4" />Ouvrir l’échange</button>
        <button type="button" onClick={() => navigate("/app/missions?view=suivi")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-black text-emerald-800 active:scale-[.98] dark:bg-transparent dark:text-emerald-200"><Workflow className="h-4 w-4" />Toutes mes missions</button>
      </div>
    </section>
  );
}

export default WaouhBotFollowUp;
