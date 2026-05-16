import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactionId: string;
  amount: number;
};

export const WaouhPaymentDialog: React.FC<Props> = ({ open, onOpenChange, transactionId, amount }) => {
  const [msisdn, setMsisdn] = useState("0165653468");
  const [operator, setOperator] = useState<"mtn" | "moov">("mtn");
  const [step, setStep] = useState<"form" | "polling" | "success" | "failed">("form");
  const [errMsg, setErrMsg] = useState("");
  const cancelRef = React.useRef(false);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setErrMsg("");
      cancelRef.current = false;
    }
  }, [open]);

  const submit = async () => {
    const clean = msisdn.replace(/\D/g, "");
    if (!/^(\d{8}|01\d{8})$/.test(clean)) {
      toast.error("Numéro invalide. Format local: 0165653468");
      return;
    }
    cancelRef.current = false;
    setStep("polling");
    setErrMsg("");
    const sessionId = (typeof window !== "undefined" && localStorage.getItem("waouh_web_session_id")) || "";
    const headers = sessionId ? { "x-waouh-session": sessionId } : undefined;
    const { data, error } = await supabase.functions.invoke("waouh-payment", {
      body: { action: "init", transaction_id: transactionId, msisdn: clean, operator },
      headers,
    });
    let errBody: any = null;
    if (error && (error as any).context?.json) {
      try { errBody = await (error as any).context.json(); } catch { /* ignore */ }
    }
    if (error || (data && data.success === false)) {
      setErrMsg(errBody?.error || data?.error || error?.message || "Échec de l'initialisation. Vérifiez votre connexion.");
      setStep("failed");
      return;
    }
    const isDemo = !!data?.demo;
    toast.success(isDemo ? "Mode démo : confirmation automatique en cours…" : "Validez sur votre téléphone Mobile Money");

    let attempts = 0;
    const poll = async () => {
      if (cancelRef.current) return;
      attempts++;
      const { data: s } = await supabase.functions.invoke("waouh-payment", {
        body: { action: "status", transaction_id: transactionId },
        headers,
      });
      if (cancelRef.current) return;
      if (s?.status === "success") { setStep("success"); return; }
      if (s?.status === "failed") { setErrMsg("Paiement refusé."); setStep("failed"); return; }
      const delay = isDemo ? 1500 : 6000;
      const max = isDemo ? 12 : 18;
      if (attempts < max) setTimeout(poll, delay);
      else { setErrMsg("Délai dépassé."); setStep("failed"); }
    };
    setTimeout(poll, isDemo ? 500 : 5000);
  };

  const cancel = () => {
    cancelRef.current = true;
    setStep("form");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Paiement Mobile Money</DialogTitle>
          <DialogDescription>Montant: <strong>{new Intl.NumberFormat("fr-FR").format(amount)} FCFA</strong></DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <Label>Opérateur</Label>
              <RadioGroup value={operator} onValueChange={(v) => setOperator(v as any)} className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="mtn" /> MTN MoMo</label>
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="moov" /> Moov Money</label>
              </RadioGroup>
            </div>
            <div>
              <Label>Numéro Mobile Money</Label>
              <Input value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="0165653468" />
              <p className="text-xs text-muted-foreground mt-1">Mode démo: mettez 0165653468. Ne mettez pas 229 devant le numéro.</p>
            </div>
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500" onClick={submit}>Payer {new Intl.NumberFormat("fr-FR").format(amount)} FCFA</Button>
          </div>
        )}

        {step === "polling" && (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-cyan-500" />
            <p className="font-medium">En attente de validation…</p>
            <p className="text-sm text-muted-foreground">
              Vous allez recevoir une notification {operator.toUpperCase()} sur votre téléphone. Saisissez votre code PIN pour confirmer.
            </p>
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-md py-1 px-2 inline-block">
              ⚙️ Mode démo activé — confirmation automatique en quelques secondes, aucun débit réel.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-bold text-lg">Paiement confirmé !</p>
            <p className="text-sm text-muted-foreground">Les fonds sont sécurisés en escrow jusqu'à la confirmation de réception.</p>
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="text-center py-8 space-y-3">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="font-bold">Échec du paiement</p>
            <p className="text-sm text-muted-foreground">{errMsg}</p>
            <Button variant="outline" onClick={() => setStep("form")}>Réessayer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WaouhPaymentDialog;
