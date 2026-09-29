import 'package:flutter/material.dart';

/// Notes de l'avatar (parité Web : `src/lib/waouh/avatarNotes.ts`) — points d'avancement et synthèse d'une offre
/// vers un vendeur externe. Les données sont calculées côté serveur (`meta.avatar_progress`, `meta.avatar_synthesis`).
class LiveAvatarStep {
  const LiveAvatarStep({required this.key, required this.label, required this.state});
  final String key;
  final String label;

  /// `done` | `current` | `todo`
  final String state;
}

/// Lecture défensive : toute donnée inattendue donne `null`, jamais une exception dans la timeline.
List<LiveAvatarStep>? liveParseAvatarProgress(Object? value) {
  if (value is! List) return null;
  final steps = <LiveAvatarStep>[];
  for (final raw in value) {
    if (raw is! Map) continue;
    final label = '${raw['label'] ?? ''}'.trim();
    final state = '${raw['state'] ?? ''}';
    if (label.isEmpty || !const {'done', 'current', 'todo'}.contains(state)) continue;
    steps.add(LiveAvatarStep(key: '${raw['key'] ?? ''}', label: label, state: state));
  }
  return steps.length >= 2 ? steps : null;
}

class LiveAvatarSynthesisData {
  const LiveAvatarSynthesisData({
    required this.offer,
    this.listPrice,
    this.gapPct,
    this.stance = 'unknown',
    this.suggested,
    this.etaHours,
    this.nextFollowUpAt,
  });
  final double offer;
  final double? listPrice;
  final int? gapPct;
  final String stance;
  final double? suggested;
  final int? etaHours;
  final DateTime? nextFollowUpAt;

  /// Part du prix affiché atteinte par l'offre (0–100), `null` si inconnue.
  int? get gauge => listPrice == null || listPrice! <= 0 ? null : (offer / listPrice! * 100).round().clamp(0, 100).toInt();

  String get stanceLabel => switch (stance) {
        'close' => 'Offre proche du prix affiché',
        'fair' => 'Offre réaliste',
        'ambitious' => 'Offre ambitieuse',
        _ => 'Offre enregistrée',
      };
}

LiveAvatarSynthesisData? liveParseAvatarSynthesis(Object? value) {
  if (value is! Map) return null;
  double? number(Object? v) => v == null ? null : double.tryParse('$v');
  final offer = number(value['offer']);
  if (offer == null) return null;
  final stance = '${value['stance'] ?? ''}';
  return LiveAvatarSynthesisData(
    offer: offer,
    listPrice: number(value['listPrice']),
    gapPct: number(value['gapPct'])?.round(),
    stance: const {'close', 'fair', 'ambitious'}.contains(stance) ? stance : 'unknown',
    suggested: number(value['suggested']),
    etaHours: number(value['etaHours'])?.round(),
    nextFollowUpAt: DateTime.tryParse('${value['nextFollowUpAt'] ?? ''}'),
  );
}

String liveFollowUpLabel(DateTime? at, {DateTime? now}) {
  if (at == null) return 'bientôt';
  final diff = at.difference(now ?? DateTime.now());
  if (diff.inMinutes <= 0) return 'maintenant';
  final hours = (diff.inMinutes / 60).round();
  if (hours < 1) return 'dans moins d\'1 h';
  if (hours < 24) return 'dans $hours h';
  final days = (hours / 24).round();
  return days == 1 ? 'demain' : 'dans $days jours';
}

String _fcfa(num n) {
  final digits = n.round().toString();
  final grouped = digits.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ');
  return '$grouped FCFA';
}

/// Stepper compact des points d'avancement de l'avatar.
class LiveAvatarProgressStrip extends StatelessWidget {
  const LiveAvatarProgressStrip({super.key, required this.steps});
  final List<LiveAvatarStep> steps;

