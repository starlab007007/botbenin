import 'package:flutter/material.dart';
import 'avatar/bot_character.dart';
import 'live_avatar_autonomy.dart';

class LiveGuidedProgress extends StatelessWidget {
  const LiveGuidedProgress({
    super.key,
    required this.phase,
    required this.count,
    required this.onActivity,
    this.refreshing = false,
  });
  final String phase;
  final int count;
  final bool refreshing;
  final VoidCallback onActivity;
  @override
  Widget build(BuildContext context) {
    final interrupted = ['partial', 'paused', 'error'].contains(phase),
        ready = phase == 'ready',
        current = phase == 'understanding' ? 0 : 1;
    final message = phase == 'understanding'
        ? 'Je précise votre besoin et vos limites.'
        : phase == 'collecting'
        ? refreshing
              ? 'J’ai reçu les premières pistes. Je poursuis la recherche.'
              : 'J’explore les offres correspondant à votre demande.'
        : phase == 'paused'
        ? 'La recherche est en pause.'
        : phase == 'partial'
        ? 'Une partie de la recherche n’a pas abouti. Les premières pistes restent accessibles.'
        : phase == 'error'
        ? 'Je n’ai pas pu terminer. Vous pouvez relancer la recherche.'
        : 'Ma sélection est prête. Je vous explique mes choix.';
    final labels = [
      ('Votre besoin est compris', 'Vos critères guident ma recherche.'),
      (
        'J’explore les offres',
        count > 0
            ? '$count pistes reçues.'
            : 'Je recueille les premières pistes.',
      ),
      ('J’écarte les écarts', 'Doublons et critères incompatibles.'),
      ('Je compare les offres', 'Prix, conditions et informations manquantes.'),
      ('Je prépare ma sélection', 'Un choix expliqué et ses alternatives.'),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ready
                ? '● Sélection prête'
                : interrupted
                ? '● Recherche à reprendre'
                : '● Recherche en cours',
            style: const TextStyle(fontSize: 12, color: Color(0xFF117B68)),
          ),
          const SizedBox(height: 16),
          Text(
            interrupted ? 'Je garde le fil.' : 'Je m’en occupe.',
            style: const TextStyle(
              fontSize: 27,
              fontWeight: FontWeight.w500,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 21),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const BotCharacter(size: 48, animated: false),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Votre avatar · IA',
                      style: TextStyle(
                        fontSize: 12,
                        color: avatarPremiumBlue,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        message,
                        style: const TextStyle(fontSize: 14, height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          for (var i = 0; i < labels.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 22),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: ready || i < current
                          ? const Color(0xFFEAF7F1)
                          : !interrupted && i == current
                          ? const Color(0xFFEDF1FF)
                          : const Color(0xFFEDF1F8),
                    ),
                    alignment: Alignment.center,
                    child: ready || i < current
                        ? const Icon(
                            Icons.check,
                            size: 15,
                            color: Color(0xFF117B68),
                          )
                        : !interrupted && i == current
                        ? const SizedBox(
                            width: 15,
                            height: 15,
                            child: CircularProgressIndicator(strokeWidth: 1.5),
                          )
                        : const Icon(
                            Icons.schedule,
                            size: 15,
                            color: avatarPremiumMuted,
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            labels[i].$1,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: ready || i <= current
                                  ? avatarPremiumInk
                                  : avatarPremiumMuted,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            ready || i <= current
                                ? labels[i].$2
                                : interrupted
                                ? 'À reprendre'
                                : 'À venir',
                            style: const TextStyle(
                              fontSize: 12,
                              color: avatarPremiumMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          TextButton(
            onPressed: onActivity,
            child: const Text(
              'Voir le déroulé de ma recherche',
              style: TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
