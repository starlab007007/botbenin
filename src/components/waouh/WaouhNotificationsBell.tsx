import React, { useState } from "react";
import { Bell, BellOff, Check, ShoppingBag, Target, Radar, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  type WaouhNotification,
  getMatchKind,
  getMatchBadgeLabel,
} from "@/hooks/useWaouhMatchNotifications";

const BADGE_STYLES: Record<string, string> = {
  radar_match: "bg-violet-600 text-white",
  match: "bg-emerald-600 text-white",
  match_buyer: "bg-emerald-600 text-white",
  new_buyer: "bg-amber-500 text-white",
  match_seller: "bg-amber-500 text-white",
  deal_created: "bg-sky-600 text-white",
  deal_seller: "bg-sky-600 text-white",
  deal_buyer: "bg-sky-600 text-white",
  deal_ops: "bg-fuchsia-600 text-white",
};

const DEAL_TEMPLATES = new Set(["deal_created", "deal_seller", "deal_buyer", "deal_ops"]);

const BadgeIcon: React.FC<{ template: string; className?: string }> = ({ template, className }) => {
  if (template === "radar_match") return <Radar className={className} />;
  if (DEAL_TEMPLATES.has(template)) return <Truck className={className} />;
  const kind = getMatchKind(template);
  if (kind === "seller") return <ShoppingBag className={className} />;
  if (kind === "buyer") return <Target className={className} />;
  return null;
};

export const WaouhNotificationsBell: React.FC<{
  permission: NotificationPermission;
  notifications: WaouhNotification[];
  unreadCount: number;
  onRequestPermission: () => void;
  onMarkAllRead: () => void;
  onMarkRead?: (id: string) => void;
  onClearAll: () => void;
}> = ({ permission, notifications, unreadCount, onRequestPermission, onMarkAllRead, onMarkRead, onClearAll }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v && permission !== "granted") onRequestPermission();
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="relative gap-1.5" title="Notifications">
          {permission === "granted" ? (
            <Bell className={cn("w-4 h-4", unreadCount > 0 ? "text-emerald-600" : "")} />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span className="hidden sm:inline text-xs">
            {permission === "granted" ? "Notif." : "Activer"}
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onMarkAllRead}>
                  <Check className="w-3 h-3 mr-1" /> Tout lire
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClearAll}>
                  Effacer
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 px-4">
              Aucune notification pour le moment.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const matchKind = getMatchKind(n.template);
                const isMatch = !!matchKind;
                const clickable = isMatch || !!(n.message_id || n.transaction_id);
                const badgeLabel = getMatchBadgeLabel(n.template);

                const handleClick = () => {
                  if (!clickable) return;
                  if (isMatch && n.article_id) {
                    window.dispatchEvent(
                      new CustomEvent("waouh:open-match-chat", {
                        detail: {
                          notification_id: n.id,
                          seed_text: n.payload?.text ?? n.body ?? null,
                          article_id: n.article_id,
                          buyer_profile_id: n.payload?.buyer_profile_id ?? null,
                          counterpart_user_id:
                            n.payload?.counterpart_user_id ?? n.payload?.buyer_user_id ?? null,
                          kind: matchKind,
                          title: n.payload?.title,
                          price: n.payload?.price,
                          city: n.payload?.city,
                          photo: n.image_url,
                        },
                      })
                    );
                  } else if (n.message_id || n.transaction_id) {
                    window.dispatchEvent(
                      new CustomEvent("waouh:focus-message", {
                        detail: { message_id: n.message_id, transaction_id: n.transaction_id },
                      })
                    );
                  }
                  onMarkRead?.(n.id);
                  setOpen(false);
                };

                return (
                  <li
                    key={n.id}
                    onClick={handleClick}
                    className={cn(
                      "p-3 text-sm",
                      !n.read && "bg-emerald-50/60 dark:bg-emerald-950/30",
                      clickable && "cursor-pointer hover:bg-muted/60 active:bg-muted"
                    )}
                    role={clickable ? "button" : undefined}
                  >
                    <div className="flex items-start gap-2">
                      {n.image_url ? (
                        <img src={n.image_url} alt="" className="w-10 h-10 rounded object-cover border" />
                      ) : isMatch ? (
                        <div
                          className={cn(
                            "w-10 h-10 rounded flex items-center justify-center shrink-0",
                            BADGE_STYLES[n.template] || "bg-emerald-600 text-white"
                          )}
                        >
                          <BadgeIcon template={n.template} className="w-5 h-5" />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate flex-1">{n.title}</span>
                          {!n.read && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                              aria-label="Non lue"
                            />
                          )}
                        </div>
                        {badgeLabel && (
                          <Badge
                            className={cn(
                              "mt-1 border-0 text-[9px] py-0 px-1.5 h-4",
                              BADGE_STYLES[n.template] || "bg-emerald-600 text-white"
                            )}
                          >
                            <BadgeIcon template={n.template} className="w-2.5 h-2.5 mr-0.5" />
                            {badgeLabel}
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString("fr-FR")}
                          {clickable && <span className="ml-2 text-emerald-600">↗ Ouvrir</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default WaouhNotificationsBell;
