import { describe, expect, it } from 'vitest';
import { followUpView, sinceText, untilText } from '../WaouhBotFollowUp';

describe('suivi après « Confier à Bot »', () => {
  const now = Date.parse('2026-11-15T18:00:00Z');

  it('dit où en est Bot sans jargon, étape par étape', () => {
    const start = followUpView({ events: [{ event_type: 'delegate', created_at: '2026-11-15T17:59:00Z', id: '1' }], control_mode: 'bot' });
    expect(start.headline).toBe('Bot prépare le premier contact');
    expect(start.steps.map((s) => s.state)).toEqual(['done', 'active', 'todo', 'todo']);

    const waiting = followUpView({ provider_joined: true, control_mode: 'bot' });
    expect(waiting.headline).toBe('En attente de la réponse du vendeur');

    const negotiating = followUpView({ provider_joined: true, current_offer_version: 2, control_mode: 'bot' });
    expect(negotiating.headline).toBe('Bot négocie pour vous');
    expect(negotiating.steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'active']);

    const agreed = followUpView({ provider_joined: true, current_offer_version: 2, agreement: { status: 'accepted' } });
    expect(agreed.headline).toBe('Accord trouvé');
    expect(agreed.steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('montre la pause et les dernières activités, plus récentes en premier', () => {
    const view = followUpView({ control_mode: 'paused', events: [
      { event_type: 'delegate', created_at: '2026-11-15T17:00:00Z', id: 'a' },
      { event_type: 'bot_step', created_at: '2026-11-15T17:30:00Z', id: 'b' },
      { event_type: 'inconnu_interne', created_at: '2026-11-15T17:40:00Z', id: 'c' },
    ] });
    expect(view.headline).toBe('Bot est en pause');
    expect(view.activity.map((a) => a.id)).toEqual(['b', 'a']);
    expect(view.activity.every((a) => !/_/.test(a.text))).toBe(true);
  });

  it('formule les durées en clair', () => {
    expect(sinceText('2026-11-15T17:59:50Z', now)).toBe('à l’instant');
    expect(sinceText('2026-11-15T17:55:00Z', now)).toBe('il y a 5 min');
    expect(sinceText('2026-11-15T15:00:00Z', now)).toBe('il y a 3 h');
    expect(untilText('2026-11-15T18:12:00Z', now)).toBe('dans 12 min');
    expect(sinceText(null, now)).toBe('');
  });
});
