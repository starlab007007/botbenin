import { X, ShoppingBag, Target, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";
import type { MatchChatMeta } from "./WaouhMatchChatWindow";

export function WaouhChatTabs({
  matches,
  activeKey,
  onSelect,
  onClose,
  sessionId,
}: {
  matches: MatchChatMeta[];
  activeKey: string; // "main" or match.key
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
  sessionId: string;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-2 py-1.5 bg-background border-b border-border/50 shrink-0">
      <button
        onClick={() => onSelect("main")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0 text-xs font-semibold transition-all",
          activeKey === "main"
            ? "bg-[hsl(var(--wa-green,142_70%_24%))] text-white"
            : "bg-card border border-border/60 text-foreground active:scale-95"
        )}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        WAOUH
      </button>
      {matches.map((m) => {
        const active = activeKey === m.key;
        const label = formatMatchLabel({
          articleId: m.article_id,
          userKey: m.buyer_profile_id || m.counterpart_user_id || sessionId,
          role: m.kind,
        });
        const short = label.replace(/^WAOUH·/, "");
        const Icon = m.kind === "buyer" ? Target : ShoppingBag;
        return (
          <div
            key={m.key}
            className={cn(
              "flex items-center gap-1 pl-2 pr-1 py-1 rounded-full shrink-0 text-xs font-semibold transition-all",
              active
                ? "bg-emerald-600 text-white"
                : "bg-card border border-border/60 text-foreground"
            )}
          >
            <button
              onClick={() => onSelect(m.key)}
              className="flex items-center gap-1.5 min-w-0 active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[110px]">{short}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(m.key);
              }}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                active ? "hover:bg-white/20" : "hover:bg-muted"
              )}
              aria-label="Fermer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
