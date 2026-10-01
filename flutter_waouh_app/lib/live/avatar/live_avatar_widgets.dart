import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../live_theme.dart';
import 'bot_character.dart';
import 'live_avatar_controller.dart';

/// Avatar de l'utilisateur : c'est le personnage Bot, dont l'expression suit
/// l'état de présence. [expression] force une expression précise.
class LiveAvatarVisual extends StatelessWidget {
  const LiveAvatarVisual({
    super.key,
    required this.preset,
    this.state = LiveAvatarPresenceState.idle,
    this.size = 112,
    this.showStatusBadge = true,
    this.expression,
    this.animated = true,
  });

  final LiveAvatarPreset preset;
  final LiveAvatarPresenceState state;
  final double size;
  final bool showStatusBadge;
  final BotExpression? expression;
  final bool animated;

  @override
  Widget build(BuildContext context) {
    final online = state != LiveAvatarPresenceState.offline;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          BotCharacter(
            expression: expression ?? botExpressionForPresence(state),
            size: size,
            animated: animated,
          ),
          if (showStatusBadge && online)
            Positioned(
              right: size * .12,
              bottom: size * .10,
              child: Container(
                width: math.max(8, size * .1),
                height: math.max(8, size * .1),
                decoration: BoxDecoration(
                  color: const Color(0xFF34D399),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class LiveAvatarPresenceStrip extends StatelessWidget {
  const LiveAvatarPresenceStrip({
    super.key,
    required this.busy,
    this.missionCount = 0,
    this.watchCount = 0,
    this.approvalCount = 0,
  });

  final bool busy;
  final int missionCount;
  final int watchCount;
  final int approvalCount;

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    if (!avatar.loaded) return const SizedBox.shrink();
    final state = busy
        ? LiveAvatarPresenceState.searching
        : approvalCount > 0
            ? LiveAvatarPresenceState.waiting
            : missionCount > 0
                ? LiveAvatarPresenceState.searching
                : watchCount > 0
                    ? LiveAvatarPresenceState.watching
                    : LiveAvatarPresenceState.idle;
    final status = busy
        ? '${avatar.name} cherche et compare…'
        : approvalCount > 0
            ? '$approvalCount décision(s) vous attendent'
            : missionCount > 0
                ? '${avatar.name} poursuit $missionCount mission(s)'
                : watchCount > 0
                    ? '${avatar.name} surveille $watchCount veille(s)'
                    : '${avatar.name} est prêt';

    return InkWell(
      onTap: () => context.push('/app/avatar'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(10, 6, 10, 2),
        padding: const EdgeInsets.fromLTRB(8, 6, 10, 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FBFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Row(
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: state,
              size: 38,
              showStatusBadge: false,
            ),
            const SizedBox(width: 7),
            Expanded(
              child: Text(
                status,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: WaouhPalette.ink,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 17,
              color: Color(0xFF99A8BE),
            ),
          ],
        ),
      ),
    );
  }
}

class LiveAvatarDock extends StatelessWidget {
  const LiveAvatarDock({
    super.key,
    this.missionCount = 0,
    this.watchCount = 0,
    this.approvalCount = 0,
    this.compact = false,
  });

  final int missionCount;
  final int watchCount;
  final int approvalCount;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    if (!avatar.loaded || !avatar.profile.configured) {
      return const SizedBox.shrink();
    }

    final state = approvalCount > 0
        ? LiveAvatarPresenceState.waiting
        : missionCount > 0
            ? LiveAvatarPresenceState.searching
            : watchCount > 0
                ? LiveAvatarPresenceState.watching
                : avatar.state;

    final proactive = avatar.profile.proactivity == 'Proactif';
    final discreet = avatar.profile.proactivity == 'Discret';
    final peek = approvalCount > 0
        ? '$approvalCount à valider'
        : discreet
            ? null
            : proactive && missionCount > 0
                ? '$missionCount mission(s)'
                : proactive && watchCount > 0
                    ? '$watchCount veille(s)'
                    : null;

    return Semantics(
      button: true,
      label: 'Ouvrir ${avatar.name}, votre Avatar WAOUH',
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () => context.push('/app/avatar'),
        child: Container(
          padding: const EdgeInsets.fromLTRB(5, 4, 5, 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .96),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: WaouhPalette.line),
            boxShadow: WaouhShadows.card,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              LiveAvatarVisual(
                preset: avatar.profile.preset,
                state: state,
                size: compact ? 42 : 46,
                showStatusBadge: true,
              ),
              if (!compact && peek != null) ...[
                const SizedBox(width: 3),
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(
                    peek,
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
