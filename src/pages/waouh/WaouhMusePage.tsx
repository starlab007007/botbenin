import { Link } from "react-router-dom";
import { Bot, MessageSquareText, RadioTower, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WaouhWebChat from "@/components/waouh/WaouhWebChat";

export default function WaouhMusePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Module test
              </Badge>
              <Badge variant="outline">Backend Supabase partagé</Badge>
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Bot className="h-6 w-6" />
                WAOUH Muse
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Interface Web de test du moteur WAOUH agentique : chat intelligent,
                missions, veilles, approbations, offres et actions assistées.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/waouh/messages">
                <RadioTower className="mr-2 h-4 w-4" />
                Tester SMS / RCS
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/app/chat/waouh">
                <MessageSquareText className="mr-2 h-4 w-4" />
                Vue mobile WAOUH
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-2 py-3 sm:px-4">
        <div className="min-h-[calc(100vh-170px)] overflow-hidden rounded-xl border bg-card shadow-sm">
          <WaouhWebChat embedded fullscreen />
        </div>
      </section>
    </main>
  );
}
