import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


type Conv = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  last_message: string | null;
  updated_at: string;
};

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString();
}

export default function ChatListScreen() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("waouh_conversations")
        .select("id,phone_number,channel,last_message,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (mounted) { setConvs((data as any) ?? []); setLoading(false); }
    };
    load();
    const ch = supabase.channel("mobile-conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_conversations", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const filtered = useMemo(
    () => convs.filter(c => !q || (c.phone_number ?? "").includes(q) || (c.last_message ?? "").toLowerCase().includes(q.toLowerCase())),
    [convs, q]
  );

  const convIds = useMemo(() => convs.map(c => c.id), [convs]);
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
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Rechercher" className="pl-9 bg-white/15 border-0 text-white placeholder:text-white/60" />
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
          {filtered.map(c => {
            const n = unread[c.id] ?? 0;
            return (
              <li
                key={c.id}
                onClick={() => navigate(`/app/chat/${c.id}`)}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer bg-background/70 backdrop-blur-sm"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-[hsl(165_91%_25%)] text-white">{(c.phone_number ?? "?").slice(-2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className={"truncate " + (n > 0 ? "font-bold" : "font-semibold")}>{c.phone_number ?? "Inconnu"}</span>
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
