import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageCircle } from "lucide-react";
import { MobileScreenHeader } from "../components/MobileScreenHeader";
import { useNotifications, type AppNotification } from "../hooks/useNotifications";
import { Button } from "@/components/ui/button";

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
  const { items, unread, loading, markRead, markAllRead } = useNotifications();

  const onOpen = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <MobileScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est lu"}
        back="/app/chat"
        action={
          unread > 0 ? (
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={markAllRead}>
              <Check className="h-4 w-4 mr-1" /> Tout lire
            </Button>
          ) : null
        }
      />
      <main className="pb-20">
        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}
        {!loading && items.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune notification</p>
            <p className="text-sm">Vous serez alerté à chaque nouveau message.</p>
          </div>
        )}
        <ul className="divide-y">
          {items.map((n) => (
            <li
              key={n.id}
              onClick={() => onOpen(n)}
              className={`flex gap-3 px-4 py-3 cursor-pointer active:bg-muted ${n.read ? "" : "bg-emerald-50/60 dark:bg-emerald-950/20"}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${n.type === "chat" ? "bg-emerald-500 text-white" : "bg-muted text-foreground"}`}>
                {n.type === "chat" ? <MessageCircle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${n.read ? "font-medium" : "font-bold"}`}>{n.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                {n.content && <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>}
              </div>
              {!n.read && <span className="h-2 w-2 rounded-full bg-[hsl(165_91%_35%)] mt-2 shrink-0" />}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
