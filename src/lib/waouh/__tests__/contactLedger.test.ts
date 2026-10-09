import { describe, expect, it } from "vitest";
import { bucketOf, buildLedger, journeyPhone } from "../contactLedger";

const journey = (over: Record<string, unknown>) => ({
  id: "j", fabric_id: "f", mode: "buy", stage: "discovered", contactability_level: "C2", progress: 10, subject: "Moto", ...over,
}) as any;

describe("contactLedger", () => {
  it("classe les étapes", () => {
    expect(bucketOf("enriching")).toBe("to_contact");
    expect(bucketOf("waiting_reply")).toBe("pending");
    expect(bucketOf("negotiating")).toBe("replied");
    expect(bucketOf("executing")).toBe("agreed");
    expect(bucketOf("cancelled")).toBe("cancelled");
  });

  it("n'expose que les 4 derniers chiffres", () => {
    const j = journey({ masked_contact: { phones: [{ last4: "1234", channel: "whatsapp" }] } });
    expect(journeyPhone(j).phone).toBe("+229 •• •• 12 34");
    expect(journeyPhone(journey({})).phone).toBeNull();
  });

  it("compte contactés, en attente, réponses et recherches en cours", () => {
    const ledger = buildLedger(
      [
        journey({ id: "a", stage: "discovered" }),
        journey({ id: "b", stage: "waiting_reply", masked_contact: { phones: [{ last4: "5678" }] } }),
        journey({ id: "c", stage: "negotiating" }),
        journey({ id: "d", stage: "completed" }),
      ],
      [
        { id: "m1", goal: "S25", status: "active", contacted_count: 2, max_contacts: 3, replied_count: 1, next_run_at: null },
        { id: "m2", goal: "old", status: "completed", contacted_count: 3, max_contacts: 3, replied_count: 0, next_run_at: null },
      ],
    );
    expect(ledger.total).toBe(4);
    expect(ledger.contacted).toBe(3);
    expect(ledger.pending).toBe(1);
    expect(ledger.replied).toBe(2);
    expect(ledger.toContact).toBe(1);
    expect(ledger.withNumber).toBe(1);
    expect(ledger.missions).toHaveLength(1);
  });
});
