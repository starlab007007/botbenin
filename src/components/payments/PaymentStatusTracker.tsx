import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Clock, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentStatusTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  operator: string;
  amount: number;
}

export const PaymentStatusTracker = ({ 
  open, 
  onOpenChange, 
  orderId, 
  operator, 
  amount 
}: PaymentStatusTrackerProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'timeout'>('pending');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    if (!open || !orderId) return;

    const TIMEOUT_MS = 180000; // 3 minutes
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    let statusCheckInterval: NodeJS.Timeout | null = null;

    // Timer
    intervalId = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Timeout
    timeoutId = setTimeout(() => {
      setStatus('timeout');
      toast({
        title: "Délai dépassé",
        description: "Le paiement prend plus de temps que prévu. Vérifiez votre historique.",
        variant: "destructive",
      });
    }, TIMEOUT_MS);

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`payment:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
          setStatus(newStatus);
          setTransactionData(payload.new);

          if (newStatus === 'completed') {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            if (statusCheckInterval) clearInterval(statusCheckInterval);
            toast({
              title: "✅ Paiement réussi!",
              description: `Votre paiement de ${amount} FCFA a été confirmé.`,
            });
          } else if (newStatus === 'failed') {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            if (statusCheckInterval) clearInterval(statusCheckInterval);
            toast({
              title: "❌ Paiement échoué",
              description: "Le paiement n'a pas pu être complété.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (data) {
        const fetchedStatus = data.status as 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
        setStatus(fetchedStatus);
        setTransactionData(data);

        // Start polling if processing
        if (fetchedStatus === 'processing') {
          statusCheckInterval = setInterval(async () => {
            try {
              console.log('🔄 Auto-checking payment status...', orderId);
              await supabase.functions.invoke('qosic-check-status', {
                body: { transref: orderId }
              });
            } catch (error) {
              console.error('Status check failed:', error);
            }
          }, 10000); // Every 10 seconds
        }
      }
    };

    fetchStatus();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      if (statusCheckInterval) clearInterval(statusCheckInterval);
      supabase.removeChannel(channel);
    };
  }, [open, orderId, amount, toast]);

  const steps = [
    { key: 'pending', label: 'Initiation', icon: Clock },
    { key: 'processing', label: 'Envoi au téléphone', icon: Smartphone },
    { key: 'confirmation', label: 'En attente de confirmation', icon: Loader2 },
  ];

  const currentStepIndex = 
    status === 'pending' ? 0 : 
    status === 'processing' ? 1 : 
    status === 'completed' || status === 'failed' ? 2 : 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Empêcher la fermeture si le paiement est en cours
        if (!newOpen && (status === 'pending' || status === 'processing')) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Suivi du paiement {operator}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-4 text-center">
            <div className="text-3xl font-bold">{amount.toLocaleString()} FCFA</div>
            <div className="text-sm text-muted-foreground mt-1">ID: {orderId.substring(0, 20)}...</div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex || status === 'completed';
              const isFailed = status === 'failed' && index === currentStepIndex;

              return (
                <div key={step.key} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive ? 'bg-primary/10 border border-primary/20' :
                  isCompleted ? 'bg-green-50 dark:bg-green-950' :
                  'bg-muted/30'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted && status === 'completed' ? 'bg-green-500 text-white' :
                    isFailed ? 'bg-red-500 text-white' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted'
                  }`}>
                    {isCompleted && status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isFailed ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`} />
                    )}
                  </div>
                  <span className={`flex-1 ${isActive ? 'font-semibold' : ''}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Final Status */}
          {status === 'completed' && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <div className="font-semibold text-green-900 dark:text-green-100">Paiement réussi!</div>
              <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                Votre transaction a été complétée avec succès
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-600 mb-2" />
              <div className="font-semibold text-red-900 dark:text-red-100">Paiement échoué</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                {transactionData?.metadata?.qosic_message || "Une erreur s'est produite"}
              </div>
            </div>
          )}

          {status === 'timeout' && (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-4 text-center">
              <Clock className="w-12 h-12 mx-auto text-orange-600 mb-2" />
              <div className="font-semibold text-orange-900 dark:text-orange-100">Délai dépassé</div>
              <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Vérifiez votre historique de paiements
              </div>
            </div>
          )}

          {/* Timer */}
          {status !== 'completed' && status !== 'failed' && (
            <div className="text-center text-sm text-muted-foreground">
              Temps écoulé: {formatTime(elapsedTime)}
            </div>
          )}

          {/* Instructions */}
          {status === 'processing' && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
              <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
                <div className="font-semibold">📱 Action requise sur votre téléphone</div>
                <div>
                  1. Composez le code USSD reçu sur votre téléphone {operator}<br/>
                  2. Entrez votre code PIN pour confirmer<br/>
                  3. Le paiement sera vérifié automatiquement toutes les 10 secondes
                </div>
                <div className="text-xs opacity-75 mt-2">
                  ⏱️ Auto-vérification en cours... Ne fermez pas cette fenêtre.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alert for pending/processing status */}
        {(status === 'pending' || status === 'processing') && (
          <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <AlertDescription className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                <strong>Paiement en cours</strong> - Veuillez patienter jusqu'à la confirmation finale.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === 'pending' || status === 'processing'}
            className="flex-1"
          >
            {status === 'pending' || status === 'processing' ? 'Paiement en cours...' : 'Fermer'}
          </Button>
          {(status === 'completed' || status === 'failed') && (
            <Button
              onClick={() => window.location.href = '/payment-history'}
              className="flex-1"
            >
              Voir l'historique
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
