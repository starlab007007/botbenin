import 'package:flutter/material.dart';
import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_avatar_autonomy.dart';

class LiveMissionActivity {
  LiveMissionActivity(this.text) : at = DateTime.now();
  final String text;
  final DateTime at;
}

class LivePremiumMission extends StatefulWidget {
  const LivePremiumMission({
    super.key,
    required this.busy,
    required this.count,
    required this.events,
    this.paused = false,
    this.refreshing = false,
    this.error,
    this.onPause,
    this.onResume,
  });
  final bool busy, paused, refreshing;
  final int count;
  final List<LiveMissionActivity> events;
  final String? error;
  final VoidCallback? onPause, onResume;
  @override
  State<LivePremiumMission> createState() => _LivePremiumMissionState();
}

class _LivePremiumMissionState extends State<LivePremiumMission> {
  bool open = false;
  @override
  Widget build(BuildContext context) {
    final stage = widget.count > 0 ? 2 : 1;
    final title = widget.paused
        ? 'Votre recherche est en pause.'
        : widget.error != null
        ? 'La recherche a été interrompue.'
        : widget.busy
        ? (widget.refreshing
              ? 'Je cherche d’autres pistes.'
              : 'Je cherche les bonnes pistes.')
        : widget.count > 0
        ? 'Vos premières pistes sont prêtes.'
        : 'Aucune piste pour le moment.';
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: avatarPremiumLine),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              ClipOval(
                child: Image.asset(
                  botAvatarAsset,
                  width: 40,
                  height: 40,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Semantics(
                  liveRegion: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: avatarPremiumInk,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.count > 0
                            ? '${widget.count} offres repérées · conditions à confirmer.'
                            : 'Les résultats apparaissent dès leur réception.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: avatarPremiumMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F7F3),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  widget.paused
                      ? 'En pause'
                      : widget.error != null
                      ? 'À reprendre'
                      : widget.busy
                      ? 'En cours'
                      : 'À choisir',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF008B87),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          Row(
            children: [
              for (var i = 0; i < 5; i++)
                Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i == 4 ? 0 : 4),
                    decoration: BoxDecoration(
                      color: i < stage
                          ? const Color(0xFF008B87)
                          : i == stage
                          ? avatarPremiumBlue
                          : const Color(0xFFEEF2F9),
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (final label in [
                'Besoin',
                'Recherche',
                'Comparer',
                'Contact',
                'Suivi',
              ])
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color:
                        label ==
                            [
                              'Besoin',
                              'Recherche',
                              'Comparer',
                              'Contact',
                              'Suivi',
                            ][stage]
                        ? avatarPremiumBlue
                        : avatarPremiumMuted,
                  ),
                ),
            ],
          ),
          if (widget.events.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                widget.events.last.text,
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: avatarPremiumMuted,
                ),
              ),
            ),
          const SizedBox(height: 12),
          const Divider(color: avatarPremiumLine, height: 1),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            spacing: 10,
            children: [
              TextButton.icon(
                onPressed: () => setState(() => open = !open),
                icon: const Icon(Icons.checklist, size: 15),
                label: const Text(
                  'Voir l’activité',
                  style: TextStyle(fontSize: 12),
                ),
              ),
              if (widget.paused && widget.onResume != null)
                TextButton.icon(
                  onPressed: widget.onResume,
                  icon: const Icon(Icons.play_arrow, size: 15),
                  label: const Text(
                    'Reprendre',
                    style: TextStyle(fontSize: 12),
                  ),
                )
              else if (widget.busy && widget.onPause != null)
                TextButton.icon(
                  onPressed: widget.onPause,
                  icon: const Icon(Icons.pause, size: 15),
                  label: const Text(
                    'Mettre en pause',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
            ],
          ),
          if (open)
            for (final event in widget.events)
              Padding(
                padding: const EdgeInsets.only(bottom: 11),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${event.at.hour.toString().padLeft(2, '0')}:${event.at.minute.toString().padLeft(2, '0')}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    const SizedBox(width: 9),
                    const Icon(
                      Icons.check_circle_outline,
                      size: 15,
                      color: Color(0xFF008B87),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        event.text,
                        style: const TextStyle(fontSize: 12, height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
