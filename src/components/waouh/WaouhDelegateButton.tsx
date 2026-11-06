import type {MissionKind,MissionContext} from '@/lib/waouh/guidedDiscovery';
import {supabase} from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { createNexusMandate, listNexusOwnedArticles, startNexusOpportunity } from "@/lib/waouh/nexus";
import { resultContact } from "@/lib/waouh/resultCardData";
import { userFacingErrorText } from "@/lib/userFacingError";
import { roomCall, roomErrorText } from "@/lib/waouh/dealRoom";

/** Candidature alternative pour la cascade automatique (offre suivante si pas de réponse). */
export type WaouhDelegateAlternate = { fabric_id: string; city?: string | null };

const DEFAULT_RULES = { mode: "autonomous", duration_hours: 72, max_followups: 1, active_start: "08:00", active_end: "21:00" } as const;

/** « Confier à Bot » : un contact, deux appuis (action puis confirmation). Rien ne part sans confirmation.
 *  Une fois confirmé : Bot ouvre le Deal Room, démarre la négociation, et — si des pistes
 *  alternatives sont fournies — reprend automatiquement avec la suivante en l’absence de réponse. */
export function WaouhDelegateButton({ result, mode, articleId, className = "h-12", onHandled, discoveryKind, missionContext, alternates, city, budgetMax }: {
  result: { fabric_id: string; subject?: string | null; category?: string | null; title?: string | null; city?: string | null; evidence?: Record<string, unknown> | null; contact_pack?: unknown };
  mode: "buy" | "sell" | "ask";
  articleId?: string;
  discoveryKind?:MissionKind;missionContext?:MissionContext;
  /** Jusqu’à 3 pistes suivantes (par ordre de pertinence) que Bot essaiera automatiquement si celle-ci ne répond pas. */
  alternates?: WaouhDelegateAlternate[];
  city?: string | null;
  budgetMax?: number | null;
  className?: string;
  onHandled?: () => void;
}) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const runBuyAsk = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { navigate(`/app/deal-room?${new URLSearchParams({ fabric_id: result.fabric_id, delegate: "1" })}`); return; }
    const opened = await roomCall("open", { fabric_id: result.fabric_id, city: city ?? result.city ?? undefined, budget_max: budgetMax ?? null, confirmed: false });
    const cascade_candidates = (alternates ?? []).slice(0, 3).filter(a => a.fabric_id && a.fabric_id !== result.fabric_id);
    const rules: Record<string, unknown> = { ...DEFAULT_RULES, budget_max: budgetMax ?? null };
    if (cascade_candidates.length) { rules.cascade_candidates = cascade_candidates; rules.cascade_step = 1; rules.cascade_max_steps = 1 + cascade_candidates.length; }
    await roomCall("delegate", { deal_room_id: opened.deal_room_id, mandate_revision: opened.mandate_revision ?? 0, confirmed: true, rules });
    setRoomId(opened.deal_room_id);
    setDone(true);
    onHandled?.();
  };

  const run = async () => {
    if (busy) return;
    setError("");
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    try {
      if (mode !== "sell") { await runBuyAsk(); return; }
      const {data}=await supabase.auth.getSession();
      const expectedOwner=data.session?.user.id;
      if(!expectedOwner)throw new Error("Connectez-vous pour confier cette piste.");
      let article = articleId;
      if (mode === "sell" && !article) {
        const list = (await listNexusOwnedArticles()).articles ?? [];
        if (list.length === 1) article = list[0].id;
        else {
          setError(list.length ? "Choisissez d’abord l’article à vendre." : "Publiez d’abord votre article.");
          setConfirm(false);
          return;
        }
      }
      const response = await createNexusMandate({
        mode,discovery_kind:discoveryKind,mission_context:missionContext,
        goal: result.subject ?? result.title ?? result.category ?? "Opportunité",
        article_id: mode === "sell" ? article : undefined,
        autonomy_mode: "semi_autonomous",
        max_contacts: 4,
        max_followups: 1,
        duration_hours: 72,
        completion_goal: "agreement",
        allow_waouh: true,
        allow_public_business: true,
        allow_blind_message: true,
        allow_whatsapp: resultContact(result).channel === "whatsapp",
        origin_surface: "web_result_card",
      },{expectedOwner});
      await startNexusOpportunity(result.fabric_id, mode, response.mandate.id,{expectedOwner});
      setDone(true);
      onHandled?.();
    } catch (err) {
      setError(mode === "sell" ? userFacingErrorText(err, "save") : roomErrorText(err));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <button type="button" onClick={() => navigate(roomId ? `/app/deal-room?room_id=${roomId}` : "/app/missions?view=suivi")} className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white ${className}`}>
        <CheckCircle2 className="h-4 w-4" />Bot s’en occupe · Suivre
      </button>
    );
  }
  return (
    <div className="w-full">
      <button type="button" onClick={() => void run()} disabled={busy}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-black text-white shadow-md active:scale-[.98] ${className} ${confirm ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
        {confirm ? "Confirmer" : "Confier à Bot"}
      </button>
      {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export default WaouhDelegateButton;
