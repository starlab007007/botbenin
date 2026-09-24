import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_presence_checkin_screen.dart';
import 'waouh_presence_history_screen.dart';
import 'waouh_presence_models.dart';
import 'waouh_presence_qr_actions.dart';
import 'waouh_presence_repository.dart';
import 'waouh_presence_site_sheet.dart';
import 'waouh_presence_team_sheet.dart';

class WaouhPresenceDashboardScreen extends StatefulWidget {
  const WaouhPresenceDashboardScreen({super.key, required this.client});

  final SupabaseClient client;

  @override
  State<WaouhPresenceDashboardScreen> createState() =>
      _WaouhPresenceDashboardScreenState();
}

class _WaouhPresenceDashboardScreenState
    extends State<WaouhPresenceDashboardScreen> {
  static const green = Color(0xFF076B5D);
  static const deepGreen = Color(0xFF075E54);
  static const canvas = Color(0xFFF3F8F6);
  static const ink = Color(0xFF10211C);
  static const muted = Color(0xFF66736F);
  static const line = Color(0xFFDDE9E5);

  late final WaouhPresenceRepository _repository = WaouhPresenceRepository(
    widget.client,
  );

  List<WaouhPresenceSite> _sites = const [];
  WaouhPresenceDashboard? _dashboard;
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final values = await Future.wait([
        _repository.fetchSites(),
        _repository.fetchDashboard(),
      ]);
      if (!mounted) return;
      setState(() {
        _sites = values[0] as List<WaouhPresenceSite>;
        _dashboard = values[1] as WaouhPresenceDashboard;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _editSite([WaouhPresenceSite? site]) async {
    final value = await showModalBottomSheet<WaouhPresenceSite>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          WaouhPresenceSiteSheet(repository: _repository, site: site),
    );
    if (value != null) await _load();
  }

  Future<void> _team(WaouhPresenceSite site) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          WaouhPresenceTeamSheet(repository: _repository, site: site),
    );
    await _load();
  }

  Future<void> _scan() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => WaouhPresenceCheckInScreen(client: widget.client),
      ),
    );
    if (changed == true) await _load();
  }

  void _history([WaouhPresenceSite? site]) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            WaouhPresenceHistoryScreen(repository: _repository, site: site),
      ),
    );
  }

  void _showQr(WaouhPresenceSite site) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            WaouhPresenceQrScreen(repository: _repository, site: site),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = _dashboard;
    return Scaffold(
      backgroundColor: canvas,
      appBar: AppBar(
        backgroundColor: deepGreen,
        foregroundColor: Colors.white,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Présence QR', style: TextStyle(fontWeight: FontWeight.w900)),
            Text(
              'Sites, équipe et pointages sécurisés',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Ajouter un site',
            onPressed: () => _editSite(),
            icon: const Icon(Icons.add_location_alt_outlined),
          ),
          IconButton(
            tooltip: 'Scanner un QR',
            onPressed: _scan,
            icon: const Icon(Icons.qr_code_scanner_rounded),
          ),
          IconButton(
            tooltip: 'Actualiser',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _Failure(error: _error!, onRetry: _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                children: [
                  const Text(
                    'Vue d’ensemble',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Créez vos sites, générez un QR web public et suivez les présences.',
                    style: TextStyle(color: muted),
                  ),
                  const SizedBox(height: 14),
                  if (dashboard != null) _Metrics(dashboard: dashboard),
                  const SizedBox(height: 16),
                  _QuickActions(
                    onAddSite: () => _editSite(),
                    onScan: _scan,
                    onHistory: () => _history(),
                  ),
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Sites de présence',
                    subtitle:
                        'Chaque QR peut être scanné depuis n’importe quel téléphone, sans installer l’application.',
                    actionLabel: 'Ajouter un site',
                    onAction: () => _editSite(),
                  ),
                  const SizedBox(height: 12),
                  if (_sites.isEmpty)
                    _EmptySites(onCreate: () => _editSite())
                  else
                    ..._sites.map(
                      (site) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _SiteCard(
                          site: site,
                          onQr: () => _showQr(site),
                          onTeam: () => _team(site),
                          onHistory: () => _history(site),
                          onSettings: () => _editSite(site),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  _SectionHeader(
                    title: 'Activité récente',
                    subtitle: 'Derniers pointages enregistrés sur vos sites.',
                    actionLabel: 'Tout voir',
                    onAction: () => _history(),
                  ),
                  const SizedBox(height: 8),
                  if (dashboard == null || dashboard.recentEvents.isEmpty)
                    const _EmptyEvents()
                  else
                    ...dashboard.recentEvents
                        .take(8)
                        .map((event) => _RecentEvent(event: event)),
                ],
              ),
            ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'presence_add_site',
            onPressed: () => _editSite(),
            backgroundColor: Colors.white,
            foregroundColor: green,
            icon: const Icon(Icons.add_location_alt_outlined),
            label: const Text('Ajouter un site'),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'presence_scan',
            onPressed: _scan,
            icon: const Icon(Icons.qr_code_scanner_rounded),
            label: const Text('Scanner'),
          ),
        ],
      ),
    );
  }
}

