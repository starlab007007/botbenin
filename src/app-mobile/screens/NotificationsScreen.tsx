import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageCircle, Trash2, X } from "lucide-react";
import { MobileScreenHeader } from "../components/MobileScreenHeader";
import { useNotifications, type AppNotification } from "../hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { items, unread, loading, markRead, markAllRead, remove, clearAll, clearRead } = useNotifications();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? items : items.filter((n) => !n.read);

  const onOpen = (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    navigate(n.action_url || "/app/chat");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <MobileScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Tout est lu"}
        back="/app/chat"
        action={
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={markAllRead}>
                <Check className="h-4 w-4 mr-1" /> Tout lire
              </Button>
            )}
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" aria-label="Nettoyer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Nettoyer les notifications</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprime définitivement les notifications de chat. Les messages eux-mêmes restent dans vos conversations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="m-0">Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={clearRead} className="bg-muted text-foreground hover:bg-muted/80">
                      Supprimer les lues
                    </AlertDialogAction>
                    <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Tout supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <div className="flex gap-2 px-4 py-2 border-b bg-muted/30">
        <Button
          size="sm"
          variant={showAll ? "ghost" : "default"}
          className={!showAll ? "bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)] text-white" : ""}
          onClick={() => setShowAll(false)}
        >
          Non lues {unread > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-white/20 text-[10px] font-bold">{unread}</span>}
        </Button>
        <Button
          size="sm"
          variant={showAll ? "default" : "ghost"}
          className={showAll ? "bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)] text-white" : ""}
          onClick={() => setShowAll(true)}
        >
          Toutes
        </Button>
      </div>

      <main className="pb-20">
        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}
        {!loading && visible.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{showAll ? "Aucune notification" : "Aucun message non lu"}</p>
            <p className="text-sm">Les nouveaux messages (App & WhatsApp IA) apparaîtront ici.</p>
          </div>
        )}
        <ul className="divide-y">
          {visible.map((n) => {
            const channel = n.metadata?.channel as string | undefined;
            return (
              <li
                key={n.id}
                className={`group flex gap-3 px-4 py-3 active:bg-muted transition-colors ${n.read ? "" : "bg-emerald-50/60 dark:bg-emerald-950/20"}`}
              >
                <button onClick={() => onOpen(n)} className="flex flex-1 gap-3 min-w-0 text-left">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${channel === "whatsapp" ? "bg-[#25D366] text-white" : "bg-emerald-500 text-white"}`}>
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${n.read ? "font-medium" : "font-bold"}`}>{n.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.content && <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>}
                    {channel && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                        {channel === "whatsapp" ? "WhatsApp IA" : "App"}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="self-start p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="Supprimer"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
