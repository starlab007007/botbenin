// deno-lint-ignore-file no-explicit-any
import { openBuyerDeal } from './waouh-deal-open.ts';
import { planAvatarNegotiation } from './waouh-avatar-lifecycle.ts';

export async function avatarNotice(sb: any, ownerId: string, key: string, text: string, context: any = {}) {
  const { data: user } = await sb.from('waouh_users').select('id,web_session_id')
    .eq('auth_user_id', ownerId).order('created_at').limit(1).maybeSingle();
  if (!user) return;
  const { error } = await sb.from('waouh_notifications').insert({
    user_id: user.id, web_session_id: user.web_session_id, notification_type: 'avatar_mission_progress',
    article_id: context.article_id ?? null, thread_id: context.thread_id ?? null,
    channel: 'waouh_app', photos: [], delivery_status: 'delivered', delivered_at: new Date().toISOString(),
    dedupe_key: key, payload: { text, ...context, actions: [{ id: context.thread_id ? `ouvrir-deal-room:${context.thread_id}` : 'open-missions',
      label: context.thread_id ? 'Continuer dans la Deal Room' : 'Voir ma mission', kind: 'navigate', route: context.thread_id ? '/app/chat/waouh' : '/app/missions' }] },
  });
  if (error && error.code !== '23505') throw error;
}

export async function requestAvatarApproval(sb: any, mandate: any, journey: any, action: string, key: string, summary: string, extra: any = {}) {
  const context = { operation: 'avatar.lifecycle', avatar_action_key: key, mandate_id: mandate.id,
    journey_id: journey.id, fabric_id: journey.fabric_id, article_id: journey.article_id, thread_id: journey.thread_id, ...extra };
  const { data: existing } = await sb.from('waouh_agent_approvals').select('id,status').contains('context', { avatar_action_key: key }).maybeSingle();
  if (existing) return existing;
  const { data, error } = await sb.from('waouh_agent_approvals').insert({ owner_id: mandate.owner_id,
    action_type: action, action_summary: summary, context, status: 'pending',
    expires_at: new Date(Math.min(Date.parse(mandate.expires_at), Date.now() + 24 * 3600000)).toISOString(),
  }).select('id,status').single();
  if (error) { if (error.code === '23505') return null; throw error; }
  await avatarNotice(sb, mandate.owner_id, `avatar-approval:${key}`, summary, { ...context, approval_id: data.id });
  await sb.from('waouh_opportunity_journeys').update({ next_best_action: 'REQUEST_APPROVAL',
    last_action: 'owner_approval_requested', next_action: 'Valider dans Missions', last_message: summary,
  }).eq('id', journey.id);
  return data;
}

