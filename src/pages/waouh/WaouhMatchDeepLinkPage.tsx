import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SESSION_KEY = "waouh_web_session_id";
const PENDING_OPEN_KEY = "waouh_pending_open";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function parseCanonicalKey(key: string) {
  const match = key.match(/^art_(.+)_(buyer|seller)_(.+)$/);
  if (!match) return null;
  return {
    key,
    article_id: match[1],
    kind: match[2] as "buyer" | "seller",
    counterpart_user_id: match[3] === "any" ? null : match[3],
    title: "Négociation WAOUH",
    price: null,
    source: "deep_link",
  };
}

export default function WaouhMatchDeepLinkPage() {
  const { key = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const sid = getSessionId();
    let detail: any = null;
    try {
      const open = JSON.parse(localStorage.getItem(`waouh_open_matches_${sid}`) || "[]");
      if (Array.isArray(open)) detail = open.find((item) => item?.key === key) || null;
    } catch {}

    detail ||= parseCanonicalKey(key);

    if (detail) {
      try {
        const raw = localStorage.getItem(PENDING_OPEN_KEY);
        const current = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(current) ? current : [current];
        list.push(detail);
        localStorage.setItem(PENDING_OPEN_KEY, JSON.stringify(list.slice(-10)));
      } catch {}
    }

    navigate(window.innerWidth >= 1180 ? "/" : "/app/chat/waouh", { replace: true });
  }, [key, navigate]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
        Ouverture de la Deal Room…
      </div>
    </div>
  );
}
