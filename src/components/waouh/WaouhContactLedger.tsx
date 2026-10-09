import { useCallback, useEffect, useMemo, useState } from "react";
import { Hourglass, Loader2, MessageCircleReply, Phone, Radar, RefreshCw, Send, UserPlus } from "lucide-react";
import { listNexusMandates, listNexusOpportunityJourneys } from "@/lib/waouh/nexus";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_LABEL, buildLedger, type ContactBucket, type ContactLedger } from "@/lib/waouh/contactLedger";

const FILTERS: Array<{ id: "all" | ContactBucket; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "to_contact", label: "À contacter" },
  { id: "pending", label: "En attente" },
  { id: "replied", label: "Réponses" },
];

const CHIP: Record<ContactBucket, string> = {
  to_contact: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700",
  replied: "bg-emerald-50 text-emerald-700",
  agreed: "bg-blue-50 text-blue-700",
  done: "bg-violet-50 text-violet-700",
  cancelled: "bg-rose-50 text-rose-600",
};

const nextRun = (iso: string | null) => {
  if (!iso) return null;
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (!Number.isFinite(minutes)) return null;
  if (minutes <= 1) return "maintenant";
  if (minutes < 60) return `dans ${minutes} min`;
  return `dans ${Math.round(minutes / 60)} h`;
};

/** Tableau de bord des contacts de Bot : qui, combien, où en est-on. Numéros toujours masqués. */
type ExactStats = { total: number; to_contact: number; pending: number; replied: number; contacted: number; with_number: number; active_missions: number; actions_7d: number };

export function WaouhContactLedger() {
  const [ledger, setLedger] = useState<ContactLedger | null>(null);
  const [exact, setExact] = useState<ExactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<"all" | ContactBucket>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [journeys, mandates] = await Promise.all([
        listNexusOpportunityJourneys({ include_completed: true, limit: 50 }),
        listNexusMandates().catch(() => ({ mandates: [], intents: [] })),
      ]);
      setLedger(buildLedger(journeys.journeys ?? journeys.items ?? [], mandates.mandates ?? []));
      try {
        const { data, error } = await (supabase as any).rpc("waouh_contact_stats");
        setExact(!error && data && typeof data.total === "number" ? (data as ExactStats) : null);
      } catch {
        setExact(null);
      }
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  const rows = useMemo(
    () => (ledger?.rows ?? []).filter((row) => filter === "all" || (filter === "replied" ? ["replied", "agreed", "done"].includes(row.bucket) : row.bucket === filter)).slice(0, 12),
    [ledger, filter],
  );

  const tiles = ledger
    ? [
        { label: "Contactés", value: exact?.contacted ?? ledger.contacted, icon: Send, tone: "from-blue-600 to-indigo-600 text-white" },
        { label: "En attente", value: exact?.pending ?? ledger.pending, icon: Hourglass, tone: "bg-white text-amber-700" },
        { label: "Réponses", value: exact?.replied ?? ledger.replied, icon: MessageCircleReply, tone: "bg-white text-emerald-700" },
        { label: "À contacter", value: exact?.to_contact ?? ledger.toContact, icon: UserPlus, tone: "bg-white text-slate-700" },
      ]
    : [];

  return (
    <section aria-label="Contacts de Bot" className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-violet-50/60 p-4 shadow-[0_24px_60px_-44px_rgba(37,99,235,.5)]">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-base font-black text-slate-950">Mes contacts</h2>
        <button type="button" onClick={() => void load()} aria-label="Actualiser" className="grid h-9 w-9 place-items-center rounded-full border border-blue-100 bg-white text-slate-500 active:scale-95">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {failed && !ledger && <p className="mt-3 text-xs font-semibold text-slate-500">Impossible de charger pour le moment.</p>}

      {ledger && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl border border-blue-100 p-3 shadow-sm ${tone.includes("from-") ? `bg-gradient-to-br ${tone}` : tone}`}>
                <Icon className="h-4 w-4 opacity-80" />
                <div className="mt-2 text-2xl font-black leading-none">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-500">{exact?.with_number ?? ledger.withNumber} sur {exact?.total ?? ledger.total} avec un numéro masqué disponible.</p>

          {ledger.missions.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><Radar className="h-3 w-3" />Recherches en cours</div>
              {ledger.missions.slice(0, 4).map((mission) => {
                const pct = mission.max ? Math.min(100, Math.round((mission.contacted / mission.max) * 100)) : 0;
                const run = nextRun(mission.nextRunAt);
                return (
                  <div key={mission.id} className="rounded-2xl border border-violet-100 bg-white/90 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-bold text-slate-900">{mission.goal}</span>
                      <span className="shrink-0 text-[11px] font-black text-violet-700">{mission.contacted}/{mission.max}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${pct}%` }} /></div>
                    <div className="mt-1 text-[10.5px] font-semibold text-slate-500">{mission.replied} réponse{mission.replied > 1 ? "s" : ""}{run ? ` · prochaine recherche ${run}` : ""}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Filtre contacts">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${filter === item.id ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-600"}`}>{item.label}</button>
            ))}
          </div>

          <ul className="mt-2 space-y-1.5">
            {rows.length === 0 && <li className="rounded-2xl border border-dashed border-blue-100 bg-white/60 px-3 py-4 text-center text-xs font-semibold text-slate-500">Rien ici pour le moment.</li>}
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-slate-900">{row.title}</div>
                  <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500">
                    <Phone className="h-3 w-3 text-indigo-500" />{row.phone ?? "numéro non disponible"}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${CHIP[row.bucket]}`}>{BUCKET_LABEL[row.bucket]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default WaouhContactLedger;
