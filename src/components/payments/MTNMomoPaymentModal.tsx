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

    // Clean phone number (remove all non-numeric characters)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validate phone format (should be 229XXXXXXXX for Benin)
    if (!/^229\d{8}$/.test(cleanPhone)) {
      toast({ 
        title: 'Format invalide', 
        description: 'Le numéro doit être au format 229XXXXXXXX (ex: 22967123456)', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('qosic-payment', {
        body: {
          amount: amountCFA,
          phoneNumber: cleanPhone,
          fullName: fullName || undefined,
          planName,
          operator: 'MTN',
        },
      });
      if (error) throw error;
      
      if (data.success) {
        setResult({ 
          status: 'processing', 
          message: data.message,
          orderId: data.orderId 
        } as any);
        toast({
          title: 'Paiement initié',
          description: 'Veuillez confirmer le paiement sur votre téléphone MTN Mobile Money',
        });
      } else {
        throw new Error(data.message || 'Échec de l\'initiation du paiement');
      }
    } catch (e: any) {
      console.error('MTN MoMo error:', e);
      setResult({ status: 'failed', message: e.message } as any);
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
