import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlayCircle } from "lucide-react";
import { PaymentStatusTracker } from "@/components/payments/PaymentStatusTracker";

export const PaymentTestPage = () => {
  const { toast } = useToast();
  const [operator, setOperator] = useState<'MTN' | 'MOOV' | 'SBIN'>('MTN');
  const [amount, setAmount] = useState('1000');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTracker, setShowTracker] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const runTest = async () => {
    setIsLoading(true);
    setLogs([]);
    setTestResult(null);
    
    try {
      addLog(`🚀 Démarrage du test de paiement ${operator}`);
      addLog(`💰 Montant: ${amount} FCFA`);
      addLog(`📱 Téléphone: ${phoneNumber}`);

      // Validate inputs
      if (!phoneNumber || !amount) {
        throw new Error('Tous les champs sont requis');
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!/^229\d{8}$/.test(cleanPhone)) {
        throw new Error('Format de téléphone invalide (doit être 229XXXXXXXX)');
      }

      addLog('✅ Validation des entrées réussie');
      addLog('📞 Appel de l\'edge function qosic-payment...');

      const { data, error } = await supabase.functions.invoke('qosic-payment', {
        body: {
          amount: parseInt(amount),
          phoneNumber: cleanPhone,
          fullName: 'Test User',
          planName: 'Test Plan',
          operator: operator,
        },
      });

      if (error) {
        addLog(`❌ Erreur edge function: ${error.message}`);
        throw error;
      }

      addLog('✅ Edge function appelée avec succès');
      addLog(`📊 Réponse: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        addLog(`✅ Paiement initié - Order ID: ${data.orderId}`);
        addLog('🔄 En attente de confirmation...');
        
        setTestResult(data);
        setCurrentOrderId(data.orderId);
        setShowTracker(true);

        // Check database
        addLog('🗄️ Vérification de la base de données...');
        const { data: dbData, error: dbError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('order_id', data.orderId)
          .single();

        if (dbError) {
          addLog(`⚠️ Erreur DB: ${dbError.message}`);
        } else {
          addLog(`✅ Transaction trouvée en DB: ${dbData.status}`);
          addLog(`📝 Détails: ${JSON.stringify(dbData, null, 2)}`);
        }

        toast({
          title: "Test lancé",
          description: "Le paiement a été initié avec succès",
        });
      } else {
        addLog(`❌ Échec de l'initiation: ${data.message}`);
        throw new Error(data.message || 'Échec du paiement');
      }

    } catch (err: any) {
      addLog(`❌ ERREUR: ${err.message}`);
      toast({
        title: "Erreur de test",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-6 h-6" />
            Test de Paiement Qosic (Admin)
          </CardTitle>
          <CardDescription>
            Interface de test complète pour valider le système de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operator">Opérateur</Label>
              <Select value={operator} onValueChange={(v: any) => setOperator(v)}>
                <SelectTrigger id="operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="MOOV">Moov Money</SelectItem>
                  <SelectItem value="SBIN">SBIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="229XXXXXXXX"
              />
            </div>
          </div>

          {/* Test Button */}
          <Button 
            onClick={runTest} 
            disabled={isLoading} 
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Lancer le test
              </>
            )}
          </Button>

          {/* Logs Display */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <Label>Logs en temps réel</Label>
              <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-green-900 dark:text-green-100">
                  ✅ Test Réussi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Payment Tracker Modal */}
      {showTracker && currentOrderId && (
        <PaymentStatusTracker
          open={showTracker}
          onOpenChange={setShowTracker}
          orderId={currentOrderId}
          operator={operator}
          amount={parseInt(amount)}
        />
      )}
    </div>
  );
};
