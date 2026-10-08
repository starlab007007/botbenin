import { beforeEach, describe, expect, it, vi } from "vitest";
import { waouhRequestTimeout } from "@/lib/waouh/requestTimeout";
import { WAOUH_RUNTIME_ENDPOINTS } from "@/lib/waouh/runtimeEndpoints";
const { invoke, getSession, refreshSession } = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn(), refreshSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, auth: { getSession, refreshSession } } }));
import { globalNexusDiscovery, sendNexusDiscoveryContact, enrichNexusOpportunity } from "@/lib/waouh/nexus";
import { invokeWaouhAgentic } from "@/lib/waouh/agenticClient";
import { toUserFacingError } from "@/lib/userFacingError";
const url = `https://example.supabase.co/functions/v1/${WAOUH_RUNTIME_ENDPOINTS.agenticCore}`;

describe("Avatar discovery transport", () => {
  beforeEach(() => { invoke.mockReset(); getSession.mockReset().mockResolvedValue({ data: { session: null } }); refreshSession.mockReset(); });
  it.each(["find_sellers", "find_buyers", "auto"] as const)("allows the AI/external discovery budget for %s", async mode => {
    invoke.mockResolvedValue({ data: { ok: true, data: { results: [] } }, error: null });
    await expect(globalNexusDiscovery({ query: "Samsung Cotonou", mode, refresh_external: true })).resolves.toEqual({ results: [] });
    const [endpoint, options] = invoke.mock.calls[0];
    expect(endpoint).toBe(WAOUH_RUNTIME_ENDPOINTS.agenticCore);
    expect(options.body.payload.mode).toBe(mode);
    expect(waouhRequestTimeout(url, { method: "POST", body: JSON.stringify(options.body) })).toBe(120_000);
  });
  it("enriches the selected mission journey instead of starting a different one", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: { journey: { id: "selected" } } }, error: null });
    await enrichNexusOpportunity("external:signal", "sell", "selected");
    expect(invoke.mock.calls[0][1].body).toMatchObject({ action: "nexus.opportunity.enrich", payload: { fabric_id: "external:signal", mode: "sell", journey_id: "selected" } });
  });
  it("keeps ordinary requests short and gives mandate discovery the same budget", () => {
    expect(waouhRequestTimeout(url, { method: "POST", body: '{"action":"nexus.mandate.create"}' })).toBe(120_000);
    expect(waouhRequestTimeout(url, { method: "POST", body: '{"action":"nexus.contact.send"}' })).toBe(12_000);
    expect(waouhRequestTimeout(url, { method: "POST", body: "invalid" })).toBe(12_000);
    expect(waouhRequestTimeout("https://example.supabase.co/rest/v1/articles")).toBe(12_000);
  });
  it("retains authentication errors so the UI asks for reconnection", async () => {
    invoke.mockResolvedValue({ data: null, error: {
      message: "Edge Function returned a non-2xx status code",
      context: new Response(JSON.stringify({ error: { code: "authentication_required", message: "Session expirée" } }), { status: 401 }),
    } });
    const error = await invokeWaouhAgentic("nexus.global_discovery", {}).catch(e => e);
    expect(error).toMatchObject({ status: 401, code: "authentication_required" });
    expect(toUserFacingError(error).title).toBe("Session expirée");
  });
  it("retains server diagnostics without retrying discovery POSTs", async () => {
    invoke.mockResolvedValue({ data: null, error: {
      message: "Edge Function returned a non-2xx status code",
      context: new Response(JSON.stringify({ error: { code: "nexus_global_discovery_failed", message: "Source unavailable" } }), { status: 500 }),
    } });
    await expect(globalNexusDiscovery({ query: "Samsung" })).rejects.toMatchObject({ status: 500, code: "nexus_global_discovery_failed", message: "Source unavailable" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("refreshes an expired signed-in session once after a rejected 401", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "expired" } } });
    refreshSession.mockResolvedValue({ data: { session: { access_token: "renewed" } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { message: "unauthorized", context: new Response("{}", { status: 401 }) } })
      .mockResolvedValueOnce({ data: { ok: true, data: { results: [] } }, error: null });
    await expect(globalNexusDiscovery({ query: "Samsung" })).resolves.toEqual({ results: [] });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it("does not re-execute when session renewal fails", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "expired" } } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error("expired refresh token") });
    invoke.mockResolvedValue({ data: null, error: { message: "unauthorized", context: new Response("{}", { status: 401 }) } });
    await expect(globalNexusDiscovery({ query: "Samsung" })).rejects.toMatchObject({ status: 401 });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("starts a tracked seller journey before direct contact", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, data: { journey: { id: "journey-sell" } } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, data: { queued: true } }, error: null });
    await sendNexusDiscoveryContact({ fabric_id: "external:offer", message: "Proposition", confirmed: true, mode: "sell" });
    expect(invoke.mock.calls[0][1].body).toMatchObject({ action: "nexus.opportunity.start", payload: { mode: "sell" } });
    expect(invoke.mock.calls[1][1].body).toMatchObject({ action: "nexus.contact.send", payload: { journey_id: "journey-sell" } });
  });
  it("preserves a selected mission journey without creating a replacement", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: { queued: true } }, error: null });
    await sendNexusDiscoveryContact({ fabric_id: "external:offer", journey_id: "selected-journey", message: "Proposition", confirmed: true });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][1].body.payload.journey_id).toBe("selected-journey");
  });

});
