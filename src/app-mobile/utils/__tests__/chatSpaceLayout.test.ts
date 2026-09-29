import { describe, expect, it } from "vitest";
import { chatSpaceMode, readDrawerPinned, unreadBadge, writeDrawerPinned } from "../chatSpaceLayout";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("espace de chat — mode d'affichage", () => {
  it("téléphone : pile ; tablette et portable 13\" : tiroir ; grand écran : tiroir ou épinglé", () => {
    expect(chatSpaceMode(390, false)).toBe("stack");
    expect(chatSpaceMode(767, true)).toBe("stack");
    expect(chatSpaceMode(768, false)).toBe("drawer");
    expect(chatSpaceMode(1024, true)).toBe("drawer"); // épinglage ignoré sur écran étroit
    expect(chatSpaceMode(1279, true)).toBe("drawer");
    expect(chatSpaceMode(1280, false)).toBe("drawer");
    expect(chatSpaceMode(1440, true)).toBe("pinned");
    expect(chatSpaceMode(Number.NaN, true)).toBe("stack");
  });
  it("épinglage mémorisé, et lecture sûre si le stockage est indisponible", () => {
    const s = memory();
    expect(readDrawerPinned(s)).toBe(false);
    writeDrawerPinned(true, s);
    expect(readDrawerPinned(s)).toBe(true);
    writeDrawerPinned(false, s);
    expect(readDrawerPinned(s)).toBe(false);
    const broken = { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("bloqué"); }, removeItem: () => { throw new Error("bloqué"); } };
    expect(readDrawerPinned(broken)).toBe(false);
    expect(() => writeDrawerPinned(true, broken)).not.toThrow();
    expect(readDrawerPinned(null)).toBe(false);
  });
  it("pastille : vide à 0, chiffre jusqu'à 9, « 9+ » ensuite", () => {
    expect([0, -3, Number.NaN].map(unreadBadge)).toEqual([null, null, null]);
    expect([1, 9, 10, 250].map(unreadBadge)).toEqual(["1", "9", "9+", "9+"]);
  });
});
