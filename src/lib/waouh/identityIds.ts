// Read every identity: conversations can belong to any device/session of the account.
export interface IdentityClient {
  from: (table: string) => any;
}

export const IDENTITY_PAGE_SIZE = 100;

export async function fetchAuthIdentityIds(client: IdentityClient, authUserId: string): Promise<string[]> {
  const ids = new Set<string>();
  for (let from = 0; ; from += IDENTITY_PAGE_SIZE) {
    const { data, error } = await client.from("waouh_users").select("id")
      .eq("auth_user_id", authUserId)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(from, from + IDENTITY_PAGE_SIZE - 1);
    if (error || !Array.isArray(data)) break;
    for (const row of data) {
      if (typeof row?.id === "string" && row.id) ids.add(row.id);
    }
    if (data.length < IDENTITY_PAGE_SIZE) break;
  }
  return [...ids];
}
