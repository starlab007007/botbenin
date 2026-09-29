// WAOUH — Barre du guide (avatar) : état, « Faire le point », et réglages (accueil, cadence, heures calmes).
import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  boardChips, CADENCE_OPTIONS, fetchAvatarPrefs, fetchMissionBoard, hourLabel, nextPointLabel, saveAvatarPrefs,
  type AvatarCadence, type AvatarPrefs, type MissionBoard,
} from "@/lib/waouh/avatarGuide";
import { WaouhAvatarOrb } from "./WaouhAvatarBriefingCard";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function WaouhAvatarGuideBar({
  prefs: externalPrefs,
  busy,
  settingsOpenSignal = 0,
  refreshSignal = 0,
  onPoint,
  onPrefsChange,
}: {
  prefs: AvatarPrefs | null;
  busy: boolean;
  /** Incrémenté par le parent (bouton « Régler mes points » d'une carte) pour ouvrir les réglages. */
  settingsOpenSignal?: number;
  /** Incrémenté par le parent à chaque bulle de l'avatar reçue : le tableau de mission se rafraîchit aussitôt. */
  refreshSignal?: number;
  onPoint: () => void;
  onPrefsChange?: (prefs: AvatarPrefs) => void;
}) {
  const [prefs, setPrefs] = useState<AvatarPrefs | null>(externalPrefs);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const [board, setBoard] = useState<MissionBoard | null>(null);
  const refreshBoard = useCallback(async () => {
    const r = await fetchMissionBoard();
    if (r?.board) setBoard(r.board);
    if (r?.prefs) setPrefs((p) => p ?? r.prefs);
  }, []);
  // Tableau de mission vivant : à l'ouverture, à chaque message de l'avatar, puis toutes les 60 s tant que l'onglet est visible.
  useEffect(() => { void refreshBoard(); }, [refreshBoard, refreshSignal]);
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void refreshBoard(); }, 60_000);
    return () => window.clearInterval(t);
  }, [refreshBoard]);

  useEffect(() => { if (externalPrefs) setPrefs(externalPrefs); }, [externalPrefs]);
  useEffect(() => { if (settingsOpenSignal > 0) setOpen(true); }, [settingsOpenSignal]);
  useEffect(() => {
    if (prefs) return;
    let alive = true;
    void fetchAvatarPrefs().then((p) => { if (alive && p) setPrefs(p); });
    return () => { alive = false; };
  }, [prefs]);

  const update = async (patch: Partial<Pick<AvatarPrefs, "welcome" | "cadence" | "quiet_start" | "quiet_end" | "notify_events" | "notify_digest">>) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch }); // réponse immédiate ; annulée si le serveur refuse
    setSaving(true);
    setFailed(false);
    setSaved(false);
    const result = await saveAvatarPrefs(patch);
    setSaving(false);
    if (result) { setPrefs(result); setSaved(true); onPrefsChange?.(result); } else { setPrefs(previous); setFailed(true); }
  };

  const cadence: AvatarCadence = prefs?.cadence ?? "daily";
  return (
    <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-cyan-50/70" data-testid="avatar-guide-bar">
    <div className="flex items-center gap-2 px-3 py-1.5">
      <WaouhAvatarOrb size={22} active={!busy} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[12px] font-black text-emerald-950">Votre avatar</div>
        <div className="truncate text-[10px] text-slate-500">
          {busy ? "Je fais le point…" : prefs ? nextPointLabel(prefs.next_briefing_at, cadence) : "Prêt à vous guider"}
        </div>
      </div>
      <button
        type="button"
        onClick={onPoint}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        Faire le point
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Régler les points de l'avatar" className="rounded-full p-1.5 text-slate-500 transition hover:bg-emerald-100 hover:text-emerald-800">
            <Settings2 className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] space-y-3 rounded-2xl p-4" data-testid="avatar-settings">
          <div>
            <div className="text-sm font-black text-slate-900">Régler mon avatar</div>
            <p className="text-[11px] text-slate-500">Vous choisissez quand je fais le point. Je ne contacte jamais un vendeur sans votre tap.</p>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-slate-800">
              Accueil à chaque ouverture
              <span className="block text-[11px] font-normal text-slate-500">Un mot de bienvenue et le point du moment.</span>
            </span>
            <Switch checked={prefs?.welcome ?? true} disabled={!prefs} onCheckedChange={(v) => void update({ welcome: v })} aria-label="Accueil à chaque ouverture" />
          </label>

          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold text-slate-800">Points réguliers</legend>
            <div className="space-y-1" role="radiogroup" aria-label="Fréquence des points de l'avatar">
              {CADENCE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={cadence === o.value}
                  disabled={!prefs}
                  onClick={() => void update({ cadence: o.value })}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border px-2.5 py-1.5 text-left transition",
                    cadence === o.value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span aria-hidden className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full border", cadence === o.value ? "border-emerald-600 bg-emerald-600" : "border-slate-300")} />
                  <span>
                    <span className="block text-[12px] font-bold text-slate-800">{o.label}</span>
                    <span className="block text-[10px] text-slate-500">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="mb-1 text-[13px] font-semibold text-slate-800">Me joindre sur WhatsApp</div>
            <p className="mb-1 text-[10px] text-slate-500">Tout ce que j'écris arrive d'abord dans ce chat. WhatsApp double seulement ce que vous choisissez.</p>
            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-[12px] font-semibold text-slate-800">
                Évènements de mes offres
                <span className="block text-[10px] font-normal text-slate-500">Relance possible, vendeur joignable, offre clôturée.</span>
              </span>
              <Switch checked={prefs?.notify_events ?? true} disabled={!prefs} onCheckedChange={(v) => void update({ notify_events: v })} aria-label="Évènements de mes offres sur WhatsApp" />
            </label>
            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-[12px] font-semibold text-slate-800">
                Bilans réguliers
                <span className="block text-[10px] font-normal text-slate-500">Le point de l'avatar, sans ouvrir l'app.</span>
              </span>
              <Switch checked={prefs?.notify_digest ?? false} disabled={!prefs} onCheckedChange={(v) => void update({ notify_digest: v })} aria-label="Bilans réguliers sur WhatsApp" />
            </label>
          </div>

          {cadence !== "off" && (
            <div>
              <div className="mb-1 text-[13px] font-semibold text-slate-800">Heures calmes</div>
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <span>de</span>
                <select
                  aria-label="Début des heures calmes"
                  value={prefs?.quiet_start ?? 21}
                  onChange={(e) => void update({ quiet_start: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
                <span>à</span>
                <select
                  aria-label="Fin des heures calmes"
                  value={prefs?.quiet_end ?? 7}
                  onChange={(e) => void update({ quiet_end: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Pas de point régulier pendant ces heures (heure du Bénin).</p>
            </div>
          )}

          <div className="h-4 text-[11px]" aria-live="polite">
            {saving ? <span className="text-slate-500">Enregistrement…</span> : failed ? <span className="text-red-600">Réglage non enregistré, réessayez.</span> : saved ? <span className="text-emerald-700">Réglages enregistrés</span> : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
    <div className="flex gap-1.5 overflow-x-auto px-3 pb-1.5 [scrollbar-width:none]" data-testid="avatar-mission-board" aria-label="Mission de l'avatar">
      {board && boardChips(board).length > 0 ? boardChips(board).map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={onPoint}
          disabled={busy}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold transition active:scale-95",
            c.key === "needsYou" ? "border-amber-300 bg-amber-50 text-amber-900 animate-pulse" : "border-emerald-200 bg-white/80 text-emerald-900 hover:bg-emerald-50",
          )}
        >
          <span aria-hidden>{c.icon}</span>{c.count} {c.label}
        </button>
      )) : (
        <span className="shrink-0 py-0.5 text-[10.5px] text-slate-500">{board ? "Aucune mission active — dites « Je cherche… » ou « Je vends… » et je m'en occupe." : "Je regarde où j'en suis…"}</span>
      )}
    </div>
    </div>
  );
}
