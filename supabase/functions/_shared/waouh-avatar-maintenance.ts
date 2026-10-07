import { scoreFabricSignal } from './waouh-signal-fabric.ts';
import { avatarNotice } from './waouh-avatar-orchestrator.ts';

// Legacy watches are read-only monitoring; they never grant outreach authority.
export async function maintainAvatarQueues(sb: any) {
  const now = new Date().toISOString();
  const { data: expired, error: expiryError } = await sb.from('waouh_agent_approvals').update({ status: 'expired', decided_at: now, decision_note: 'Délai de réponse atteint.' })
    .eq('status', 'pending').lt('expires_at', now).select('id,context');
  if (expiryError) throw expiryError;
  for (const a of expired ?? []) {
    await sb.from('waouh_agent_outbox').update({ status: 'failed', last_error: 'approval_expired' }).eq('aggregate_id', a.id).eq('status', 'pending');
    if (a.context?.journey_id) await sb.from('waouh_opportunity_journeys').update({ last_action: 'approval_expired', last_message: 'Le délai de validation est dépassé. Une nouvelle décision est nécessaire.' }).eq('id', a.context.journey_id);
  }
  const { data: watches, error } = await sb.from('waouh_watchlists').select('*').eq('status', 'active')
    .or(`next_check_at.is.null,next_check_at.lte.${now}`).order('next_check_at', { nullsFirst: true }).limit(10);
  if (error) throw error;
  let checked = 0;
  for (const watch of watches ?? []) {
    if (watch.expires_at && Date.parse(watch.expires_at) <= Date.now()) {
      await sb.from('waouh_watchlists').update({ status: 'paused' }).eq('id', watch.id);
      await sb.from('waouh_agent_outbox').update({ status: 'delivered', delivered_at: now }).eq('aggregate_id', watch.id).eq('event_type', 'watch.created');
      continue;
    }
    let query = sb.from('waouh_signal_fabric').select('*').in('intent', ['SELL', 'ANNOUNCE']);
    if (watch.article_id) query = query.eq('fabric_id', `article:${watch.article_id}`);
    else if (watch.source_url) query = query.eq('source_url', watch.source_url);
    const { data: signals, error: searchError } = await query.order('observed_at', { ascending: false }).limit(1500);
    if (searchError) throw searchError;
    const matches = (signals ?? []).filter((s: any) => (watch.article_id || watch.source_url ||
      scoreFabricSignal({ query: watch.query, mode: 'find_sellers', signal: s }).total_score >= 75) && Number(s.price_min ?? s.price_max) > 0);
    const amount = matches.length ? Math.min(...matches.map((s: any) => Number(s.price_min ?? s.price_max))) : null;
    if (amount && (watch.last_observed_amount == null || amount !== Number(watch.last_observed_amount)) &&
        (watch.target_amount == null || amount <= Number(watch.target_amount))) {
      await avatarNotice(sb, watch.owner_id, `watch:${watch.id}:${amount}:${now.slice(0,10)}`,
        `Votre veille « ${watch.query} » a trouvé un prix de ${amount} FCFA. Vérifiez disponibilité et conditions dans WAOUH.`,
        { watch_id: watch.id, article_id: watch.article_id, observed_amount: amount });
    }
    if (!amount && !watch.last_checked_at) await avatarNotice(sb, watch.owner_id, `watch-registered:${watch.id}`,
      'Votre veille est active sur les sources disponibles. Aucun prix correspondant n’est encore observé.', { watch_id: watch.id });
    const { error: updateError } = await sb.from('waouh_watchlists').update({ last_checked_at: now, last_observed_amount: amount,
      next_check_at: new Date(Date.now() + Math.max(15, Number(watch.check_interval_minutes || 60)) * 60000).toISOString() }).eq('id', watch.id).eq('status', 'active');
    if (updateError) throw updateError;
    await sb.from('waouh_agent_outbox').update({ status: 'delivered', delivered_at: now, last_error: null }).eq('aggregate_id', watch.id).eq('event_type', 'watch.created').eq('status', 'pending');
    checked++;
  }
  return { watches_checked: checked, approvals_expired: (expired ?? []).length };
}
