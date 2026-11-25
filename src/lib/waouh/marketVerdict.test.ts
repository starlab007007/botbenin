import { describe, it, expect } from "vitest";
import { marketVerdict } from "./marketVerdict";
describe("marketVerdict", () => {
  it("10 % sous la référence = bonne affaire", () => expect(marketVerdict(4500, 5000)?.tone).toBe("good"));
  it("9 % sous = prix juste", () => expect(marketVerdict(4550, 5000)?.tone).toBe("fair"));
  it("15 % au-dessus = encore prix juste", () => expect(marketVerdict(5750, 5000)?.tone).toBe("fair"));
  it("plus de 15 % au-dessus = trop cher", () => expect(marketVerdict(5800, 5000)?.tone).toBe("high"));
  it("sans référence = pas de verdict", () => expect(marketVerdict(5000, null)).toBeNull());
});
