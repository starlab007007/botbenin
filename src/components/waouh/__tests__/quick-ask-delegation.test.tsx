import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WaouhQuickAsk } from "../WaouhQuickAsk";

const follow = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/waouh/automaticMission", () => ({ followAutomaticSearch: follow }));
vi.mock("../WaouhCityField", () => ({ WaouhCityField: () => null }));
vi.mock("../WaouhSmartSale", () => ({ WaouhSmartSale: () => null }));
vi.mock("@/components/waouh/bot/BotLiveAvatar", () => ({ BotLiveAvatar: () => null }));

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  follow.mockReset();
});

it("requires a purchase limit and creates the mandate before opening any results", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.body.append(container);
  root = createRoot(container);
  const onAsk = vi.fn();
  const onSubmit = vi.fn();
  follow.mockResolvedValue({ mandate: { id: "mission-1", metadata: { entry_delegation: true } } });
  await act(async () => root.render(
    <WaouhQuickAsk kind="acheter" onClose={() => {}} onAsk={onAsk} onSubmit={onSubmit} />,
  ));

  const press = async (label: string) => {
    const button = [...document.body.querySelectorAll("button")].find(item => item.textContent?.trim() === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
  };
  await press("Samsung S25");
  await press("Confier à Bot");
  expect(follow).toHaveBeenCalledTimes(0);
  expect(document.querySelector("[role=alert]")?.textContent).toContain("budget maximal");

  const field = document.querySelector<HTMLInputElement>('input[aria-label="Budget max (FCFA)"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "225000");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await press("Confier à Bot");

  expect(follow).toHaveBeenCalledWith("owner", expect.objectContaining({
    goal: "Samsung S25", budget_max: 225000, mode: "buy", discovery_kind: "purchase",
    completion_goal: "agreement", confirmed_entry_delegation: true,
  }));
  expect(onAsk).not.toHaveBeenCalled();
  expect(onSubmit).toHaveBeenCalledWith("/app/missions?mandate=mission-1");
});
