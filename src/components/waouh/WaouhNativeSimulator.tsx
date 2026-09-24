import { useMemo, useState } from "react";
import { Loader2, MessageSquareText, RadioTower, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WAOUH_RUNTIME_ENDPOINTS } from "@/lib/waouh/runtimeEndpoints";

type NativeMode = "sms" | "rcs";

type SimulationResult = {
  ok: true;
  mode: NativeMode;
  rendered: {
    text: string;
    products?: Array<Record<string, unknown>>;
    actions?: Array<Record<string, unknown>>;
    attachments?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
  };
  segments?: string[];
  engine?: {
    intent?: string | null;
    correlation_id?: string | null;
    conversation_id?: string | null;
  };
  dry_run?: boolean;
};

const SESSION_KEY = "waouh_native_sim_session_v1";

function simulatorSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

export function WaouhNativeSimulator() {
  const [mode, setMode] = useState<NativeMode>("sms");
  const [text, setText] = useState("Je cherche un smartphone à Cotonou autour de 100 000 F CFA");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");

  const segments = useMemo(() => result?.segments || [], [result]);

  const runSimulation = async () => {
    const message = text.trim();
    if (!message) {
      setError("Écrivez un message à tester.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    const sessionId = simulatorSessionId();
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        WAOUH_RUNTIME_ENDPOINTS.nativeSimulator,
        {
          headers: { "x-waouh-session": sessionId },
          body: {
            mode,
            text: message,
            sessionId,
            city: "Cotonou",
          },
        },
      );
      if (invokeError || !data?.ok) {
        throw new Error(data?.error || invokeError?.message || "Simulation indisponible.");
      }
      setResult(data as SimulationResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Simulation indisponible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-8 border-emerald-300/15 bg-slate-950/70 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15">
              Mode test
            </Badge>
            <Badge variant="outline" className="border-white/15 text-slate-200">
              Aucun SMS réel envoyé
            </Badge>
          </div>
          <h2 className="mt-3 text-xl font-bold">Simulateur Native SMS / RCS</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Testez le vrai moteur WAOUH et le rendu Native sans numéro opérateur ni clé Infobip.
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("sms")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "sms" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <MessageSquareText className="h-4 w-4" />
            SMS
          </button>
          <button
            type="button"
            onClick={() => setMode("rcs")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "rcs" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <RadioTower className="h-4 w-4" />
            RCS
          </button>
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-5 min-h-28 border-white/10 bg-white/5 text-white placeholder:text-slate-500"
        placeholder="Ex. Je cherche un ordinateur portable à Cotonou..."
        maxLength={1600}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{text.length}/1600 caractères</p>
        <Button
          type="button"
          onClick={runSimulation}
          disabled={loading}
          className="bg-emerald-400 font-bold text-slate-950 hover:bg-emerald-300"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Tester en {mode.toUpperCase()}
        </Button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Rendu {result.mode.toUpperCase()}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">
              {result.rendered.text}
            </p>
            {result.mode === "sms" && segments.length > 1 ? (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold text-slate-400">{segments.length} segments SMS</p>
                {segments.map((segment, index) => (
                  <div key={`${index}-${segment.slice(0, 12)}`} className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300">
                    {segment}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Contrat WAOUH
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>Produits : <strong className="text-white">{result.rendered.products?.length || 0}</strong></p>
              <p>Actions : <strong className="text-white">{result.rendered.actions?.length || 0}</strong></p>
              <p>Pièces jointes : <strong className="text-white">{result.rendered.attachments?.length || 0}</strong></p>
              <p>Intent : <strong className="text-white">{result.engine?.intent || "—"}</strong></p>
              <p className="break-all text-xs text-slate-500">
                Corrélation : {result.engine?.correlation_id || "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
