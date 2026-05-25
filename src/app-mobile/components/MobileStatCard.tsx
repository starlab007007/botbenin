import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: string;
}

export const MobileStatCard = ({ icon, label, value, accent }: Props) => (
  <div className="rounded-2xl border bg-card p-3 flex flex-col gap-1">
    <div className={`flex items-center gap-1.5 text-[11px] text-muted-foreground ${accent ?? ""}`}>
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="text-base font-bold leading-tight truncate">{value}</div>
  </div>
);

export default MobileStatCard;
