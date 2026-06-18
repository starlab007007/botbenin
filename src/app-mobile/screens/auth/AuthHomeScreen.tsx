import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageCircle,
  ShoppingBag,
  Search,
  Handshake,
  Package,
  MapPin,
  Edit3,
  CreditCard,
  Truck,
  Brain,
  Lightbulb,
  CheckCircle2,
  Database,
  Tag,
  ShoppingCart,
  User as UserIcon,
  Store,
} from "lucide-react";

/* ----------------------------- Flow animation ----------------------------- */

type Step = { icon: any; label: string };

const buyerSteps: Step[] = [
  { icon: Search, label: "Je cherche un produit" },
  { icon: Tag, label: "WAOUH trouve les offres" },
  { icon: MapPin, label: "Produits proches de moi" },
  { icon: Edit3, label: "Je fais une offre" },
  { icon: MessageCircle, label: "Je négocie" },
  { icon: Handshake, label: "J'accepte" },
  { icon: CreditCard, label: "Je paie" },
  { icon: Truck, label: "Je suis livré" },
];

const sellerSteps: Step[] = [
  { icon: Package, label: "Je publie un produit" },
  { icon: Brain, label: "WAOUH analyse le prix" },
  { icon: MapPin, label: "WAOUH cherche acheteurs" },
  { icon: MessageCircle, label: "Je reçois une proposition" },
  { icon: Lightbulb, label: "WAOUH me conseille" },
  { icon: CheckCircle2, label: "Je confirme" },
  { icon: Package, label: "Je prépare" },
  { icon: ShoppingCart, label: "Je vends" },
];

const orchestrationNodes: Step[] = [
  { icon: Database, label: "Catalogue unifié" },
  { icon: Brain, label: "Matching intelligent" },
  { icon: Tag, label: "Négociation" },
  { icon: Handshake, label: "Accord" },
  { icon: Truck, label: "Livraison" },
];

const TOTAL = 8;
const CYCLE_MS = TOTAL * 1400; // ~11.2s