async function callNegotiation(sb: any, mandate: any, journey: any, text: string, approvalId?: string) {
  const { data: actor } = await sb.from('waouh_users').select('id').eq('auth_user_id', mandate.owner_id).order('created_at').limit(1).maybeSingle();
  if (!actor) throw new Error('avatar_owner_identity_missing');
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/waouh-negotiation-router`, {
    method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: actor.id, thread_id: journey.thread_id, negotiation_id: journey.negotiation_id, text, avatar_approval_id: approvalId }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.ok === false || result.error) throw new Error(`negotiation_transition_failed:${response.status}`);
  return result;
}

export async function reconcileAvatarApprovals(sb: any, limit = 20) {
  const { data: approvals, error } = await sb.from('waouh_agent_approvals').select('*')
    .in('status', ['approved', 'rejected']).in('context->>operation', ['avatar.lifecycle', 'nexus.internal_blind_message', 'nexus.blind_message']).is('context->lifecycle_processed_at', null).order('decided_at').limit(200);
  if (error) throw error;
  let processed = 0;
  for (const approval of approvals ?? []) {
    const c = approval.context ?? {};
    if (c.lifecycle_processed_at || processed >= limit) continue;
    if (!['avatar.lifecycle', 'nexus.internal_blind_message', 'nexus.blind_message'].includes(c.operation)) continue;
    try {
      let query = sb.from('waouh_opportunity_journeys').select('*');
      query = c.journey_id ? query.eq('id', c.journey_id) : query.eq('owner_id', c.from_auth_user).eq('fabric_id', c.fabric_id ?? `external:${c.signal_id}`);
      const { data: journey } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (!journey) throw new Error('approval_journey_missing');
      let outcome = 'rejected';
      if (approval.status === 'rejected') {
        if (approval.action_type === 'send_message') await sb.from('waouh_opportunity_journeys').update({ stage: 'cancelled', last_action: 'contact_declined', last_message: 'Mise en relation refusée.', completed_at: new Date().toISOString() }).eq('id', journey.id);
      } else if (c.operation === 'avatar.lifecycle') {
        const { data: mandate } = await sb.from('waouh_avatar_mandates').select('*').eq('id', c.mandate_id).eq('owner_id', approval.owner_id).maybeSingle();
        if (!mandate || mandate.status !== 'active' || Date.parse(mandate.expires_at) <= Date.now()) throw new Error('approval_mandate_inactive');
        if (approval.action_type === 'send_message') {
          await sb.from('waouh_opportunity_journeys').update({ stage: 'contact_ready', next_best_action: 'CONTACT_NOW',
            metadata: { ...journey.metadata, contact_approved: true, contact_approval_id: approval.id }, last_action: 'contact_approved',
          }).eq('id', journey.id);
          await sb.from('waouh_persistent_intents').update({ next_scan_at: new Date().toISOString() }).eq('mandate_id', mandate.id).eq('status', 'active');
          outcome = 'contact_authorized';
        } else if (approval.action_type === 'accept_offer') {
          const { data: neg } = await sb.from('waouh_negotiations').select('*').eq('id', journey.negotiation_id).maybeSingle();
          if (!neg || neg.updated_at !== c.negotiation_revision || Number(neg.last_offer_price) !== Number(c.amount)) throw new Error('offer_changed_reapproval_required');
          await callNegotiation(sb, mandate, journey, 'oui', approval.id);
          outcome = 'agreement_recorded';
        } else {
          await avatarNotice(sb, mandate.owner_id, `avatar-manual-terms:${approval.id}`, 'Ouvrez la Deal Room pour préciser votre contre-offre.', journey);
          outcome = 'owner_terms_required';
        }
      } else {
        // Historical mediated approvals never authorize impersonating the origin seller.
        let articleId = journey.article_id ?? c.article_id ?? (journey.fabric_id.startsWith('article:') ? journey.fabric_id.slice(8) : null);
        const buyerAuth = journey.mode === 'sell' ? approval.owner_id : journey.owner_id;
        const { data: buyer } = await sb.from('waouh_users').select('id').eq('auth_user_id', buyerAuth).order('created_at').limit(1).maybeSingle();
        if (articleId && buyer) {
          const { data: article } = await sb.from('waouh_articles').select('seller_id').eq('id', articleId).maybeSingle();
          const sellerAuth = journey.mode === 'sell' ? journey.owner_id : approval.owner_id;
          const { data: seller } = await sb.from('waouh_users').select('id').eq('auth_user_id', sellerAuth).eq('id', article?.seller_id).maybeSingle();
          if (!seller) throw new Error('approved_counterparty_mismatch');
          const result = await openBuyerDeal({ sb, articleId, buyerUserId: buyer.id, source: 'avatar_legacy_approval',
            supabaseUrl: Deno.env.get('SUPABASE_URL')!, serviceRole: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            rejectUnavailable: true, notifySeller: 'on_create', openNegotiation: false });
          if (!result.ok || !result.threadId) throw new Error(result.code ?? 'deal_room_failed');
          await sb.from('waouh_opportunity_journeys').update({ article_id: articleId, thread_id: result.threadId,
            negotiation_id: result.negotiationId, stage: 'negotiating', last_action: 'approved_contact_connected',
            next_best_action: 'NEGOTIATE', last_message: 'Mise en relation acceptée. Définissez les conditions dans la Deal Room.',
          }).eq('id', journey.id);
          await avatarNotice(sb, journey.owner_id, `legacy-approved:${approval.id}`, 'Votre mise en relation acceptée est disponible dans la Deal Room.', { ...journey, thread_id: result.threadId });
          outcome = 'thread_opened';
        } else {
          await avatarNotice(sb, journey.owner_id, `legacy-article-required:${approval.id}`, 'Votre mise en relation est acceptée. Sélectionnez l’article à proposer pour ouvrir la Deal Room.', journey);
          await sb.from('waouh_opportunity_journeys').update({ stage: 'contact_ready', last_action: 'article_selection_required',
            last_message: 'Contrepartie d’accord. Sélectionnez l’article à proposer.', next_best_action: 'REQUEST_APPROVAL',
          }).eq('id', journey.id);
          outcome = 'article_selection_required';
        }
      }
      await sb.from('waouh_agent_approvals').update({ context: { ...c, lifecycle_processed_at: new Date().toISOString(), lifecycle_outcome: outcome } }).eq('id', approval.id);
      await sb.from('waouh_agent_outbox').update({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null }).eq('aggregate_id', approval.id).eq('status', 'pending');
      processed++;
    } catch (e) {
      await sb.from('waouh_agent_approvals').update({ context: { ...c, lifecycle_error: String(e).slice(0, 200) } }).eq('id', approval.id);
    }
  }
  return processed;
}

export async function finishLegacySearch(sb: any, mandate: any, results: any[]) {
  const missionId = mandate.metadata?.legacy_mission_id;
  if (!missionId) {
    if (mandate.metadata?.completion_goal === 'recommendations') {
      const { error } = await sb.from('waouh_avatar_mandates').update({ status: 'completed', metadata: {
        ...mandate.metadata, outcome: results.length ? 'recommendations_ready' : 'no_match',
        results: results.slice(0,12).map(r => ({ fabric_id: r.fabric_id, subject: r.subject, score: r.scores?.total_score }))
      } }).eq('id', mandate.id);
      if (error) throw error;
      await avatarNotice(sb, mandate.owner_id, `avatar-results:${mandate.id}`, `${results.length} pistes pertinentes trouvées. Consultez les résultats de votre recherche.`, { mandate_id: mandate.id });
    }
    return;
  }
  const output = { avatar_mandate_id: mandate.id, result_count: results.length,
    results: results.slice(0, 12).map(r => ({ fabric_id: r.fabric_id, subject: r.subject, score: r.scores?.total_score, source_key: r.source_key })) };
  const { error } = await sb.from('waouh_agent_steps').update({ status: 'completed', output, completed_at: new Date().toISOString(), last_error: null })
    .eq('mission_id', missionId).in('tool_name', ['catalog_search', 'compare_results', 'present_recommendations', 'nexus_market_search', 'nexus_price_compare']);
  if (error) throw error;
  await sb.from('waouh_agent_steps').update({ status: 'waiting_approval', output }).eq('mission_id', missionId).eq('tool_name', 'request_contact_approval');
  await sb.from('waouh_agent_steps').update({ status: 'running', output }).eq('mission_id', missionId).eq('tool_name', 'continuous_watch');
  await sb.from('waouh_agent_outbox').update({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null })
    .eq('mission_id', missionId).in('event_type', ['mission.created', 'mission.run_requested']);
  await avatarNotice(sb, mandate.owner_id, `legacy-search:${missionId}`, results.length
    ? `Avatar a comparé ${results.length} pistes. Consultez les résultats et choisissez celles à contacter.`
    : 'Avatar a terminé cette recherche sans résultat suffisamment pertinent. Modifiez le besoin ou élargissez la zone.', { mandate_id: mandate.id, mission_id: missionId });
  if (mandate.metadata.completion_goal === 'recommendations') {
    await sb.from('waouh_agent_plans').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('mission_id', missionId).eq('status', 'active');
    await sb.from('waouh_avatar_mandates').update({ status: 'completed', metadata: { ...mandate.metadata, outcome: results.length ? 'recommendations_ready' : 'no_match' } }).eq('id', mandate.id);
  }
}

export async function advanceAvatarLifecycle(sb: any, limit = 20) {
  const approvals = await reconcileAvatarApprovals(sb, limit);
  const { data: journeys } = await sb.from('waouh_opportunity_journeys').select('*,waouh_avatar_mandates(*)')
    .not('mandate_id', 'is', null).in('stage', ['negotiating', 'agreed', 'executing']).order('last_activity_at').limit(limit);
  let advanced = 0;
  for (const j of journeys ?? []) {
    const m = j.waouh_avatar_mandates;
    if (!m || m.status !== 'active') continue;
    try {
      if (j.stage === 'negotiating' && j.negotiation_id) {
        const { data: neg } = await sb.from('waouh_negotiations').select('*').eq('id', j.negotiation_id).maybeSingle();
        if (!neg) continue;
        const rounds = Number(j.metadata?.avatar_counter_rounds ?? 0);
        const plan = planAvatarNegotiation(m, neg, rounds);
        const key = `negotiate:${j.id}:${neg.updated_at}`;
        if (plan.kind === 'counter') {
          await callNegotiation(sb, m, j, `je propose ${plan.amount} FCFA`);
          await sb.from('waouh_opportunity_journeys').update({ metadata: { ...j.metadata, avatar_counter_rounds: rounds + 1 },
            last_action: 'bounded_counter_offer', last_message: `Avatar a proposé ${plan.amount} FCFA dans votre limite.`, last_activity_at: new Date().toISOString() }).eq('id', j.id);
          advanced++;
        } else if (plan.kind === 'approval') {
          await requestAvatarApproval(sb, m, j, plan.action!, key,
            plan.action === 'accept_offer' ? `Confirmer l’accord à ${plan.amount} FCFA ?` : 'Votre décision est nécessaire pour les conditions de cette offre.',
            { negotiation_id: neg.id, negotiation_revision: neg.updated_at, amount: plan.amount, reason: plan.reason });
        }
      }
      if (j.deal_id) {
        const { data: deal } = await sb.from('waouh_deals').select('*').eq('id', j.deal_id).maybeSingle();
        if (!deal || ['completed', 'cancelled'].includes(deal.status)) continue;
        if (deal.status === 'pending_assignment' && deal.seller_confirmed_at && deal.buyer_payment_selected_at) {
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/waouh-deal-ops`, {
            method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reconcile', deal_id: deal.id }), signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error('deal_reconciliation_failed');
        }
        const day = new Date().toISOString().slice(0, 10);
        const message = !deal.seller_confirmed_at ? 'Accord enregistré. Confirmation de disponibilité du vendeur en attente.'
          : !deal.buyer_payment_selected_at ? 'Confirmez votre mode de paiement pour préparer la livraison.'
          : deal.status === 'pending_assignment' ? 'WAOUH recherche un livreur. Votre dossier reste suivi.'
          : deal.status === 'delivered' ? 'Livraison enregistrée. Vérifiez la réception puis confirmez le paiement effectivement réalisé.'
          : 'Votre accord est en cours d’exécution. Consultez le suivi dans la Deal Room.';
        await avatarNotice(sb, m.owner_id, `avatar-deal:${deal.id}:${deal.status}:${day}`, message, j);
      }
    } catch (e) {
      await sb.from('waouh_opportunity_journeys').update({ last_action: 'retry_required', last_message: 'Une étape doit être reprise. Votre accord reste conservé.',
        metadata: { ...j.metadata, lifecycle_error: String(e).slice(0, 160) } }).eq('id', j.id);
    }
  }
  return { approvals, advanced };
}

