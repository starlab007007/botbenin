// Service-only atomic cooldown: one person cannot be re-solicited by parallel missions.
export async function claimAvatarContact(sb: any, mandate: any, journey: any, endpoint: string): Promise<boolean> {
  const { data, error } = await sb.rpc('waouh_avatar_claim_contact', {
    p_owner_id: mandate.owner_id, p_journey_id: journey.id, p_endpoint: endpoint,
  });
  if (error) throw error; // Fail closed if the migration is missing.
  return data === true;
}
