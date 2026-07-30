import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchChatMeta } from "./WaouhMatchChatWindow";

export type CachedMsg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: any;
  meta?: any;
};

// Canonical key. v13: BOTH sides discriminate per counterpart so a window is
// always strictly 1 article × 1 interlocuteur.
//   seller → art_<articleId>_seller_<buyerId|any>
//   buyer  → art_<articleId>_buyer_<sellerId|any>
export function matchKey(
  articleId: string | null | undefined,
  role: "buyer" | "seller",
  counterpartId?: string | null
): string {
  if (role === "seller") {
    return `art_${articleId ?? "none"}_seller_${counterpartId ?? "any"}`;
  }
  return `art_${articleId ?? "none"}_buyer_${counterpartId ?? "any"}`;
}



const STORAGE_KEY = (sid: string) => `waouh_open_matches_${sid}`;
const ACTIVE_KEY = (sid: string) => `waouh_active_match_${sid}`;
const SNAPSHOT_KEY = (sid: string, key: string) => `waouh_match_msgs_${sid}_${key}`;
const HASMORE_KEY = (sid: string, key: string) => `waouh_match_hasmore_${sid}_${key}`;
const PENDING_OPEN_KEY = "waouh_pending_open";
const SNAPSHOT_LIMIT = 300;

function loadOpen(sid: string): MatchChatMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOpen(sid: string, list: MatchChatMeta[]) {
  try {
    localStorage.setItem(STORAGE_KEY(sid), JSON.stringify(list.slice(0, 10)));
  } catch {}
}

function loadActive(sid: string): string {
  try {
    return localStorage.getItem(ACTIVE_KEY(sid)) || "main";
  } catch {
    return "main";
  }
}

function saveActive(sid: string, key: string) {
  try {
    localStorage.setItem(ACTIVE_KEY(sid), key);
  } catch {}
}

