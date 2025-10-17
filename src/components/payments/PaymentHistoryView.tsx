import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  phone_number: string;
  full_name: string | null;
  plan_name: string | null;
  status: string;
  payment_method: string;
  operator: string;
  created_at: string;
}

export const PaymentHistoryView = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des paiements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'En attente', variant: 'secondary' as const },
      processing: { label: 'En traitement', variant: 'default' as const },
      completed: { label: 'Complété', variant: 'success' as const },
      failed: { label: 'Échoué', variant: 'destructive' as const },
      cancelled: { label: 'Annulé', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>Aucune transaction trouvée</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des paiements</CardTitle>
        <CardDescription>
          Liste de vos {transactions.length} dernières transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{transaction.plan_name || 'Paiement'}</span>
                  {getStatusBadge(transaction.status)}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ID: {transaction.order_id}</p>
                  <p>Opérateur: {transaction.operator}</p>
                  <p>Téléphone: {transaction.phone_number}</p>
                  {transaction.full_name && <p>Nom: {transaction.full_name}</p>}
                  <p>Date: {new Date(transaction.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </div>
                <div className="text-xs text-muted-foreground">
                  {transaction.payment_method.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};