  @override
  Widget build(BuildContext context) {
    final done = steps.where((s) => s.state == 'done').length;
    return Semantics(
      container: true,
      label: 'Points d\'avancement de l\'avatar : $done sur ${steps.length}',
      child: Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF7F1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFBFE5D3)),
        ),
        child: Column(children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (var i = 0; i < steps.length; i++)
              Expanded(
                child: Column(children: [
                  Row(children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == 0
                            ? Colors.transparent
                            : (steps[i - 1].state == 'done' ? const Color(0xFF10B981) : const Color(0xFFBFE5D3)),
                      ),
                    ),
                    _dot(steps[i].state),
                    Expanded(child: Container(height: 2, color: Colors.transparent)),
                  ]),
                  const SizedBox(height: 3),
                  Text(
                    steps[i].label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 8.5,
                      height: 1.15,
                      fontWeight: steps[i].state == 'todo' ? FontWeight.w400 : FontWeight.w700,
                      color: steps[i].state == 'todo' ? const Color(0xFF6B7C93) : const Color(0xFF065F46),
                    ),
                  ),
                ]),
              ),
          ]),
          const SizedBox(height: 4),
          Text('Avatar · $done/${steps.length} points notés',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF047857))),
        ]),
      ),
    );
  }

  Widget _dot(String state) => Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: state == 'done' ? const Color(0xFF059669) : Colors.white,
          border: Border.all(color: state == 'todo' ? const Color(0xFFBFE5D3) : const Color(0xFF059669), width: 2),
          boxShadow: state == 'current' ? [const BoxShadow(color: Color(0x6634D399), blurRadius: 0, spreadRadius: 2)] : null,
        ),
      );
}

/// Carte de synthèse de l'avatar : offre, prix affiché, jauge, conseil, prochain point de suivi.
class LiveAvatarSynthesisCard extends StatelessWidget {
  const LiveAvatarSynthesisCard({super.key, required this.data, this.now});
  final LiveAvatarSynthesisData data;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final gauge = data.gauge;
    final ambitious = data.stance == 'ambitious';
    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF059669), Color(0xFF0D9488)]),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('SYNTHÈSE DE L\'AVATAR',
                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: .3)),
            Flexible(
              child: Text(data.stanceLabel,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Votre offre', style: TextStyle(fontSize: 10, color: Color(0xFF6B7C93))),
                Text(_fcfa(data.offer), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
              ]),
              if (data.listPrice != null)
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  const Text('Prix affiché', style: TextStyle(fontSize: 10, color: Color(0xFF6B7C93))),
                  Text(_fcfa(data.listPrice!), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                ]),
            ]),
            if (gauge != null) ...[
              const SizedBox(height: 8),
              Semantics(
                label: 'Offre à $gauge % du prix affiché',
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: gauge / 100,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFF1F5F9),
                    valueColor: AlwaysStoppedAnimation(ambitious ? const Color(0xFFF59E0B) : const Color(0xFF10B981)),
                  ),
                ),
              ),
              if (data.gapPct != null)
                Align(
                  alignment: Alignment.centerRight,
                  child: Text('${data.gapPct! > 0 ? '+' : ''}${data.gapPct} % du prix affiché',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF6B7C93))),
                ),
            ],
            if (data.suggested != null) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(8)),
                child: Text('Conseil : autour de ${_fcfa(data.suggested!)} pour une réponse plus probable.',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF78350F))),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              'Suivi actif · prochain point ${liveFollowUpLabel(data.nextFollowUpAt, now: now)}'
              '${data.etaHours != null ? ' · réponse en général sous ${data.etaHours} h' : ''}',
              style: const TextStyle(fontSize: 11, color: Color(0xFF334155)),
            ),
          ]),
        ),
      ]),
    );
  }
}

/// Bloc « avatar » d'un message (stepper et/ou synthèse), vide si le message n'en porte pas.
Widget liveAvatarBlocks(Map<String, dynamic> meta) {
  final steps = liveParseAvatarProgress(meta['avatar_progress']);
  final synthesis = liveParseAvatarSynthesis(meta['avatar_synthesis']);
  if (steps == null && synthesis == null) return const SizedBox.shrink();
  return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    if (synthesis != null) LiveAvatarSynthesisCard(data: synthesis),
    if (steps != null) LiveAvatarProgressStrip(steps: steps),
  ]);
}
