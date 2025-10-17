import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface PaymentMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMethod: (method: 'MTN' | 'MOOV' | 'SBIN') => void;
  amountCFA: number;
  planName?: string;
}

export function PaymentMethodSelector({
  open,
  onOpenChange,
  onSelectMethod,
  amountCFA,
  planName,
}: PaymentMethodSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un mode de paiement</DialogTitle>
          <DialogDescription>
            {planName && `Plan: ${planName} - `}
            Montant: {amountCFA.toLocaleString('fr-FR')} FCFA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            onClick={() => onSelectMethod('MTN')}
            className="w-full h-16 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            MTN Mobile Money
          </Button>

          <Button
            onClick={() => onSelectMethod('MOOV')}
            className="w-full h-16 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Moov Money
          </Button>

          <Button
            onClick={() => onSelectMethod('SBIN')}
            className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            SBIN
          </Button>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Sélectionnez votre méthode de paiement préférée pour continuer
        </div>
      </DialogContent>
    </Dialog>
  );
}
