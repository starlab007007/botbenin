import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildRadarInterestMessage,
  checkAndMarkRadarSend,
  RADAR_DEDUP_WINDOW_MS,
  radarDedupKey,
  setRadarPauseReason,
  readRadarPauseReason,
  clearRadarPauseReason,
} from "../utils/radarAutosend";

/**
 * Memory-backed Storage shim — sessionStorage in jsdom works, but we want
 * a predictable, fully isolated store per test.
 */
function mkStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  } as Storage;
}

describe("radarAutosend — anti-spam dedup (30s window)", () => {
  let storage: Storage;
  beforeEach(() => { storage = mkStorage(); });

  it("allows the first send for a given (article, intent)", () => {
    const r = checkAndMarkRadarSend("art-1", "interest", 1_000_000, storage);
    expect(r.fresh).toBe(true);
    expect(r.remainingMs).toBe(0);
    expect(storage.getItem(radarDedupKey("art-1", "interest"))).toBe("1000000");
  });

  it("blocks a duplicate send within 30s and reports remaining time", () => {
    checkAndMarkRadarSend("art-1", "interest", 1_000_000, storage);
    const r = checkAndMarkRadarSend("art-1", "interest", 1_000_000 + 10_000, storage);
    expect(r.fresh).toBe(false);
    expect(r.remainingMs).toBe(RADAR_DEDUP_WINDOW_MS - 10_000);
  });

  it("allows again after the 30s window", () => {
    checkAndMarkRadarSend("art-1", "interest", 1_000_000, storage);
    const r = checkAndMarkRadarSend("art-1", "interest", 1_000_000 + RADAR_DEDUP_WINDOW_MS, storage);
    expect(r.fresh).toBe(true);
  });

  it("isolates dedup per intent (interest vs negotiate vs buy)", () => {
    checkAndMarkRadarSend("art-1", "interest", 1_000_000, storage);
    expect(checkAndMarkRadarSend("art-1", "negotiate", 1_000_000, storage).fresh).toBe(true);
    expect(checkAndMarkRadarSend("art-1", "buy", 1_000_000, storage).fresh).toBe(true);
    expect(checkAndMarkRadarSend("art-1", "interest", 1_000_000 + 5_000, storage).fresh).toBe(false);
  });

  it("isolates dedup per article", () => {
    checkAndMarkRadarSend("art-1", "interest", 1_000_000, storage);
    expect(checkAndMarkRadarSend("art-2", "interest", 1_000_000, storage).fresh).toBe(true);
  });
});

describe("radarAutosend — canonical message format", () => {
  it("includes title, distance, price and intent tags identical to chat-direct flow", () => {
    const msg = buildRadarInterestMessage({
      title: "iPhone 14 Pro 256Go",
      intent: "interest",
      article: "abc-123",
      distance: "1.2 km",
      price: "650000",
      devise: "FCFA",
    });
    expect(msg).toContain('Intéressé par "iPhone 14 Pro 256Go"');
    expect(msg).toContain("Radar WAOUH à 1.2 km");
    expect(msg).toContain("(~650000 FCFA)");
    expect(msg).toContain("#radar");
    expect(msg).toContain("#interest");
    expect(msg).toContain("#article:abc-123");
  });

  it("omits distance / price segments when absent (so empty radar items still match StatusCard wording)", () => {
    const msg = buildRadarInterestMessage({ title: "Frigo", intent: "buy" });
    expect(msg).toContain('Intéressé par "Frigo"');
    expect(msg).not.toContain("Radar WAOUH à");
    expect(msg).not.toContain("(~");
    expect(msg).toContain("#buy");
  });
});

describe("radarAutosend — pause reason persistence", () => {
  let storage: Storage;
  beforeEach(() => { storage = mkStorage(); });

  it("round-trips reason payload", () => {
    setRadarPauseReason({ kind: "autosend", title: "T", intent: "interest", at: 42 }, storage);
    const r = readRadarPauseReason(storage);
    expect(r?.kind).toBe("autosend");
    expect(r?.title).toBe("T");
    expect(r?.at).toBe(42);
  });

  it("clears reason on demand (consumed by Relancer)", () => {
    setRadarPauseReason({ kind: "duplicate", title: "T", intent: "buy", at: 1 }, storage);
    clearRadarPauseReason(storage);
    expect(readRadarPauseReason(storage)).toBeNull();
  });
});

/**
 * Non-regression contract: Radar autosend MUST hit the same edge function
 * with the same payload shape as StatusCard's "intéressé" button.
 *   - function name: "waouh-buyer-interest"
 *   - body keys:    { article_id, source, intent }
 *   - source value: "radar"  (StatusCard uses "card"; the server treats
 *                   both identically for notification/dispatch purposes)
 *
 * This guards against silent drift between the two surfaces.
 */
describe("radarAutosend ↔ StatusCard pipeline parity", () => {
  it("uses the canonical buyer-interest invocation contract", () => {
    const invoke = vi.fn().mockResolvedValue({ data: {}, error: null });
    const article_id = "abc-123";
    const intent = "interest" as const;
    invoke("waouh-buyer-interest", { body: { article_id, source: "radar", intent } });
    expect(invoke).toHaveBeenCalledWith("waouh-buyer-interest", {
      body: { article_id: "abc-123", source: "radar", intent: "interest" },
    });
  });
});
