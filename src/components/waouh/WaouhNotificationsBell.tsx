import React, { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { WaouhNotification } from "@/hooks/useWaouhMatchNotifications";

export const WaouhNotificationsBell: React.FC<{
  permission: NotificationPermission;
  notifications: WaouhNotification[];
  unreadCount: number;
  onRequestPermission: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}> = ({ permission, notifications, unreadCount, onRequestPermission, onMarkAllRead, onClearAll }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v && unreadCount > 0) {
      // Defer to allow visual ack
      setTimeout(onMarkAllRead, 400);
    }
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
                const clickable = !!(n.message_id || n.transaction_id);
                const handleClick = () => {
                  if (!clickable) return;
                  window.dispatchEvent(new CustomEvent("waouh:focus-message", {
                    detail: { message_id: n.message_id, transaction_id: n.transaction_id }
                  }));
                  setOpen(false);
                };
                return (
                  <li
                    key={n.id}
                    onClick={handleClick}
                    className={cn(
                      "p-3 text-sm",
                      !n.read && "bg-emerald-50/60",
                      clickable && "cursor-pointer hover:bg-muted/60 active:bg-muted"
                    )}
                    role={clickable ? "button" : undefined}
                  >
                    <div className="flex items-start gap-2">
                      {n.image_url && (
                        <img src={n.image_url} alt="" className="w-10 h-10 rounded object-cover border" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
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
