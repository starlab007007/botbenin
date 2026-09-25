import { Bot, Handshake, ShoppingBag, Sparkles, Target, X } from "lucide-react";
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
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
  sessionId: string;
}) {
  return (
    <div className="shrink-0 border-b border-slate-200/80 bg-white/95 px-2 py-1 backdrop-blur">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => onSelect("main")}
          className={cn(
            "group flex shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1 text-left transition",
            activeKey === "main"
              ? "border-slate-900 bg-slate-950 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60"
          )}
        >
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg",
            activeKey === "main" ? "bg-white/12" : "bg-emerald-50 text-emerald-700"
          )}>
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] font-black">
              Assistant WAOUH
              <Sparkles className={cn("h-3 w-3", activeKey === "main" ? "text-emerald-300" : "text-emerald-600")} />
            </div>
            <div className={cn("hidden text-[9px] font-semibold sm:block", activeKey === "main" ? "text-white/60" : "text-slate-400")}>
              Avatar · NEXUS · Signal
            </div>
          </div>
        </button>

        {matches.map((match) => {
          const active = activeKey === match.key;
          const label = formatMatchLabel({
            articleId: match.article_id,
            userKey: match.buyer_profile_id || match.counterpart_user_id || sessionId,
            role: match.kind,
          }).replace(/^WAOUH·/, "");
          const Icon = match.kind === "buyer" ? Target : ShoppingBag;
          return (
            <div
              key={match.key}
              className={cn(
                "flex shrink-0 items-center rounded-xl border pr-0.5 transition",
                active
                  ? "border-emerald-300 bg-gradient-to-r from-emerald-700 to-cyan-700 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
              )}
            >
              <button
                onClick={() => onSelect(match.key)}
                className="flex min-w-0 items-center gap-1.5 px-2 py-1 text-left"
              >
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-white/15" : "bg-amber-50 text-amber-700"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide">
                    <Handshake className="h-3 w-3" /> Deal Room
                  </div>
                  <div className={cn(
                    "max-w-[120px] truncate text-[9px] font-semibold",
                    active ? "text-white/75" : "text-slate-500"
                  )}>
                    {match.title || label}
                  </div>
                </div>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(match.key);
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg transition",
                  active ? "hover:bg-white/15" : "hover:bg-slate-100"
                )}
                aria-label="Fermer cette Deal Room"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
