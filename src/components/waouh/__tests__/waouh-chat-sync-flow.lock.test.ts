/**
 * Test de non-régression du flux WAOUH chat verrouillé (v1).
 *
 * Vérifie que les 3 zones critiques (webhook NEGOTIATE, negotiation-router,
 * WaouhMatchChatWindow) contiennent toujours les marqueurs invariants
 * définis dans `waouhChatSyncLock.ts`.
 *
 * Référence : mem://features/waouh-chat-sync-flow
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { WAOUH_CHAT_SYNC_LOCK } from "../waouhChatSyncLock";

const root = resolve(__dirname, "../../../..");

function read(rel: string): string {
  const p = resolve(root, rel);
  expect(existsSync(p), `missing file: ${rel}`).toBe(true);
  return readFileSync(p, "utf8");
}

describe("WAOUH Chat Sync Flow — Locked v1", () => {
  for (const [zone, spec] of Object.entries(WAOUH_CHAT_SYNC_LOCK.invariants)) {
    describe(`zone: ${zone} (${spec.file})`, () => {
      const src = read(spec.file);

      for (const needle of spec.mustContain) {
        it(`must contain: ${needle.slice(0, 80)}`, () => {
          expect(
            src.includes(needle),
            `Locked invariant lost in ${spec.file}: "${needle}"`
          ).toBe(true);
        });
      }

      const mustNot = (spec as any).mustNotContain as string[] | undefined;
      if (mustNot) {
        for (const needle of mustNot) {
          it(`must NOT contain: ${needle.slice(0, 80)}`, () => {
            expect(
              src.includes(needle),
              `Forbidden pattern reintroduced in ${spec.file}: "${needle}"`
            ).toBe(false);
          });
        }
      }
    });
  }

  it("lock metadata is frozen", () => {
    expect(Object.isFrozen(WAOUH_CHAT_SYNC_LOCK)).toBe(true);
    expect(WAOUH_CHAT_SYNC_LOCK.version).toBe("v5");
    expect(WAOUH_CHAT_SYNC_LOCK.memoryRef).toBe("mem://features/waouh-chat-sync-flow");
  });
});
