import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, RefreshCw, Webhook, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CHANNEL_IN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/waouh-channel-in`;

export const WaouhWhatsAppPanel: React.FC = () => {
  const [status, setStatus] = useState<string>("unknown");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState("default");

  const callWaha = async (action: string, payload?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-waha-control", {
        body: { action, session, ...payload },
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      toast.error(e.message || "Erreur WAHA");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    const data = await callWaha("session-status");
    if (data?.status) setStatus(data.status);
  };

  const startSession = async () => {
    await callWaha("session-start");
    toast.success("Session démarrée. Récupération du QR…");
    setTimeout(loadQr, 1500);
    refreshStatus();
  };

  const stopSession = async () => {
    await callWaha("session-stop");
    setQr(null);
    refreshStatus();
  };

  const loadQr = async () => {
    const data = await callWaha("get-qr");
    if (data?.qr) setQr(data.qr);
    else if (data?.image) setQr(data.image);
  };

  const configureWebhook = async () => {
    const data = await callWaha("set-webhook", {
      webhook: { url: CHANNEL_IN_URL, events: ["message"] },
    });
    if (data) toast.success("Webhook configuré sur WAHA → WAOUH");
  };

  useEffect(() => { refreshStatus(); }, []);

  const statusColor = status === "WORKING" ? "bg-green-500" : status === "SCAN_QR_CODE" ? "bg-yellow-500" : "bg-gray-400";

  return (
    <Card className="p-4 bg-card border-[hsl(var(--waouh-border))]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">WhatsApp via WAHA</h3>
          <Badge className={statusColor + " text-white"}>{status}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={refreshStatus} disabled={loading}>
          <RefreshCw className={"w-4 h-4 mr-1 " + (loading ? "animate-spin" : "")} /> Rafraîchir
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <Label>Nom de la session</Label>
            <Input value={session} onChange={(e) => setSession(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={startSession} disabled={loading}>
              <Power className="w-4 h-4 mr-1" /> Démarrer
            </Button>
            <Button variant="outline" onClick={loadQr} disabled={loading}>
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
              Configure WAHA pour envoyer les événements <code>message</code> vers le moteur WAOUH.
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
              Aucun QR. Démarrez une session puis cliquez sur « Charger QR ».
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default WaouhWhatsAppPanel;
