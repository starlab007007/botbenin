import PartnerMobileWrap from "./PartnerMobileWrap";
import PartnerProductsNativeScreen from "./PartnerProductsNativeScreen";

export default function PartnerProductsScreen() {
  return (
    <PartnerMobileWrap title="Produits" back="/app/partner/businesses">
      <PartnerProductsNativeScreen />
    </PartnerMobileWrap>
  );
}
