import React, { useState } from "react";
import { Search, Bell, MessageSquare, Plus, CheckCheck, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WaouhMatchChatList } from "./WaouhMatchChatList";
import type { WaouhNotification } from "@/hooks/useWaouhMatchNotifications";

type MatchNotification = WaouhNotification;

type Props = {
  sessionId: string;
  authUserId: string | null;
  notifications: MatchNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onOpenNotification?: (n: MatchNotification) => void;
  onNewConversation: () => void;
};

export function WaouhChatSidebar({
  sessionId,
  authUserId,
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onClearAll,
  onOpenNotification,
  onNewConversation,
}: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"chats" | "notifs">("chats");

  return (
    <aside className="h-full w-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Discussions</h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={onNewConversation}
          aria-label="Nouvelle conversation"
        >
          <Plus className="h-4 w-4 mr-1" /> Nouveau
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            className="pl-8 h-9 bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 mx-3 mt-2">
          <TabsTrigger value="chats" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="notifs" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex-1 min-h-0 mt-2 mx-0">
          <ScrollArea className="h-full">
            <WaouhMatchChatList sessionId={sessionId} authUserId={authUserId} query={query} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notifs" className="flex-1 min-h-0 mt-2 mx-0">
          <div className="px-3 pb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {notifications.length} notification{notifications.length > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onMarkAllRead}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tout lu
                </Button>
              )}
              {notifications.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClearAll}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <ul className="px-2 pb-4 space-y-1">
              {notifications.length === 0 && (
                <li className="text-center text-xs text-muted-foreground py-8 px-4">
                  Aucune notification pour le moment.
                </li>
              )}
              {notifications
                .filter((n) =>
                  query.trim()
                    ? `${n.title ?? ""} ${n.body ?? ""}`
                        .toLowerCase()
                        .includes(query.toLowerCase())
                    : true
                )
                .map((n) => (
                  <li
                    key={n.id}
                    onClick={() => {
                      onMarkRead(n.id);
                      onOpenNotification?.(n);
                    }}
                    className={
                      "px-3 py-2 rounded-md cursor-pointer hover:bg-muted/60 transition-colors " +
                      (!n.opened ? "bg-primary/5" : "")
                    }
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary"
                        style={{ opacity: n.opened ? 0 : 1 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium truncate text-foreground">
                            {n.title ?? "Notification"}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(n.sent_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 whitespace-pre-line">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
