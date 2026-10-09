import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Radar, UserCircle } from "lucide-react";
import WaouhNexusDashboard, { type NexusActivity } from "@/components/waouh/WaouhNexusDashboard";
import { WaouhAgentCenter } from "@/components/waouh/WaouhAgentCenter";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";

const VIEWS = [
  { id: "nexus", label: "NEXUS" },
  { id: "suivi", label: "Suivi" },
] as const;

const avatarName = () => {
  try {
    const name = (localStorage.getItem("waouh.avatar.name") || "").trim();
    return name && name.toLowerCase() !== "ayo" ? name : "Bot";
  } catch {
    return "Bot";
  }
};

export default function WaouhMissionsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "suivi" ? "suivi" : "nexus";
  const [activity, setActivity] = useState<NexusActivity>({ state: "idle", line: "Dites-moi ce que vous cherchez." });
  const onActivity = useCallback((next: NexusActivity) => setActivity((prev) => (prev.state === next.state && prev.line === next.line ? prev : next)), []);

  const setView = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next === "nexus") updated.delete("view");
    else updated.set("view", next);
    setParams(updated, { replace: true });
  };

  const line = view === "suivi" ? "Je suis vos missions et veilles." : activity.line;
  const state = view === "suivi" ? "idle" : activity.state;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,.10),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(139,92,246,.08),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_58%)]">
      <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 pb-[calc(var(--shell-bottom,64px)+24px)] sm:space-y-4 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-violet-50/80 px-4 py-4 shadow-[0_24px_70px_-48px_rgba(37,99,235,.45)] sm:px-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/15 blur-3xl" />
          <div className="relative flex items-center gap-3 sm:gap-5">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <BotLiveAvatar size="clamp(64px, 16vw, 112px)" state={state} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />En ligne</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[clamp(22px,5vw,34px)] font-black leading-none tracking-tight text-slate-950">Missions</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">{avatarName()} · Trouver · Vendre · Suivre</p>
              <p className="mt-2 inline-block max-w-full rounded-2xl rounded-tl-sm border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-900 shadow-sm" aria-live="polite">{line}</p>
            </div>
          </div>
          <div className="relative mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <button type="button" onClick={() => navigate("/app/avatar")} className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3 text-xs font-bold text-blue-800 shadow-sm active:scale-95"><UserCircle className="h-4 w-4" />Avatar</button>
            <button type="button" onClick={() => navigate("/app/radar-map")} className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3 text-xs font-bold text-blue-800 shadow-sm active:scale-95"><Radar className="h-4 w-4" />Radar</button>
            <Link to="/app/whatsapp" className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-black text-white shadow-sm active:scale-95"><MessageCircle className="h-4 w-4" />Studio WhatsApp IA<ArrowRight className="h-3.5 w-3.5" /></Link>
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
              className={`min-h-[44px] rounded-xl text-sm font-black transition ${view === item.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {view === "nexus" ? (
          <WaouhNexusDashboard
            onActivity={onActivity}
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
    </div>
  );
}