class _Metrics extends StatelessWidget {
  const _Metrics({required this.dashboard});

  final WaouhPresenceDashboard dashboard;

  @override
  Widget build(BuildContext context) {
    const tiles = <_MetricData>[
      _MetricData(
        label: 'Sites',
        icon: Icons.apartment_outlined,
        color: Color(0xFF076B5D),
      ),
      _MetricData(
        label: 'Membres actifs',
        icon: Icons.groups_outlined,
        color: Colors.blue,
      ),
      _MetricData(
        label: 'Présents',
        icon: Icons.how_to_reg_outlined,
        color: Colors.orange,
      ),
      _MetricData(
        label: 'Évènements du jour',
        icon: Icons.event_available_outlined,
        color: Colors.purple,
      ),
    ];

    final values = [
      '${dashboard.siteCount}',
      '${dashboard.activeMembers}',
      '${dashboard.presentNow}',
      '${dashboard.eventsToday}',
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth >= 760 ? 4 : 2;
        return GridView.builder(
          itemCount: tiles.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: constraints.maxWidth < 360 ? 1.0 : 1.4,
          ),
          itemBuilder: (_, index) {
            final tile = tiles[index];
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _WaouhPresenceDashboardScreenState.line,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: tile.color.withValues(alpha: 0.10),
                    foregroundColor: tile.color,
                    child: Icon(tile.icon),
                  ),
                  Text(
                    values[index],
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    tile.label,
                    style: const TextStyle(
                      color: _WaouhPresenceDashboardScreenState.muted,
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _MetricData {
  const _MetricData({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({
    required this.onAddSite,
    required this.onScan,
    required this.onHistory,
  });

  final VoidCallback onAddSite;
  final VoidCallback onScan;
  final VoidCallback onHistory;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF075E54), Color(0xFF0A8B78)],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pointage QR public',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Les employés scannent le QR depuis n’importe quel téléphone, acceptent le GPS et marquent leur présence dans le rayon autorisé.',
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF075E54),
                ),
                onPressed: onAddSite,
                icon: const Icon(Icons.add_location_alt_outlined),
                label: const Text('Ajouter un site'),
              ),
              FilledButton.icon(
                onPressed: onScan,
                icon: const Icon(Icons.qr_code_scanner_rounded),
                label: const Text('Scanner dans l’app'),
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white54),
                ),
                onPressed: onHistory,
                icon: const Icon(Icons.history_rounded),
                label: const Text('Historique'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, constraints) {
        final compact = constraints.maxWidth < 440;
        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  color: _WaouhPresenceDashboardScreenState.muted,
                ),
              ),
              const SizedBox(height: 10),
              FilledButton(onPressed: onAction, child: Text(actionLabel)),
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: _WaouhPresenceDashboardScreenState.muted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        );
      },
    );
  }
}

