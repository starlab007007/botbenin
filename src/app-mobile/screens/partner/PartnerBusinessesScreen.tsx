import PartnerMobileWrap from "./PartnerMobileWrap";
import PartnerBusinessesNativeScreen from "./PartnerBusinessesNativeScreen";

export default function PartnerBusinessesScreen() {
  return (
    <PartnerMobileWrap title="Mes entreprises" subtitle="Enrôlement intelligent" back="/app">
      <PartnerBusinessesNativeScreen />
    </PartnerMobileWrap>
  );
}
