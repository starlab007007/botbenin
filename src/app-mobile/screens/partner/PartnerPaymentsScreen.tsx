import { lazy, Suspense } from "react";
import PartnerMobileWrap from "./PartnerMobileWrap";
import { Loader2 } from "lucide-react";

const PaymentHistoryView = lazy(() =>
  import("@/components/payments/PaymentHistoryView").then((m) => ({
    default: m.PaymentHistoryView,
  }))
);

export default function PartnerPaymentsScreen() {
  return (
    <PartnerMobileWrap title="Historique paiements" subtitle="Toutes vos transactions" back="/app/partner/businesses">
      <div className="p-3">
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
          <PaymentHistoryView />
        </Suspense>
      </div>
    </PartnerMobileWrap>
  );
}
