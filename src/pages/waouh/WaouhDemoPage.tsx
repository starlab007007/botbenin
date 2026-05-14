import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, ShoppingBag, Search, Handshake, CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { from: "user" | "waouh"; text: string; ts: Date };
type Log = { fn: string; req: any; res: any; ts: Date };

const SCENARIOS: Record<string, string> = {
  sell: "Je vends mon iPhone 14 Pro 256Go noir comme neuf 650 000 FCFA, je suis à Cotonou Akpakpa",
  buy: "Je cherche un iPhone autour de moi à Cotonou max 700 000 FCFA",
  negotiate: "Je propose 580 000 FCFA pour l'iPhone",
  pay: "Je paye en Mobile Money, mon numéro 97123456",
};

const DEMO_PHONE = "+22999999000";

export default function WaouhDemoPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "waouh", text: "👋 Bienvenue dans la démo WAOUH. Choisissez un scénario ou tapez un message.", ts: new Date() },
  ]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { from: "user", text, ts: new Date() }]);
    setInput("");
    const req = { phone_number: DEMO_PHONE, text, lat: 6.36, lng: 2.42, city: "Cotonou", demo: true };
    try {
      const { data, error } = await supabase.functions.invoke("waouh-webhook", { body: req });
      setLogs((l) => [{ fn: "waouh-webhook", req, res: data ?? error, ts: new Date() }, ...l].slice(0, 30));
      const reply = (data as any)?.reply ?? "(aucune réponse)";
      setMessages((m) => [...m, { from: "waouh", text: reply, ts: new Date() }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "waouh", text: `Erreur: ${e.message}`, ts: new Date() }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--waouh-bg))] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link to="/waouh"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Retour WAOUH</Button></Link>
          <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-waouh-ai" /> Démo conversation WAOUH</h1>
          <div className="text-sm text-muted-foreground">{DEMO_PHONE}</div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Chat simulator */}
          <Card className="bg-[#0b141a] border-[hsl(var(--waouh-border))] overflow-hidden flex flex-col h-[75dvh]">
            <div className="bg-[#202c33] p-3 flex items-center gap-2 border-b border-[#2a3942]">
              <div className="w-9 h-9 rounded-full bg-waouh-primary/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-waouh-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">WAOUH</p>
                <p className="text-xs text-green-400">en ligne</p>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "#0b141a" }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.from === "user" ? "bg-[#005c4b] text-white" : "bg-[#202c33] text-white"}`}>
                    <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                    <p className="text-[10px] opacity-60 mt-1 text-right">{m.ts.toLocaleTimeString().slice(0, 5)}</p>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full waouh-typing-dot" />
                      <span className="w-1.5 h-1.5 bg-white rounded-full waouh-typing-dot" />
                      <span className="w-1.5 h-1.5 bg-white rounded-full waouh-typing-dot" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-[#202c33] p-2 border-t border-[#2a3942]">
              <div className="flex gap-2 mb-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => send(SCENARIOS.sell)} disabled={busy}><ShoppingBag className="w-3 h-3 mr-1" /> Vendre</Button>
                <Button size="sm" variant="outline" onClick={() => send(SCENARIOS.buy)} disabled={busy}><Search className="w-3 h-3 mr-1" /> Acheter</Button>
                <Button size="sm" variant="outline" onClick={() => send(SCENARIOS.negotiate)} disabled={busy}><Handshake className="w-3 h-3 mr-1" /> Négocier</Button>
                <Button size="sm" variant="outline" onClick={() => send(SCENARIOS.pay)} disabled={busy}><CreditCard className="w-3 h-3 mr-1" /> Payer</Button>
              </div>
              <div className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Tapez un message..." className="bg-[#2a3942] border-none text-white" />
                <Button onClick={() => send(input)} disabled={busy} className="bg-waouh-success text-white"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>

          {/* AI logs */}
          <Card className="bg-card border-[hsl(var(--waouh-border))] p-4 h-[75dvh] overflow-y-auto">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-waouh-ai"><Sparkles className="w-4 h-4" /> Logs IA & Edge Functions</h3>
            {logs.length === 0 && <p className="text-sm text-muted-foreground">Les appels apparaîtront ici en temps réel.</p>}
            <div className="space-y-3">
              {logs.map((l, i) => (
                <div key={i} className="border border-[hsl(var(--waouh-border))] rounded p-2 text-xs font-mono">
                  <div className="flex justify-between mb-1">
                    <span className="text-waouh-primary">{l.fn}</span>
                    <span className="text-muted-foreground">{l.ts.toLocaleTimeString()}</span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">requête</summary>
                    <pre className="mt-1 overflow-x-auto p-2 bg-[hsl(var(--waouh-bg))] rounded">{JSON.stringify(l.req, null, 2)}</pre>
                  </details>
                  <details open>
                    <summary className="cursor-pointer text-waouh-success">réponse</summary>
                    <pre className="mt-1 overflow-x-auto p-2 bg-[hsl(var(--waouh-bg))] rounded">{JSON.stringify(l.res, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
