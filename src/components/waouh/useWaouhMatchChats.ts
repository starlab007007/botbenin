import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchChatMeta } from "./WaouhMatchChatWindow";

const STORAGE_KEY = (sid: string) => `waouh_open_matches_${sid}`;

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

/**
 * Manages the list of open product-scoped chat tabs.
 * Listens for `waouh:open-match-chat` events fired from notifications/inbox.
 */
export function useWaouhMatchChats(sessionId: string, authUserId?: string | null) {
  const [matches, setMatches] = useState<MatchChatMeta[]>(() => loadOpen(sessionId));
  const [waouhIds, setWaouhIds] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<string>("main");

  useEffect(() => {
    let alive = true;
    (async () => {
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
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
      const counterpartKey = detail.buyer_profile_id || detail.counterpart_user_id || "any";
      const key = `${role[0]}_${articleId}_${counterpartKey}`;

      const meta: MatchChatMeta = {
        key,
        article_id: articleId,
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
