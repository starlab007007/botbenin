import 'package:flutter/material.dart';

// Suivi après « Confier à Bot » : où il en est, ce qu'il a fait, ce qu'il fera ensuite.
// Même logique que le web : on décrit l'avancement, jamais le fonctionnement.

const Map<String, String> _eventText = {
  'open': 'Échange ouvert',
  'adopt': 'Historique relié',
  'delegate': 'Vous avez confié l’échange à Bot',
  'bot_step': 'Bot a avancé sur l’échange',
  'takeover': 'Vous avez repris la main',
  'pause': 'Bot mis en pause',
  'resume_bot': 'Bot a repris l’échange',
  'propose': 'Une proposition a été faite',
  'accept': 'Une partie a confirmé les conditions',
  'complete': 'Échange clôturé',
  'retry_required': 'Nouvelle tentative prévue',
  'guest_contacted': 'Vendeur contacté par WhatsApp',
  'guest_stopped': 'Le vendeur ne souhaite pas être contacté',
  'seller_pending': 'Recherche d’un moyen de joindre le vendeur',
};

String liveSinceText(String? iso, [DateTime? now]) {
  final t = iso == null ? null : DateTime.tryParse(iso);
  if (t == null) return '';
  final s = (now ?? DateTime.now()).difference(t).inSeconds.clamp(0, 1 << 30);
  if (s < 45) return 'à l’instant';
  final m = (s / 60).round();
  if (m < 60) return 'il y a $m min';
  final h = (m / 60).round();
  if (h < 24) return 'il y a $h h';
  return 'il y a ${(h / 24).round()} j';
}

String liveUntilText(String? iso, [DateTime? now]) {
  final t = iso == null ? null : DateTime.tryParse(iso);
  if (t == null) return '';
  final m = (t.difference(now ?? DateTime.now()).inSeconds / 60).round();
  if (m <= 1) return 'dans un instant';
  if (m < 60) return 'dans $m min';
  final h = (m / 60).round();
  return h < 24 ? 'dans $h h' : 'dans ${(h / 24).round()} j';
}

class LiveFollowStep {
  const LiveFollowStep(this.label, this.state);
  final String label;
  /// 'done' | 'active' | 'todo'
  final String state;
}

class LiveFollowActivity {
  const LiveFollowActivity(this.id, this.text, this.at);
  final String id, text;
  final String? at;
}

class LiveFollowUpView {
  const LiveFollowUpView({required this.steps, required this.headline, required this.hint, required this.activity, required this.cascade, required this.agreed, required this.paused});
  final List<LiveFollowStep> steps;
  final String headline, hint, cascade;
  final List<LiveFollowActivity> activity;
  final bool agreed, paused;
}

