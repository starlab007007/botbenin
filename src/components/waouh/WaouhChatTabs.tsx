import { useEffect, useState } from "react";
import { Bot, Handshake, Search, ShoppingBag, Sparkles, Target, X } from "lucide-react";
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
  const [search, setSearch] = useState<{ goal: string; status: string; count: number; open: boolean } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setSearch((e as CustomEvent).detail ?? null);
    window.addEventListener("waouh:chat-search", on);
    return () => window.removeEventListener("waouh:chat-search", on);
  }, []);
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
              Bot · Avatar IA
              <Sparkles className={cn("h-3 w-3", activeKey === "main" ? "text-emerald-300" : "text-emerald-600")} />
            </div>
            <div className={cn("hidden text-[9px] font-semibold sm:block", activeKey === "main" ? "text-white/60" : "text-slate-400")}>
              Bot · NEXUS · Signal
            </div>
          </div>
        </button>

        {search && (
          <div className={cn(
            "flex shrink-0 items-center rounded-xl border pr-0.5 transition",
            search.open ? "border-violet-300 bg-violet-600 text-white shadow-sm" : "border-violet-200 bg-white text-slate-700"
          )}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("waouh:chat-search-open"))}
              className="flex min-w-0 items-center gap-1.5 px-2 py-1 text-left"
            >
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", search.open ? "bg-white/15" : "bg-violet-50 text-violet-700")}>
                <Search className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-wide">Recherche</div>
                <div className={cn("max-w-[120px] truncate text-[9px] font-semibold", search.open ? "text-white/75" : "text-slate-500")}>
                  {search.status === "running" ? "En cours…" : search.count ? `${search.count} résultat${search.count > 1 ? "s" : ""}` : search.goal}
                </div>
              </div>
            </button>
            <button
              onClick={(event) => { event.stopPropagation(); window.dispatchEvent(new CustomEvent("waouh:chat-search-close")); }}
              className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-black/10"
              aria-label="Fermer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
