import { describe, it, expect } from "vitest";
import { matchesAnyKeyword, extractFallbackKeywords } from "../../../../supabase/functions/_shared/waouh-keywords";
const kw = extractFallbackKeywords("Je cherche un ordinateur portable à Cotonou");
describe("search returns the object asked for", () => {
  it("keywords keep the head noun first", () => { expect(kw[0]).toBe("ordinateur"); });
  it("a phone does not answer 'ordinateur portable'", () => {
    expect(matchesAnyKeyword(["Téléphone portable Tecno Spark"], kw)).toBe(false);
  });
  it("a laptop answers", () => {
    expect(matchesAnyKeyword(["Ordinateur Portable HP"], kw)).toBe(true);
    expect(matchesAnyKeyword(["Ordinateurs portatifs à vendre"], kw)).toBe(true);
  });
  it("an accessory does not answer unless asked", () => {
    expect(matchesAnyKeyword(["Support d'ordinateur"], kw)).toBe(false);
    expect(matchesAnyKeyword(["Support d'ordinateur"], extractFallbackKeywords("support ordinateur"))).toBe(true);
  });
  it("single keyword search unchanged", () => {
    expect(matchesAnyKeyword(["Sac Zara rouge"], ["zara"])).toBe(true);
  });
});
