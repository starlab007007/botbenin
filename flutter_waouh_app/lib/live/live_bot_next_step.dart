import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'live_nexus_service.dart';
import 'live_theme.dart';

/// « Et maintenant ? » : après les résultats, une action fait passer Bot du
/// repérage au contact puis à la négociation. Rien ne part sans confirmation,
/// dans les limites choisies (nombre de contacts, WhatsApp, autonomie).
class LiveBotNextStep extends StatefulWidget {
  const LiveBotNextStep({
    super.key,
    required this.service,
    required this.mode,
    required this.goal,
    required this.city,
    required this.budget,
    required this.items,
    this.articleId,
    this.priceFloor,
  });

  final LiveNexusService service;
  final String mode; // buy | sell | ask
  final String goal;
  final String city;
  final double? budget;
  final List<NexusDiscoveryItem> items;
  final String? articleId;
  final double? priceFloor;

  @override
  State<LiveBotNextStep> createState() => _LiveBotNextStepState();
}

class _LiveBotNextStepState extends State<LiveBotNextStep> {
  String _autonomy = 'semi_autonomous';
  int _count = 3;
  bool _whatsapp = false;
  bool _confirm = false;
  bool _busy = false;
  int? _linked;
  String _error = '';

  String get _title => switch (widget.mode) {
        'sell' => 'Bot contacte les acheteurs',
        'ask' => 'Bot contacte les bons profils',
        _ => 'Bot négocie avec les vendeurs',
      };
  String get _who => switch (widget.mode) {
        'sell' => 'acheteur',
        'ask' => 'profil',
        _ => 'vendeur',
      };

  int get _maxPick => widget.items.isEmpty ? 1 : widget.items.length.clamp(1, 10);
  int get _picked => _count.clamp(1, _maxPick);

  Future<void> _launch() async {
    if (_busy) return;
    if (!_confirm) {
      setState(() => _confirm = true);
      return;
    }
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final data = await widget.service.createMandate(
        mode: widget.mode,
        goal: widget.goal,
        articleId: widget.mode == 'sell' ? widget.articleId : null,
        priceFloor: widget.mode == 'sell' ? widget.priceFloor : null,
        autonomyMode: _autonomy,
        city: widget.city.trim().isEmpty ? null : widget.city.trim(),
        budgetMax: widget.mode == 'buy' ? widget.budget : null,
        maxContacts: _picked,
        maxFollowups: _autonomy == 'assisted' ? 0 : 1,
        allowWhatsapp: _whatsapp,
        allowPublicBusiness: true,
        allowBlindMessage: true,
        durationHours: 72,
        completionGoal: 'agreement',
      );
      final mandate = data['mandate'];
      final mandateId = mandate is Map ? '${mandate['id'] ?? ''}' : '';
      var linked = 0;
      for (final item in widget.items.take(_picked)) {
        try {
          await widget.service.startOpportunity(
            fabricId: item.fabricId,
            mode: widget.mode,
            mandateId: mandateId,
          );
          linked++;
        } catch (_) {}
      }
      if (mounted) setState(() => _linked = linked);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Impossible de lancer Bot pour le moment. Réessayez.';
          _confirm = false;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return const SizedBox.shrink();
    final decoration = BoxDecoration(
      gradient: const LinearGradient(
        colors: [Colors.white, Color(0xFFEFF5FF), Color(0xFFF3EFFF)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(26),
      border: Border.all(color: const Color(0xFFDCE7F8)),
    );

    if (_linked != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: decoration,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.check_circle_rounded, color: Color(0xFF059669)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Bot s’en occupe',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
              ),
            ]),
            const SizedBox(height: 6),
            Text(
              '$_linked $_who${_linked! > 1 ? 's' : ''} pris en charge. ${_autonomy == 'assisted' ? 'Vous validez chaque message.' : 'Je vous préviens à chaque réponse.'}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: WaouhPalette.muted),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => context.go('/app/missions'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              child: const Text('Suivre mes contacts'),
            ),
          ],
        ),
      );
    }

    Widget autonomyChip(String id, String label, String hint) {
      final selected = _autonomy == id;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() {
            _autonomy = id;
            _confirm = false;
          }),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFEFF5FF) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: selected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text(hint,
                    style: const TextStyle(
                        fontSize: 9.5, fontWeight: FontWeight.w600, color: WaouhPalette.muted)),
              ],
            ),
          ),
        ),
      );
    }

    final counts = <int>{1, 3, 5, 10, _maxPick}.where((n) => n <= _maxPick).toList()
      ..sort();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: decoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ET MAINTENANT ?',
              style: TextStyle(
                  fontSize: 10,
                  letterSpacing: 1.6,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF2563EB))),
          const SizedBox(height: 2),
          Text(_title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(
            '${widget.items.length} $_who${widget.items.length > 1 ? 's' : ''} trouvé${widget.items.length > 1 ? 's' : ''}.',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: WaouhPalette.muted),
          ),
          const SizedBox(height: 10),
          Row(children: [
            for (final step in const ['Bot contacte', 'Vous validez', 'Négociation', 'Accord'])
              Expanded(
                child: Text(step,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
              ),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            autonomyChip('assisted', 'Assisté', 'Je valide chaque message'),
            autonomyChip('semi_autonomous', 'Semi-auto', 'Bot contacte, je valide l’accord'),
            autonomyChip('autonomous', 'Autonome', 'Bot négocie dans mes limites'),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            const Expanded(
              child: Text('Contacter jusqu’à',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            ),
            for (final n in counts)
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: ChoiceChip(
                  label: Text('$n'),
                  selected: _picked == n,
                  onSelected: (_) => setState(() {
                    _count = n;
                    _confirm = false;
                  }),
                ),
              ),
          ]),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('WhatsApp vérifié',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            value: _whatsapp,
            onChanged: (value) => setState(() {
              _whatsapp = value;
              _confirm = false;
            }),
          ),
          if (_error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(_error,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE11D48))),
            ),
          FilledButton.icon(
            onPressed: _busy ? null : _launch,
            icon: _busy
                ? const SizedBox.square(
                    dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(_confirm ? Icons.verified_user_rounded : Icons.handshake_rounded),
            label: Text(_confirm
                ? 'Confirmer : $_picked contact${_picked > 1 ? 's' : ''} max'
                : 'Lancer Bot'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: _confirm ? const Color(0xFF059669) : null,
            ),
          ),
          const SizedBox(height: 6),
          const Center(
            child: Text('Aucun paiement. Vous validez l’accord final.',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: WaouhPalette.muted)),
          ),
        ],
      ),
    );
  }
}
