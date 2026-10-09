
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Radar, Sparkles } from "lucide-react";
import WaouhNexusDashboard from "@/components/waouh/WaouhNexusDashboard";

import { WaouhAgentCenter } from "@/components/waouh/WaouhAgentCenter";

const VIEWS = [
  { id: "nexus", label: "NEXUS" },
  { id: "suivi", label: "Suivi" },
] as const;

export default function WaouhMissionsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "suivi" ? "suivi" : "nexus";

  const setView = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next === "nexus") updated.delete("view");
    else updated.set("view", next);
    setParams(updated, { replace: true });
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,.09),transparent_32%),linear-gradient(180deg,#f7fbfa_0%,#ffffff_45%)]">
      <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-[calc(var(--shell-bottom,64px)+20px)] sm:space-y-4 sm:p-4 lg:p-5">
        <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#062f2a] via-[#075f54] to-[#0f8d7d] p-4 text-white shadow-[0_24px_70px_-34px_rgba(5,95,86,.65)] sm:p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">WAOUH One</div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Missions</h1>
              <p className="text-xs font-semibold text-emerald-50/80">Trouver · Vendre · Suivre</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate("/app/avatar")} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/12 px-3 text-xs font-bold text-white active:scale-95"><Sparkles className="h-4 w-4" />Avatar</button>
              <button type="button" onClick={() => navigate("/app/radar-map")} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/12 px-3 text-xs font-bold text-white active:scale-95"><Radar className="h-4 w-4" />Radar</button>
              <Link to="/app/whatsapp" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-black text-white active:scale-95"><MessageCircle className="h-4 w-4" />Studio WhatsApp IA<ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </header>

        <div role="tablist" aria-label="Vue Missions" className="sticky top-0 z-10 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setView(item.id)}
              className={`min-h-[44px] rounded-xl text-sm font-black transition ${view === item.id ? "bg-emerald-700 text-white shadow" : "text-slate-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {view === "nexus" ? (
          <WaouhNexusDashboard
            onAsk={(prompt) => {
              navigate("/");
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("waouh:avatar-ask", { detail: { prompt } }));
              }, 80);
            }}
          />
        ) : (
          <WaouhAgentCenter embedded />
        )}
      </div>
    </main>
  );
}
