import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { AiAgent } from "@/hooks/useAiAgents";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, UserCog, Bot, Volume2, VolumeX, RefreshCw } from "lucide-react";

interface Conversation {
  id: string;
  agent_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message_at: string;
  human_takeover: boolean;
  messages: Array<{ role: string; content: string; ts?: string; by?: string }>;
  operator_messages?: any[];
}

export function LiveConversationsDialog({ agent, onClose }: { agent: AiAgent; onClose: () => void }) {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState<Set<string>>(new Set(agent.paused_contacts || []));
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("waouh_ai_agent_conversations")
      .select("*")
      .eq("agent_id", agent.id)
      .order("last_message_at", { ascending: false })
      .limit(50);
    setConvs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`agent_conv_${agent.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "waouh_ai_agent_conversations", filter: `agent_id=eq.${agent.id}` },
        (payload) => {
          const row = payload.new as Conversation;
          if (!row) return;
          setConvs((prev) => {
            const other = prev.filter((c) => c.id !== row.id);
            return [row, ...other].sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));
          });
          setSelected((s) => (s?.id === row.id ? row : s));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selected?.messages?.length]);

  const toggleTakeover = async (v: boolean) => {
    if (!selected) return;
    const { error } = await supabase.functions.invoke("waouh-agent-manual-reply", {
      body: { agent_id: agent.id, conversation_id: selected.id, action: "takeover", enabled: v },
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: v ? "Vous contrôlez la conversation" : "Bot repris" });
  };

  const togglePause = async (phone: string) => {
    const willPause = !paused.has(phone);
    const { error } = await supabase.functions.invoke("waouh-agent-manual-reply", {
      body: { agent_id: agent.id, action: "pause_contact", contact_phone: phone, paused: willPause },
    });
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setPaused((prev) => {
      const s = new Set(prev);
      willPause ? s.add(phone) : s.delete(phone);
      return s;
    });
  };

  const sendManual = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("waouh-agent-manual-reply", {
        body: {
          agent_id: agent.id, conversation_id: selected.id,
          action: "send", contact_phone: selected.contact_phone, text: reply.trim(),
        },
      });
      if (error) throw error;
      setReply("");
    } catch (e: any) {
      toast({ title: "Erreur envoi", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85dvh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-green-600" />
            💬 Conversations en direct — {agent.name}
            <Badge variant="secondary" className="ml-2">{convs.length}</Badge>
            <Button size="sm" variant="ghost" onClick={load} className="ml-auto">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className="w-72 border-r overflow-y-auto">
            {loading && <div className="p-4 text-sm text-muted-foreground">Chargement…</div>}
            {!loading && convs.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Aucune conversation. L'agent doit être connecté à WhatsApp.
              </div>
            )}
            {convs.map((c) => {
              const isPaused = paused.has(c.contact_phone);
              const last = c.messages?.[c.messages.length - 1];
              return (
                <button key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/40 ${selected?.id === c.id ? "bg-green-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate">{c.contact_name || c.contact_phone}</div>
                    <div className="flex gap-1">
                      {c.human_takeover && <Badge className="bg-orange-500 text-white text-[10px]">MANUEL</Badge>}
                      {isPaused && <Badge variant="secondary" className="text-[10px]">⏸</Badge>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {last?.role === "user" ? "👤 " : "🤖 "}{last?.content || "…"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.last_message_at).toLocaleString("fr-FR")}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className="flex-1 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Sélectionnez une conversation
              </div>
            ) : (
              <>
                <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                  <div>
                    <div className="font-semibold text-sm">{selected.contact_name || selected.contact_phone}</div>
                    <div className="text-xs text-muted-foreground">{selected.contact_phone}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs">
                      {paused.has(selected.contact_phone) ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      <span>Bot</span>
                      <Switch checked={!paused.has(selected.contact_phone)} onCheckedChange={() => togglePause(selected.contact_phone)} />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <UserCog className="w-3 h-3" />
                      <span>Prendre la main</span>
                      <Switch checked={selected.human_takeover} onCheckedChange={toggleTakeover} />
                    </div>
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
                  {(selected.messages || []).map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-white border"
                          : m.by === "human"
                            ? "bg-orange-100 border border-orange-300"
                            : "bg-green-500 text-white"
                      }`}>
                        {m.by === "human" && <div className="text-[10px] font-semibold text-orange-700 mb-0.5">👤 Vous</div>}
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t flex gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendManual()}
                    placeholder={selected.human_takeover ? "Répondre manuellement…" : "Envoyer un message (met le bot en pause auto)"} />
                  <Button onClick={sendManual} disabled={sending || !reply.trim()} className="bg-green-600 hover:bg-green-700">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
