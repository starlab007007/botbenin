import { lazy, Suspense } from "react";
import PartnerMobileWrap from "./PartnerMobileWrap";
import { Loader2 } from "lucide-react";

const Inner = lazy(() => import("@/pages/partner/PartnerProductsPage"));

export default function PartnerProductsScreen() {
  return (
    <PartnerMobileWrap title="Produits" back="/app/partner/businesses">
      <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>}>
        <Inner />
      </Suspense>
    </PartnerMobileWrap>
  );
}
