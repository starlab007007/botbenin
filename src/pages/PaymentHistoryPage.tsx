import { MainLayout } from "@/components/layouts/MainLayout";
import { PaymentHistoryView } from "@/components/payments/PaymentHistoryView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const PaymentHistoryPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>
            Consultez toutes vos transactions et leur statut en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentHistoryView />
        </CardContent>
      </Card>
    </div>
  );
};
