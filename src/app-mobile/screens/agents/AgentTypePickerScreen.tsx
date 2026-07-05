import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Package, MapPin, MessageSquareText } from "lucide-react";

const TYPES = [
  { id: "conversational", label: "Agent conversationnel", desc: "Répond à vos clients sur WhatsApp, vend, prend RDV.", icon: MessageSquareText, color: "bg-emerald-100 text-emerald-700", route: "/app/bots/new" },
  { id: "bi", label: "Agent BI / Analyse", desc: "Connecté à Google Sheet ou Excel. Graphes, KPI, insights IA.", icon: BarChart3, color: "bg-blue-100 text-blue-700", route: "/app/agents/bi/new" },
  { id: "stock", label: "Gestion de stock IA", desc: "Suivi produits, alertes ruptures, recommandations réappro.", icon: Package, color: "bg-amber-100 text-amber-700", route: "/app/agents/stock/new" },
  { id: "attendance", label: "Présence QR géolocalisée", desc: "QR sur site, validation dans 50 m, notif WhatsApp employeur.", icon: MapPin, color: "bg-fuchsia-100 text-fuchsia-700", route: "/app/agents/attendance/new" },
];

export default function AgentTypePickerScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-3 py-3 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div>
          <div className="font-semibold">Créer un agent IA</div>
          <div className="text-xs text-white/70">Choisissez le type d'agent</div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto space-y-3 pb-24">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(t.route)}>
              <CardContent className="p-4 flex gap-3 items-start">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${t.color}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-sm text-muted-foreground">{t.desc}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
