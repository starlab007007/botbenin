import { useState } from "react";
import { openNewChat } from "@/lib/waouh/newChat";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BrainCircuit, FlaskConical, Globe2, LockKeyhole, Sparkles, Workflow } from "lucide-react";

import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaouhGlobalDiscoveryPanel } from "@/components/waouh/WaouhGlobalDiscoveryPanel";
import { WaouhNexusDashboard } from "@/components/waouh/WaouhNexusDashboard";
import { WaouhNexusInnovationPanel } from "@/components/waouh/WaouhNexusInnovationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";

export default function WaouhNexusPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const requestedTab = params.get("tab");
  const [tab, setTab] = useState(
    requestedTab === "lab" || requestedTab === "missions" ? requestedTab : "discover",
  );

  const changeTab = (next: string) => {
    if (!user && next !== "discover") {
      const target = next === "missions" ? "/app/missions" : "/app/nexus?tab=lab";
      navigate(buildWaouhAuthRedirect(target));
      return;
    }
    setTab(next);
    const updated = new URLSearchParams(params);
    if (next === "discover") updated.delete("tab");
    else updated.set("tab", next);
    setParams(updated, { replace: true });
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.08),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <header className="flex items-center gap-3 rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/80 p-3 shadow-[0_24px_60px_-40px_rgba(37,99,235,.55)] sm:p-4">
          <button type="button" aria-label="Retour" onClick={() => navigate("/")} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BotLiveAvatar size="clamp(56px, 14vw, 84px)" state="idle" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(18px,4.6vw,26px)] font-black leading-none tracking-tight text-slate-950">WAOUH NEXUS</h1>
            <p className="mt-1.5 inline-block max-w-full rounded-2xl rounded-tl-sm border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-900 shadow-sm">Je trouve, je compare, je contacte.</p>
          </div>
          <Button type="button" variant="outline" className="h-10 shrink-0 rounded-2xl border-blue-100 bg-white px-3" onClick={() => navigate("/app/avatar")}>
            <BrainCircuit className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Avatar</span>
          </Button>
        </header>

        <Tabs value={tab} onValueChange={changeTab} className="space-y-3">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-blue-100 bg-white p-1 shadow-sm">
            <TabsTrigger value="discover" className="rounded-xl font-bold">
              <Globe2 className="mr-2 h-4 w-4" /> Découvrir
            </TabsTrigger>
            <TabsTrigger value="lab" className="rounded-xl font-bold">
              {user ? <FlaskConical className="mr-2 h-4 w-4" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
              NEXUS Lab
            </TabsTrigger>
            <TabsTrigger value="missions" className="rounded-xl font-bold">
              {user ? <Workflow className="mr-2 h-4 w-4" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
              Missions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-0">
            <WaouhGlobalDiscoveryPanel />
          </TabsContent>

          <TabsContent value="lab" className="mt-0">
            <WaouhNexusInnovationPanel />
          </TabsContent>

          <TabsContent value="missions" className="mt-0">
            <WaouhNexusDashboard onAsk={(prompt) => openNewChat(navigate, prompt)} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
