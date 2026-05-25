import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}

export const MobileSectionTile = ({ to, icon, title, subtitle, badge }: Props) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3 bg-card rounded-2xl border active:scale-[0.99] transition-transform"
  >
    <div className="h-10 w-10 rounded-xl bg-[hsl(var(--wa-green)/0.1)] text-[hsl(var(--wa-green))] flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm truncate">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
    </div>
    {badge}
    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
  </Link>
);

export default MobileSectionTile;