class _SiteCard extends StatelessWidget {
  const _SiteCard({
    required this.site,
    required this.onQr,
    required this.onTeam,
    required this.onHistory,
    required this.onSettings,
  });

  final WaouhPresenceSite site;
  final VoidCallback onQr;
  final VoidCallback onTeam;
  final VoidCallback onHistory;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    final statusColor = site.active
        ? _WaouhPresenceDashboardScreenState.green
        : Colors.grey;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _WaouhPresenceDashboardScreenState.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 25,
                backgroundColor: statusColor.withValues(alpha: 0.10),
                foregroundColor: statusColor,
                child: const Icon(Icons.location_on_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      site.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      site.address ??
                          '${site.latitude.toStringAsFixed(5)}, ${site.longitude.toStringAsFixed(5)}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _WaouhPresenceDashboardScreenState.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _StatusChip(
                label: site.active ? 'Actif' : 'Inactif',
                color: statusColor,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(
                icon: Icons.gps_fixed_rounded,
                label: 'Rayon ${site.radiusMeters} m',
              ),
              _InfoChip(
                icon: Icons.security_outlined,
                label: site.requirePin ? 'PIN requis' : 'Sans PIN',
              ),
              _InfoChip(
                icon: Icons.person_pin_circle_outlined,
                label: site.requireEmployeeCode
                    ? 'Matricule requis'
                    : 'Matricule facultatif',
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: onQr,
                icon: const Icon(Icons.qr_code_2_rounded),
                label: const Text('QR public'),
              ),
              OutlinedButton.icon(
                onPressed: onTeam,
                icon: const Icon(Icons.groups_outlined),
                label: const Text('Équipe'),
              ),
              OutlinedButton.icon(
                onPressed: onSettings,
                icon: const Icon(Icons.tune_rounded),
                label: const Text('Paramétrer'),
              ),
              TextButton.icon(
                onPressed: onHistory,
                icon: const Icon(Icons.history_rounded),
                label: const Text('Historique'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F8F6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: _WaouhPresenceDashboardScreenState.green),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _RecentEvent extends StatelessWidget {
  const _RecentEvent({required this.event});

  final WaouhPresenceEvent event;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _WaouhPresenceDashboardScreenState.line),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _WaouhPresenceDashboardScreenState.green.withValues(
            alpha: 0.10,
          ),
          foregroundColor: _WaouhPresenceDashboardScreenState.green,
          child: const Icon(Icons.how_to_reg_outlined),
        ),
        title: Text(
          event.memberName,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text('${event.action.label} · ${event.siteName}'),
        trailing: Text(
          TimeOfDay.fromDateTime(event.occurredAt.toLocal()).format(context),
          style: const TextStyle(
            color: _WaouhPresenceDashboardScreenState.muted,
          ),
        ),
      ),
    );
  }
}

class _Failure extends StatelessWidget {
  const _Failure({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 52,
              color: Colors.redAccent,
            ),
            const SizedBox(height: 10),
            const Text(
              'Présence QR indisponible',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
            ),
            const SizedBox(height: 8),
            Text('$error', textAlign: TextAlign.center),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptySites extends StatelessWidget {
  const _EmptySites({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _WaouhPresenceDashboardScreenState.line),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.add_location_alt_outlined,
            size: 50,
            color: _WaouhPresenceDashboardScreenState.green,
          ),
          const SizedBox(height: 10),
          const Text(
            'Créez votre premier site',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          const SizedBox(height: 6),
          const Text(
            'Définissez une adresse, une position GPS et un rayon autorisé pour vos pointages.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Ajouter un site'),
          ),
        ],
      ),
    );
  }
}

class _EmptyEvents extends StatelessWidget {
  const _EmptyEvents();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _WaouhPresenceDashboardScreenState.line),
      ),
      child: const Text(
        'Aucun pointage récent à afficher.',
        textAlign: TextAlign.center,
      ),
    );
  }
}
