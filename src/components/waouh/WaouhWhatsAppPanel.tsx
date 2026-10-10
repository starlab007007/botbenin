import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, RefreshCw, Webhook, Power, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CHANNEL_IN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/waha-webhook`;

export const WaouhWhatsAppPanel: React.FC = () => {
  const [status, setStatus] = useState<string>("unknown");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session = "WaouhApp";
  const [identityMatches, setIdentityMatches] = useState<boolean | null>(null);
  const [providerOperational, setProviderOperational] = useState<boolean | null>(null);
  const [webhookReady, setWebhookReady] = useState(false);

  const callWaha = async (action: string, payload?: any, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-waha-control", {
        body: { action, session, ...payload },
      });
      if (error) {
        let details = "";
        try { details = (await (error as any).context?.json?.())?.error || ""; } catch { /* ignore */ }
        throw new Error(details || error.message || "Erreur WAHA");
      }
      return data;
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Erreur WAHA");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshStatus = async (silent = false) => {
    const data = await callWaha("central-status", undefined, silent);
    if (data?.status) {
      if (data.status === "WORKING") setQr(null); setStatus(data.status); setIdentityMatches(data.identity_matches); setWebhookReady(data.webhook_ready); setProviderOperational(data.provider_operational ?? null); }
  };

  const createSession = async () => {
    const data = await callWaha("session-create");
    if (data) {
      toast.success(`Session « ${session} » créée et webhook lié.`);
      setTimeout(loadQr, 1500);
      refreshStatus();
    }
  };

  const startSession = async () => {
    const started = await callWaha("session-start");
    if (!started) return;
    toast.success(`Session « ${session} » démarrée. Récupération du QR…`);
    setTimeout(loadQr, 1500);
    refreshStatus();
  };

  const stopSession = async () => {
    await callWaha("session-stop");
    setQr(null);
    refreshStatus();
  };

  const loadQr = async (silent = false) => {
    const data = await callWaha("get-qr", undefined, silent);
    if (data?.qr) setQr(data.qr);
    else if (data?.image) setQr(data.image);
    else if (data?.connected) setQr(null);
  };

  const configureWebhook = async () => {
    const data = await callWaha("central-connect");
    if (data?.webhook_ready) { toast.success("WhatsApp central relié au chat et à l’Avatar"); refreshStatus(); }
  };

  useEffect(() => { void refreshStatus(); }, []);

  // En attente de scan : le QR WhatsApp expire en quelques secondes. On le renouvelle
  // et on suit l'état jusqu'à la connexion, sans action de l'utilisateur.
  useEffect(() => {
    if (status !== "SCAN_QR_CODE") return;
    void loadQr(true);
    const qrTimer = window.setInterval(() => void loadQr(true), 15000);
    const statusTimer = window.setInterval(() => void refreshStatus(true), 4000);
    return () => { window.clearInterval(qrTimer); window.clearInterval(statusTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Démarrage en cours : on suit l'état pour afficher le QR dès qu'il est prêt.
  useEffect(() => {
    if (status !== "STARTING") return;
    const t = window.setInterval(() => void refreshStatus(true), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const statusColor = status === "WORKING" && providerOperational === true && identityMatches === true ? "bg-green-500" : status === "SCAN_QR_CODE" ? "bg-yellow-500" : "bg-gray-400";

  return (
    <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">WhatsApp via WAHA</h3>
          <Badge className={statusColor + " text-white"}>{status === "WORKING" && providerOperational === false ? "À réparer" : status}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={loading}>
          <RefreshCw className={"w-4 h-4 mr-1 " + (loading ? "animate-spin" : "")} /> Rafraîchir
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <Label>Nom de la session</Label>
            <Input value={session} readOnly />
            <p className="mt-1 text-xs text-muted-foreground">+229 65653468 · Chat et Avatar</p>
            {status === "SCAN_QR_CODE" && <p className="text-xs text-muted-foreground">Ouvrez WhatsApp sur +229 65653468 → Appareils connectés → Scanner ce code. Il se renouvelle seul.</p>}
            {status === "WORKING" && providerOperational === false && <p className="text-xs text-destructive">WhatsApp est connecté, mais son moteur ne répond pas. Réparez WAHA avant de relancer une mission.</p>}
            {status === "WORKING" && identityMatches === false && <p className="text-xs text-destructive">Le numéro connecté ne correspond pas au numéro central.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={createSession} disabled={loading}>
              <Plus className="w-4 h-4 mr-1" /> Créer
            </Button>
            <Button onClick={startSession} disabled={loading}>
              <Power className="w-4 h-4 mr-1" /> Démarrer
            </Button>
            <Button variant="outline" onClick={() => void loadQr()} disabled={loading}>
              <QrCode className="w-4 h-4 mr-1" /> Charger QR
            </Button>
            <Button variant="outline" onClick={stopSession} disabled={loading}>
              Arrêter
            </Button>
          </div>

          <div className="pt-3 border-t">
            <Label>Webhook WAOUH</Label>
            <div className="flex gap-2 mt-1">
              <Input value={CHANNEL_IN_URL} readOnly className="text-xs" />
              <Button onClick={configureWebhook} disabled={loading}>
                <Webhook className="w-4 h-4 mr-1" /> Lier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {webhookReady ? "Messages, réponses et accusés reliés à l’Avatar." : "Liez les messages et les accusés au chat et à l’Avatar."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg min-h-[280px]">
          {loading && !qr ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : qr ? (
            <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR WhatsApp" className="max-w-full max-h-72" />
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
              {status === "WORKING" ? "Session connectée à WhatsApp. Aucun QR nécessaire." : "Aucun QR. Démarrez une session puis cliquez sur « Charger QR »."}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default WaouhWhatsAppPanel;
