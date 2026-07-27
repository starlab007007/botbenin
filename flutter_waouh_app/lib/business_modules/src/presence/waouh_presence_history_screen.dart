import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'waouh_presence_models.dart';
import 'waouh_presence_repository.dart';

class WaouhPresenceHistoryScreen extends StatefulWidget {
  const WaouhPresenceHistoryScreen({
    super.key,
    required this.repository,
    this.site,
  });

  final WaouhPresenceRepository repository;
  final WaouhPresenceSite? site;

  @override
  State<WaouhPresenceHistoryScreen> createState() =>
      _WaouhPresenceHistoryScreenState();
}

class _WaouhPresenceHistoryScreenState
    extends State<WaouhPresenceHistoryScreen> {
  static const green = Color(0xFF076B5D);
  static const muted = Color(0xFF66736F);

  List<WaouhPresenceEvent> _events = const [];
  WaouhPresenceAction? _filter;
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
      final events = await widget.repository.fetchEvents(
        siteId: widget.site?.id,
        limit: 300,
      );
      if (!mounted) return;
      setState(() => _events = events);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  List<WaouhPresenceEvent> get _visible => _filter == null
      ? _events
      : _events.where((event) => event.action == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final values = _visible;
    return Scaffold(
      backgroundColor: const Color(0xFFF3F8F6),
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        title: Text(
          widget.site == null
              ? 'Historique des présences'
              : 'Historique · '
                    '${widget.site!.name}',
        ),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 58,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              scrollDirection: Axis.horizontal,
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 7),
                  child: ChoiceChip(
                    label: Text('Tous ${_events.length}'),
                    selected: _filter == null,
                    onSelected: (_) => setState(() => _filter = null),
                  ),
                ),
                ...WaouhPresenceAction.values.map(
                  (action) => Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text(action.label),
                      selected: _filter == action,
                      onSelected: (_) => setState(() => _filter = action),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(child: Text('$_error'))
                : values.isEmpty
                ? const Center(
                    child: Text(
                      'Aucun évènement '
                      'à afficher.',
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(14),
                      itemCount: values.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, index) {
                        final event = values[index];
                        return Container(
                          padding: const EdgeInsets.all(13),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFDDE9E5)),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: _actionColor(
                                  event.action,
                                ).withValues(alpha: .10),
                                foregroundColor: _actionColor(event.action),
                                child: Icon(_actionIcon(event.action)),
                              ),
                              const SizedBox(width: 11),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      event.memberName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${event.action.label} · '
                                      '${event.siteName}',
                                      style: const TextStyle(color: muted),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      DateFormat(
                                        'dd/MM/yyyy '
                                        'à HH:mm',
                                      ).format(event.occurredAt.toLocal()),
                                      style: const TextStyle(
                                        color: muted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Icon(
                                    event.insideRadius
                                        ? Icons.verified_rounded
                                        : Icons.gps_off_rounded,
                                    color: event.insideRadius
                                        ? green
                                        : Colors.redAccent,
                                  ),
                                  if (event.distanceMeters != null)
                                    Text(
                                      '${event.distanceMeters!.round()} m',
                                      style: const TextStyle(
                                        color: muted,
                                        fontSize: 11,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Color _actionColor(WaouhPresenceAction action) => switch (action) {
    WaouhPresenceAction.arrival => green,
    WaouhPresenceAction.breakStart => Colors.orange,
    WaouhPresenceAction.breakEnd => Colors.blue,
    WaouhPresenceAction.departure => Colors.purple,
  };

  IconData _actionIcon(WaouhPresenceAction action) => switch (action) {
    WaouhPresenceAction.arrival => Icons.login_rounded,
    WaouhPresenceAction.breakStart => Icons.free_breakfast_outlined,
    WaouhPresenceAction.breakEnd => Icons.play_arrow_rounded,
    WaouhPresenceAction.departure => Icons.logout_rounded,
  };
}
