import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, MessageSquare, Phone, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWaouhInbox } from "@/hooks/useWaouhInbox";

type Props = {
  sessionId: string;
  authUserId: string | null;
  triggerClassName?: string;
};

function relativeTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const j = Math.floor(h / 24);
  return `${j} j`;
}

export function WaouhUnifiedInbox({ sessionId, authUserId, triggerClassName }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, totalUnread, markRead } = useWaouhInbox(sessionId, authUserId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Inbox"
          className={cn("relative p-2 rounded-lg hover:bg-white/15 active:bg-white/25", triggerClassName)}
        >
          <Inbox className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] flex flex-col rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Inbox unifiée
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2">{totalUnread} nouveau(x)</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune conversation pour le moment.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => {
              const isWa = it.channel === "whatsapp";
              const unread = it.unread_count > 0;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      await markRead(it.id);
                      setOpen(false);
                      navigate(`/app/chat/${it.id}`);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 active:bg-muted",
                      unread && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white",
                        isWa ? "bg-emerald-600" : "bg-sky-600"
                      )}
                    >
                      {isWa ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm truncate", unread ? "font-bold" : "font-medium")}>
                          {it.phone_number || (isWa ? "WhatsApp" : "WAOUH App")}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] py-0 h-4",
                            isWa ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                          )}
                        >
                          {isWa ? "WhatsApp" : "App"}
                        </Badge>
                      </div>
                      <p className={cn("text-xs truncate", unread ? "text-foreground" : "text-muted-foreground")}>
                        {it.last_message || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(it.last_inbound_at || it.updated_at)}
                      </span>
                      {unread ? (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {it.unread_count}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
