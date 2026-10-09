import 'dart:async';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_nexus_service.dart';
import 'live_reasoning.dart' show maskPhone;
import 'live_theme.dart';

/// Registre de contacts de Bot : contactés, en attente, réponses, à contacter,
/// numéros masqués (4 derniers chiffres) et recherches en cours.
class LiveContactLedger extends StatefulWidget {
  const LiveContactLedger({super.key});

  @override
  State<LiveContactLedger> createState() => _LiveContactLedgerState();
}

enum _Bucket { toContact, pending, replied }

_Bucket _bucketOf(String stage) {
  switch (stage) {
    case 'contacting':
    case 'waiting_reply':
      return _Bucket.pending;
    case 'negotiating':
    case 'agreed':
    case 'executing':
    case 'completed':
      return _Bucket.replied;
    default:
      return _Bucket.toContact;
  }
}

String? _journeyPhone(NexusOpportunityJourney journey) {
  final phones = journey.maskedContact['phones'];
  if (phones is List) {
    for (final entry in phones) {
      if (entry is Map) {
        final masked = maskPhone('${entry['last4'] ?? ''}');
        if (masked != null) return masked;
      }
    }
  }
  for (final contact in journey.contactPack?.maskedContacts ?? const <Map<String, dynamic>>[]) {
    final masked = maskPhone('${contact['last4'] ?? ''}');
    if (masked != null) return masked;
  }
  return null;
}

class _LiveContactLedgerState extends State<LiveContactLedger> {
  late final LiveNexusService _service = LiveNexusService(legacy.supabase);
  List<NexusOpportunityJourney> _journeys = const <NexusOpportunityJourney>[];
  List<Map<String, dynamic>> _missions = const <Map<String, dynamic>>[];
  bool _loading = true;
  bool _failed = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => unawaited(_load()));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait<dynamic>([
        _service.listOpportunities(includeCompleted: true, limit: 50),
        _service.listMandates().catchError((Object _) => <String, dynamic>{}),
      ]);
      final mandates = (results[1] as Map<String, dynamic>)['mandates'];
      if (!mounted) return;
      setState(() {
        _journeys = results[0] as List<NexusOpportunityJourney>;
        _missions = mandates is List
            ? mandates
                .whereType<Map>()
                .map((m) => Map<String, dynamic>.from(m))
                .where((m) => m['status'] == 'active')
                .toList(growable: false)
            : const <Map<String, dynamic>>[];
        _loading = false;
        _failed = false;
      });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _failed = true; });
    }
  }

  int _count(_Bucket bucket) =>
      _journeys.where((j) => _bucketOf(j.stage) == bucket).length;

  @override
  Widget build(BuildContext context) {
    final pending = _count(_Bucket.pending);
    final replied = _count(_Bucket.replied);
    final toContact = _count(_Bucket.toContact);
    final contacted = pending + replied;
    final withNumber = _journeys.where((j) => _journeyPhone(j) != null).length;

    Widget tile(String label, int value, {bool primary = false}) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              gradient: primary
                  ? const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)])
                  : null,
              color: primary ? null : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFDCE7F8)),
            ),
            child: Column(children: [
              Text('$value',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: primary ? Colors.white : WaouhPalette.ink)),
              const SizedBox(height: 2),
              Text(label,
                  style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: primary ? const Color(0xFFDBEAFE) : WaouhPalette.muted)),
            ]),
          ),
        );

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FAFF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDCE7F8)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          leading: const Icon(Icons.contacts_rounded, color: WaouhPalette.blue),
          title: const Text('Mes contacts',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
          subtitle: Text(
            _loading
                ? 'Chargement…'
                : _failed
                    ? 'Indisponible pour le moment'
                    : '$contacted contactés · $pending en attente · $toContact à contacter',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 360),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      tile('Contactés', contacted, primary: true),
                      const SizedBox(width: 6),
                      tile('En attente', pending),
                      const SizedBox(width: 6),
                      tile('Réponses', replied),
                      const SizedBox(width: 6),
                      tile('À contacter', toContact),
                    ]),
                    const SizedBox(height: 6),
                    Text('$withNumber sur ${_journeys.length} avec un numéro masqué disponible.',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: WaouhPalette.muted)),
                    if (_missions.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      const Text('RECHERCHES EN COURS',
                          style: TextStyle(
                              fontSize: 9.5,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF94A3B8))),
                      for (final m in _missions.take(4))
                        Builder(builder: (context) {
                          final contactedCount = (m['contacted_count'] as num?)?.toInt() ?? 0;
                          final max = (m['max_contacts'] as num?)?.toInt() ?? 0;
                          final replies = (m['replied_count'] as num?)?.toInt() ?? 0;
                          return Container(
                            margin: const EdgeInsets.only(top: 6),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE4D8FF)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Expanded(
                                    child: Text('${m['goal'] ?? 'Mission'}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontSize: 12.5, fontWeight: FontWeight.w800)),
                                  ),
                                  Text('$contactedCount/$max',
                                      style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF6D28D9))),
                                ]),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(99),
                                  child: LinearProgressIndicator(
                                    minHeight: 5,
                                    value: max > 0 ? (contactedCount / max).clamp(0, 1).toDouble() : 0,
                                    backgroundColor: const Color(0xFFEDE9FE),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text('$replies réponse${replies > 1 ? 's' : ''}',
                                    style: const TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: WaouhPalette.muted)),
                              ],
                            ),
                          );
                        }),
                    ],
                    const SizedBox(height: 10),
                    for (final j in _journeys.take(12))
                      Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE3ECFA)),
                        ),
                        child: Row(children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(j.subject ?? 'Opportunité',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        fontSize: 12.5, fontWeight: FontWeight.w800)),
                                Text(_journeyPhone(j) ?? 'numéro non disponible',
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: WaouhPalette.muted)),
                              ],
                            ),
                          ),
                          Text(
                            switch (_bucketOf(j.stage)) {
                              _Bucket.pending => 'En attente',
                              _Bucket.replied => 'A répondu',
                              _Bucket.toContact => 'À contacter',
                            },
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: WaouhPalette.blue),
                          ),
                        ]),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
