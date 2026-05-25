import { ReactNode, MouseEventHandler } from "react";
import { Link } from "react-router-dom";

interface Props {
  to?: string;
  onClick?: MouseEventHandler;
  children: ReactNode;
  label?: string;
}

export const MobileFab = ({ to, onClick, children, label }: Props) => {
  const className =
    "fixed right-4 z-30 flex items-center gap-2 px-4 h-12 rounded-full bg-[hsl(var(--wa-green))] text-white shadow-lg active:scale-95 transition-transform font-medium text-sm";
  const style = { bottom: "calc(64px + env(safe-area-inset-bottom) + 16px)" };

  if (to) {
    return (
      <Link to={to} className={className} style={style} aria-label={label}>
        {children}
        {label && <span>{label}</span>}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={className} style={style} aria-label={label}>
      {children}
      {label && <span>{label}</span>}
    </button>
  );
};

export default MobileFab;
