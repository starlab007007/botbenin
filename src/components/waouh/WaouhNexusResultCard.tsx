import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, ImageOff, Loader2, MapPin, Phone, Handshake, Sparkles } from "lucide-react";
import { createNexusMandate, listNexusOwnedArticles, startNexusOpportunity, type NexusDiscoveryResult } from "@/lib/waouh/nexus";
import { moneyXof } from "@/lib/waouh/agenticClient";
import { channelLabel, resultContact, resultPhotos } from "@/lib/waouh/resultCardData";
import { userFacingErrorText } from "@/lib/userFacingError";
import { WaouhNexusContactSheet } from "./WaouhNexusContactSheet";

/**
 * Carte de résultat « prête à négocier » : photos, faits clés, contact masqué
 * (4 derniers chiffres), puis deux options — confier à Bot (un seul contact)
 * ou contacter soi-même. Aucun message ne part sans confirmation.
 */
export function WaouhNexusResultCard({ result, mode, articleId, onHandled }: { result: NexusDiscoveryResult; mode: "buy" | "sell"; articleId?: string; onHandled?: () => void }) {
  const navigate = useNavigate();
  const photos = resultPhotos(result);
  const [photo, setPhoto] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const { phone, channel } = resultContact(result);
  const e = (result.evidence ?? {}) as Record<string, unknown>;
  const verified = e.verified === true || result.contact_pack?.verified_channel === true;
  const score = Math.round(result.scores.total_score);
  const price = result.price_min != null && result.price_max != null && result.price_min !== result.price_max
    ? `${moneyXof(result.price_min)} – ${moneyXof(result.price_max)}`
    : result.price_min != null || result.price_max != null ? moneyXof(result.price_min ?? result.price_max) : null;
  const facts = [result.condition, result.brand, result.model].filter((v): v is string => !!v && String(v).trim().length > 0).slice(0, 3);
  const title = result.subject ?? result.category ?? "Opportunité";
  const shown = photos[photo] && !broken[photos[photo]] ? photos[photo] : null;

  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const delegate = async () => {
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
          setError(list.length ? "Choisissez l’article dans « Et maintenant ? »." : "Publiez d’abord votre article.");
          setConfirm(false);
          return;
        }
      }
      const response = await createNexusMandate({
        mode,
        goal: title,
        article_id: mode === "sell" ? article : undefined,
        autonomy_mode: "semi_autonomous",
        max_contacts: 1,
        max_followups: 1,
        duration_hours: 72,
        completion_goal: "agreement",
        allow_waouh: true,
        allow_public_business: true,
        allow_blind_message: true,
        allow_whatsapp: channel === "whatsapp",
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

  return (
    <article className="overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_18px_44px_-34px_rgba(37,99,235,.55)]">
      <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100">
        {shown ? (
          <img src={shown} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken((b) => ({ ...b, [shown]: true }))} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-blue-300"><ImageOff className="h-8 w-8" /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-blue-700 shadow-sm backdrop-blur">{score}% compatible</span>
        {verified && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white"><BadgeCheck className="h-3 w-3" />Vérifié</span>}
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {photos.map((u, i) => (
              <button key={u} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setPhoto(i)} className={`h-1.5 rounded-full transition-all ${i === photo ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h4 className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950">{title}</h4>
          <div className="mt-1 flex items-center justify-between gap-2">
            {price ? <span className="text-lg font-black text-blue-700">{price}</span> : <span className="text-xs font-bold text-slate-400">Prix à négocier</span>}
            {result.city && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"><MapPin className="h-3 w-3" />{result.city}</span>}
          </div>
        </div>

        {facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {facts.map((f) => <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">{f}</span>)}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <Phone className="h-4 w-4 text-indigo-500" />
          <span className="font-mono text-xs font-bold text-slate-700">{phone ?? "Contact via Bot"}</span>
          {channel && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">{channelLabel(channel)}</span>}
        </div>

        {result.scores.reasons.length > 0 && (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-violet-800"><Sparkles className="mt-0.5 h-3 w-3 shrink-0" />{result.scores.reasons.slice(0, 2).join(" · ")}</p>
        )}

        {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

        {done ? (
          <button type="button" onClick={() => navigate("/app/missions?view=suivi")} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white">
            <CheckCircle2 className="h-4 w-4" />Bot s’en occupe · Suivre
          </button>
        ) : (
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <button type="button" onClick={() => void delegate()} disabled={busy}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-black text-white shadow-md active:scale-[.98] ${confirm ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
              {confirm ? "Confirmer" : "Confier à Bot"}
            </button>
            <div className="[&_button]:h-12 [&_button]:w-full [&_button]:rounded-2xl">
              <WaouhNexusContactSheet fabricId={result.fabric_id} title={title} sourceUrl={result.source_url} contactabilityLevel={result.contact_policy.level} mode={mode} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default WaouhNexusResultCard;
