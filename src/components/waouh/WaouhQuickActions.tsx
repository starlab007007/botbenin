import React from "react";
import { ShoppingBag, Search, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickAction = "sell" | "buy" | "negotiate" | "pay";

const ACTIONS: { key: QuickAction; label: string; Icon: any }[] = [
  { key: "sell", label: "Vendre", Icon: ShoppingBag },
  { key: "buy", label: "Acheter", Icon: Search },
  { key: "negotiate", label: "Négocier", Icon: Handshake },
];

export const WaouhQuickActions: React.FC<{
  onAction: (a: QuickAction) => void;
  disabled?: boolean;
}> = ({ onAction, disabled }) => {
  return (
    <div className="flex gap-2 px-2 py-2 overflow-x-auto border-t bg-background scrollbar-none">
      {ACTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onAction(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:bg-accent",
            "text-sm font-medium whitespace-nowrap shrink-0 shadow-sm transition",
            "disabled:opacity-50"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default WaouhQuickActions;
