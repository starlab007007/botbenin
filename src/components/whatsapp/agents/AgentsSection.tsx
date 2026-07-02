import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAiAgents, AiAgent } from "@/hooks/useAiAgents";
import { CreateAgentWizard } from "./CreateAgentWizard";
import { LiveConversationsDialog } from "./LiveConversationsDialog";
import { AgentInsightsDialog } from "./AgentInsightsDialog";
import { Bot, Plus, Play, Pause, MessageSquare, Send, Loader2, Radio, BarChart3, ShoppingBag, FileText, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AgentsSection() {
  const { agents, loading } = useAiAgents();
  const [wizard, setWizard] = useState(false);
  const [testing, setTesting] = useState<AiAgent | null>(null);
  const [live, setLive] = useState<AiAgent | null>(null);
  const [insights, setInsights] = useState<AiAgent | null>(null);

  return (
    <Card className="border-green-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-green-600" />
          Mes Agents IA WhatsApp
          <Badge variant="secondary">{agents.length}</Badge>
        </CardTitle>
        <Button size="sm" onClick={() => setWizard(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-1" />Nouvel agent
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Chargement…</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-3">
              Créez votre premier agent IA. Il répondra automatiquement sur WhatsApp,
              selon votre catalogue et votre personnalité.
            </p>
            <Button onClick={() => setWizard(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />Créer mon agent IA
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a}
                onTest={() => setTesting(a)}
                onLive={() => setLive(a)}
                onInsights={() => setInsights(a)} />
            ))}
          </div>
        )}
      </CardContent>

      <CreateAgentWizard open={wizard} onClose={() => setWizard(false)} />
      {testing && <SandboxDialog agent={testing} onClose={() => setTesting(null)} />}
      {live && <LiveConversationsDialog agent={live} onClose={() => setLive(null)} />}
      {insights && <AgentInsightsDialog agent={insights} onClose={() => setInsights(null)} />}
    </Card>
  );
}

function AgentCard({ agent, onTest }: { agent: AiAgent; onTest: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const stats = agent.stats || {};
  const toggleStatus = async () => {
    setBusy(true);
    const next = agent.status === "active" ? "paused" : "active";
    const { error } = await (supabase as any).from("waouh_ai_agents").update({ status: next }).eq("id", agent.id);
    setBusy(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
  };
  return (
    <div className="border rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold flex items-center gap-2">
            {agent.name}
            <Badge variant={agent.status === "active" ? "default" : "secondary"} className={agent.status === "active" ? "bg-green-500" : ""}>
              {agent.status}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {agent.persona?.name} · {agent.sector} · {agent.waha_session_name || "non connecté"}
          </div>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>💬 {stats.messages_handled || 0} msg</span>
        <span>🤝 {stats.handoffs || 0} handoffs</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onTest}>
          <MessageSquare className="w-3 h-3 mr-1" />Tester
        </Button>
        {agent.waha_session_name && (
          <Button size="sm" variant={agent.status === "active" ? "outline" : "default"} onClick={toggleStatus} disabled={busy}>
            {agent.status === "active" ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            {agent.status === "active" ? "Pause" : "Activer"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SandboxDialog({ agent, onClose }: { agent: AiAgent; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-agent-chat", {
        body: { agent_id: agent.id, message: q, history: msgs, persist: false },
      });
      if (error) throw error;
      setMsgs((m) => [...m, { role: "assistant", content: data?.reply || "…" }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>🧪 Test — {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded min-h-[300px]">
          {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Envoyez un message comme le ferait un client.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-green-500 text-white" : "bg-white border"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-1" />L'agent réfléchit…</div>}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tapez comme un client WhatsApp…" />
          <Button onClick={send} disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
