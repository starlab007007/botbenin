import { describe, expect, it } from "vitest";
import { shouldSendBuyerInterest, matchKey } from "../useWaouhMatchChats";

describe("shouldSendBuyerInterest", () => {
  it("un seul intérêt par article et par session pendant 30 s (évènement doublé + tampon)", () => {
    const t = 1_000_000;
    expect(shouldSendBuyerInterest("s", "a1", t)).toBe(true);
    expect(shouldSendBuyerInterest("s", "a1", t + 120)).toBe(false);
    expect(shouldSendBuyerInterest("s", "a1", t + 500)).toBe(false);
    expect(shouldSendBuyerInterest("s", "a2", t + 500)).toBe(true);
    expect(shouldSendBuyerInterest("autre", "a1", t + 500)).toBe(true);
    expect(shouldSendBuyerInterest("s", "a1", t + 31_000)).toBe(true);
  });
});

it("keeps two canonical discussions separate even if the counterparty is not loaded yet", () => {
  expect(matchKey("article", "seller", null, "thread-1")).not.toBe(matchKey("article", "seller", null, "thread-2"));
  expect(matchKey("article", "seller", "buyer", "thread-1")).toBe("art_article_seller_buyer");
});
