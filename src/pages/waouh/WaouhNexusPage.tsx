import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BrainCircuit, FlaskConical, Globe2, Sparkles, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaouhGlobalDiscoveryPanel } from "@/components/waouh/WaouhGlobalDiscoveryPanel";
import { WaouhNexusDashboard } from "@/components/waouh/WaouhNexusDashboard";
import { WaouhNexusInnovationPanel } from "@/components/waouh/WaouhNexusInnovationPanel";

export default function WaouhNexusPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("discover");

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.08),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/15">
            <Globe2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-950">WAOUH NEXUS</h1>
              <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                <Sparkles className="mr-1 h-3 w-3" /> Signal Fabric
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-500">Le moteur de découverte de votre Avatar · trouver · comparer · contacter</p>
          </div>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/app/avatar")}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            Avatar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="discover" className="rounded-xl font-bold">
              <Globe2 className="mr-2 h-4 w-4" /> Découvrir
            </TabsTrigger>
            <TabsTrigger value="lab" className="rounded-xl font-bold">
              <FlaskConical className="mr-2 h-4 w-4" /> NEXUS Lab
            </TabsTrigger>
            <TabsTrigger value="missions" className="rounded-xl font-bold">
              <Workflow className="mr-2 h-4 w-4" /> Missions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-0">
            <WaouhGlobalDiscoveryPanel />
          </TabsContent>

          <TabsContent value="lab" className="mt-0">
            <WaouhNexusInnovationPanel />
          </TabsContent>

          <TabsContent value="missions" className="mt-0">
            <WaouhNexusDashboard onAsk={(prompt) => {
              navigate("/");
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("waouh:avatar-ask", { detail: { prompt } }));
              }, 80);
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
