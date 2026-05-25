import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Users } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

export default function DiffusionScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/app/auth"); return; }
    (async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setCampaigns((data as any) ?? []); setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const importContacts = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Disponible uniquement sur Android natif");
      return;
    }
    try {
      // dynamic import — works only on native
      const { Contacts } = await import("@capacitor-community/contacts");
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== "granted") { toast.error("Permission refusée"); return; }
      const res = await Contacts.getContacts({ projection: { name: true, phones: true } });
      toast.success(`${res.contacts.length} contacts importés`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Diffusion</h1>
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#e85a25]"><Plus className="h-4 w-4 mr-1" /> Nouvelle</Button>
      </header>
      <main className="p-4 space-y-4">
        <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#25D366]" />
            <div>
              <div className="font-medium text-sm">Importer mes contacts</div>
              <div className="text-xs text-muted-foreground">Depuis le téléphone Android</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={importContacts}>Importer</Button>
        </div>

        {loading && <p className="text-center text-muted-foreground py-6">Chargement…</p>}
        {!loading && campaigns.length === 0 && (
          <div className="text-center py-10">
            <Megaphone className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Aucune campagne</p>
          </div>
        )}
        {campaigns.map(c => (
          <div key={c.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="font-semibold">{c.name ?? c.title ?? "Campagne"}</div>
              <Badge variant="secondary">{c.status ?? "—"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
