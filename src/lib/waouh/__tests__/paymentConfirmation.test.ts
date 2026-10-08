import { describe, expect, it, vi } from "vitest";
import { confirmDeliveredDeal } from "../../../../supabase/functions/_shared/waouh-payment-confirmation";
function client(updateResult: unknown, currentResult?: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of ["eq", "not", "or", "select"]) query[name] = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValueOnce(updateResult).mockResolvedValueOnce(currentResult);
  const update = vi.fn(() => query);
  return { from: vi.fn(() => ({ update, select: query.select })), update, query };
}
describe("payment completion integrity", () => {
  it("does not claim payment when the primary database write fails", async () => {
    const sb = client({ error: { message: "write rejected" }, data: null });
    expect(await confirmDeliveredDeal(sb, "deal", { payment_method: "cash" })).toMatchObject({ ok: false, status: 500 });
    expect(sb.query.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it("completes a delivered deal and keeps the validated method", async () => {
    const sb = client({ error: null, data: { id: "deal" } });
    expect(await confirmDeliveredDeal(sb, "deal", { payment_method: "mobile_money" })).toEqual({ ok: true, alreadyPaid: false });
    expect(sb.update).toHaveBeenCalledWith(expect.objectContaining({ payment_method: "mobile_money", payment_status: "paid", status: "completed" }));
  });
  it("does not duplicate the winning confirmation during a race", async () => {
    const sb = client({ error: null, data: null }, { data: { status: "completed", payment_status: "paid" } });
    expect(await confirmDeliveredDeal(sb, "deal", {})).toEqual({ ok: true, alreadyPaid: true });
  });
  it("refuses a changed or cancelled deal instead of marking it paid", async () => {
    const sb = client({ error: null, data: null }, { data: { status: "cancelled", payment_status: null } });
    expect(await confirmDeliveredDeal(sb, "deal", {})).toMatchObject({ ok: false, status: 409 });
  });
});
