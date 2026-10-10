import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { createNexusMandate, listNexusOwnedArticles, startNexusOpportunity, type NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { userFacingErrorText } from "@/lib/userFacingError";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";

type Mode = "buy" | "sell" | "ask";
type Autonomy = "assisted" | "semi_autonomous" | "autonomous";

const COPY: Record<Mode, { title: string; who: string; cta: string }> = {
  sell: { title: "Bot contacte les acheteurs", who: "acheteur", cta: "Lancer Bot" },
  buy: { title: "Bot négocie avec les vendeurs", who: "vendeur", cta: "Lancer Bot" },
  ask: { title: "Bot contacte les bons profils", who: "profil", cta: "Lancer Bot" },
};

const AUTONOMY: Array<{ id: Autonomy; label: string; hint: string }> = [
  { id: "assisted", label: "Assisté", hint: "Je valide chaque message" },
  { id: "semi_autonomous", label: "Semi-auto", hint: "Bot contacte, je valide l’accord" },
  { id: "autonomous", label: "Autonome", hint: "Bot négocie dans mes limites" },
];

const STEPS = ["Bot contacte", "Vous validez", "Négociation", "Accord"];

/**
 * « Et maintenant ? » : après les résultats, une seule action fait passer Bot
 * du repérage au contact puis à la négociation. Rien ne part sans confirmation
 * explicite, dans les limites choisies (nombre de contacts, canaux, autonomie).
 */
export function WaouhBotNextStep({
  mode, goal, city, budget, results, originSurface, articleId, priceFloor,
}: {
  mode: Mode;
  goal: string;
  city?: string;
  budget?: number | null;
  results: NexusDiscoveryResult[];
  originSurface: string;
  articleId?: string;
  priceFloor?: number | null;
}) {
  const navigate = useNavigate();
  const copy = COPY[mode];
  const available = results.length;
  const maxPick = Math.max(1, Math.min(10, available));
  const [autonomy, setAutonomy] = useState<Autonomy>("semi_autonomous");
  const [count, setCount] = useState(Math.min(3, maxPick));
  const [whatsapp, setWhatsapp] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ linked: number } | null>(null);
  const [articles, setArticles] = useState<Array<{ id: string; title: string; price: number }> | null>(null);
  const [articleSel, setArticleSel] = useState("");
  const needsArticle = mode === "sell" && !articleId;
  const article = articleId || articleSel;

  useEffect(() => {
    if (!needsArticle) return;
    let alive = true;
    listNexusOwnedArticles()
      .then((r) => {
        if (!alive) return;
        const list = r.articles ?? [];
        setArticles(list);
        if (list.length === 1) setArticleSel(list[0].id);
      })
      .catch(() => { if (alive) setArticles([]); });
    return () => { alive = false; };
  }, [needsArticle]);

  const options = useMemo(() => Array.from(new Set([1, 3, 5, 10, maxPick].filter((n) => n <= maxPick))).sort((a, b) => a - b), [maxPick]);
  const picked = Math.min(count, maxPick);

  if (!available) return null;

  const launch = async () => {
    if (busy) return;
    if (mode === "sell" && !article) { setError("Choisissez l’article à vendre."); return; }
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    setError("");
    try {
      const response = await createNexusMandate({
        mode,
        goal: goal.trim(),
        article_id: mode === "sell" ? article || undefined : undefined,
        price_floor: mode === "sell" ? priceFloor || undefined : undefined,
        autonomy_mode: autonomy,
        city: city?.trim() || undefined,
        budget_max: mode === "buy" ? budget || undefined : undefined,
        max_contacts: picked,
        max_followups: autonomy === "assisted" ? 0 : 1,
        duration_hours: 72,
        completion_goal: "agreement",
        scan_interval_minutes: 60,
        min_match_score: 70,
        min_actionability_score: 65,
        allow_waouh: true,
        allow_public_business: true,
        allow_blind_message: true,
        allow_whatsapp: whatsapp,
        origin_surface: originSurface,
      });
      const targets = results.slice(0, picked);
      const settled = await Promise.allSettled(targets.map((item) => startNexusOpportunity(item.fabric_id, mode, response.mandate.id)));
      setDone({ linked: settled.filter((s) => s.status === "fulfilled").length });
    } catch (e) {
      setError(userFacingErrorText(e, "save"));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section aria-label="Bot est lancé" className="overflow-hidden rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BotLiveAvatar size={56} state="talking" />
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 text-base font-black text-slate-950"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Bot s’en occupe</h3>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {done.linked} {copy.who}{done.linked > 1 ? "s" : ""} pris en charge. {autonomy === "assisted" ? "Vous validez chaque message." : "Je vous préviens à chaque réponse."}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/app/missions?view=suivi")} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-600/25 active:scale-[0.99]">
          Suivre mes contacts
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Et maintenant ?" className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-violet-50/70 p-4 shadow-[0_24px_60px_-40px_rgba(79,70,229,.55)]">
      <div className="flex items-center gap-3">
        <BotLiveAvatar size={56} state="idle" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Et maintenant ?</div>
          <h3 className="text-base font-black leading-tight text-slate-950">{copy.title}</h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{available} {copy.who}{available > 1 ? "s" : ""} trouvé{available > 1 ? "s" : ""}.</p>
        </div>
      </div>

      <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Déroulé">
        {STEPS.map((step, index) => (
          <li key={step} className="text-center">
            <span className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${index === 0 ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>{index + 1}</span>
            <span className="mt-1 block text-[10px] font-bold leading-tight text-slate-600">{step}</span>
          </li>
        ))}
      </ol>

      {needsArticle && articles && (
        <div className="mt-3">
          <div className="text-xs font-black text-slate-700">Article à vendre</div>
          {articles.length === 0 ? (
            <button type="button" onClick={() => navigate("/app/avatar/vendre")} className="mt-1.5 w-full rounded-2xl border border-dashed border-blue-300 bg-white px-3 py-3 text-xs font-black text-blue-700">Publier mon article d’abord</button>
          ) : (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-none">
              {articles.slice(0, 12).map((a) => (
                <button key={a.id} type="button" onClick={() => { setArticleSel(a.id); setConfirm(false); setError(""); }}
                  className={`max-w-[200px] shrink-0 truncate rounded-2xl border px-3 py-2 text-[11px] font-black ${articleSel === a.id ? "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-200" : "border-slate-200 bg-white text-slate-700"}`}>{a.title}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Autonomie de Bot">
        {AUTONOMY.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={autonomy === item.id} onClick={() => { setAutonomy(item.id); setConfirm(false); }}
            className={`rounded-2xl border p-2 text-left transition ${autonomy === item.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 bg-white"}`}>
            <div className="text-[11px] font-black text-slate-900">{item.label}</div>
            <div className="mt-0.5 text-[9.5px] font-semibold leading-tight text-slate-500">{item.hint}</div>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-700">Contacter jusqu’à</span>
        <div className="flex gap-1">
          {options.map((n) => (
            <button key={n} type="button" onClick={() => { setCount(n); setConfirm(false); }} className={`h-9 min-w-9 rounded-xl px-2 text-xs font-black ${picked === n ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-700"}`}>{n}</button>
          ))}
        </div>
      </div>

      <label className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
        WhatsApp vérifié
        <input type="checkbox" checked={whatsapp} onChange={(e) => { setWhatsapp(e.target.checked); setConfirm(false); }} className="h-5 w-5 accent-blue-600" />
      </label>

      {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <button type="button" onClick={() => void launch()} disabled={busy}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg active:scale-[0.99] ${confirm ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/25" : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/25"}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : confirm ? <ShieldCheck className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
        {confirm ? `Confirmer : ${picked} contact${picked > 1 ? "s" : ""} max` : copy.cta}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-[10.5px] font-semibold text-slate-500"><Sparkles className="h-3 w-3" />Aucun paiement. Vous validez l’accord final.</p>
    </section>
  );
}

export default WaouhBotNextStep;
