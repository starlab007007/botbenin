import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Target, Archive, ArchiveRestore, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";
import { matchKey } from "./useWaouhMatchChats";

const PENDING_OPEN_KEY = "waouh_pending_open";


type MatchItem = {
  key: string; // canonical: art_<articleId>_<role>
  notification_id: string | null; // most-recent notification (for legacy display/markRead)
  notification_ids: string[]; // all notifications merged into this canonical row
  seed_text: string | null;
  article_id: string;
  buyer_profile_id: string | null;
  counterpart_user_id: string | null;
  role: "buyer" | "seller";
  title: string;
  price: number | null;
  city: string | null;
  photo: string | null;
  unread: boolean;
  last_at: string;
};


const VISIBLE_DEFAULT = 3;
const AUTO_ARCHIVE_DAYS = 7;
const ARCHIVE_KEY = (sid: string | null) => `waouh_archived_matches_${sid ?? "anon"}`;
const EXPANDED_KEY = (sid: string | null) => `waouh_match_expanded_${sid ?? "anon"}`;

function loadArchived(sid: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY(sid));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveArchived(sid: string | null, set: Set<string>) {
  try {
    localStorage.setItem(ARCHIVE_KEY(sid), JSON.stringify(Array.from(set)));
  } catch {}
}

export function WaouhMatchChatList({
  sessionId,
  authUserId,
}: {
  sessionId: string | null;
  authUserId?: string | null;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<MatchItem[]>([]);
  const [waouhIds, setWaouhIds] = useState<string[]>([]);
  const [archived, setArchived] = useState<Set<string>>(() => loadArchived(sessionId));
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EXPANDED_KEY(sessionId)) === "1";
    } catch {
      return false;
    }
  });
  const loadRef = useRef<() => void>(() => {});

  const persistArchived = useCallback(
    (next: Set<string>) => {
      setArchived(new Set(next));
      saveArchived(sessionId, next);
    },
    [sessionId]
  );

  // Resolve waouh_users for this session/profile
  useEffect(() => {
    if (!sessionId && !authUserId) return;
    let alive = true;
    (async () => {
      const ors: string[] = [];
      if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
      if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
      const { data } = await supabase
        .from("waouh_users")
        .select("id")
        .or(ors.join(","))
        .limit(50);
      if (!alive) return;
      setWaouhIds(Array.from(new Set((data ?? []).map((u: any) => u.id))));
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, authUserId]);

  // Load + merge notifications + message fallback — ONE ROW PER NOTIFICATION
  useEffect(() => {
    if (!sessionId && !authUserId) return;
    let active = true;

    const load = async () => {
      const map = new Map<string, MatchItem>();

      // 1) Notifications — one row per notification.id
      const nOrs: string[] = [];
      if (sessionId) nOrs.push(`web_session_id.eq.${sessionId}`);
      if (waouhIds.length) nOrs.push(`user_id.in.(${waouhIds.join(",")})`);
      if (nOrs.length) {
        const { data: notifs } = await supabase
          .from("waouh_notifications" as any)
          .select("id,notification_type,payload,photos,sent_at,article_id,opened")
          .in("notification_type", ["match", "match_buyer", "match_seller", "new_buyer", "radar_match"])
          .or(nOrs.join(","))
          .order("sent_at", { ascending: false })
          .limit(120);

        for (const n of (notifs ?? []) as any[]) {
          const articleId: string | null = n.article_id;
          if (!articleId) continue;
          const recipient = n.payload?.recipient;
          const role: "buyer" | "seller" =
            recipient === "seller" ||
            n.notification_type === "match_seller" ||
            n.notification_type === "new_buyer"
              ? "seller"
              : "buyer";
          const photo =
            (Array.isArray(n.photos) && n.photos[0]) ||
            (Array.isArray(n.payload?.photos) && n.payload.photos[0]) ||
            n.payload?.image_url ||
            null;
          const ck = matchKey(articleId, role);
          const prev = map.get(ck);
          // Most-recent notification wins for display; accumulate notif ids.
          const isNewer = !prev || new Date(n.sent_at) > new Date(prev.last_at);
          const accIds = new Set<string>([...(prev?.notification_ids || []), n.id]);
          map.set(ck, {
            key: ck,
            notification_id: isNewer ? n.id : prev!.notification_id,
            notification_ids: Array.from(accIds),
            seed_text: isNewer ? (n.payload?.text ?? null) : prev!.seed_text,
            article_id: articleId,
            buyer_profile_id: isNewer ? (n.payload?.buyer_profile_id ?? null) : prev!.buyer_profile_id,
            counterpart_user_id: isNewer ? (n.payload?.counterpart_user_id ?? n.payload?.buyer_user_id ?? null) : prev!.counterpart_user_id,
            role,
            title: isNewer ? (n.payload?.title || "Annonce") : prev!.title,
            price: isNewer ? (n.payload?.price ?? null) : prev!.price,
            city: isNewer ? (n.payload?.city ?? null) : prev!.city,
            photo: isNewer ? photo : prev!.photo,
            unread: (prev?.unread ?? false) || !n.opened,
            last_at: isNewer ? n.sent_at : prev!.last_at,
          });
        }
      }


      // 2) Fallback: recent article-scoped messages (last 48h) — only create stubs
      // for articles that have NO notification row at all (keeps notifications dominant).
      try {
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const mOrs: string[] = [];
        if (sessionId) mOrs.push(`web_session_id.eq.${sessionId}`);
        if (waouhIds.length) mOrs.push(`user_id.in.(${waouhIds.join(",")})`);
        if (mOrs.length) {
          const { data: msgs } = await supabase
            .from("waouh_messages" as any)
            .select("article_id,created_at,meta")
            .or("article_id.not.is.null,meta->>article_id.not.is.null")
            .gte("created_at", since)
            .or(mOrs.join(","))
            .order("created_at", { ascending: false })
            .limit(300);
          const articlesWithNotif = new Set(
            Array.from(map.values()).map((it) => it.article_id)
          );
          const seenArt = new Map<string, { role: "buyer" | "seller"; created_at: string }>();
          for (const m of (msgs ?? []) as any[]) {
            const articleId: string | null = m.article_id || m.meta?.article_id || null;
            if (!articleId || seenArt.has(articleId) || articlesWithNotif.has(articleId)) continue;
            const role: "buyer" | "seller" =
              m.meta?.role === "seller" ? "seller" : "buyer";
            seenArt.set(articleId, { role, created_at: m.created_at });
          }
          // Batch fetch article metadata in one query
          const stubIds = Array.from(seenArt.keys());
          if (stubIds.length) {
            const { data: arts } = await supabase
              .from("waouh_articles" as any)
              .select("id,title,price,city,photos")
              .in("id", stubIds);
            const artById = new Map<string, any>((arts ?? []).map((a: any) => [a.id, a]));
            for (const [articleId, info] of seenArt.entries()) {
              const art = artById.get(articleId);
              const stubKey = matchKey(articleId, info.role);
              map.set(stubKey, {
                key: stubKey,
                notification_id: null,
                notification_ids: [],

                seed_text: null,
                article_id: articleId,
                buyer_profile_id: null,
                counterpart_user_id: null,
                role: info.role,
                title: art?.title || "Annonce",
                price: art?.price ?? null,
                city: art?.city ?? null,
                photo: (Array.isArray(art?.photos) && art.photos[0]) || null,
                unread: false,
                last_at: info.created_at,
              });
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!active) return;
      const arr = Array.from(map.values()).sort(
        (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
      );
      setItems(arr);
    };

    // Debounce: coalesce bursts of realtime events into one reload.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => load(), 180);
    };

    loadRef.current = debouncedLoad;
    load();

    // Single combined realtime channel
    const ch = supabase.channel(`waouh-match-list-${sessionId ?? authUserId ?? "anon"}`);
    if (sessionId) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waouh_notifications", filter: `web_session_id=eq.${sessionId}` },
        () => loadRef.current?.()
      );
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` },
        (payload: any) => {
          if (payload?.new?.article_id) loadRef.current?.();
        }
      );
    }
    for (const uid of waouhIds) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waouh_notifications", filter: `user_id=eq.${uid}` },
        () => loadRef.current?.()
      );
    }
    ch.subscribe();

    const onBump = () => loadRef.current?.();
    window.addEventListener("waouh:match-updated", onBump as EventListener);

    return () => {
      active = false;
      supabase.removeChannel(ch);
      window.removeEventListener("waouh:match-updated", onBump as EventListener);
    };
  }, [sessionId, authUserId, waouhIds.join("|")]);

  // Auto-archive items older than N days & read
  const { fresh, autoOld } = useMemo(() => {
    const cutoff = Date.now() - AUTO_ARCHIVE_DAYS * 86400 * 1000;
    const fresh: MatchItem[] = [];
    const autoOld: MatchItem[] = [];
    for (const it of items) {
      if (archived.has(it.key)) continue;
      if (!it.unread && new Date(it.last_at).getTime() < cutoff) autoOld.push(it);
      else fresh.push(it);
    }
    return { fresh, autoOld };
  }, [items, archived]);

  const archivedItems = useMemo(
    () => items.filter((it) => archived.has(it.key)),
    [items, archived]
  );

  if (items.length === 0) return null;

  const open = async (item: MatchItem) => {
    // Mark all related notifications for this canonical match as read
    const allNotifIds = Array.from(
      new Set<string>([
        ...(item.notification_ids || []),
        ...(item.notification_id ? [item.notification_id] : []),
      ])
    );
    if (allNotifIds.length) {
      try {
        await supabase
          .from("waouh_notifications" as any)
          .update({ opened: true })
          .in("id", allNotifIds);
      } catch {}
    }

    const detail = {
      notification_id: item.notification_id,
      notification_ids: allNotifIds,
      seed_text: item.seed_text,
      article_id: item.article_id,
      buyer_profile_id: item.buyer_profile_id,
      counterpart_user_id: item.counterpart_user_id,
      kind: item.role,
      title: item.title,
      price: item.price,
      city: item.city,
      photo: item.photo,
    };

    // Buffer the open intent in localStorage so the target screen picks it up
    // at mount-time even if it isn't mounted yet (no race with navigate).
    try {
      const raw = localStorage.getItem(PENDING_OPEN_KEY);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      const canonical = matchKey(item.article_id, item.role);
      const filtered = arr.filter(
        (d: any) => matchKey(d?.article_id, d?.kind === "seller" ? "seller" : "buyer") !== canonical
      );
      filtered.push(detail);
      localStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(filtered.slice(-10)));
    } catch {}

    navigate("/app/chat/waouh");
    // Also dispatch for the case where the screen is already mounted.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail }));
    }, 50);

    // Locally mark read
    setItems((prev) => prev.map((p) => (p.key === item.key ? { ...p, unread: false } : p)));
  };


  const archive = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(archived);
    next.add(key);
    persistArchived(next);
  };
  const unarchive = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(archived);
    next.delete(key);
    persistArchived(next);
  };

  const visible = expanded ? fresh : fresh.slice(0, VISIBLE_DEFAULT);
  const latestKey = fresh[0]?.key;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(EXPANDED_KEY(sessionId), next ? "1" : "0");
    } catch {}
  };

  const renderRow = (it: MatchItem, opts: { pinned?: boolean; archivedRow?: boolean } = {}) => {
    const label = formatMatchLabel({
      articleId: it.article_id,
      userKey: it.buyer_profile_id || it.counterpart_user_id || it.notification_id || sessionId || "any",
      role: it.role,
    });
    // Preview = first non-empty line of the rich seed_text, fallback to generic.
    const previewLine =
      (it.seed_text && it.seed_text.split("\n").map((s) => s.trim()).find((s) => s.length > 0)) ||
      (it.role === "buyer"
        ? "🎯 Annonce trouvée pour vous"
        : "🛒 Acheteur intéressé par votre annonce");
    return (
      <li
        key={it.key}
        onClick={() => open(it)}
        className={
          "flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer " +
          (opts.pinned ? "bg-emerald-50/70 dark:bg-emerald-950/20" : "")
        }
      >
        <div className="relative h-12 w-12 rounded-md overflow-hidden shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          {it.photo ? (
            <img src={it.photo} alt="" className="h-full w-full object-cover" />
          ) : it.role === "buyer" ? (
            <Target className="h-6 w-6 text-white" />
          ) : (
            <ShoppingBag className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-semibold truncate text-sm flex items-center gap-1.5">
              {it.title}
              {opts.pinned && (
                <Badge className="bg-amber-500 text-white border-0 text-[9px] py-0 px-1.5 h-4">Dernier</Badge>
              )}
              {it.unread && !opts.archivedRow && (
                <Badge className="bg-emerald-500 text-white border-0 text-[9px] py-0 px-1.5 h-4">Nouveau</Badge>
              )}
            </span>
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              {it.last_at && (
                <span className="text-[10px] text-muted-foreground/80">
                  {new Date(it.last_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          <p className="text-xs text-muted-foreground truncate">
            {previewLine}
            {it.price ? ` · ${Number(it.price).toLocaleString("fr-FR")} FCFA` : ""}
            {it.city ? ` · ${it.city}` : ""}
          </p>
        </div>
        {opts.archivedRow ? (
          <button
            onClick={(e) => unarchive(it.key, e)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            aria-label="Désarchiver"
          >
            <ArchiveRestore className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={(e) => archive(it.key, e)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            aria-label="Archiver"
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="border-b">
      {fresh.length > 0 && (
        <div className="px-4 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Conversations produit
          </span>
          {fresh.length > VISIBLE_DEFAULT && (
            <button
              onClick={toggleExpanded}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Réduire <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Voir tout ({fresh.length}) <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      <ul className="divide-y">
        {visible.map((it) => renderRow(it, { pinned: it.key === latestKey }))}
      </ul>

      {(archivedItems.length > 0 || autoOld.length > 0) && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1"
          >
            <Archive className="h-3 w-3" />
            {showArchived ? "Masquer" : "Voir"} archivés ({archivedItems.length + autoOld.length})
            {showArchived ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      )}

      {showArchived && (
        <ul className="divide-y opacity-80">
          {[...archivedItems, ...autoOld].map((it) => renderRow(it, { archivedRow: true }))}
        </ul>
      )}
    </div>
  );
}
