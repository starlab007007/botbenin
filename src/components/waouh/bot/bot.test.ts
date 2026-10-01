import { describe, expect, it } from "vitest";
import { botActivityLine, botGreetingLines } from "./BotGreeting";
import { dealExpression } from "./BotDealCopilot";
import { BOT_POSES } from "./BotCharacter";
import { MUSE_PHASE_EXPRESSION } from "../WaouhMuseAvatar";

describe("Bot — accueil", () => {
  it("salue par le prénom et garde trois messages courts", () => {
    const lines = botGreetingLines("Zime Songbian", null);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Bonjour Zime, je suis Bot.");
    expect(lines[2]).toBe("Dites-moi ce qu'il vous faut, je m'occupe du reste.");
  });

  it("ignore le nom technique waouhapp", () => {
    expect(botGreetingLines("waouhapp")[0]).toBe("Bonjour, je suis Bot.");
  });

  it("annonce l'activité réelle seulement quand elle existe", () => {
    expect(botActivityLine(0)).toBeNull();
    expect(botActivityLine(1)).toBe("J'ai 1 mission en cours pour vous.");
    expect(botActivityLine(3, "Deal Room")).toBe("Je suis 3 Deal Rooms pour vous.");
    expect(botGreetingLines(null, botActivityLine(2))[2]).toBe("J'ai 2 missions en cours pour vous.");
  });
});

describe("Bot — expressions", () => {
  it("a une pose pour chaque expression utilisée", () => {
    for (const expression of Object.values(MUSE_PHASE_EXPRESSION)) {
      expect(BOT_POSES[expression]).toBeDefined();
    }
  });

  it("suit l'étape de la Deal Room", () => {
    expect(dealExpression("interest", "buyer")).toBe("think");
    expect(dealExpression("negotiation", "seller")).toBe("work");
    expect(dealExpression("agreement", "buyer")).toBe("win");
    expect(dealExpression("delivery", "buyer")).toBe("ask");
    expect(dealExpression("delivery", "seller")).toBe("work");
    expect(dealExpression("negotiation", "buyer", true)).toBe("win");
    expect(dealExpression(null, "buyer")).toBe("think");
  });
});
