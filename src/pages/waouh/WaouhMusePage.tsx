import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  Handshake,
  MessageSquareText,
  Network,
  RadioTower,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaouhAgentCenter } from "@/components/waouh/WaouhAgentCenter";
import { WaouhNexusDashboard } from "@/components/waouh/WaouhNexusDashboard";
import { WaouhNexusInnovationPanel } from "@/components/waouh/WaouhNexusInnovationPanel";
import { WaouhGlobalDiscoveryPanel } from "@/components/waouh/WaouhGlobalDiscoveryPanel";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";

type WaouhMusePageProps = {
  embedded?: boolean;
};

export default function WaouhMusePage({ embedded = false }: WaouhMusePageProps) {
  const navigate = useNavigate();
  const chatRef = useRef<WaouhWebChatHandle>(null);
  const [section, setSection] = useState("discover");

  const askMuse = (prompt: string) => {
    setSection("chat");
    window.setTimeout(() => {
      void chatRef.current?.prefillAndSend(prompt);
    }, 120);
  };

  const buyWithMuse = () => navigate("/app/avatar/acheter");
  const sellWithMuse = () => navigate("/app/avatar/vendre");
  const askAvatar = () => navigate("/app/avatar/demander");

  return (
    <main
      className={cn(
        "waouh-muse-page bg-[radial-gradient(circle_at_75%_0%,rgba(16,185,129,0.08),transparent_34%),linear-gradient(180deg,#f8fbfa_0%,#ffffff_45%)]",
        embedded ? "h-full min-h-0 overflow-y-auto" : "min-h-screen"
      )}
    >
      {!embedded && (
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-800 to-cyan-700 text-white shadow-lg shadow-emerald-900/10">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">WAOUH Avatar</div>
                <div className="truncate text-[11px] font-semibold text-slate-500">Avatar + NEXUS + Signal Fabric + Contact Layer</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <WaouhAgentCenter compact />
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/app/chat/waouh"><MessageSquareText className="mr-2 h-4 w-4" />Chat</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      <section className={cn("mx-auto w-full space-y-3", embedded ? "max-w-none p-3 lg:p-4" : "max-w-7xl px-3 py-4 sm:px-4")}>
        {section !== "chat" ? (
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-[#062f2a] via-[#075f54] to-[#0f8d7d] p-5 text-white shadow-[0_24px_70px_-34px_rgba(5,95,86,.65)] sm:p-6">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

            <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)] xl:items-end">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
                    <BrainCircuit className="mr-1 h-3.5 w-3.5" /> WAOUH Avatar
                  </Badge>
                  <Badge className="border-cyan-200/20 bg-cyan-200/10 text-cyan-50 hover:bg-cyan-200/10">
                    <Sparkles className="mr-1 h-3.5 w-3.5" /> NEXUS actif
                  </Badge>
                  <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                    Signal Fabric
                  </Badge>
                </div>

                <h1 className="max-w-3xl text-2xl font-black leading-[1.08] tracking-[-0.035em] sm:text-3xl lg:text-[34px]">
                  Un objectif. Votre Avatar organise. NEXUS trouve le marché.
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-emerald-50/85">
                  Achetez, vendez ou demandez avec un Avatar qui recherche, compare, surveille et conduit le parcours jusqu’au Deal Room.
                </p>

                <div className="mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={buyWithMuse}
                    className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 text-left text-slate-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Search className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black">Acheter avec mon Avatar</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Trouver et comparer les vendeurs</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={sellWithMuse}
                    className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/12 text-emerald-50"><ShoppingBag className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black">Vendre avec mon Avatar</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-emerald-50/70">Trouver et qualifier les acheteurs</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-white/55 transition group-hover:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={askAvatar}
                    className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 sm:col-span-2"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/12 text-cyan-50"><MessageSquareText className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black">Demander à mon Avatar</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-white/65">Service, prestation, emploi ou besoin libre</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-white/55 transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-black/10 p-2.5 backdrop-blur-sm">
                {[
                  [MessageSquareText, "Objectif", "Parlez naturellement"],
                  [BrainCircuit, "Avatar", "Planifie et poursuit"],
                  [Target, "NEXUS", "Trouve offre ↔ demande"],
                  [Network, "Signal", "Classe et sécurise"],
                ].map(([Icon, title, subtitle]) => (
                  <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <Icon className="h-4 w-4 text-emerald-100" />
                    <div className="mt-2 text-[11px] font-black">{String(title)}</div>
                    <div className="mt-0.5 text-[9px] font-semibold text-white/55">{String(subtitle)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/90 px-3 py-2 shadow-sm">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black text-slate-950">Avatar · conversation active</div>
              <div className="truncate text-[9px] font-semibold text-slate-500">Immersive Chat V2 · NEXUS et Signal Fabric restent disponibles</div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 rounded-xl text-[10px]" onClick={() => setSection("discover")}>
              Retour au cockpit
            </Button>
          </div>
        )}

        <Tabs value={section} onValueChange={setSection} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <TabsList className="grid h-11 flex-1 grid-cols-4 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm">
              <TabsTrigger value="discover" className="rounded-xl text-[10px] font-black sm:text-xs">Découvrir</TabsTrigger>
              <TabsTrigger value="tools" className="rounded-xl text-[10px] font-black sm:text-xs">Outils</TabsTrigger>
              <TabsTrigger value="missions" className="rounded-xl text-[10px] font-black sm:text-xs">Missions</TabsTrigger>
              <TabsTrigger value="chat" className="rounded-xl text-[10px] font-black sm:text-xs">Chat</TabsTrigger>
            </TabsList>
            {!embedded && (
              <Button asChild size="sm" variant="outline" className="hidden h-11 rounded-2xl sm:flex">
                <Link to="/waouh/messages"><RadioTower className="mr-2 h-4 w-4" />SMS / RCS</Link>
              </Button>
            )}
          </div>

          <TabsContent value="discover" className="mt-0">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <WaouhGlobalDiscoveryPanel />
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <WaouhNexusInnovationPanel />
            </div>
          </TabsContent>

          <TabsContent value="missions" className="mt-0">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <WaouhNexusDashboard onAsk={askMuse} />
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <div id="waouh-nexus-chat" className={cn(
              "overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,.35)]",
              embedded ? "h-[calc(100dvh-196px)] min-h-[560px]" : "min-h-[72vh]"
            )}>
              <WaouhWebChat ref={chatRef} embedded fullscreen />
            </div>
          </TabsContent>
        </Tabs>

        {section !== "chat" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">
            <span className="inline-flex items-center gap-1.5"><Handshake className="h-3.5 w-3.5 text-emerald-700" /> Toute action de contact ou de négociation reste sous votre contrôle.</span>
            <Button size="sm" variant="ghost" className="h-7 rounded-xl text-[10px]" onClick={() => setSection("chat")}>
              Parler à l’Avatar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
