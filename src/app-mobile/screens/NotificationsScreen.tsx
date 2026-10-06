import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MessageCircle, Sparkles, X } from "lucide-react";
import { MobileScreenHeader } from "../components/MobileScreenHeader";
import { useNotifications, type AppNotification } from "../hooks/useNotifications";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useWaouhIdentity } from "../hooks/useWaouhIdentity";
import { useWaouhMatchNotifications } from "@/hooks/useWaouhMatchNotifications";
import { getMatchKind, type WaouhNotification } from "@/hooks/waouhNotificationTypes";
import { openNotificationTarget } from "@/components/waouh/notificationActions";
import {
  primaryWaouhSmartAction,
  readWaouhSmartEnvelope,
  waouhSmartDisplayText,
  waouhSmartRoute,
} from "@/lib/waouh/smartPayload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

type DisplayNotification = {
  key: string;
  source: "waouh" | "legacy";
  id: string;
  title: string;
  content: string | null;
  type: string;
  read: boolean;
  created_at: string;
  metadata: any;
  waouh?: WaouhNotification;
  legacy?: AppNotification;
};

function correlationKey(row: DisplayNotification): string | null {
  const metadata = row.metadata || {};
  const smart = metadata.smart && typeof metadata.smart === "object" ? metadata.smart : {};
  const value = smart.correlation_id ?? metadata.correlation_id ?? metadata.trace_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function smartActionLabel(notification: WaouhNotification): string | null {
  const action = primaryWaouhSmartAction(notification.payload);
  if (!action) return null;
  return action.kind === "navigate"
    ? action.label
    : `Ouvrir pour ${action.label.toLocaleLowerCase("fr-FR")}`;
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { sessionId } = useWaouhIdentity();
  const legacy = useNotifications();
  const waouh = useWaouhMatchNotifications(sessionId ?? "", user?.id ?? null);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo<DisplayNotification[]>(() => {
    const unified: DisplayNotification[] = waouh.notifications.map((n) => {
      const display = waouhSmartDisplayText(n.payload, n.body);
      return {
        key: `waouh:${n.id}`,
        source: "waouh",
        id: n.id,
        title: display.title || n.title || "WAOUH",
        content: display.detail || n.body || null,
        type: n.template,
        read: n.read,
        created_at: n.created_at,
        metadata: {
          ...(n.payload || {}),
          article_id: n.article_id ?? n.payload?.article_id ?? null,
          channel: n.payload?.channel ?? n.payload?.contact?.channel ?? null,
        },
        waouh: n,
      };
    });

    const old: DisplayNotification[] = legacy.items.map((n) => ({
      key: `legacy:${n.id}`,
      source: "legacy",
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type || "chat",
      read: n.read,
      created_at: n.created_at,
      metadata: n.metadata || {},
      legacy: n,
    }));

    // The unified WAOUH event wins whenever the legacy notification shares a
    // correlation id. Otherwise keep the legacy row as compatibility history.
    const seen = new Set<string>();
    const merged: DisplayNotification[] = [];
    for (const row of [...unified, ...old]) {
      const correlation = correlationKey(row);
      const dedupe = correlation ? `corr:${correlation}` : row.key;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      merged.push(row);
    }
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [waouh.notifications, legacy.items]);

  const unread = items.filter((n) => !n.read).length;
  const loading = legacy.loading && waouh.notifications.length === 0;
  const visible = showAll ? items : items.filter((n) => !n.read);

  const markRead = (row: DisplayNotification) => {
    if (row.source === "waouh") waouh.markRead(row.id);
    else legacy.markRead(row.id);
  };

  const markAllRead = () => {
    waouh.markAllRead();
    void legacy.markAllRead();
  };

  const onOpenLegacy = (n: AppNotification) => {
    if (!n.read) legacy.markRead(n.id);
    const m = n.metadata || {};
    if (m.article_id && (m.kind === "buyer" || m.kind === "seller" || m.match_kind)) {
      const detail = {
        notification_id: n.id,
        notification_ids: [n.id],
        seed_text: n.content ?? null,
        article_id: m.article_id,
        buyer_profile_id: m.buyer_profile_id ?? null,
        counterpart_user_id: m.counterpart_user_id ?? m.buyer_user_id ?? null,
        kind: (m.kind || m.match_kind) as "buyer" | "seller",
        title: m.title || n.title,
        price: m.price ?? null,
        city: m.city ?? null,
        photo: m.image_url ?? m.photo ?? null,
      };
      try {
        const raw = localStorage.getItem("waouh_pending_open");
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        arr.push(detail);
        localStorage.setItem("waouh_pending_open", JSON.stringify(arr.slice(-10)));
      } catch {}
      navigate("/app/chat/waouh");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
      }, 80);
      return;
    }
    navigate(n.action_url || "/app/chat");
  };

  const onOpenWaouh = (n: WaouhNotification) => {
    const matchKind = getMatchKind(n.template);
    if (matchKind && n.article_id) {
      const detail = {
        notification_id: n.id,
        notification_ids: [n.id],
        seed_text: n.payload?.text ?? n.body ?? null,
        article_id: n.article_id,
        buyer_profile_id: n.payload?.buyer_profile_id ?? null,
        counterpart_user_id: n.payload?.counterpart_user_id ?? n.payload?.buyer_user_id ?? null,
        kind: matchKind,
        title: n.payload?.title || n.title,
        price: n.payload?.price ?? null,
        city: n.payload?.city ?? null,
        photo: n.image_url ?? null,
      };
      try {
        const raw = localStorage.getItem("waouh_pending_open");
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        arr.push(detail);
        localStorage.setItem("waouh_pending_open", JSON.stringify(arr.slice(-10)));
      } catch {}
      waouh.markRead(n.id);
      navigate("/app/chat/waouh");
      window.setTimeout(() => {
        openNotificationTarget(n, {
          onNavigate: navigate,
        });
      }, 80);
      return;
    }

    const handled = openNotificationTarget(n, {
      beforeOpen: () => waouh.markRead(n.id),
      onNavigate: navigate,
    });
    if (!handled) {
      waouh.markRead(n.id);
      navigate(waouhSmartRoute(n.payload) || "/app/chat/waouh");
    }
  };

  const onOpen = (row: DisplayNotification) => {
    if (row.source === "waouh" && row.waouh) onOpenWaouh(row.waouh);
    else if (row.legacy) onOpenLegacy(row.legacy);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <MobileScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} notification${unread > 1 ? "s" : ""} à voir` : "Tout est lu"}
        back="/app/chat"
        action={
          unread > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15"
              onClick={markAllRead}
            >
              <Check className="mr-1 h-4 w-4" /> Tout lire
            </Button>
          ) : null
        }
      />

      <div className="flex shrink-0 gap-2 border-b bg-muted/30 px-4 py-2">
        <Button
          size="sm"
          variant={showAll ? "ghost" : "default"}
          className={!showAll ? "bg-[hsl(165_91%_25%)] text-white hover:bg-[hsl(165_91%_18%)]" : ""}
          onClick={() => setShowAll(false)}
        >
          À voir
          {unread > 0 && (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
              {unread}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant={showAll ? "default" : "ghost"}
          className={showAll ? "bg-[hsl(165_91%_25%)] text-white hover:bg-[hsl(165_91%_18%)]" : ""}
          onClick={() => setShowAll(true)}
        >
          Historique
        </Button>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-20">
        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}
        {!loading && visible.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="font-medium">{showAll ? "Aucune notification" : "Aucune action en attente"}</p>
            <p className="text-sm">
              Chat, Avatar, WhatsApp, Partner, Stock, Diffusion et Deals sont regroupés ici.
            </p>
          </div>
        )}

        <ul className="divide-y">
          {visible.map((row) => {
            const payload = row.source === "waouh" ? row.waouh?.payload : row.metadata;
            const smart = row.source === "waouh" ? readWaouhSmartEnvelope(payload) : null;
            const channel = String(row.metadata?.channel || "").toLowerCase();
            const actionLabel = row.waouh ? smartActionLabel(row.waouh) : null;
            const isWhatsapp = channel === "whatsapp" || smart?.domain === "whatsapp";

            return (
              <li
                key={row.key}
                className={cn(
                  "group flex gap-3 px-4 py-3 transition-colors active:bg-muted",
                  !row.read && "bg-emerald-50/60 dark:bg-emerald-950/20",
                )}
              >
                <button onClick={() => onOpen(row)} className="flex min-w-0 flex-1 gap-3 text-left">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white",
                      isWhatsapp ? "bg-[#25D366]" : "bg-emerald-600",
                    )}
                  >
                    {smart ? <Sparkles className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate", row.read ? "font-medium" : "font-bold")}>
                        {row.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(row.created_at)}
                      </span>
                    </div>

                    {row.content && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {row.content}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {smart && (
                        <>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide",
                              smart.priority === "urgent"
                                ? "bg-red-100 text-red-700"
                                : smart.priority === "high"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {smart.domain}
                          </span>
                          {smart.stage && (
                            <span className="text-[9px] font-semibold text-slate-400">
                              {smart.stage}
                            </span>
                          )}
                        </>
                      )}
                      {!smart && channel && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {isWhatsapp ? "WhatsApp IA" : "App"}
                        </span>
                      )}
                    </div>

                    {actionLabel && (
                      <div className="mt-2 inline-flex rounded-xl bg-slate-950 px-2.5 py-1.5 text-[10px] font-black text-white">
                        {actionLabel}
                      </div>
                    )}
                  </div>
                </button>

                {row.source === "legacy" && row.legacy ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      legacy.remove(row.id);
                    }}
                    className="self-start rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Supprimer l'ancienne notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : !row.read ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      markRead(row);
                    }}
                    className="self-start rounded-full p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                    aria-label="Marquer comme lu"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
