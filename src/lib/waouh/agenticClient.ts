import { supabase } from "@/integrations/supabase/client";
import { type AgenticAction, unwrapAgenticEnvelope } from "./agenticContracts";
import { WAOUH_RUNTIME_ENDPOINTS } from "./runtimeEndpoints";

export async function invokeWaouhAgentic<T>(action: AgenticAction, payload: Record<string, unknown> = {}): Promise<T> {
  const request = () => supabase.functions.invoke(WAOUH_RUNTIME_ENDPOINTS.agenticCore, {
    body: { action, payload },
  });
  let { data, error } = await request();
  if (error?.context instanceof Response && error.context.status === 401) {
    // A 401 is rejected before any action executes. Refresh an existing session
    // once; never retry timeouts, server errors or an anonymous request.
    const { data: current } = await supabase.auth.getSession();
    if (current.session) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session) ({ data, error } = await request());
    }
  }
  if (error) {
    // FunctionsHttpError carries the server response; retain its status/code instead
    // of replacing every authentication/provider failure with a generic message.
    let detail: { error?: string | { message?: string; code?: string }; message?: string; code?: string } | null = null;
    const response = error.context instanceof Response ? error.context : null;
    if (response) {
      try { detail = await response.clone().json(); } catch { /* Non-JSON gateway response. */ }
    }
    const serverError = detail?.error;
    const message = typeof serverError === "string" ? serverError : serverError?.message;
    throw Object.assign(new Error(message || detail?.message || error.message || "Impossible de joindre le service agentique WAOUH."), {
      status: response?.status,
      code: (typeof serverError === "object" ? serverError?.code : undefined) || detail?.code,
    });
  }
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