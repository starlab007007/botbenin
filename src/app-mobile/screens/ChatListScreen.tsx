import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { useWaouhIdentity } from "../hooks/useWaouhIdentity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatConvLabel,
  convInitials,
  channelBadge,
  type WaouhUserLike,
} from "../utils/chatLabel";

type Conv = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  last_message: string | null;
  updated_at: string;
  user_id: string | null;
};

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Aujourd'hui · ${time}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Hier · ${time}`;
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return `${d.toLocaleDateString("fr-FR", { weekday: "short" })} · ${time}`;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: d.getFullYear() === now.getFullYear() ? undefined : "2-digit",
  });
  return `${datePart} · ${time}`;
}

export default function ChatListScreen() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const { waouhUserIds, sessionId, ready } = useWaouhIdentity();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [users, setUsers] = useState<Record<string, WaouhUserLike>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    const load = async () => {
      const fields = "id,phone_number,channel,last_message,updated_at,user_id";
      const all: Record<string, Conv> = {};
      if (waouhUserIds.length) {
        const { data } = await supabase
          .from("waouh_conversations")
          .select(fields)
          .in("user_id", waouhUserIds)
          .order("updated_at", { ascending: false })
          .limit(200);
        (data ?? []).forEach((c: any) => { all[c.id] = c; });
      }
      // Also surface conversations reachable from this device's session messages
      if (sessionId) {
        const { data: msgs } = await supabase
          .from("waouh_messages")
          .select("conversation_id")
          .eq("web_session_id", sessionId)
          .not("conversation_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(500);
        const ids = Array.from(new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean)));
        const missing = ids.filter((id) => !all[id]);
        if (missing.length) {
          const { data: extra } = await supabase
            .from("waouh_conversations")
            .select(fields)
            .in("id", missing)
            .limit(200);
          (extra ?? []).forEach((c: any) => { all[c.id] = c; });
        }
      }
      const list = Object.values(all).sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Fetch user metadata for friendly labels
      const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean))) as string[];
      const userMap: Record<string, WaouhUserLike> = {};
      if (userIds.length) {
        const { data: us } = await supabase
          .from("waouh_users")
          .select("id,display_name,phone_number,channel,auth_user_id")
          .in("id", userIds);
        (us ?? []).forEach((u: any) => { userMap[u.id] = u; });
      }

      if (mounted) { setConvs(list); setUsers(userMap); setLoading(false); }
    };
    load();
    const channels: any[] = [];
    for (const uid of waouhUserIds) {
      channels.push(
        supabase.channel(`mobile-conv-list-${uid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "waouh_conversations", filter: `user_id=eq.${uid}` }, load)
          .subscribe()
      );
    }
    return () => { mounted = false; channels.forEach((c) => supabase.removeChannel(c)); };
  }, [ready, waouhUserIds.join("|"), sessionId]);

  const enriched = useMemo(
    () => convs.map((c) => {
      const u = c.user_id ? users[c.user_id] : null;
      const label = formatConvLabel(c, u);
      return { ...c, _label: label, _user: u, _badge: channelBadge(c.channel ?? u?.channel) };
    }),
    [convs, users]
  );

  const filtered = useMemo(
    () => enriched.filter((c) => {
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        c._label.toLowerCase().includes(needle) ||
        (c.last_message ?? "").toLowerCase().includes(needle) ||
        (c.phone_number ?? "").toLowerCase().includes(needle)
      );
    }),
    [enriched, q]
  );

  const convIds = useMemo(() => convs.map((c) => c.id), [convs]);
  const unread = useUnreadCounts(convIds, user?.id);

  const initials = (profile?.full_name ?? profile?.phone ?? "U").slice(0, 2).toUpperCase();

  const openWaouh = () => navigate("/app/chat/waouh");

  return (
    <div className="min-h-[100dvh] waouh-chat-list-bg">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/app/profile")} className="flex items-center gap-2 active:opacity-70">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-white/20 text-white text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">{profile?.full_name ?? "WaouhApp"}</div>
              <div className="text-[11px] text-white/70 leading-tight">{profile?.phone ?? "Mon compte"}</div>
            </div>
          </button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={openWaouh} aria-label="Nouveau chat WAOUH">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="pl-9 bg-white/15 border-0 text-white placeholder:text-white/60" />
          </div>
        </div>
      </header>

      <main>
        {/* Pinned WAOUH conversation — default AI assistant chat */}
        <button
          onClick={openWaouh}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted border-b bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20"
        >
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
            <ShoppingBag className="h-6 w-6 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-semibold truncate flex items-center gap-1.5">
                WAOUH
                <Badge className="bg-emerald-500 text-white border-0 text-[9px] py-0 px-1.5 h-4">IA</Badge>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">Toujours actif</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">Achetez · Vendez · Négociez par message</p>
          </div>
        </button>

        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <p className="font-medium mb-1">Aucune autre conversation</p>
            <p className="text-sm mb-4">Démarrez avec WAOUH ☝️</p>
            <Button onClick={openWaouh} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">
              <Plus className="h-4 w-4 mr-1" /> Nouveau chat WAOUH
            </Button>
          </div>
        )}

        <ul className="divide-y">
          {filtered.map((c) => {
            const n = unread[c.id] ?? 0;
            return (
              <li
                key={c.id}
                onClick={() => navigate(`/app/chat/${c.id}`)}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer bg-background/70 backdrop-blur-sm"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-[hsl(165_91%_25%)] text-white">{convInitials(c._label)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={"truncate flex items-center gap-1.5 " + (n > 0 ? "font-bold" : "font-semibold")}>
                      {c._label}
                      <Badge className={`${c._badge.tint} border-0 text-[9px] py-0 px-1.5 h-4`}>{c._badge.label}</Badge>
                    </span>
                    <span className={"text-xs shrink-0 ml-2 " + (n > 0 ? "text-[hsl(165_91%_30%)] font-semibold" : "text-muted-foreground")}>
                      {formatStamp(c.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={"text-sm truncate flex-1 " + (n > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.last_message ?? `Canal: ${c.channel ?? "—"}`}
                    </p>
                    {n > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[hsl(165_91%_35%)] text-white text-[11px] font-bold shrink-0">
                        {n > 99 ? "99+" : n}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
