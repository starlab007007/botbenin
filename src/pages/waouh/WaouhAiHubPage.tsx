import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  GraduationCap,
  MessageSquareText,
  Package,
  QrCode,
  Radar,
  Sparkles,
} from "lucide-react";

const MODULES = [
  { title: "AprèsBac IA", subtitle: "Orientation intelligente, séries, filières et établissements.", route: "/app/apresbac", icon: GraduationCap, tone: "text-blue-600 bg-blue-50", tags: ["Orientation", "Filières"] },
  { title: "FA IA", subtitle: "Consultation, lancer, interprétation et journal personnel.", route: "/app/fa-ia", icon: Sparkles, tone: "text-violet-600 bg-violet-50", tags: ["Consultation", "Journal"] },
  { title: "Conversationnel", subtitle: "Assistant intelligent et conversations WhatsApp enrichies.", route: "/app/whatsapp/conversationnel", icon: MessageSquareText, tone: "text-emerald-700 bg-emerald-50", tags: ["Assistant", "WhatsApp"] },
  { title: "BI WAOUH IA", subtitle: "Analyse décisionnelle, indicateurs et lecture intelligente.", route: "/app/whatsapp/bi", icon: BarChart3, tone: "text-sky-700 bg-sky-50", tags: ["Indicateurs", "Décision"] },
  { title: "Stock WAOUH IA", subtitle: "Import, analyse des stocks et recommandations opérationnelles.", route: "/app/stock", icon: Package, tone: "text-amber-700 bg-amber-50", tags: ["Stock", "Alertes"] },
  { title: "Présence QR", subtitle: "Sites, équipes, QR et suivi fiable des pointages.", route: "/app/presence", icon: QrCode, tone: "text-emerald-700 bg-emerald-50", tags: ["QR", "Équipes"] },
  { title: "Agents IA", subtitle: "Créer, sélectionner et piloter des agents spécialisés.", route: "/app/whatsapp/select-agent", icon: Bot, tone: "text-rose-700 bg-rose-50", tags: ["Agents", "Automatisation"] },
  { title: "Radar", subtitle: "Recherche géolocalisée intelligente et signaux de proximité.", route: "/app/radar-map", icon: Radar, tone: "text-cyan-700 bg-cyan-50", tags: ["Proximité", "Temps réel"] },
] as const;

export default function WaouhAiHubPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const bots = pathname === "/app/bots";

  return (
    <main className="h-full min-h-[100dvh] overflow-y-auto bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">{bots ? "Bots WAOUH" : "Bots & IA WAOUH"}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{bots ? "Vos assistants spécialisés." : "Vos outils IA spécialisés."}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map(({ title, subtitle, route, icon: Icon, tone, tags }) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              className="group flex min-h-44 flex-col rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black tracking-wide text-blue-600">SMART</span>
              </div>
              <div className="mt-auto pt-4">
                <div className="text-base font-black text-slate-950">{title}</div>
                <div className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{subtitle}</div>
                <div className="mt-3 flex items-center gap-1.5">
                  {tags.map((tag) => <span key={tag} className="rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">{tag}</span>)}
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
