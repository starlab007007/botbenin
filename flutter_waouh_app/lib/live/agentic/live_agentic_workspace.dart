import 'package:flutter/material.dart';

import 'live_agentic_controller.dart';
import 'live_agentic_models.dart';
import '../live_theme.dart';

class LiveAgenticSummaryBar extends StatelessWidget {
  const LiveAgenticSummaryBar({
    super.key,
    required this.controller,
    required this.onResumeMission,
  });

  final LiveAgenticController controller;
  final ValueChanged<WaouhMission> onResumeMission;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: controller,
        builder: (context, _) => Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            onTap: () => _open(context),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_awesome_rounded,
                    size: 19,
                    color: WaouhPalette.blue,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _Counter(
                            label: 'Missions',
                            count: controller.activeMissionCount,
                          ),
                          _Counter(
                            label: 'Veilles',
                            count: controller.activeWatchCount,
                          ),
                          _Counter(
                            label: 'À valider',
                            count: controller.pendingApprovalCount,
                            alert: controller.pendingApprovalCount > 0,
                          ),
                          _Counter(
                            label: 'Activité',
                            count: controller.activity.length,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded),
                ],
              ),
            ),
          ),
        ),
      );

  Future<void> _open(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.white,
        builder: (_) => FractionallySizedBox(
          heightFactor: .92,
          child: LiveAgenticWorkspace(
            controller: controller,
            onResumeMission: onResumeMission,
          ),
        ),
      );
}

class _Counter extends StatelessWidget {
  const _Counter({
    required this.label,
    required this.count,
    this.alert = false,
  });

