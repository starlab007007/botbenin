import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MTNMomoPaymentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amountCFA: number;
  planName: string;
}

export const MTNMomoPaymentModal: React.FC<MTNMomoPaymentModalProps> = ({ open, onOpenChange, amountCFA, planName }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | { status: string; message?: string; demo?: boolean }>(null);

  const initiatePayment = async () => {
    if (!phone) {
      toast({ title: 'Téléphone requis', description: 'Veuillez saisir votre numéro MTN Mobile Money', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('mtn-momo-initiate', {
        body: {
          amount: amountCFA,
          currency: 'XOF',
          phoneNumber: phone,
          customerName: fullName,
          planName,
        },
      });
      if (error) throw error;
      setResult(data as any);
      toast({
        title: data?.demo ? 'Paiement de démonstration' : 'Paiement initié',
        description: data?.demo ? "Mode démo actif. Aucune transaction réelle n'a été effectuée." : 'Veuillez confirmer sur votre téléphone.',
      });
    } catch (e: any) {
      console.error('MTN MoMo error:', e);
      toast({ title: 'Erreur paiement', description: e.message || 'Impossible de lancer le paiement', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payer avec MTN MoMo — {planName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input id="amount" disabled value={`${amountCFA.toLocaleString()} CFA`} />
            </div>
            <div>
              <Label htmlFor="phone">Numéro MTN Mobile Money</Label>
              <Input id="phone" placeholder="Ex: 2296xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="name">Nom complet (optionnel)</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </div>
          {result && (
            <div className="text-sm text-muted-foreground">
              Statut: <span className="font-medium text-foreground">{result.status}</span>
              {result.message ? ` — ${result.message}` : ''}
              {result.demo ? ' — Démo' : ''}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={initiatePayment} disabled={isLoading}>
            {isLoading ? 'Traitement…' : 'Payer maintenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