function Column({
  title,
  icon: TitleIcon,
  steps,
  accent,
  side,
}: {
  title: string;
  icon: any;
  steps: Step[];
  accent: "blue" | "green";
  side: "left" | "right";
}) {
  const ring = accent === "blue" ? "ring-blue-400/80" : "ring-emerald-400/80";
  const dot = accent === "blue" ? "bg-blue-500" : "bg-emerald-500";
  const header =
    accent === "blue"
      ? "bg-blue-500/90 text-white"
      : "bg-emerald-500/90 text-white";

  return (
    <div className="flex-1 min-w-0">
      <div
        className={`${header} rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 shadow-lg`}
      >
        <TitleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span className="text-[9px] sm:text-xs font-bold tracking-wide uppercase truncate">
          {title}
        </span>
      </div>
      <ul className="space-y-1.5 sm:space-y-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const delay = `${(i * CYCLE_MS) / TOTAL}ms`;
          return (
            <li
              key={i}
              className={`waouh-step relative flex items-center gap-1.5 sm:gap-2 rounded-md sm:rounded-lg bg-white/10 border border-white/15 backdrop-blur-sm px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-white text-[9px] sm:text-[11px] leading-tight ring-2 ring-transparent ${ring} min-w-0`}
              style={{
                animationDelay: delay,
                justifyContent: side === "right" ? "flex-end" : "flex-start",
                flexDirection: side === "right" ? "row-reverse" : "row",
              }}
            >
              <span
                className={`shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded ${dot} text-white text-[8px] sm:text-[10px] font-bold flex items-center justify-center`}
              >
                {i + 1}
              </span>
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-90 shrink-0" />
              <span className="truncate min-w-0">{s.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WaouhFlowAnimation() {
  return (
    <div className="w-full max-w-[640px] mx-auto text-white">
      <style>{`
        @keyframes waouhPulseStep {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); --tw-ring-color: transparent; }
          ${Array.from({ length: TOTAL })
            .map((_, i) => {
              const start = (i / TOTAL) * 100;
              const end = ((i + 0.6) / TOTAL) * 100;
              return `${start.toFixed(2)}% { transform: translateY(0) scale(1); }
              ${(start + 0.1).toFixed(2)}% { transform: translateY(0) scale(1.04); box-shadow: 0 8px 24px -8px rgba(255,255,255,0.4); }
              ${end.toFixed(2)}% { transform: translateY(0) scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0); }`;
            })
            .join("\n")}
        }
        .waouh-step {
          animation: waouhPulseStep ${CYCLE_MS}ms linear infinite;
          transform-origin: center;
        }
        @keyframes waouhFlowDash {
          to { stroke-dashoffset: -40; }
        }
        .waouh-flow-line {
          stroke-dasharray: 6 6;
          animation: waouhFlowDash 1.2s linear infinite;
        }
        @keyframes waouhCenterPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 14px rgba(16,185,129,0); }
        }
        .waouh-center { animation: waouhCenterPulse 2.4s ease-in-out infinite; }
        @keyframes waouhShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .waouh-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 100%);
          background-size: 200% 100%;
          animation: waouhShimmer 4s linear infinite;
        }
        @keyframes waouhFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .waouh-float { animation: waouhFloat 3.5s ease-in-out infinite; }
      `}</style>

      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold font-serif tracking-tight">
          Comment fonctionne <span className="text-emerald-300">WAOUH</span>
        </h2>
        <p className="text-white/70 text-sm mt-1 italic">
          Parcours Acheteur · Orchestration · Parcours Vendeur
        </p>
      </div>

      {/* Central WAOUH badge */}
      <div className="flex justify-center mb-4 relative">
        <div className="waouh-center w-14 h-14 rounded-full bg-emerald-500 border-2 border-white/40 flex items-center justify-center text-white font-black text-lg shadow-2xl">
          W
        </div>
        {/* animated connecting lines */}
        <svg
          className="absolute inset-x-0 -bottom-2 mx-auto pointer-events-none"
          width="100%"
          height="20"
          viewBox="0 0 600 20"
          preserveAspectRatio="none"
        >
          <line
            className="waouh-flow-line"
            x1="60"
            y1="10"
            x2="290"
            y2="10"
            stroke="#60a5fa"
            strokeWidth="2"
          />
          <line
            className="waouh-flow-line"
            x1="310"
            y1="10"
            x2="540"
            y2="10"
            stroke="#34d399"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="flex gap-3 items-start">
        <Column
          title="Acheteur"
          icon={UserIcon}
          steps={buyerSteps}
          accent="blue"
          side="left"
        />

        {/* Orchestration central */}
        <div className="w-[140px] shrink-0">
          <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-xl px-2 py-2 mb-3 text-center shadow-lg">
            <span className="text-[10px] font-bold tracking-wide uppercase">
              Orchestration
            </span>
          </div>
          <ul className="space-y-2">
            {orchestrationNodes.map((n, i) => {
              const Icon = n.icon;
              return (
                <li
                  key={i}
                  className="waouh-float relative rounded-lg bg-emerald-500/20 border border-emerald-300/30 backdrop-blur-sm px-2 py-2 flex flex-col items-center gap-1 text-center"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <Icon className="w-4 h-4 text-emerald-200" />
                  <span className="text-[10px] font-medium text-white/90 leading-tight">
                    {n.label}
                  </span>
                  {/* connectors L/R */}
                  <span className="absolute -left-3 top-1/2 w-3 h-px bg-blue-300/50" />
                  <span className="absolute -right-3 top-1/2 w-3 h-px bg-emerald-300/50" />
                </li>
              );
            })}
          </ul>
        </div>

        <Column
          title="Vendeur"
          icon={Store}
          steps={sellerSteps}
          accent="green"
          side="right"
        />
      </div>

      <div className="waouh-shimmer mt-5 rounded-xl p-3 border border-white/15 text-center text-[11px] text-white/85 leading-snug">
        WAOUH connecte automatiquement le bon{" "}
        <span className="text-blue-300 font-semibold">acheteur</span> au bon{" "}
        <span className="text-emerald-300 font-semibold">vendeur</span>,
        analyse le marché, facilite la négociation et accompagne la transaction
        jusqu'à la livraison.
      </div>
    </div>
  );
}

/* ---------------------------- Existing auth UI ---------------------------- */

export default function AuthHomeScreen() {
  const navigate = useNavigate();

  const pillars = [
    { icon: ShoppingBag, title: "Vendre", subtitle: "Publiez un article en 30s", bg: "bg-[#10b981]", delay: "0ms" },
    { icon: Search, title: "Acheter", subtitle: "Trouvez près de vous", bg: "bg-[#3b82f6]", delay: "120ms" },
    { icon: Handshake, title: "Négocier", subtitle: "Proposez votre prix", bg: "bg-[#f59e0b]", delay: "240ms" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[hsl(165_91%_18%)] to-[hsl(165_91%_25%)] flex flex-col lg:flex-row relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-10 -right-24 w-80 h-80 rounded-full bg-emerald-300/5 blur-3xl" />

      {/* NEW — animated WAOUH flow (desktop only) */}
      <aside className="hidden lg:flex lg:w-1/2 items-center justify-center px-8 py-10 relative z-10 border-r border-white/10">
        <WaouhFlowAnimation />
      </aside>

      {/* EXISTING — untouched auth panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-8 relative z-10">
        <div className="w-full max-w-[400px] flex flex-col items-center gap-7">
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/15 shadow-lg shadow-black/20">
              <MessageCircle className="w-9 h-9 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-3xl text-white font-bold tracking-tight font-serif">WaouhApp</h1>
          </div>

          <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h2 className="text-[26px] leading-tight text-white font-serif">
              Envoie un message.
              <br />
              <span className="italic text-emerald-300">Le monde achète.</span>
            </h2>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm animate-fade-in hover:bg-white/15 transition-colors"
                  style={{ animationDelay: p.delay }}
                >
                  <div className={`w-11 h-11 ${p.bg} rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-black/20`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold font-serif leading-tight">{p.title}</h3>
                    <p className="text-white/65 text-xs">{p.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full flex flex-col gap-3 mt-1">
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#1da851] text-white h-14 text-base font-semibold rounded-2xl shadow-lg shadow-black/20"
              onClick={() => navigate("/app/auth/whatsapp")}
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Continuer avec WhatsApp
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-14 text-base font-semibold bg-white text-[hsl(165_91%_18%)] hover:bg-white/90 rounded-2xl shadow-md"
              onClick={() => navigate("/app/auth/email")}
            >
              <Mail className="mr-2 h-5 w-5" /> Continuer avec Email
            </Button>
            <p className="text-xs text-white/60 mt-2 text-center">
              En continuant, vous acceptez nos conditions d'utilisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
