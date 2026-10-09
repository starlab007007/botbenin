import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  GraduationCap,
  MapPin,
  MessageSquareText,
  Package,
  Plus,
  QrCode,
  Radar,
  Sparkles,
} from "lucide-react";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { CreateAgentWizard } from "@/components/whatsapp/agents/CreateAgentWizard";
import MyAiAgentsSection from "@/app-mobile/screens/agents/MyAiAgentsSection";
import { SECTOR_TEMPLATES } from "@/config/agent-templates";
import { useAiAgents } from "@/hooks/useAiAgents";

/** Types d'agents qu'on peut créer (chaque carte ouvre son assistant de création). */
const AGENT_TYPES = [
  { id: "wa", label: "Conversationnel", hint: "Répond, vend, prend RDV", icon: MessageSquareText, grad: "from-emerald-500 to-teal-600", wizard: true },
  { id: "bi", label: "BI & analyse", hint: "Sheets, Excel, KPI", icon: BarChart3, grad: "from-blue-500 to-indigo-600", route: "/app/agents/bi/new" },
  { id: "stock", label: "Stock", hint: "Alertes et réappro", icon: Package, grad: "from-amber-500 to-orange-600", route: "/app/agents/stock/new" },
  { id: "presence", label: "Présence QR", hint: "Pointage géolocalisé", icon: MapPin, grad: "from-fuchsia-500 to-pink-600", route: "/app/agents/attendance/new" },
] as const;

/** Outils IA déjà disponibles. */
const TOOLS = [
  { title: "AprèsBac IA", route: "/app/apresbac", icon: GraduationCap, tone: "text-blue-600 bg-blue-50" },
  { title: "FA IA", route: "/app/fa-ia", icon: Sparkles, tone: "text-violet-600 bg-violet-50" },
  { title: "BI WAOUH", route: "/app/whatsapp/bi", icon: BarChart3, tone: "text-sky-700 bg-sky-50" },
  { title: "Stock WAOUH", route: "/app/stock", icon: Package, tone: "text-amber-700 bg-amber-50" },
  { title: "Présence QR", route: "/app/presence", icon: QrCode, tone: "text-emerald-700 bg-emerald-50" },
  { title: "Radar", route: "/app/radar-map", icon: Radar, tone: "text-cyan-700 bg-cyan-50" },
] as const;

const STATUS: Record<string, { label: string; dot: string }> = {
  active: { label: "Actif", dot: "bg-emerald-500" },
  paused: { label: "En pause", dot: "bg-amber-500" },
  testing: { label: "Test", dot: "bg-blue-500" },
  training: { label: "Formation", dot: "bg-violet-500" },
  draft: { label: "Brouillon", dot: "bg-slate-400" },
};

export default function WaouhAiHubPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const bots = pathname === "/app/bots";
  const { agents } = useAiAgents();
  const [wizard, setWizard] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const openWizard = (id: string | null = null) => {
    setTemplateId(id);
    setWizard(true);
  };

  return (
    <main className="h-full min-h-[100dvh] overflow-y-auto bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,.10),transparent_28%),radial-gradient(circle_at_10%_20%,rgba(139,92,246,.08),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-3 py-4 pb-28 sm:px-6">
        <header className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/80 p-4 shadow-[0_24px_60px_-40px_rgba(37,99,235,.55)] sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <BotLiveAvatar size="clamp(60px, 16vw, 96px)" state="talking" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[clamp(20px,5vw,30px)] font-black leading-none tracking-tight text-slate-950">{bots ? "Mes agents" : "Agents IA"}</h1>
              <p className="mt-2 inline-block max-w-full rounded-2xl rounded-tl-sm border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-900 shadow-sm">
                {agents.length ? `${agents.length} agent${agents.length > 1 ? "s" : ""} à votre service.` : "Créons votre premier agent."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openWizard()}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-600/25 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" /> Créer un agent
          </button>
        </header>

        {agents.length > 0 && (
          <section aria-label="Mes agents WhatsApp">
            <h2 className="mb-2 text-base font-black text-slate-950">Mes agents</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {agents.map((agent) => {
                const st = STATUS[agent.status] ?? STATUS.draft;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => navigate(`/app/whatsapp/agent/${agent.id}/insights`)}
                    className="flex min-w-[150px] max-w-[190px] shrink-0 flex-col rounded-2xl border border-blue-100 bg-white p-3 text-left shadow-sm active:scale-[0.98]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Bot className="h-4 w-4" /></span>
                    <span className="mt-2 truncate text-sm font-black text-slate-950">{agent.name}</span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <MyAiAgentsSection />

        <section aria-label="Types d’agents">
          <h2 className="mb-2 text-base font-black text-slate-950">Choisir un type</h2>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {AGENT_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => ("wizard" in t ? openWizard() : navigate(t.route))}
                  className={`rounded-[22px] bg-gradient-to-br ${t.grad} p-4 text-left text-white shadow-md transition active:scale-[0.98] hover:-translate-y-0.5`}
                >
                  <Icon className="h-6 w-6" />
                  <div className="mt-3 text-sm font-black">{t.label}</div>
                  <div className="mt-0.5 text-[11px] font-semibold opacity-90">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Modèles d’agents">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-base font-black text-slate-950">Modèles prêts à l’emploi</h2>
            <span className="text-[11px] font-bold text-slate-400">{SECTOR_TEMPLATES.length} modèles</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {SECTOR_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openWizard(t.id)}
                className="group flex flex-col rounded-[20px] border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="mt-2 text-[13px] font-black leading-tight text-slate-950">{t.label}</span>
                <span className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">{t.persona.name}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-blue-600">Utiliser <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Outils IA">
          <h2 className="mb-2 text-base font-black text-slate-950">Outils IA</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {TOOLS.map(({ title, route, icon: Icon, tone }) => (
              <button
                key={route}
                type="button"
                onClick={() => navigate(route)}
                className="flex flex-col items-center gap-2 rounded-[20px] border border-slate-200 bg-white p-3 text-center shadow-sm active:scale-[0.97]"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
                <span className="text-[11px] font-black leading-tight text-slate-800">{title}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <CreateAgentWizard open={wizard} onClose={() => setWizard(false)} initialTemplateId={templateId} onCreated={(id) => { setWizard(false); navigate(`/app/whatsapp/agent/${id}/insights`); }} />
    </main>
  );
}