  final String label;
  final int count;
  final bool alert;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(right: 7),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: alert ? const Color(0xFFFFF3E2) : const Color(0xFFF3F7FF),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: alert ? const Color(0xFFF2D09A) : WaouhPalette.line,
          ),
        ),
        child: Text(
          '$label $count',
          style: TextStyle(
            color: alert ? const Color(0xFFD77D17) : WaouhPalette.blue,
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
}

class LiveAgenticWorkspace extends StatelessWidget {
  const LiveAgenticWorkspace({
    super.key,
    required this.controller,
    required this.onResumeMission,
    this.standalone = false,
  });

  final LiveAgenticController controller;
  final ValueChanged<WaouhMission> onResumeMission;
  final bool standalone;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 4,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 8, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Suivi',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: WaouhPalette.ink,
                      ),
                    ),
                  ),
                  if (!standalone)
                    IconButton.filledTonal(
                      tooltip: 'Fermer',
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFF1F5FC),
                      ),
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded, size: 19),
                    ),
                ],
              ),
            ),
            Container(
              height: 44,
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 4),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5FC),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const TabBar(
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                dividerColor: Colors.transparent,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x1552709F),
                      blurRadius: 10,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                labelColor: WaouhPalette.blue,
                unselectedLabelColor: WaouhPalette.muted,
                labelStyle: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
                unselectedLabelStyle: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
                tabs: [
                  Tab(icon: Icon(Icons.flag_outlined, size: 17), text: 'Missions'),
                  Tab(icon: Icon(Icons.notifications_active_outlined, size: 17), text: 'Veilles'),
                  Tab(icon: Icon(Icons.verified_user_outlined, size: 17), text: 'Validations'),
                  Tab(icon: Icon(Icons.history_rounded, size: 17), text: 'Activité'),
                ],
              ),
            ),
            Expanded(
              child: ListenableBuilder(
                listenable: controller,
                builder: (_, __) => TabBarView(
                  children: [
                    _MissionsTab(
                      controller: controller,
                      onResumeMission: (mission) {
                        if (!standalone) Navigator.pop(context);
                        onResumeMission(mission);
                      },
                    ),
                    _WatchesTab(controller: controller),
                    _ApprovalsTab(controller: controller),
                    _ActivityTab(controller: controller),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}

class _MissionsTab extends StatelessWidget {
  const _MissionsTab({
    required this.controller,
    required this.onResumeMission,
  });

  final LiveAgenticController controller;
  final ValueChanged<WaouhMission> onResumeMission;

  @override
  Widget build(BuildContext context) {
    if (controller.loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (controller.missions.isEmpty) {
      return const _EmptyState(
        icon: Icons.search_rounded,
        title: 'Aucune mission',
        message: 'Créez une mission depuis votre Avatar.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: controller.missions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final mission = controller.missions[index];
        return _MissionCard(
          mission: mission,
          onResume: () => onResumeMission(mission),
          onPause: mission.active && mission.status != WaouhMissionStatus.paused
              ? () => controller.pauseMission(mission.id)
              : null,
          onCancel: mission.active
              ? () => controller.cancelMission(mission.id)
              : null,
        );
      },
    );
  }
}

class _MissionCard extends StatelessWidget {
  const _MissionCard({
    required this.mission,
    required this.onResume,
    this.onPause,
    this.onCancel,
  });

  final WaouhMission mission;
  final VoidCallback onResume;
  final VoidCallback? onPause;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final tone = _missionTone(mission.status);
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: WaouhPalette.line),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    mission.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15.5,
                    ),
                  ),
                ),
                _StatusPill(label: _missionLabel(mission.status), color: tone),
              ],
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: mission.progress,
              minHeight: 7,
              borderRadius: BorderRadius.circular(10),
              color: tone,
              backgroundColor: tone.withValues(alpha: .12),
            ),
            const SizedBox(height: 11),
            for (final step in mission.steps)
              Padding(
                padding: const EdgeInsets.only(bottom: 7),
                child: Row(
                  children: [
                    Icon(
                      switch (step.status) {
                        WaouhStepStatus.completed => Icons.check_circle_rounded,
                        WaouhStepStatus.running =>
                          Icons.play_circle_fill_rounded,
                        WaouhStepStatus.failed => Icons.error_rounded,
                        WaouhStepStatus.pending => Icons.radio_button_unchecked,
                      },
                      size: 18,
                      color: switch (step.status) {
                        WaouhStepStatus.completed => const Color(0xFF11845F),
                        WaouhStepStatus.running => const Color(0xFF246BC7),
                        WaouhStepStatus.failed => const Color(0xFFB33A44),
                        WaouhStepStatus.pending => const Color(0xFF8A9B95),
                      },
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(step.label)),
                  ],
                ),
              ),
            if ((mission.summary ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                mission.summary!,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF536B63)),
              ),
            ],
            if ((mission.error ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                mission.error!,
                style: const TextStyle(
                  color: Color(0xFFAD303C),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            if (mission.status == WaouhMissionStatus.paused ||
                mission.status == WaouhMissionStatus.failed) ...[
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: onResume,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reprendre dans le chat'),
              ),
            ] else if (mission.active) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  if (onPause != null)
                    TextButton.icon(
                      onPressed: onPause,
                      icon: const Icon(Icons.pause_rounded),
                      label: const Text('Pause'),
                    ),
                  if (onCancel != null)
                    TextButton.icon(
                      onPressed: onCancel,
                      icon: const Icon(Icons.close_rounded),
                      label: const Text('Annuler'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WatchesTab extends StatelessWidget {
  const _WatchesTab({required this.controller});

  final LiveAgenticController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.watches.isEmpty) {
      return const _EmptyState(
        icon: Icons.notifications_none_rounded,
        title: 'Aucune veille',
        message: 'Activez une veille depuis une offre.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: controller.watches.length,
      separatorBuilder: (_, __) => const SizedBox(height: 9),
      itemBuilder: (_, index) {
        final watch = controller.watches[index];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(
              color: watch.targetReached
                  ? const Color(0xFFE3A42D)
                  : const Color(0xFFD5E8DF),
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: const Color(0xFFF0F5FF),
                  child: Icon(
                    watch.targetReached
                        ? Icons.trending_down_rounded
                        : Icons.visibility_outlined,
                    color: WaouhPalette.blue,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        watch.title,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        [
                          if (watch.targetPrice != null)
                            'Cible ${_amount(watch.targetPrice!)} ${watch.currency}',
                          if (watch.watchStock) 'stock surveillé',
                          if (watch.city != null) watch.city!,
                        ].join(' · '),
                        style: const TextStyle(
                          color: Color(0xFF60776E),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: watch.enabled,
                  onChanged: (value) => controller.toggleWatch(watch.id, value),
                ),
                IconButton(
                  tooltip: 'Supprimer la veille',
                  onPressed: () => controller.removeWatch(watch.id),
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ApprovalsTab extends StatelessWidget {
  const _ApprovalsTab({required this.controller});

  final LiveAgenticController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.approvals.isEmpty) {
      return const _EmptyState(
        icon: Icons.verified_user_outlined,
        title: 'Rien à valider',
        message: 'Les demandes sensibles apparaîtront ici.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: controller.approvals.length,
      separatorBuilder: (_, __) => const SizedBox(height: 9),
      itemBuilder: (_, index) {
        final approval = controller.approvals[index];
        return Card(
          elevation: 0,
          color: approval.pending ? const Color(0xFFFFFBF2) : Colors.white,
          shape: RoundedRectangleBorder(
            side: const BorderSide(color: Color(0xFFE9D7A9)),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  approval.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 5),
                Text(approval.description),
                const SizedBox(height: 8),
                _StatusPill(
                  label: approval.expired
                      ? 'Expiré'
                      : _approvalLabel(approval.status),
                  color: approval.pending
                      ? const Color(0xFF9B6500)
                      : WaouhPalette.muted,
                ),
                if (approval.pending) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () =>
                              controller.decideApproval(approval.id, false),
                          child: const Text('Refuser'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton(
                          onPressed: () =>
                              controller.decideApproval(approval.id, true),
                          child: const Text('Autoriser'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ActivityTab extends StatelessWidget {
  const _ActivityTab({required this.controller});
  final LiveAgenticController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.activity.isEmpty) {
      return const _EmptyState(
        icon: Icons.history_rounded,
        title: 'Aucune activité',
        message: 'L’activité de WAOUH apparaîtra ici.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(14),
      itemCount: controller.activity.length,
      itemBuilder: (_, index) {
        final item = controller.activity[index];
        return Semantics(
          label: '${item.title}. ${item.detail}',
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 4),
            leading: CircleAvatar(
              backgroundColor: const Color(0xFFF0F5FF),
              child: Icon(_activityIcon(item.kind),
                  color: WaouhPalette.blue),
            ),
            title: Text(
              item.title,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text(item.detail),
            trailing: Text(
              _time(item.createdAt),
              style: const TextStyle(fontSize: 11, color: Color(0xFF758A82)),
            ),
          ),
        );
      },
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: .35)),
        ),
        child: Text(
          label,
          style: TextStyle(
              color: color, fontSize: 10.5, fontWeight: FontWeight.w800),
        ),
      );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: const Color(0xFF8A9AB6)),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF60776E)),
              ),
            ],
          ),
        ),
      );
}

Future<void> showWaouhWatchDialog(
  BuildContext context, {
  required LiveAgenticController controller,
  required String payload,
}) async {
  final queryAt = payload.indexOf('?');
  final params = queryAt < 0
      ? const <String, String>{}
      : Uri.splitQueryString(payload.substring(queryAt + 1));
  final currentPrice = _parseAmount(params['price']);
  final target = TextEditingController(
    text: currentPrice == null ? '' : currentPrice.round().toString(),
  );
  var watchStock = true;
  final accepted = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        title: const Text('Créer une veille'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              params['title'] ?? 'Article WAOUH',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: target,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'M’alerter sous ce prix (FCFA)',
                hintText: 'Optionnel',
                prefixIcon: Icon(Icons.trending_down_rounded),
              ),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: watchStock,
              onChanged: (value) =>
                  setDialogState(() => watchStock = value ?? true),
              title: const Text('Surveiller aussi le stock'),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            const Text(
              'Vous pouvez suspendre ou supprimer cette veille à tout moment.',
              style: TextStyle(color: Color(0xFF60776E), fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Activer'),
          ),
        ],
      ),
    ),
  );
  if (accepted != true || !context.mounted) return;
  final title = (params['title'] ?? 'Article WAOUH').trim();
  final productId =
      (params['product_id'] ?? params['article_id'] ?? title).trim();
  await controller.addWatch(
    productId: productId,
    title: title,
    targetPrice: _parseAmount(target.text),
    currentPrice: currentPrice,
    currency: params['currency'] ?? 'XOF',
    watchStock: watchStock,
    city: params['city'],
    imageUrl: params['image_url'],
  );
}

num? _parseAmount(String? value) => num.tryParse(
      (value ?? '').replaceAll(RegExp(r'[^0-9,.-]'), '').replaceAll(',', '.'),
    );

String _amount(num value) => value.round().toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => ' ',
    );

String _missionLabel(WaouhMissionStatus status) => switch (status) {
      WaouhMissionStatus.planning => 'Planification',
      WaouhMissionStatus.searching => 'Recherche',
      WaouhMissionStatus.comparing => 'À comparer',
      WaouhMissionStatus.watching => 'En veille',
      WaouhMissionStatus.negotiating => 'Négociation',
      WaouhMissionStatus.awaitingApproval => 'Accord requis',
      WaouhMissionStatus.paused => 'En pause',
      WaouhMissionStatus.completed => 'Terminée',
      WaouhMissionStatus.failed => 'À reprendre',
      WaouhMissionStatus.cancelled => 'Annulée',
    };

Color _missionTone(WaouhMissionStatus status) => switch (status) {
      WaouhMissionStatus.failed ||
      WaouhMissionStatus.cancelled =>
        const Color(0xFFB33A44),
      WaouhMissionStatus.paused => const Color(0xFF7B6A28),
      WaouhMissionStatus.completed => const Color(0xFF11845F),
      WaouhMissionStatus.awaitingApproval => const Color(0xFF9B6500),
      _ => const Color(0xFF246BC7),
    };

String _approvalLabel(WaouhApprovalStatus status) => switch (status) {
      WaouhApprovalStatus.pending => 'En attente',
      WaouhApprovalStatus.approved => 'Autorisé',
      WaouhApprovalStatus.refused => 'Refusé',
      WaouhApprovalStatus.expired => 'Expiré',
    };

IconData _activityIcon(WaouhActivityKind kind) => switch (kind) {
      WaouhActivityKind.mission => Icons.flag_outlined,
      WaouhActivityKind.search => Icons.search_rounded,
      WaouhActivityKind.comparison => Icons.compare_arrows_rounded,
      WaouhActivityKind.watch => Icons.notifications_active_outlined,
      WaouhActivityKind.approval => Icons.verified_user_outlined,
      WaouhActivityKind.negotiation => Icons.handshake_outlined,
      WaouhActivityKind.system => Icons.info_outline_rounded,
    };

String _time(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  if (now.year == local.year &&
      now.month == local.month &&
      now.day == local.day) {
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}';
}
