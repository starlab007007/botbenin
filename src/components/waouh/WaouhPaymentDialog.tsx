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
  const [msisdn, setMsisdn] = useState("229");
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
    if (!/^229\d{8}$/.test(clean)) {
      toast.error("Numéro invalide. Format: 229XXXXXXXX");
      return;
    }
    cancelRef.current = false;
    setStep("polling");
    setErrMsg("");
    const { data, error } = await supabase.functions.invoke("waouh-payment", {
      body: { action: "init", transaction_id: transactionId, msisdn: clean, operator },
    });
    if (error || !data?.success) {
      setErrMsg(data?.error || error?.message || "Échec de l'initialisation. Vérifiez votre connexion.");
      setStep("failed");
      return;
    }
    toast.success("Validez sur votre téléphone Mobile Money");

    let attempts = 0;
    const poll = async () => {
      if (cancelRef.current) return;
      attempts++;
      const { data: s } = await supabase.functions.invoke("waouh-payment", {
        body: { action: "status", transaction_id: transactionId },
      });
      if (cancelRef.current) return;
      if (s?.status === "success") { setStep("success"); return; }
      if (s?.status === "failed") { setErrMsg("Paiement refusé par l'opérateur."); setStep("failed"); return; }
      if (attempts < 18) setTimeout(poll, 6000);
      else { setErrMsg("Délai dépassé. Vérifiez votre solde puis réessayez."); setStep("failed"); }
    };
    setTimeout(poll, 5000);
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
              <Input value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="22996123456" />
              <p className="text-xs text-muted-foreground mt-1">Format: 229 + 8 chiffres</p>
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
