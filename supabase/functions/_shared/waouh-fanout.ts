// WAOUH — Appel de fan-out interne avec issue observable (E7).
// Avant : `fetch(...).catch(() => {})` — la publication répondait ok:true sans savoir si les acheteurs avaient été notifiés.
// Désormais : l'appel est attendu (délai borné), son issue est journalisée et renvoyée au client, sans jamais faire échouer la publication.

export interface FanoutResult {
  ok: boolean;
  status: number;
  /** Réponse du service appelé (tronquée) ou raison de l'échec. */
  detail: string;
}

export async function runFanout(
  url: string,
  init: { headers: Record<string, string>; body: unknown },
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch; label?: string } = {},
): Promise<FanoutResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const label = opts.label ?? "fanout";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: init.headers,
      body: JSON.stringify(init.body),
      signal: controller.signal,
    });
    const text = (await res.text().catch(() => "")).slice(0, 200);
    const ok = res.ok;
    if (!ok) console.error(`[${label}] échec ${res.status}`, text);
    return { ok, status: res.status, detail: text };
  } catch (error) {
    const aborted = (error as { name?: string })?.name === "AbortError";
    const detail = aborted ? "timeout" : String((error as Error)?.message ?? error);
    console.error(`[${label}] impossible`, detail);
    return { ok: false, status: 0, detail };
  } finally {
    clearTimeout(timer);
  }
}
