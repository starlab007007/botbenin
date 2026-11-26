import { describe, it, expect } from "vitest";
import { waouhRequestTimeout } from "../requestTimeout";
const base = "https://x.supabase.co/functions/v1/";
describe("request time limits", () => {
  it("chat search message waits 60 s (server allows 55 s)", () => {
    expect(waouhRequestTimeout(base + "waouh-channel-in-secure", { method: "POST", body: "{}" })).toBe(60_000);
  });
  it("ordinary requests keep 12 s", () => {
    expect(waouhRequestTimeout(base + "waouh-deal-room", { method: "POST", body: "{}" })).toBe(12_000);
  });
});
