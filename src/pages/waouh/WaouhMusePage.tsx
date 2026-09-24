import { useRef } from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, MessageSquareText, RadioTower, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaouhAgentCenter } from "@/components/waouh/WaouhAgentCenter";
import { WaouhNexusDashboard } from "@/components/waouh/WaouhNexusDashboard";
import { WaouhNexusInnovationPanel } from "@/components/waouh/WaouhNexusInnovationPanel";
import { WaouhGlobalDiscoveryPanel } from "@/components/waouh/WaouhGlobalDiscoveryPanel";
import WaouhWebChat, { type WaouhWebChatHandle } from "@/components/waouh/WaouhWebChat";

export default function WaouhMusePage() {
  const chatRef = useRef<WaouhWebChatHandle>(null);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-cyan-600 text-white hover:bg-cyan-600">
                <BrainCircuit className="h-3.5 w-3.5" />
                WAOUH Muse
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Propulsé par NEXUS
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Votre agent IA pour acheter et vendre</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Muse poursuit votre objectif. NEXUS cherche vendeurs et acheteurs, compare et prépare les meilleures actions sous votre contrôle.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <WaouhAgentCenter />
            <Button asChild size="sm" variant="outline">
              <Link to="/waouh/messages">
                <RadioTower className="mr-2 h-4 w-4" />
                SMS / RCS
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/app/chat/waouh">
                <MessageSquareText className="mr-2 h-4 w-4" />
                Chat WAOUH
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl space-y-4 px-2 py-4 sm:px-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-card px-3 py-2.5">
            <div className="text-xs font-semibold">Chat</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Répond immédiatement.</div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 py-2.5 dark:border-cyan-900 dark:bg-cyan-950/20">
            <div className="text-xs font-semibold">Muse</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Planifie, suit et poursuit votre objectif.</div>
          </div>
          <div className="rounded-xl border bg-card px-3 py-2.5">
            <div className="text-xs font-semibold">NEXUS</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Cherche partout et relie offre ↔ demande.</div>
          </div>
        </div>

        <WaouhGlobalDiscoveryPanel />

        <WaouhNexusInnovationPanel />

        <WaouhNexusDashboard
          onAsk={(prompt) => {
            void chatRef.current?.prefillAndSend(prompt);
            setTimeout(() => document.getElementById("waouh-nexus-chat")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }}
        />

        <div id="waouh-nexus-chat" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            <div>
              <div className="text-sm font-semibold">Parler à WAOUH</div>
              <div className="text-[11px] text-muted-foreground">Demandez un conseil, une comparaison ou une négociation.</div>
            </div>
          </div>
          <div className="min-h-[68vh]">
            <WaouhWebChat ref={chatRef} embedded fullscreen />
          </div>
        </div>
      </section>
    </main>
  );
}