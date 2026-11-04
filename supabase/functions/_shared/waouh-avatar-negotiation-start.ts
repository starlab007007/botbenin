// First proposals are separate from acceptance: an initial offer never grants an agreement.
export type InitialNegotiationPlan =
  | { kind: 'wait' }
  | { kind: 'approval' }
  | { kind: 'offer'; amount: number }
  | { kind: 'quote'; text: string };

export function planAvatarNegotiationStart(mandate: any, journey: any, price: unknown,
  approved = false, now = Date.now()): InitialNegotiationPlan {
  if (mandate.status !== 'active' || !Number.isFinite(Date.parse(mandate.expires_at)) ||
      Date.parse(mandate.expires_at) <= now || mandate.allow_waouh === false || mandate.metadata?.agreement_reached_at ||
      journey.negotiation_id || journey.metadata?.initial_negotiation_sent ||
      journey.stage !== 'negotiating' || !journey.thread_id || !journey.article_id) return { kind: 'wait' };
  if (!approved && (mandate.autonomy_mode !== 'autonomous' ||
      mandate.metadata?.autonomy_settings?.allow_negotiate === false)) return { kind: 'approval' };
  const amount = Number(price), budget = Number(mandate.budget_max);
  if (mandate.mode !== 'sell' && Number.isFinite(amount) && amount >= 1 &&
      Number.isFinite(budget) && budget >= 1) {
    return { kind: 'offer', amount: Math.min(100_000_000, Math.floor(amount), Math.floor(budget)) };
  }
  return { kind: 'quote', text: mandate.mode === 'sell'
    ? 'Pouvez-vous préciser la quantité souhaitée et votre proposition de prix ? L’accord final sera confirmé par le vendeur.'
    : 'Pouvez-vous préciser votre prix et les conditions du devis pour cette demande ? L’accord final sera confirmé par l’utilisateur.' };
}

/** A stable commerce key makes a crash after dispatch recoverable without a second proposal. */
export async function dispatchAvatarNegotiationStart(journey: any,
  plan: Extract<InitialNegotiationPlan, {kind: 'offer' | 'quote'}>,
  dispatch: (body: Record<string, unknown>) => Promise<any>) {
  const result = await dispatch({
    action: plan.kind === 'offer' ? 'offer' : 'ask',
    idem: `avatar-start:${journey.id}:${plan.kind}:${plan.kind === 'offer' ? plan.amount : 'quote'}`,
    thread_id: journey.thread_id, article_id: journey.article_id,
    ...(plan.kind === 'offer' ? { amount: plan.amount } : { text: plan.text }),
    confirmed: true, source: 'avatar_initial_negotiation',
  });
  if (!result?.ok || result.pending || result.thread_id !== journey.thread_id ||
      (plan.kind === 'offer' && !result.negotiation_id)) throw new Error('initial_negotiation_not_confirmed');
  return result;
}
