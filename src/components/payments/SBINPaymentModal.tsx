import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentStatusTracker } from './PaymentStatusTracker';

interface SBINPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountCFA: number;
  planName?: string;
}

export const SBINPaymentModal = ({ 
  open, 
  onOpenChange, 
  amountCFA, 
  planName 
}: SBINPaymentModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    status: 'idle' | 'processing' | 'completed' | 'failed';
    message?: string;
    orderId?: string;
  }>({ status: 'idle' });
  const { toast } = useToast();
  const [showTracker, setShowTracker] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');

  const initiatePayment = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre numéro de téléphone",
        variant: "destructive",
      });
      return;
    }

    // Clean phone number (remove all non-numeric characters)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Validate phone format (should be 229XXXXXXXX for Benin)
    if (!/^229\d{8}$/.test(cleanPhone)) {
      toast({ 
        title: 'Format invalide', 
        description: 'Le numéro doit être au format 229XXXXXXXX (ex: 22901123456)', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qosic-payment', {
        body: {
          amount: amountCFA,
          phoneNumber: cleanPhone,
          fullName: fullName.trim() || undefined,
          planName: planName || 'Payment',
          operator: 'SBIN',
        },
      });

      if (error) throw error;

      if (data.success) {
        setPaymentStatus({
          status: 'processing',
          message: 'Paiement en cours de traitement. Veuillez confirmer sur votre téléphone.',
          orderId: data.orderId,
        });
        setCurrentOrderId(data.orderId);
        setShowTracker(true);
        
        toast({
          title: "Paiement initié",
          description: "Veuillez confirmer le paiement sur votre téléphone",
        });
      } else {
        throw new Error(data.message || 'Échec de l\'initiation du paiement');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentStatus({
        status: 'failed',
        message: err.message || 'Une erreur est survenue lors du paiement',
      });
      
      toast({
        title: "Erreur",
        description: err.message || 'Une erreur est survenue',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Payer avec SBIN</DialogTitle>
          <DialogDescription>
            Entrez vos informations pour procéder au paiement
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              placeholder="Ex: 97123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading || paymentStatus.status === 'processing'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullname">Nom complet (optionnel)</Label>
            <Input
              id="fullname"
              placeholder="Votre nom"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading || paymentStatus.status === 'processing'}
            />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Montant à payer:</span>
              <span className="text-lg font-bold">{amountCFA.toLocaleString()} FCFA</span>
            </div>
          </div>

          {paymentStatus.message && (
            <div className={`rounded-lg p-4 ${
              paymentStatus.status === 'processing' ? 'bg-blue-50 text-blue-900' :
              paymentStatus.status === 'failed' ? 'bg-red-50 text-red-900' :
              'bg-green-50 text-green-900'
            }`}>
              <p className="text-sm">{paymentStatus.message}</p>
              {paymentStatus.orderId && (
                <p className="text-xs mt-1">ID: {paymentStatus.orderId}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={initiatePayment}
            disabled={loading || !phoneNumber.trim() || paymentStatus.status === 'processing'}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              'Payer maintenant'
            )}
          </Button>
        </div>
      </DialogContent>

      {showTracker && currentOrderId && (
        <PaymentStatusTracker
          open={showTracker}
          onOpenChange={setShowTracker}
          orderId={currentOrderId}
          operator="SBIN"
          amount={amountCFA}
        />
      )}
    </Dialog>
  );
};