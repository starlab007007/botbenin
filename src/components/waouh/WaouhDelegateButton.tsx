import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { createNexusMandate, listNexusOwnedArticles, startNexusOpportunity } from "@/lib/waouh/nexus";
import { resultContact } from "@/lib/waouh/resultCardData";
import { userFacingErrorText } from "@/lib/userFacingError";

/** « Confier à Bot » : un contact, deux appuis (action puis confirmation). Rien ne part sans confirmation. */
export function WaouhDelegateButton({ result, mode, articleId, className = "h-12", onHandled }: {
  result: { fabric_id: string; subject?: string | null; category?: string | null; title?: string | null; evidence?: Record<string, unknown> | null; contact_pack?: unknown };
  mode: "buy" | "sell" | "ask";
  articleId?: string;
  className?: string;
  onHandled?: () => void;
}) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (busy) return;
    setError("");
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    try {
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
        mode,
        goal: result.subject ?? result.title ?? result.category ?? "Opportunité",
        article_id: mode === "sell" ? article : undefined,
        autonomy_mode: "semi_autonomous",
        max_contacts: 1,
        max_followups: 1,
        duration_hours: 72,
        completion_goal: "agreement",
        allow_waouh: true,
        allow_public_business: true,
        allow_blind_message: true,
        allow_whatsapp: resultContact(result).channel === "whatsapp",
        origin_surface: "web_result_card",
      });
      await startNexusOpportunity(result.fabric_id, mode, response.mandate.id);
      setDone(true);
      onHandled?.();
    } catch (err) {
      setError(userFacingErrorText(err, "save"));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <button type="button" onClick={() => navigate("/app/missions?view=suivi")} className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white ${className}`}>
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
