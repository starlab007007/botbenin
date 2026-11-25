import type {MissionKind,MissionContext} from '@/lib/waouh/guidedDiscovery';
import {supabase} from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { listNexusOwnedArticles } from "@/lib/waouh/nexus";
import { roomCall, roomErrorText } from "@/lib/waouh/dealRoom";
import { WaouhBotFollowUp } from "@/components/waouh/WaouhBotFollowUp";

/** Candidature alternative pour la cascade automatique (offre suivante si pas de réponse). */
export type WaouhDelegateAlternate = { fabric_id: string; city?: string | null };

const DEFAULT_RULES = { mode: "autonomous", duration_hours: 168, max_followups: 2, active_start: "08:00", active_end: "21:00" } as const;

/** « Confier à Bot » : un contact, deux appuis (action puis confirmation). Rien ne part sans confirmation.
 *  Une fois confirmé : Bot ouvre le Deal Room, démarre la négociation, et — si des pistes
 *  alternatives sont fournies — reprend automatiquement avec la suivante en l’absence de réponse. */
export function WaouhDelegateButton({ result, mode, articleId, className = "h-12", onHandled, alternates, city, budgetMax, label = "Confier à l’avatar", variant = "primary" }: {
  result: { fabric_id: string; subject?: string | null; category?: string | null; title?: string | null; city?: string | null; evidence?: Record<string, unknown> | null; contact_pack?: unknown };
  mode: "buy" | "sell" | "ask";
  articleId?: string;
  discoveryKind?:MissionKind;missionContext?:MissionContext;
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
          ...(mode === "sell" ? { sale_article_id: article } : { budget_max: budgetMax ?? null }),
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
      budget_max: mode === "sell" ? null : budgetMax ?? null,
      ...(cascade.length ? { cascade_candidates: cascade, cascade_step: 1, cascade_max_steps: 1 + cascade.length } : {}),
    };
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
        {confirm ? "Confirmer" : label}
      </button>
      {confirm && mode === "sell" && (
        <p className="mt-1.5 text-xs font-semibold text-slate-600">Bot présente le prix de votre annonce aux acheteurs joignables. Vous confirmez l’accord final.</p>
      )}
      {confirm && mode !== "sell" && (
        <p className="mt-1.5 text-xs font-semibold text-slate-600">
          L’avatar peut écrire seul au vendeur, relancer 2 fois et négocier sans jamais dépasser {budgetMax ? `${new Intl.NumberFormat("fr-FR").format(budgetMax)} FCFA` : "votre budget"}. Vous confirmez l’accord final.
        </p>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export default WaouhDelegateButton;
