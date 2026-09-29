// Fenêtres chaudes : vocabulaire commun Web ⇄ Flutter (docs/contracts/chat/hot-labels-fixtures.json)
// et garde-fou : aucun libellé « contacter » froid ne doit revenir dans le code des cartes et du chat.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import fixtures from "../../../../docs/contracts/chat/hot-labels-fixtures.json";
import {
  COLD_LABELS,
  contactabilityActionLabel,
  findChannelLabel,
  interestMessage,
  SEND_OFFER_LABEL,
  smartOfferAmount,
} from "@/lib/waouh/hotLabels";

const root = resolve(__dirname, "../../../..");

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (["node_modules", "__tests__", ".dart_tool", "build"].includes(name)) continue;
      walk(full, exts, out);
    } else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

describe("vocabulaire chaud (identique à Flutter)", () => {
  it("bouton principal selon le niveau de contactabilité", () => {
    for (const [level, expected] of Object.entries(fixtures.contactability)) {
      expect(contactabilityActionLabel(level)).toBe(expected);
    }
    expect(contactabilityActionLabel(null)).toBe("Lancer la démarche");
    expect(contactabilityActionLabel(undefined)).toBe("Lancer la démarche");
    expect(contactabilityActionLabel("c5")).toBe("Négocier dans WAOUH");
  });

  it("recherche de canal, envoi, message d'amorce", () => {
    for (const [level, expected] of Object.entries(fixtures.findChannel)) expect(findChannelLabel(level)).toBe(expected);
    expect(SEND_OFFER_LABEL).toBe(fixtures.sendOffer);
    expect(interestMessage("Vélo")).toContain("Quel est votre meilleur prix ?");
    expect(interestMessage("Vélo")).toContain("« Vélo »");
  });

  it("prix suggéré : 10 % sous le prix affiché, arrondi", () => {
    for (const c of fixtures.smartOffer) expect(smartOfferAmount(c.list as number | null)).toBe(c.expected);
  });

  it("la liste des libellés froids est la même des deux côtés", () => {
    expect([...COLD_LABELS]).toEqual(fixtures.cold);
  });
});

describe("garde-fou : aucun libellé froid dans le code", () => {
  const targets = [
    ...walk(join(root, "src/components/waouh"), [".ts", ".tsx"]),
    ...walk(join(root, "src/app-mobile"), [".ts", ".tsx"]),
    ...walk(join(root, "src/lib/waouh"), [".ts", ".tsx"]).filter((f) => !f.endsWith("hotLabels.ts")),
    ...walk(join(root, "flutter_waouh_app/lib"), [".dart"]).filter((f) => !f.endsWith("live_hot_labels.dart")),
    join(root, "supabase/functions/waouh-agentic-core/index.ts"),
  ];

  it("couvre bien les fichiers des cartes, du chat et de Flutter", () => {
    expect(targets.length).toBeGreaterThan(50);
  });

  it.each(COLD_LABELS.map((l) => [l]))("« %s » n'apparaît nulle part", (label) => {
    const offenders = targets.filter((file) => readFileSync(file, "utf8").includes(label)).map((f) => f.replace(root + "/", ""));
    expect(offenders).toEqual([]);
  });
});
