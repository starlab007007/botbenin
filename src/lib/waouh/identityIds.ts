// Identités d'un compte (waouh_users) côté Web : un compte connecté peut en avoir des centaines (une par session).
// Les fils, les notifications et les messages sont rattachés à UNE de ces lignes — le plus souvent la plus ancienne (ligne canonique) —
// donc une lecture « les N plus récentes » la perd. On lit les plus anciennes ET les plus récentes (deux requêtes courtes).
export interface IdentityClient {
  from: (table: string) => any;
}

export const IDENTITY_EDGE = 60;

export async function fetchAuthIdentityIds(client: IdentityClient, authUserId: string): Promise<string[]> {
  const read = (ascending: boolean) =>
    client.from("waouh_users").select("id").eq("auth_user_id", authUserId).order("created_at", { ascending }).limit(IDENTITY_EDGE);
  const [oldest, newest] = await Promise.all([read(true), read(false)]);
  const ids = [...(oldest?.data ?? []), ...(newest?.data ?? [])].map((r: { id?: string }) => r?.id).filter((x): x is string => typeof x === "string" && x.length > 0);
  return Array.from(new Set(ids));
}
