import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchChatMeta } from "./WaouhMatchChatWindow";

const STORAGE_KEY = (sid: string) => `waouh_open_matches_${sid}`;
const ACTIVE_KEY = (sid: string) => `waouh_active_match_${sid}`;

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

/**
 * Manages the list of open product-scoped chat tabs.
 * Listens for `waouh:open-match-chat` events fired from notifications/inbox.
 */
export function useWaouhMatchChats(sessionId: string, authUserId?: string | null) {
  const [matches, setMatches] = useState<MatchChatMeta[]>(() => loadOpen(sessionId));
  const [waouhIds, setWaouhIds] = useState<string[]>([]);
  const [activeKey, setActiveKeyState] = useState<string>(() => {
    const saved = loadActive(sessionId);
    const open = loadOpen(sessionId);
    // Only restore active key if the match is still in the open list
    if (saved !== "main" && !open.some((m) => m.key === saved)) return "main";
    return saved;
  });

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
      // Strict per-identity scoping (mirrors useWaouhMatchNotifications)
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

  useEffect(() => {
    const onOpen = async (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const articleId: string | null = detail.article_id ?? null;
      if (!articleId) return;

      const { data: art } = await supabase
        .from("waouh_articles")
        .select("id,title,price,city,photos")
        .eq("id", articleId)
        .maybeSingle();

      const role: "buyer" | "seller" = detail.kind === "buyer" ? "buyer" : "seller";
      const notificationId: string | null = detail.notification_id ?? null;
      // One tab per notification (or article+role fallback when no notif id).
      const key = notificationId
        ? `n_${notificationId}`
        : `${role[0]}_${articleId}`;

      const meta: MatchChatMeta = {
        key,
        article_id: articleId,
        notification_id: notificationId,
        seed_text: detail.seed_text ?? null,
        buyer_profile_id: detail.buyer_profile_id ?? null,
        counterpart_user_id: detail.counterpart_user_id ?? null,
        title: art?.title || detail.title || "Annonce",
        price: art?.price ?? detail.price ?? null,
        city: art?.city ?? detail.city ?? null,
        photo: (Array.isArray(art?.photos) && art!.photos[0]) || detail.photo || null,
        kind: role,
      };
      setMatches((prev) => {
        if (prev.some((m) => m.key === meta.key)) {
          setActiveKey(meta.key);
          return prev;
        }
        const next = [meta, ...prev].slice(0, 10);
        saveOpen(sessionId, next);
        return next;
      });
      setActiveKey(meta.key);
      window.dispatchEvent(
        new CustomEvent("waouh:match-updated", { detail: { article_id: articleId } })
      );

      // Buyer-side: notify the seller that this article got real interest.
      // Edge function dedupes per (article, buyer) so it's safe to call repeatedly.
      if (role === "buyer" && articleId) {
        supabase.functions
          .invoke("waouh-buyer-interest", {
            body: { article_id: articleId, source: detail.source || "match" },
          })
          .catch((e) => console.debug("[waouh-buyer-interest] invoke failed", e));
      }
    };
    window.addEventListener("waouh:open-match-chat", onOpen as EventListener);
    return () => window.removeEventListener("waouh:open-match-chat", onOpen as EventListener);
  }, [sessionId]);


  const close = useCallback(
    (key: string) => {
      setMatches((prev) => {
        const next = prev.filter((m) => m.key !== key);
        saveOpen(sessionId, next);
        return next;
      });
      setActiveKey((cur) => (cur === key ? "main" : cur));
      // Auto-archive in the inbox list so closed windows disappear from the visible list
      try {
        const aKey = `waouh_archived_matches_${sessionId}`;
        const raw = localStorage.getItem(aKey);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        if (!arr.includes(key)) {
          arr.push(key);
          localStorage.setItem(aKey, JSON.stringify(arr));
        }
      } catch {}
    },
    [sessionId]
  );


  return { matches, waouhIds, activeKey, setActiveKey, close };
}