function mergeSnapshots(a: CachedMsg[], b: CachedMsg[]): CachedMsg[] {
  const seen = new Map<string, CachedMsg>();
  for (const m of [...a, ...b]) {
    if (!m || !m.id) continue;
    if (!seen.has(m.id)) seen.set(m.id, m);
  }
  return Array.from(seen.values()).sort(
    (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
  );
}

/**
 * One-time migration: rename legacy snapshot/tab keys
 *   - `n_<notifId>`           (notification-scoped)
 *   - `msg_<articleId>_<role>` (message-fallback)
 *   - `b_<articleId>` / `s_<articleId>` (early fallback)
 * to the canonical `art_<articleId>_<role>` key, merging histories.
 */
function migrateLegacyKeys(sid: string, openTabs: MatchChatMeta[]): MatchChatMeta[] {
  const MIGRATION_FLAG = `waouh_keys_migrated_v4_${sid}`;
  const LEGACY_FLAG_V3 = `waouh_keys_migrated_v3_${sid}`;
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return openTabs;
    // v13 : la migration v4 doit rejouer même si v3 a déjà tourné.
    localStorage.removeItem(LEGACY_FLAG_V3);
  } catch {
    return openTabs;
  }


  // 1) Migrate snapshot blobs
  const prefix = `waouh_match_msgs_${sid}_`;
  const legacyEntries: { oldKey: string; canonical: string | null; msgs: CachedMsg[] }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const tail = k.slice(prefix.length);
      // v13 canonical: art_<id>_<buyer|seller>_<counterpart|any>
      if (tail.startsWith("art_") && /_(buyer|seller)_.+$/.test(tail)) continue;
      let canonical: string | null = null;
      // v11/v12 legacy: art_<id>_seller | art_<id>_buyer (no counterpart) → _any
      let m = tail.match(/^art_(.+)_(buyer|seller)$/);
      if (m) canonical = matchKey(m[1], m[2] as any, null);

      // msg_<art>_<role>
      if (!canonical) {
        m = tail.match(/^msg_(.+)_(buyer|seller)$/);
        if (m) canonical = matchKey(m[1], m[2] as any, null);
      }
      if (!canonical) {
        // b_<art> / s_<art>
        m = tail.match(/^([bs])_(.+)$/);
        if (m) canonical = matchKey(m[2], m[1] === "b" ? "buyer" : "seller", null);
      }

      // n_<notifId>: needs articleId+role from openTabs meta, defer
      let parsed: CachedMsg[] = [];
      try {
        parsed = JSON.parse(localStorage.getItem(k) || "[]");
      } catch {}
      legacyEntries.push({ oldKey: k, canonical, msgs: parsed });
    }
  } catch {}

  // 2) Map open tabs to canonical, capturing notification_ids.
  // v12: seller tabs need a counterpart_user_id; legacy seller tabs without
  // one are migrated to the `_any` bucket so existing history isn't lost.
  const canonicalTabs = new Map<string, MatchChatMeta>();
  for (const t of openTabs) {
    if (!t.article_id) continue;
    const role = (t.kind || "buyer") as "buyer" | "seller";
    const counterpart = role === "seller" ? (t.counterpart_user_id ?? null) : null;
    const ck = matchKey(t.article_id, role, counterpart);
    const existing = canonicalTabs.get(ck);
    const nIds = new Set<string>([
      ...((t as any).notification_ids || []),
      ...(t.notification_id ? [t.notification_id] : []),
      ...(existing ? ((existing as any).notification_ids || []) : []),
    ]);
    canonicalTabs.set(ck, {
      ...(existing || t),
      ...t,
      key: ck,
      notification_id: t.notification_id ?? existing?.notification_id ?? null,
      notification_ids: Array.from(nIds),
    } as MatchChatMeta);
  }


  // 3) Resolve n_<notifId> snapshots by matching against canonicalTabs notification_ids
  for (const entry of legacyEntries) {
    if (entry.canonical) continue;
    const tail = entry.oldKey.slice(prefix.length);
    const m = tail.match(/^n_(.+)$/);
    if (!m) continue;
    const notifId = m[1];
    for (const [ck, tab] of canonicalTabs) {
      if ((tab as any).notification_ids?.includes(notifId)) {
        entry.canonical = ck;
        break;
      }
    }
  }

  // 4) Merge into canonical snapshots, drop legacy keys
  const grouped = new Map<string, CachedMsg[]>();
  for (const entry of legacyEntries) {
    if (!entry.canonical) {
      try { localStorage.removeItem(entry.oldKey); } catch {}
      continue;
    }
    const cur = grouped.get(entry.canonical) || [];
    grouped.set(entry.canonical, mergeSnapshots(cur, entry.msgs));
    try { localStorage.removeItem(entry.oldKey); } catch {}
  }
  for (const [ck, msgs] of grouped) {
    try {
      const existing = JSON.parse(localStorage.getItem(SNAPSHOT_KEY(sid, ck)) || "[]") as CachedMsg[];
      const merged = mergeSnapshots(existing, msgs).slice(-SNAPSHOT_LIMIT);
      localStorage.setItem(SNAPSHOT_KEY(sid, ck), JSON.stringify(merged));
    } catch {}
  }

  // 5) Persist canonical open tabs
  const migrated = Array.from(canonicalTabs.values());
  saveOpen(sid, migrated);

  // 6) Fix active key if it pointed to a legacy key
  try {
    const active = loadActive(sid);
    if (active !== "main" && !migrated.some((t) => t.key === active)) {
      // try to resolve legacy active
      if (active.startsWith("n_")) {
        const notifId = active.slice(2);
        const t = migrated.find((x) => (x as any).notification_ids?.includes(notifId));
        saveActive(sid, t?.key || "main");
      } else {
        saveActive(sid, "main");
      }
    }
  } catch {}

  try { localStorage.setItem(MIGRATION_FLAG, "1"); } catch {}
  return migrated;
}