LiveFollowUpView liveFollowUpView(Map<String, dynamic>? room) {
  final agreement = room?['agreement'];
  final status = agreement is Map ? '${agreement['status'] ?? ''}' : '';
  final events = room?['events'] is List ? (room!['events'] as List).whereType<Map>().toList() : <Map>[];
  final messages = room?['messages'] is List ? room!['messages'] as List : const [];
  final closed = room?['closed'] == true || status == 'completed';
  final agreed = status == 'accepted' || status == 'completed';
  final paused = room?['control_mode'] == 'paused';
  final contacted = room?['provider_joined'] == true ||
      room?['external_contact'] != null ||
      events.any((e) => e['event_type'] == 'guest_contacted' || e['event_type'] == 'bot_step') ||
      messages.isNotEmpty;
  final negotiating = agreed || (num.tryParse('${room?['current_offer_version'] ?? 0}') ?? 0) > 0 || agreement != null;
  final done = [true, contacted, negotiating, agreed];
  const labels = ['Mission confiée', 'Vendeur contacté', 'Négociation', 'Accord'];
  final firstOpen = done.indexOf(false);
  final steps = [
    for (var i = 0; i < labels.length; i++)
      LiveFollowStep(labels[i], done[i] ? 'done' : (i == firstOpen && !paused ? 'active' : 'todo')),
  ];
  final headline = agreed
      ? (closed ? 'Échange conclu' : 'Accord trouvé')
      : paused
          ? 'Bot est en pause'
          : !contacted
              ? 'Bot prépare le premier contact'
              : !negotiating
                  ? 'En attente de la réponse du vendeur'
                  : status == 'proposed'
                    ? (agreement is Map && agreement['owner_accepted_at'] != null
                      ? 'En attente de l’interlocuteur' : 'Votre confirmation est attendue')
                    : 'Bot négocie pour vous';
  final hint = agreed
      ? 'Il ne reste qu’à finaliser ensemble.'
      : paused
          ? 'Reprenez-le quand vous voulez.'
          : 'Vous serez prévenu à chaque avancée importante.';
  final known = events.where((e) => _eventText.containsKey('${e['event_type']}')).toList();
  final activity = [
    for (final e in known.reversed.take(3))
      LiveFollowActivity('${e['id'] ?? '${e['event_type']}-${e['created_at']}'}', _eventText['${e['event_type']}']!, e['created_at']?.toString()),
  ];
  final mandate = room?['mandate'];
  final steps0 = mandate is Map ? num.tryParse('${mandate['cascade_step'] ?? 0}') ?? 0 : 0;
  final stepsMax = mandate is Map ? num.tryParse('${mandate['cascade_max_steps'] ?? 0}') ?? 0 : 0;
  final cascade = stepsMax > 1 && steps0 > 0 ? 'Piste $steps0 sur $stepsMax' : '';
  return LiveFollowUpView(steps: steps, headline: headline, hint: hint, activity: activity, cascade: cascade, agreed: agreed, paused: paused);
}

class LiveBotFollowUpCard extends StatelessWidget {
  const LiveBotFollowUpCard({super.key, required this.room, this.title, this.onMissions});
  final Map<String, dynamic>? room;
  final String? title;
  final VoidCallback? onMissions;

  @override
  Widget build(BuildContext context) {
    final view = liveFollowUpView(room);
    final next = room?['next_run_at'] != null && !view.agreed && !view.paused ? liveUntilText('${room!['next_run_at']}') : '';
    const jade = Color(0xFF087E70);
    return Semantics(
      liveRegion: true,
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        color: const Color(0xFFECFAF6),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Image.asset('assets/bot/bot_avatar.png', width: 40),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(view.headline, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  Text(
                    [if (title != null && title!.isNotEmpty) title!, view.hint].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              for (final s in view.steps)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Column(children: [
                      Container(
                        height: 5,
                        decoration: BoxDecoration(
                          color: s.state == 'done' ? jade : (s.state == 'active' ? const Color(0xFF7BD0C4) : const Color(0xFFD9DEE3)),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        s.label,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        style: TextStyle(fontSize: 11, fontWeight: s.state == 'todo' ? FontWeight.w400 : FontWeight.w600, color: s.state == 'todo' ? Colors.black38 : Colors.black87),
                      ),
                    ]),
                  ),
                ),
            ]),
            if (view.activity.isNotEmpty || next.isNotEmpty || view.cascade.isNotEmpty) ...[
              const Divider(height: 20),
              for (final a in view.activity)
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Row(children: [
                    Expanded(child: Text(a.text, style: const TextStyle(fontSize: 12))),
                    Text(liveSinceText(a.at), style: const TextStyle(fontSize: 11, color: Colors.black45)),
                  ]),
                ),
              if (next.isNotEmpty) Text('Prochain point de Bot : $next', style: const TextStyle(fontSize: 12, color: Colors.black54)),
              if (view.cascade.isNotEmpty) Text('${view.cascade} · Bot passe à la suivante si le vendeur ne répond pas.', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ],
            if (onMissions != null) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(onPressed: onMissions, icon: const Icon(Icons.account_tree_outlined, size: 18), label: const Text('Toutes mes missions')),
            ],
          ]),
        ),
      ),
    );
  }
}
