import { motion } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Tab { value: string; label: string }
interface Props {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
}

export function SegmentedTabs({ tabs, value, onChange }: Props) {
  const handle = (v: string) => {
    if (v === value) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    onChange(v);
  };
  return (
    <div className="relative grid grid-cols-3 bg-muted/60 rounded-2xl p-1 gap-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => handle(t.value)}
            className="relative h-10 rounded-xl text-sm font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId="seg-pill"
                className="absolute inset-0 bg-background rounded-xl shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative z-10 ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
