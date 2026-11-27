import type {MissionKind,MissionContext} from '@/lib/waouh/guidedDiscovery';
import {supabase} from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { listNexusOwnedArticles } from "@/lib/waouh/nexus";
import { roomCall, roomErrorText } from "@/lib/waouh/dealRoom";
import { WaouhBotFollowUp } from "@/components/waouh/WaouhBotFollowUp";
import { botStrategy, botTrack, mandateSummary, suggestMandate } from "@/lib/waouh/botStrategy";

/** Candidature alternative pour la cascade automatique (offre suivante si pas de réponse). */
export type WaouhDelegateAlternate = { fabric_id: string; city?: string | null };

const DEFAULT_RULES = { mode: "autonomous", duration_hours: 168, max_followups: 2, active_start: "08:00", active_end: "21:00" } as const;

/** « Confier à Bot » : un contact, deux appuis (action puis confirmation). Rien ne part sans confirmation.
 *  Une fois confirmé : Bot ouvre le Deal Room, démarre la négociation, et — si des pistes
 *  alternatives sont fournies — reprend automatiquement avec la suivante en l’absence de réponse. */
export function WaouhDelegateButton({ result, mode, articleId, discoveryKind, marketMedian, className = "h-12", onHandled, alternates, city, budgetMax, label = "Confier à l’avatar", variant = "primary" }: {
  result: { price_min?: number | null; price_max?: number | null; fabric_id: string; subject?: string | null; category?: string | null; title?: string | null; city?: string | null; evidence?: Record<string, unknown> | null; contact_pack?: unknown };
  mode: "buy" | "sell" | "ask";
  articleId?: string;
  discoveryKind?:MissionKind;missionContext?:MissionContext;
  /** Médiane marché connue : sert à préremplir le plafond. */
  marketMedian?: number | null;
  /** Jusqu’à 3 pistes suivantes (par ordre de pertinence) que Bot essaiera automatiquement si celle-ci ne répond pas. */
  alternates?: WaouhDelegateAlternate[];
  city?: string | null;
  budgetMax?: number | null;
  /** Libellé du bouton (ex. « Confier les 4 à Bot » dans le bandeau des résultats). */
  label?: string;
  /** « secondary » : bouton discret, pour les cartes de résultats où « Intéressé » est l'action principale. */
  variant?: "primary" | "secondary";
  className?: string;
  onHandled?: () => void;
}) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const track = botTrack(mode, discoveryKind);
  const strategy = botStrategy(track);
  const shownPrice = Number((result as { price_min?: number | null; price_max?: number | null }).price_min ?? (result as { price_max?: number | null }).price_max ?? 0) || null;
  const [draft, setDraft] = useState(() => suggestMandate({ track, price: shownPrice, marketMedian, budgetMax }));

  const openAndDelegate = async () => {
    const { data } = await supabase.auth.getSession();
    const params = new URLSearchParams({ fabric_id: result.fabric_id, delegate: "1" });
    let article = articleId;
    if (mode === "sell" && data.session && !article) {
      const list = (await listNexusOwnedArticles()).articles ?? [];
      if (list.length !== 1) throw new Error("sale_article_required");
      article = list[0].id;
    }
    if (article && mode === "sell") params.set("sale_article_id", article);
    if (!data.session) { navigate(`/app/chat?${params}`); return; }
    if (mode === "sell" && !article) throw new Error("sale_article_required");
    // Candidats dans l'ordre : une piste qui vous appartient ou qui n'est plus disponible est sautée.
    const candidates = [{ fabric_id: result.fabric_id, city: result.city ?? null }, ...(alternates ?? []).filter(a => a.fabric_id && a.fabric_id !== result.fabric_id).slice(0, 3)];
    const skippable = ["own_offer", "article_unavailable", "offer_not_found", "contact_unavailable"];
    let opened: Awaited<ReturnType<typeof roomCall>> | null = null;
    let index = 0;
    let lastError: unknown = null;
    for (; index < candidates.length; index++) {
      try {
        opened = await roomCall("open", {
          fabric_id: candidates[index].fabric_id, city: city ?? candidates[index].city ?? undefined,
          ...(mode === "sell" ? { sale_article_id: article } : { budget_max: draft.limit ?? budgetMax ?? null }),
          confirmed: false,
        });
        break;
      } catch (err) {
        lastError = err;
        if (mode === "sell" || !skippable.includes((err as Error)?.message)) throw err;
      }
    }
    if (!opened) throw lastError ?? new Error("request_failed");
    const cascade = candidates.slice(index + 1);
    const rules = {
      ...DEFAULT_RULES,
      duration_hours: draft.durationHours,
      max_followups: draft.maxFollowups,
      strategy: track,
      budget_max: mode === "sell" ? null : draft.limit ?? budgetMax ?? null,
      ...(mode === "sell" ? { price_floor: draft.limit } : {}),
      ...(cascade.length ? { cascade_candidates: cascade, cascade_step: 1, cascade_max_steps: 1 + cascade.length } : {}),
    };
    await roomCall("delegate", { deal_room_id: opened.deal_room_id, mandate_revision: opened.mandate_revision ?? 0, confirmed: true, rules });
    setRoomId(opened.deal_room_id);
    setDone(true);
    onHandled?.();
    navigate(`/app/chat?room_id=${encodeURIComponent(opened.deal_room_id)}`);
  };

  const run = async () => {
    if (busy) return;
    setError("");
    if (!confirm) { setConfirm(true); return; }
    if (track==="opportunity") { setError("Utilisez la veille de cette opportunité."); return; }
    if (mode==="sell" && (draft.limit===null || !Number.isFinite(draft.limit) || draft.limit<=0)) { setError("Indiquez votre prix plancher privé."); return; }
    if (mode!=="sell" && (draft.limit===null || !Number.isFinite(draft.limit) || draft.limit<=0 || (budgetMax!=null && draft.limit>budgetMax))) { setError("Indiquez un plafond valide dans votre budget."); return; }
    setBusy(true);
    try {
      await openAndDelegate();
    } catch (err) {
      setError(roomErrorText(err));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    if (roomId) return <WaouhBotFollowUp roomId={roomId} title={result.title ?? result.subject ?? null} />;
    return (
      <button type="button" onClick={() => navigate("/app/missions?view=suivi")} className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-md ${className}`}>
        <CheckCircle2 className="h-4 w-4" />Bot s’en occupe · Suivre
      </button>
    );
  }
  const tone = variant === "secondary"
    ? (confirm ? "border border-emerald-600 bg-emerald-50 text-emerald-800" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50")
    : `text-white shadow-md ${confirm ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`;
  return (
    <div className="w-full">
      <button type="button" onClick={() => void run()} disabled={busy}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-black active:scale-[.98] ${className} ${tone}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
        {confirm ? "Confirmer le mandat" : label}
      </button>
      {confirm && (
        <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-left">
          <p className="text-sm font-black text-slate-900">{strategy.title}</p>
          <ul className="space-y-0.5 text-xs font-semibold text-slate-600">{strategy.actions.map((a) => <li key={a}>• {a}</li>)}</ul>
          <div className="grid grid-cols-2 gap-2">
            {strategy.limitLabel && (
              <label className="text-[11px] font-bold text-slate-500">{strategy.limitLabel} (FCFA)
                <input type="number" min={1} value={draft.limit ?? ""} onChange={(e) => setDraft({ ...draft, limit: e.target.value ? Number(e.target.value) : null })}
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900" />
              </label>
            )}
            <label className="text-[11px] font-bold text-slate-500">Durée
              <select value={draft.durationHours} onChange={(e) => setDraft({ ...draft, durationHours: Number(e.target.value) })}
                className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900">
                <option value={24}>24 h</option><option value={72}>3 jours</option><option value={168}>7 jours</option>
              </select>
            </label>
          </div>
          <p className="text-xs font-semibold text-slate-700">{mandateSummary(draft)}</p>
          <button type="button" onClick={() => setConfirm(false)} className="text-xs font-bold text-slate-500 underline">Annuler</button>
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export default WaouhDelegateButton;
