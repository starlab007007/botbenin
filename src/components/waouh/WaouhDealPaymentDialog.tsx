import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const WaouhDealPaymentDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string;
  amount?: number;
  onPaid?: () => void;
}> = ({ open, onOpenChange, dealId, amount, onPaid }) => {
  const [loading, setLoading] = useState<"cash" | "mobile_money" | null>(null);

  const confirm = async (method: "cash" | "mobile_money") => {
    setLoading(method);
    try {
      const { error } = await supabase.functions.invoke("waouh-deal-ops", {
        body: { action: "payment", deal_id: dealId, method },
      });
      if (error) throw error;
      toast.success("Paiement confirmé. Merci !");
      onPaid?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur de confirmation");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] w-[90vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💵 Confirmer le paiement</DialogTitle>
          <DialogDescription>
            Le livreur WAOUH vous a remis le colis{amount ? ` (${amount.toLocaleString("fr-FR")} FCFA)` : ""}. Indiquez le moyen utilisé pour régler la course.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={() => confirm("cash")}
            disabled={loading !== null}
          >
            {loading === "cash" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5 text-emerald-600" />}
            <div className="text-left">
              <div className="font-semibold">Espèces</div>
              <div className="text-xs text-muted-foreground">J'ai payé le livreur en cash</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={() => confirm("mobile_money")}
            disabled={loading !== null}
          >
            {loading === "mobile_money" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5 text-amber-600" />}
            <div className="text-left">
              <div className="font-semibold">Mobile Money</div>
              <div className="text-xs text-muted-foreground">MTN / Moov / Orange Money</div>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading !== null}>
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WaouhDealPaymentDialog;
