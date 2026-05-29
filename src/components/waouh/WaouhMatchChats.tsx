import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WaouhMatchChatWindow, type MatchChatMeta } from "./WaouhMatchChatWindow";

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

export function WaouhMatchChats({ sessionId, authUserId }: { sessionId: string; authUserId?: string | null }) {
  const [matches, setMatches] = useState<MatchChatMeta[]>(() => loadOpen(sessionId));
  const [waouhIds, setWaouhIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
      const { data } = await supabase
        .from("waouh_users")
        .select("id")
        .or(ors.join(","))
        .limit(50);
      if (!active) return;
      setWaouhIds(Array.from(new Set((data ?? []).map((u: any) => u.id))));
    })();
    return () => {
      active = false;
    };
  }, [sessionId, authUserId]);

  // Listen for open-match-chat events from notifications
  useEffect(() => {
    const onOpen = async (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const articleId: string | null = detail.article_id ?? null;
      if (!articleId) return;

      // Fetch article info to populate the window
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
        if (prev.some((m) => m.key === meta.key)) return prev;
        const next = [meta, ...prev].slice(0, 10);
        saveOpen(sessionId, next);
        return next;
      });
    };
    window.addEventListener("waouh:open-match-chat", onOpen as EventListener);
    return () => window.removeEventListener("waouh:open-match-chat", onOpen as EventListener);
  }, [sessionId]);

  const close = (key: string) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.key !== key);
      saveOpen(sessionId, next);
      return next;
    });
  };

  if (matches.length === 0) return null;

  return (
    <div className="px-2 pt-2 pb-1 bg-background border-t border-border/40 max-h-[50vh] overflow-y-auto">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1">
        Discussions ({matches.length})
      </div>
      {matches.map((m) => (
        <WaouhMatchChatWindow
          key={m.key}
          match={m}
          sessionId={sessionId}
          waouhIds={waouhIds}
          onClose={() => close(m.key)}
        />
      ))}
    </div>
  );
}
