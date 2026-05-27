import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Tab { value: string; label: string }
interface Props {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
}

export function SegmentedTabs({ tabs, value, onChange }: Props) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.value === value));
  const handle = (v: string) => {
    if (v === value) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    onChange(v);
  };
  return (
    <div className="relative grid grid-cols-3 bg-muted/60 rounded-2xl p-1">
      <span
        className="absolute top-1 bottom-1 rounded-xl bg-background shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          left: "0.25rem",
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => handle(t.value)}
            className={`relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
