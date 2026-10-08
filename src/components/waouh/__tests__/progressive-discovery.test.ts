import { beforeEach, expect, it, vi } from "vitest";
const { discovery } = vi.hoisted(() => ({ discovery: vi.fn() }));
vi.mock("@/lib/waouh/nexus", () => ({ globalNexusDiscovery: discovery }));
import { progressiveNexusDiscovery } from "@/lib/waouh/progressiveDiscovery";
beforeEach(() => discovery.mockReset());
it("shows indexed offers while external search is still pending", async () => {
  let finish!: (v: unknown) => void;
  const cached = { results: [{ fabric_id: "article:cached" }] };
  discovery.mockResolvedValueOnce(cached).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const onIndexed = vi.fn();
  const pending = progressiveNexusDiscovery({ query: "Samsung", mode: "find_sellers" }, onIndexed);
  await vi.waitFor(() => expect(onIndexed).toHaveBeenCalledWith(cached));
  expect(discovery.mock.calls[0][0]).toMatchObject({ smart: false, refresh_external: false });
  finish({ results: [{ fabric_id: "external:live" }] });
  await expect(pending).resolves.toEqual({ results: [{ fabric_id: "external:live" }] });
});
it("keeps the indexed callback result when live search fails without hiding the error", async () => {
  discovery.mockResolvedValueOnce({ results: [] }).mockRejectedValueOnce(new Error("session expired"));
  const onIndexed = vi.fn();
  await expect(progressiveNexusDiscovery({ query: "Samsung" }, onIndexed)).rejects.toThrow("session expired");
  expect(onIndexed).toHaveBeenCalledTimes(1);
});

it("anonymous indexed search makes one request without AI or external refresh", async () => {
  const cached = { results: [{ fabric_id: "article:fan" }] };
  discovery.mockResolvedValue(cached);
  const onIndexed = vi.fn();
  await expect(progressiveNexusDiscovery({ query: "ventilateur", refresh_external: false, smart: false }, onIndexed)).resolves.toEqual(cached);
  expect(discovery).toHaveBeenCalledTimes(1);
  expect(discovery).toHaveBeenCalledWith(expect.objectContaining({ refresh_external: false, smart: false }));
  expect(onIndexed).toHaveBeenCalledWith(cached);
});
