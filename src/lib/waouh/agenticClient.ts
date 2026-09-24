import { supabase } from "@/integrations/supabase/client";
import { type AgenticAction, unwrapAgenticEnvelope } from "./agenticContracts";
import { WAOUH_RUNTIME_ENDPOINTS } from "./runtimeEndpoints";

export async function invokeWaouhAgentic<T>(action: AgenticAction, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(WAOUH_RUNTIME_ENDPOINTS.agenticCore, {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Impossible de joindre le service agentique WAOUH.");
  return unwrapAgenticEnvelope<T>(data);
}

export function moneyXof(value: number | null | undefined, currency = "XOF") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function relativeAgentTime(value?: string | null) {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const deltaMinutes = Math.round((timestamp - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) return formatter.format(deltaHours, "hour");
  return formatter.format(Math.round(deltaHours / 24), "day");
}