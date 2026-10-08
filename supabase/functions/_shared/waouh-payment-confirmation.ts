// deno-lint-ignore-file no-explicit-any -- server-side Supabase client.
/** Complete only a still-delivered deal; a failed write must never announce payment. */
export async function confirmDeliveredDeal(sb: any, dealId: string, patch: Record<string, unknown>) {
  const { data, error } = await sb.from("waouh_deals").update({ ...patch, payment_status: "paid", status: "completed" })
    .eq("id", dealId).eq("status", "delivered").not("delivered_at", "is", null)
    .or("payment_status.is.null,payment_status.neq.paid").select("id").maybeSingle();
  if (error) return { ok: false, code: "payment_confirmation_write_failed", status: 500 };
  if (data) return { ok: true, alreadyPaid: false };
  // Another confirmation may have won the race. Do not repeat its downstream effects.
  const current = await sb.from("waouh_deals").select("status,payment_status").eq("id", dealId).maybeSingle();
  if (current.error) return { ok: false, code: "payment_confirmation_read_failed", status: 500 };
  if (current.data?.status === "completed" && current.data?.payment_status === "paid") return { ok: true, alreadyPaid: true };
  return { ok: false, code: "payment_confirmation_requires_delivery", status: 409 };
}
