import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ invoke: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: api.invoke } } }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
import { WaouhDealPaymentDialog } from "../WaouhDealPaymentDialog";
let root: Root; let container: HTMLDivElement;
beforeEach(() => { Object.values(api).forEach(mock => mock.mockReset()); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function mount(onPaid: () => void, onOpenChange: (value: boolean) => void) { await act(async () => root.render(<WaouhDealPaymentDialog open onOpenChange={onOpenChange} onPaid={onPaid} dealId="exact-deal" amount={1000} />)); }
const cash = () => [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Espèces"))!;
it("does not announce payment or close the dialog when the server did not confirm it", async () => {
  const onPaid = vi.fn(), onOpenChange = vi.fn();
  api.invoke.mockResolvedValue({ data: { ok: false }, error: null });
  await mount(onPaid, onOpenChange); await act(async () => cash().click());
  expect(api.success).not.toHaveBeenCalled(); expect(onPaid).not.toHaveBeenCalled(); expect(onOpenChange).not.toHaveBeenCalled(); expect(api.error).toHaveBeenCalledTimes(1);
});
it("sends one explicit payment confirmation despite a double tap", async () => {
  const onPaid = vi.fn(), onOpenChange = vi.fn();
  let finish!: (result: unknown) => void;
  api.invoke.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount(onPaid, onOpenChange);
  await act(async () => { const button = cash(); button.click(); button.click(); });
  expect(api.invoke).toHaveBeenCalledTimes(1);
  expect(api.invoke).toHaveBeenCalledWith("waouh-deal-ops", { body: { action: "payment", deal_id: "exact-deal", method: "cash" } });
  await act(async () => finish({ data: { ok: true }, error: null }));
  expect(onPaid).toHaveBeenCalledTimes(1); expect(onOpenChange).toHaveBeenCalledWith(false);
});
