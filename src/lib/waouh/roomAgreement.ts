import type { DealRoom } from './dealRoom';

export const staleAgreementMessage = 'Les conditions ont changé. Relisez la nouvelle version.';
export const isStaleAgreement = (error: unknown) =>
  error instanceof Error && ['offer_version_changed', 'agreement_unavailable_or_changed'].includes(error.message);

export function agreementConfirmation(room: DealRoom | null) {
  const agreement = room?.agreement;
  const mine = Boolean(room?.is_owner ? agreement?.owner_accepted_at : agreement?.provider_accepted_at);
  const other = Boolean(room?.is_owner ? agreement?.provider_accepted_at : agreement?.owner_accepted_at);
  return { mine, other, count: Number(mine) + Number(other) };
}

export function privateRoomLimit(room: DealRoom | null) {
  if (!room?.is_owner || !room.mandate) return null;
  const { price_floor, budget_max } = room.mandate;
  if (price_floor != null && price_floor !== '') return { label: 'Votre prix plancher', value: price_floor };
  if (budget_max != null && budget_max !== '') return { label: 'Votre budget maximal', value: budget_max };
  return null;
}

export function agreementTotal(room: DealRoom) {
  if (room.agreement_total != null) return room.agreement_total;
  const terms = room.agreement?.terms;
  const fees = Number(terms?.delivery_fee ?? 0);
  return { fees, amount: Number(terms?.amount ?? 0) + fees };
}

export type RoomFollowup = {
  deal_room_id: string;
  title: string;
  next_status?: string;
  decision_version?: number;
  latest_event?: string;
};

const roomStates: Record<string, string> = {
  awaiting_you: 'Votre confirmation est attendue',
  awaiting_other: 'En attente de l’interlocuteur',
  accepted: 'Accord confirmé',
  completed: 'Échange clôturé',
  rejected: 'Proposition refusée',
  application_prepared: 'Dossier prêt à transmettre',
  application_submitted: 'Dépôt enregistré · Réponse attendue',
  application_answered: 'Réponse au dossier reçue',
  awaiting_contact: 'Contact en attente',
  bot: 'Bot mène l’échange',
  paused: 'Bot en pause',
  blocked: 'Liaison de l’échange à vérifier',
};

export const roomFollowupText = (room: RoomFollowup) =>
  roomStates[room.next_status ?? ''] ?? 'Voir le suivi de l’échange';
