import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewChatSheet } from "../components/NewChatSheet";

type Conv = {
  id: string;
  phone_number: string | null;
  channel: string | null;
  last_message: string | null;
  updated_at: string;
};

export default function ChatListScreen() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);

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

  const filtered = convs.filter(c => !q || (c.phone_number ?? "").includes(q) || (c.last_message ?? "").toLowerCase().includes(q.toLowerCase()));
  const initials = (profile?.full_name ?? profile?.phone ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background">
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
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setNewOpen(true)}>
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
        {loading && <div className="p-8 text-center text-muted-foreground">Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium mb-1">Aucune conversation</p>
            <p className="text-sm mb-4">Démarrez votre premier Waouh Chat.</p>
            <Button onClick={() => setNewOpen(true)} className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">
              <Plus className="h-4 w-4 mr-1" /> Nouveau chat
            </Button>
          </div>
        )}
        <ul className="divide-y">
          {filtered.map(c => (
            <li key={c.id} onClick={() => navigate(`/app/chat/${c.id}`)} className="flex items-center gap-3 px-4 py-3 active:bg-muted cursor-pointer">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-[hsl(165_91%_25%)] text-white">{(c.phone_number ?? "?").slice(-2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold truncate">{c.phone_number ?? "Inconnu"}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.last_message ?? `Canal: ${c.channel ?? "—"}`}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <NewChatSheet open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
