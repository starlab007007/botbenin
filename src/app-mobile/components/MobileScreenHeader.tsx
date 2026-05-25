import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  back?: string | true;
  action?: ReactNode;
}

export const MobileScreenHeader = ({ title, subtitle, back, action }: Props) => {
  const navigate = useNavigate();
  return (
    <header
      className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        {back !== undefined && (
          <button
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className="p-2 -ml-2 rounded-full active:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-white/75 truncate">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
};

export default MobileScreenHeader;
