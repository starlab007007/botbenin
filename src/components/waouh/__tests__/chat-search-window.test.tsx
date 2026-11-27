import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaouhChatSearchWindow, type ChatSearch } from "../WaouhChatSearchWindow";
import { searchStage } from "@/lib/waouh/chatSearchStage";

vi.mock("../bot/BotLiveAvatar", () => ({ BotLiveAvatar: () => <span data-bot /> }));
vi.mock("../WaouhProductCard", () => ({ WaouhProductResults: ({ results }: { results: unknown[] }) => <div data-testid="cards">{results.length} fiches</div> }));
vi.mock("../WaouhDelegateButton", () => ({ WaouhDelegateButton: (p: { label: string; result: { fabric_id: string }; alternates?: unknown[]; budgetMax?: number | null; mode: string }) => <button data-delegate={p.result.fabric_id} data-alternates={p.alternates?.length ?? 0} data-budget={p.budgetMax ?? ""} data-mode={p.mode}>{p.label}</button> }));

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null })) as typeof window.matchMedia;
  Element.prototype.scrollTo = () => {};
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

const search = (over: Partial<ChatSearch> = {}): ChatSearch => ({ id: "s1", goal: "iPhone 13", city: "Cotonou", status: "done", text: "", kind: "acheter", budget: 300000, results: [
  { id: "a", index: 1, title: "iPhone 13 128 Go", price: 280000, city: "Cotonou", fabric_id: "external:a" },
  { id: "b", index: 2, title: "iPhone 13 256 Go", price: 290000, city: "Cotonou", fabric_id: "external:b" },
  { id: "c", index: 3, title: "iPhone 13 Pro", price: 420000, city: "Parakou", fabric_id: "external:c" },
] as ChatSearch["results"], ...over });
const render = async (value: ChatSearch | null) => act(async () => root.render(<MemoryRouter><WaouhChatSearchWindow search={value} onClose={() => {}} onAction={() => {}} /></MemoryRouter>));

describe("fenêtre de recherche du Chat", () => {
  it("suit les étapes du parcours", () => {
    expect(searchStage(null, false)).toBe(0);
    expect(searchStage(search({ status: "running", results: [] }), false)).toBe(1);
    expect(searchStage(search(), false)).toBe(2);
    expect(searchStage(search(), true)).toBe(3);
  });

  it("affiche l’analyse du marché, le choix de Bot, les fiches et un seul bouton pour tout confier", async () => {
    await render(search());
    const text = document.body.textContent || "";
    expect(text).toContain("Achat");
    expect(text).toContain("Analyse du marché");
    expect(text).toContain("Le choix de Bot");
    expect(text).toContain("Budget 300 000 F");
    expect(document.querySelector('[data-testid="cards"]')?.textContent).toBe("3 fiches");
    const delegates = document.querySelectorAll("[data-delegate]");
    expect(delegates).toHaveLength(1);
    const button = delegates[0] as HTMLElement;
    // L'offre hors budget n'est jamais confiée ; la deuxième devient l'offre de repli.
    expect(button.dataset.delegate).toBe("external:a");
    expect(button.dataset.alternates).toBe("1");
    expect(button.dataset.budget).toBe("300000");
    expect(button.textContent).toBe("Confier à Bot");
    expect(document.querySelector(".wsl-other-offers")?.hasAttribute("open")).toBe(false);
    expect(document.querySelector(".wsl-stages .is-current")?.textContent).toContain("Offres");
  });

  it("une prestation est confiée comme une demande, pas comme un achat", async () => {
    await render(search({ kind: "prestation", budget: null }));
    expect((document.querySelector("[data-delegate]") as HTMLElement).dataset.mode).toBe("ask");
  });

  it("sans résultat, propose de préciser la demande et n’affiche ni analyse ni bouton Bot", async () => {
    await render(search({ results: [] }));
    expect(document.body.textContent).toContain("Aucune offre assez proche");
    expect(document.querySelector('[data-testid="chat-market-brief"]')).toBeNull();
    expect(document.querySelector("[data-delegate]")).toBeNull();
  });

  it("n’expose aucun terme technique à l’utilisateur", async () => {
    await render(search());
    expect(document.body.textContent).not.toMatch(/fabric|nexus|supabase|payload|score|external:/i);
  });
});
