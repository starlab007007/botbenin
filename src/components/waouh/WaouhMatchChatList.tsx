import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMatchLabel } from "@/app-mobile/utils/chatLabel";

type MatchItem = {
  key: string;
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

/**
 * Lists product-scoped chats (buyer & seller side) directly under the pinned
 * WAOUH conversation in the inbox.
 *
 * Source = waouh_notifications of type {match, match_buyer, match_seller, new_buyer}
 * scoped to the current user / session.
 */
export function WaouhMatchChatList({
  sessionId,
  authUserId,
}: {
  sessionId: string | null;
  authUserId?: string | null;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<MatchItem[]>([]);

  useEffect(() => {
    if (!sessionId && !authUserId) return;
    let active = true;

    (async () => {
      // Resolve linked waouh_users
      const ors: string[] = [];
      if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
      if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
      const { data: wusers } = await supabase
        .from("waouh_users")
        .select("id")
        .or(ors.join(","))
        .limit(50);
      const waouhIds = Array.from(new Set((wusers ?? []).map((u: any) => u.id)));

      const nOrs: string[] = [];
      if (sessionId) nOrs.push(`web_session_id.eq.${sessionId}`);
      if (waouhIds.length) nOrs.push(`user_id.in.(${waouhIds.join(",")})`);
      if (nOrs.length === 0) return;

      const { data: notifs } = await supabase
        .from("waouh_notifications" as any)
        .select("id,notification_type,payload,photos,sent_at,article_id,opened")
        .in("notification_type", ["match", "match_buyer", "match_seller", "new_buyer"])
        .or(nOrs.join(","))
        .order("sent_at", { ascending: false })
        .limit(60);

      if (!active || !notifs?.length) return;

      // Group by (role + article_id + counterpart) → one chat per product/buyer pair
      const map = new Map<string, MatchItem>();
      for (const n of notifs as any[]) {
        const articleId: string | null = n.article_id;
        if (!articleId) continue;
        const role: "buyer" | "seller" =
          n.notification_type === "match_seller" || n.notification_type === "new_buyer"
            ? "seller"
            : "buyer";
        const buyerProfileId = n.payload?.buyer_profile_id ?? null;
        const counterpartUserId = n.payload?.counterpart_user_id ?? null;
        const counterpartKey = buyerProfileId || counterpartUserId || "any";
        const key = `${role[0]}_${articleId}_${counterpartKey}`;
        if (map.has(key)) continue;
        const photo =
          (Array.isArray(n.photos) && n.photos[0]) ||
          (Array.isArray(n.payload?.photos) && n.payload.photos[0]) ||
          n.payload?.image_url ||
          null;
        map.set(key, {
          key,
          article_id: articleId,
          buyer_profile_id: buyerProfileId,
          counterpart_user_id: counterpartUserId,
          role,
          title: n.payload?.title || "Annonce",
          price: n.payload?.price ?? null,
          city: n.payload?.city ?? null,
          photo,
          unread: !n.opened,
          last_at: n.sent_at,
        });
      }
      setItems(Array.from(map.values()));
    })();

    return () => {
      active = false;
    };
  }, [sessionId, authUserId]);

  if (items.length === 0) return null;

  const open = (item: MatchItem) => {
    // Navigate to the WAOUH chat screen and ask it to open this product chat.
    navigate("/app/chat/waouh");
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("waouh:open-match-chat", {
          detail: {
            article_id: item.article_id,
            buyer_profile_id: item.buyer_profile_id,
            counterpart_user_id: item.counterpart_user_id,
            kind: item.role,
            title: item.title,
            price: item.price,
            city: item.city,
            photo: item.photo,
          },
        })
      );
    }, 50);
  };

  return (
    <ul className="divide-y border-b">
      {items.map((it) => {
        const label = formatMatchLabel({
          articleId: it.article_id,
          userKey: it.buyer_profile_id || it.counterpart_user_id || sessionId || "any",
          role: it.role,
        });
        return (
          <li
            key={it.key}
            onClick={() => open(it)}
            className="flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer"
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
                  {it.unread && (
                    <Badge className="bg-emerald-500 text-white border-0 text-[9px] py-0 px-1.5 h-4">
                      Nouveau
                    </Badge>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {it.role === "buyer"
                  ? "🎯 Annonce trouvée pour vous"
                  : "🛒 Acheteur intéressé par votre annonce"}
                {it.price ? ` · ${Number(it.price).toLocaleString("fr-FR")} FCFA` : ""}
                {it.city ? ` · ${it.city}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
