import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, RefreshCw, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppScreen() {
  const { user } = useMobileAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    const { data } = await supabase.from("waha_sessions_data").select("*").order("updated_at", { ascending: false }).limit(10);
    setSessions((data as any) ?? []);
  };

  useEffect(() => { loadSessions(); }, [user]);

  const startQr = async () => {
    setLoading(true); setQrUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("waha-connect", { body: { action: "start", sessionName: `user-${user?.id?.slice(0,8) ?? "default"}` } });
      if (error) throw error;
      const qr = (data as any)?.qr || (data as any)?.qrCode || (data as any)?.qr_url;
      if (qr) setQrUrl(qr);
      else toast.info("Session en cours, vérifiez le QR dans quelques secondes");
      await loadSessions();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">WhatsApp IA</h1>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={loadSessions}><RefreshCw className="h-4 w-4" /></Button>
      </header>

      <main className="p-4 space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="h-6 w-6 text-[#25D366]" />
            <div>
              <div className="font-semibold">Connecter WhatsApp</div>
              <div className="text-xs text-muted-foreground">Scannez un QR depuis votre téléphone</div>
            </div>
          </div>
          {qrUrl && (
            <div className="bg-white p-4 rounded-lg flex justify-center mb-3">
              <img src={qrUrl} alt="QR WhatsApp" className="w-56 h-56" />
            </div>
          )}
          <Button onClick={startQr} disabled={loading} className="w-full bg-[#25D366] hover:bg-[#1da851]">
            <QrCode className="mr-2 h-4 w-4" /> {loading ? "Génération…" : "Générer un QR Code"}
          </Button>
        </div>

        <div>
          <h2 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Sessions</h2>
          <div className="space-y-2">
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">Aucune session active.</p>}
            {sessions.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{s.session_name}</div>
                  <div className="text-xs text-muted-foreground">{s.phone_number ?? "—"}</div>
                </div>
                <Badge variant={s.status === "WORKING" ? "default" : "secondary"}>{s.status ?? "?"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