/**
 * Manages the list of open product-scoped chat tabs.
 * Listens for `waouh:open-match-chat` events fired from notifications/inbox,
 * and also drains a localStorage "pending open" buffer at mount-time so
 * cross-screen navigations don't lose the open intent.
 */
export function useWaouhMatchChats(sessionId: string, authUserId?: string | null) {
  const [matches, setMatches] = useState<MatchChatMeta[]>(() =>
    migrateLegacyKeys(sessionId, loadOpen(sessionId))
  );
  const [waouhIds, setWaouhIds] = useState<string[]>([]);
  const [activeKey, setActiveKeyState] = useState<string>(() => {
    const saved = loadActive(sessionId);
    const open = loadOpen(sessionId);
    if (saved !== "main" && !open.some((m) => m.key === saved)) return "main";
    return saved;
  });

  // Per-match in-memory message cache. Survives window mount/unmount when
  // user switches tabs. Bootstraps from localStorage snapshot (up to 300 msgs).
  const msgCacheRef = useRef<Map<string, CachedMsg[]>>(new Map());
  const hasMoreCacheRef = useRef<Map<string, boolean>>(new Map());

  const getCached = useCallback((key: string): CachedMsg[] => {
    const mem = msgCacheRef.current.get(key);
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY(sessionId, key));
      if (raw) {
        const arr = JSON.parse(raw) as CachedMsg[];
        msgCacheRef.current.set(key, arr);
        return arr;
      }
    } catch {}
    return [];
  }, [sessionId]);

  const setCached = useCallback((key: string, msgs: CachedMsg[]) => {
    msgCacheRef.current.set(key, msgs);
    try {
      const snap = msgs.slice(-SNAPSHOT_LIMIT);
      localStorage.setItem(SNAPSHOT_KEY(sessionId, key), JSON.stringify(snap));
    } catch {}
  }, [sessionId]);

  const getHasMore = useCallback((key: string): boolean => {
    const mem = hasMoreCacheRef.current.get(key);
    if (mem !== undefined) return mem;
    try {
      const raw = localStorage.getItem(HASMORE_KEY(sessionId, key));
      if (raw === "0") {
        hasMoreCacheRef.current.set(key, false);
        return false;
      }
      if (raw === "1") {
        hasMoreCacheRef.current.set(key, true);
        return true;
      }
    } catch {}
    return true;
  }, [sessionId]);

  const setHasMoreCached = useCallback((key: string, v: boolean) => {
    hasMoreCacheRef.current.set(key, v);
    try {
      localStorage.setItem(HASMORE_KEY(sessionId, key), v ? "1" : "0");
    } catch {}
  }, [sessionId]);

  const setActiveKey = useCallback(
    (key: string | ((cur: string) => string)) => {
      setActiveKeyState((cur) => {
        const next = typeof key === "function" ? key(cur) : key;
        saveActive(sessionId, next);
        return next;
      });
    },
    [sessionId]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      let data: any[] | null = null;
      if (authUserId) {
        const res = await supabase
          .from("waouh_users").select("id").eq("auth_user_id", authUserId).limit(50);
        data = res.data ?? [];
      } else {
        const res = await supabase
          .from("waouh_users").select("id").eq("web_session_id", sessionId).limit(50);
        data = res.data ?? [];
      }
      if (!alive) return;
      setWaouhIds(Array.from(new Set((data ?? []).map((u: any) => u.id))));
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, authUserId]);

  // Open handler — canonical key, merges with existing tab, drains pending buffer.
  const openMatchFromDetail = useCallback(
    async (detail: any) => {
      const articleId: string | null = detail?.article_id ?? null;
      if (!articleId) return;
      const role: "buyer" | "seller" = detail.kind === "buyer" ? "buyer" : "seller";
      // v13: les DEUX côtés discriminent par contrepartie — une fenêtre
      // correspond toujours à 1 article × 1 interlocuteur.
      const counterpartForKey: string | null =
        detail.counterpart_user_id ??
        (role === "buyer" ? (detail.seller_user_id ?? null) : null);
      const key = matchKey(articleId, role, counterpartForKey);

      const notificationId: string | null = detail.notification_id ?? null;


      let art: any = null;
      try {
        const res = await supabase
          .from("waouh_articles")
          .select("id,title,price,city,photos")
          .eq("id", articleId)
          .maybeSingle();
        art = res.data;
      } catch {}

      setMatches((prev) => {
        const existing = prev.find((m) => m.key === key);
        const mergedNotifIds = Array.from(
          new Set<string>([
            ...((existing as any)?.notification_ids || []),
            ...(existing?.notification_id ? [existing.notification_id] : []),
            ...(notificationId ? [notificationId] : []),
          ])
        );
        const meta: MatchChatMeta = {
          key,
          article_id: articleId,
          notification_id: notificationId || existing?.notification_id || null,
          notification_ids: mergedNotifIds,
          seed_text: detail.seed_text ?? existing?.seed_text ?? null,
          buyer_profile_id:
            detail.buyer_profile_id ?? existing?.buyer_profile_id ?? null,
          counterpart_user_id:
            detail.counterpart_user_id ?? existing?.counterpart_user_id ?? null,
          title: art?.title || detail.title || existing?.title || "Annonce",
          price: art?.price ?? detail.price ?? existing?.price ?? null,
          city: art?.city ?? detail.city ?? existing?.city ?? null,
          photo:
            (Array.isArray(art?.photos) && art!.photos[0]) ||
            detail.photo ||
            existing?.photo ||
            null,
          kind: role,
        } as MatchChatMeta;

        let next: MatchChatMeta[];
        if (existing) {
          next = prev.map((m) => (m.key === key ? meta : m));
        } else {
          next = [meta, ...prev].slice(0, 10);
        }
        saveOpen(sessionId, next);
        return next;
      });
      setActiveKey(key);

      // Un-archive when reopening
      try {
        const aKey = `waouh_archived_matches_${sessionId}`;
        const raw = localStorage.getItem(aKey);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        const filtered = arr.filter((k) => k !== key);
        if (filtered.length !== arr.length) {
          localStorage.setItem(aKey, JSON.stringify(filtered));
        }
      } catch {}

      window.dispatchEvent(
        new CustomEvent("waouh:match-updated", { detail: { article_id: articleId } })
      );

      if (role === "buyer" && articleId) {
        supabase.functions
          .invoke("waouh-buyer-interest", {
            body: { article_id: articleId, source: detail.source || "match" },
          })
          .catch((e) => console.debug("[waouh-buyer-interest] invoke failed", e));
      }
    },
    [sessionId, setActiveKey]
  );

  // Drain the pending-open buffer at mount (fixes navigate→dispatch race).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_OPEN_KEY);
      if (raw) {
        localStorage.removeItem(PENDING_OPEN_KEY);
        const arr = JSON.parse(raw);
        const list = Array.isArray(arr) ? arr : [arr];
        for (const detail of list) {
          openMatchFromDetail(detail);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      openMatchFromDetail(detail);
    };
    window.addEventListener("waouh:open-match-chat", onOpen as EventListener);
    return () => window.removeEventListener("waouh:open-match-chat", onOpen as EventListener);
  }, [openMatchFromDetail]);

  const close = useCallback(
    (key: string) => {
      setMatches((prev) => {
        const next = prev.filter((m) => m.key !== key);
        saveOpen(sessionId, next);
        return next;
      });
      setActiveKey((cur) => (cur === key ? "main" : cur));
      // NOTE: We intentionally do NOT delete the cached snapshot
      // (SNAPSHOT_KEY/HASMORE_KEY) so reopening from the list restores the
      // full chat history. We also no longer auto-archive on close — the
      // conversation remains visible in WaouhMatchChatList.
    },
    [sessionId, setActiveKey]
  );

  return {
    matches,
    waouhIds,
    activeKey,
    setActiveKey,
    close,
    getCached,
    setCached,
    getHasMore,
    setHasMoreCached,
  };
}