// A STOP applies to the endpoint across its duplicated source records.
export async function revokeAvatarContacts(sb: any, contactIds: string[]) {
  if (!contactIds.length) return;
  const { data: contacts } = await sb.from('waouh_entity_contacts').select('value_hash').in('id', contactIds);
  const hashes = [...new Set((contacts ?? []).map((c: any) => c.value_hash).filter(Boolean))];
  if (hashes.length) await sb.from('waouh_entity_contacts').update({ consent_state: 'revoked', contactability_level: 'C0',
    verification_status: 'revoked', is_whatsapp_reachable: false }).in('value_hash', hashes);
}

export async function openAvatarReplyRoom(sb: any, journey: any, phone: string, channel: string) {
  if (journey.thread_id) return { threadId: journey.thread_id, negotiationId: journey.negotiation_id, articleId: journey.article_id };
  const signalId = String(journey.fabric_id).startsWith('external:') ? journey.fabric_id.slice(9) : null;
  if (!signalId) throw new Error('external_signal_required');
  const { data: signal } = await sb.from('waouh_external_commerce_signals').select('*').eq('id', signalId).single();
  if (!signal) throw new Error('external_signal_missing');
  const digits = phone.replace(/\D/g, '');
  let { data: counterpart } = await sb.from('waouh_users').select('id').eq('phone_number', digits).order('created_at').limit(1).maybeSingle();
  if (!counterpart) {
    const result = await sb.from('waouh_users').insert({ phone_number: digits, display_name: signal.actor_name || 'Contact Avatar', channel, is_verified: false }).select('id').single();
    if (result.error) throw result.error;
    counterpart = result.data;
  }
  const { data: owner } = await sb.from('waouh_users').select('id').eq('auth_user_id', journey.owner_id).order('created_at').limit(1).maybeSingle();
  if (!owner) throw new Error('owner_identity_missing');
  let articleId = journey.article_id;
  if (journey.mode !== 'sell') {
    if (!['SELL','ANNOUNCE'].includes(signal.intent)) throw new Error('seller_signal_required');
    const key = `nexus_external:${signal.id}`;
    const { data: existing } = await sb.from('waouh_articles').select('id').eq('ai_canonical_key', key).limit(1).maybeSingle();
    articleId = existing?.id;
    if (!articleId) {
      const { signalToArticleRow } = await import('./waouh-nexus-deal.ts');
      const result = await sb.from('waouh_articles').insert({ ...signalToArticleRow(signal, counterpart.id), ai_canonical_key: key }).select('id').single();
      if (result.error) throw result.error;
      articleId = result.data.id;
    }
  } else {
    const { data: article } = await sb.from('waouh_articles').select('id').eq('id', articleId).eq('seller_id', owner.id).maybeSingle();
    if (!article) throw new Error('owned_article_required');
  }
  const result = await openBuyerDeal({ sb, articleId, buyerUserId: journey.mode === 'sell' ? counterpart.id : owner.id,
    source: 'avatar_positive_reply', supabaseUrl: Deno.env.get('SUPABASE_URL')!, serviceRole: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    notifySeller: 'never', openNegotiation: false, rejectUnavailable: true });
  if (!result.ok || !result.threadId) throw new Error(result.code ?? 'deal_room_failed');
  await sb.from('waouh_opportunity_journeys').update({ article_id: articleId, thread_id: result.threadId,
    negotiation_id: result.negotiationId, stage: 'negotiating', last_action: 'counterparty_connected' }).eq('id', journey.id);
  return { threadId: result.threadId, negotiationId: result.negotiationId, articleId };
}
