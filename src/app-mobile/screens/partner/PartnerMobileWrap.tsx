import { ReactNode } from "react";
import MobileScreenHeader from "../../components/MobileScreenHeader";

interface Props {
  title: string;
  subtitle?: string;
  back?: string | true;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps an existing web page (or any content) inside the mobile shell:
 * native sticky green header + bottom padding to clear the BottomTabBar.
 * The wrapped page keeps its own logic & data fetching, ensuring 1:1 parity
 * with the web. Containers (`container py-8`) are neutralized for mobile width.
 */
export const PartnerMobileWrap = ({ title, subtitle, back = true, action, children }: Props) => (
  <div className="min-h-[100dvh] bg-background flex flex-col">
    <MobileScreenHeader title={title} subtitle={subtitle} back={back} action={action} />
    <div className="flex-1 partner-mobile-wrap">
      {children}
    </div>
  </div>
);

export default PartnerMobileWrap;
