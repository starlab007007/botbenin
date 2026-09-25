import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../live_theme.dart';
import 'live_avatar_controller.dart';

class LiveAvatarVisual extends StatefulWidget {
  const LiveAvatarVisual({
    super.key,
    required this.preset,
    this.state = LiveAvatarPresenceState.idle,
    this.size = 112,
    this.showStatusBadge = true,
  });

  final LiveAvatarPreset preset;
  final LiveAvatarPresenceState state;
  final double size;
  final bool showStatusBadge;

  @override
  State<LiveAvatarVisual> createState() => _LiveAvatarVisualState();
}

class _LiveAvatarVisualState extends State<LiveAvatarVisual>
    with SingleTickerProviderStateMixin {
  late final AnimationController _motion = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  List<Color> get _colors => switch (widget.preset) {
        LiveAvatarPreset.sky => const [Color(0xFF5A86FF), Color(0xFF55DDF2)],
        LiveAvatarPreset.aura => const [Color(0xFF8B7CFF), Color(0xFFE08CFF)],
        LiveAvatarPreset.nova => const [Color(0xFF49C8B5), Color(0xFF63A5FF)],
        LiveAvatarPreset.orbit => const [Color(0xFF4B63D6), Color(0xFF8A7CFF)],
        LiveAvatarPreset.sol => const [Color(0xFFFFB65A), Color(0xFFFF7F78)],
        LiveAvatarPreset.flux => const [Color(0xFF2A9CCB), Color(0xFF66E2C4)],
      };

  IconData get _face => switch (widget.preset) {
        LiveAvatarPreset.sky => Icons.face_rounded,
        LiveAvatarPreset.aura => Icons.auto_awesome_rounded,
        LiveAvatarPreset.nova => Icons.account_circle_rounded,
        LiveAvatarPreset.orbit => Icons.blur_on_rounded,
        LiveAvatarPreset.sol => Icons.sentiment_satisfied_rounded,
        LiveAvatarPreset.flux => Icons.bubble_chart_rounded,
      };

  IconData? get _statusIcon => switch (widget.state) {
        LiveAvatarPresenceState.searching => Icons.travel_explore_rounded,
        LiveAvatarPresenceState.comparing => Icons.compare_arrows_rounded,
        LiveAvatarPresenceState.watching => Icons.radar_rounded,
        LiveAvatarPresenceState.found => Icons.auto_awesome_rounded,
        LiveAvatarPresenceState.waiting => Icons.verified_user_outlined,
        LiveAvatarPresenceState.negotiating => Icons.handshake_outlined,
        LiveAvatarPresenceState.done => Icons.check_rounded,
        LiveAvatarPresenceState.offline => Icons.cloud_off_rounded,
        _ => null,
      };

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _motion,
        builder: (_, __) {
          final t = _motion.value;
          final floating = math.sin(t * math.pi) * (widget.size * .025);
          final active = widget.state != LiveAvatarPresenceState.idle;
          return Transform.translate(
            offset: Offset(0, -floating),
            child: SizedBox(
              width: widget.size,
              height: widget.size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  if (active)
                    Container(
                      width: widget.size * (.94 + .04 * t),
                      height: widget.size * (.94 + .04 * t),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            _colors.last.withValues(alpha: .22),
                            _colors.first.withValues(alpha: .02),
                          ],
                        ),
                      ),
                    ),
                  Transform.rotate(
                    angle: widget.state == LiveAvatarPresenceState.searching ||
                            widget.state == LiveAvatarPresenceState.thinking ||
                            widget.state == LiveAvatarPresenceState.comparing
                        ? t * .45
                        : 0,
                    child: Container(
                      width: widget.size * .82,
                      height: widget.size * .82,
                      padding: EdgeInsets.all(widget.size * .055),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: SweepGradient(
                          colors: [
                            _colors.first,
                            _colors.last,
                            _colors.first.withValues(alpha: .55),
                            _colors.first,
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _colors.first.withValues(alpha: .20),
                            blurRadius: widget.size * .22,
                            spreadRadius: -widget.size * .08,
                          ),
                        ],
                      ),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: widget.size * .66,
                    height: widget.size * .66,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          _colors.first.withValues(alpha: .16),
                          _colors.last.withValues(alpha: .09),
                        ],
                      ),
                    ),
                    child: Icon(
                      _face,
                      size: widget.size * .34,
                      color: _colors.first,
                    ),
                  ),
                  if (widget.state == LiveAvatarPresenceState.typing)
                    Positioned(
                      bottom: widget.size * .10,
                      child: _TypingDots(color: _colors.first),
                    ),
                  if (widget.showStatusBadge && _statusIcon != null)
                    Positioned(
                      right: widget.size * .03,
                      bottom: widget.size * .12,
                      child: Container(
                        width: widget.size * .24,
                        height: widget.size * .24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: WaouhPalette.line),
                          boxShadow: WaouhShadows.card,
                        ),
                        child: Icon(
                          _statusIcon,
                          size: widget.size * .12,
                          color: _colors.first,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      );
}

class _TypingDots extends StatelessWidget {
  const _TypingDots({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              if (i != 2) const SizedBox(width: 3),
            ],
          ],
        ),
      );
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
