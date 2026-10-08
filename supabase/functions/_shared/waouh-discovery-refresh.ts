/** An optional external provider must not discard already indexed offers. */
export async function settleDiscoverySource<T extends { configured: boolean; inserted: number; reason?: string | null }>(operation: () => Promise<T>) {
  try {
    const result = await operation();
    return { ...result, status: result.configured ? "updated" : "unavailable" };
  } catch {
    return { configured: false, inserted: 0, reason: "refresh_failed", status: "unavailable" };
  }
}
