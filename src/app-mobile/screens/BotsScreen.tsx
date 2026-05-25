import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus } from "lucide-react";

type BotRow = { id: string; name: string; description: string | null; is_active: boolean; created_at: string };

export default function BotsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/app/auth"); return; }
    const load = async () => {
      const { data } = await supabase.from("bots").select("id,name,description,is_active,created_at").eq("owner_id", user.id).order("created_at", { ascending: false });
      setBots((data as any) ?? []); setLoading(false);
    };
    load();
    const ch = supabase.channel(`mobile-bots-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bots", filter: `owner_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Mes Bots</h1>
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#e85a25]" onClick={() => navigate("/app/bots/new")}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau
        </Button>
      </header>
      <main className="p-4 space-y-3">
        {loading && <p className="text-center text-muted-foreground py-8">Chargement…</p>}
        {!loading && bots.length === 0 && (
          <div className="text-center py-12">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium mb-2">Aucun bot pour l'instant</p>
            <Button onClick={() => navigate("/app/bots/new")} className="bg-[#FF6B35] hover:bg-[#e85a25]">Créer mon premier bot</Button>
          </div>
        )}
        {bots.map(b => (
          <div key={b.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-[hsl(165_91%_25%)]/10 flex items-center justify-center"><Bot className="h-5 w-5 text-[hsl(165_91%_25%)]" /></div>
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Actif" : "Inactif"}</Badge>
            </div>
            {b.description && <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>}
          </div>
        ))}
      </main>
    </div>
  );
}
