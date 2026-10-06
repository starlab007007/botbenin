import { describe, expect, it } from "vitest";

import {
  buildWaouhAuthRedirect,
  normalizeWaouhRedirect,
  requiresWaouhAuthentication,
} from "../../waouhAccessPolicy";

describe("WAOUH access policy", () => {
  it.each([
    ["/app/chat", false],
    ["/app/avatar", false],
    ["/app/nexus", false],
    ["/app/radar-map", false],
    ["/app/chat/waouh", true],
    ["/app/chat/123", true],
    ["/app/avatar/buy", true],
    ["/app/missions", true],
    ["/app/diffusion", true],
    ["/app/profile", true],
    ["/app/notifications", true],
  ])("classifie %s", (path, expected) => {
    expect(requiresWaouhAuthentication(path)).toBe(expected);
  });

  it("préserve une destination interne avec paramètres", () => {
    expect(normalizeWaouhRedirect("/app/chat/42?from=radar"))
      .toBe("/app/chat/42?from=radar");
  });

  it("refuse les redirections externes et les boucles d'auth", () => {
    expect(normalizeWaouhRedirect("https://example.com")).toBe("/app/chat");
    expect(normalizeWaouhRedirect("//example.com")).toBe("/app/chat");
    expect(normalizeWaouhRedirect("/app/auth/email")).toBe("/app/chat");
    expect(normalizeWaouhRedirect("/auth")).toBe("/app/chat");
  });

  it("construit un retour de connexion encodé", () => {
    expect(buildWaouhAuthRedirect("/app/diffusion"))
      .toBe("/app/auth?next=%2Fapp%2Fdiffusion");
  });
});
