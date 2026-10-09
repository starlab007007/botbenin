import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'avatar/bot_character.dart';
import 'live_nexus_service.dart';
import 'live_theme.dart';

/// « Trouver pour moi » — même parcours que l'onglet NEXUS du Web :
/// décrire, chercher et comparer, surveiller, demander conseil à l'IA.
class LiveNexusFindPanel extends StatefulWidget {
  const LiveNexusFindPanel({
    super.key,
    required this.onExpression,
    required this.onSpeak,
    required this.onAsk,
  });

  final ValueChanged<BotExpression> onExpression;
  final ValueChanged<String> onSpeak;

  /// Ouvre un NOUVEAU chat avec ce texte (jamais dans l'historique en cours).
  final ValueChanged<String> onAsk;

  @override
  State<LiveNexusFindPanel> createState() => _LiveNexusFindPanelState();
}

class _LiveNexusFindPanelState extends State<LiveNexusFindPanel> {
  static const List<String> _suggestions = <String>[
    'Samsung S25 neuf',
    'Moto Bajaj d’occasion',
    'Appartement à Calavi',
    'Climatiseur 12000 BTU',
  ];

  late final LiveNexusService _service = LiveNexusService(legacy.supabase);
  final TextEditingController _query = TextEditingController();
  final TextEditingController _budget = TextEditingController();
  final TextEditingController _city = TextEditingController(text: 'Cotonou');
  bool _searching = false;
  bool _watching = false;
  String? _error;
  NexusDiscoveryResponse? _result;

  @override
  void dispose() {
    _query.dispose();
    _budget.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final text = _query.text.trim();
    if (text.isEmpty || _searching) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _searching = true;
      _error = null;
    });
    widget.onExpression(BotExpression.think);
    widget.onSpeak('Je cherche et je compare les offres…');
    try {
      final budget = double.tryParse(_budget.text.replaceAll(RegExp(r'\D'), ''));
      final response = await _service.search(
        query: text,
        findSellers: true,
        city: _city.text,
        budgetMax: budget,
        limit: 9,
      );
      if (!mounted) return;
      setState(() => _result = response);
      widget.onExpression(BotExpression.talk);
      widget.onSpeak(response.results.isEmpty
          ? 'Rien d’assez proche, activons une veille ?'
          : 'J’ai trouvé ${response.results.length} option(s) pour vous.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error is NexusApiException
          ? error.message
          : 'Recherche impossible pour le moment.');
      widget.onExpression(BotExpression.idle);
      widget.onSpeak('Je n’ai pas pu chercher, réessayons.');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _watch() async {
    final text = _query.text.trim();
    if (text.isEmpty || _watching) return;
    setState(() => _watching = true);
    try {
      final budget = double.tryParse(_budget.text.replaceAll(RegExp(r'\D'), ''));
      await _service.createWatch(query: text, targetAmount: budget);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veille activée. WAOUH continue à chercher.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error is NexusApiException
              ? error.message
              : 'Veille impossible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _watching = false);
    }
  }

  static String _money(double? value, String currency) {
    if (value == null || value <= 0) return 'Prix sur demande';
    final digits = value.round().toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final unit = (currency == 'XOF' || currency.isEmpty) ? 'FCFA' : currency;
    return '$buffer $unit';
  }

  @override
  Widget build(BuildContext context) {
    final results = _result?.results ?? const <NexusDiscoveryItem>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: WaouhPalette.line),
            boxShadow: WaouhShadows.card,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      gradient: WaouhGradients.brand,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded,
                        color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Trouver pour moi',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: WaouhPalette.ink,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _query,
                minLines: 2,
                maxLines: 3,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: const InputDecoration(
                  hintText: 'Ex. Samsung S25 256 Go neuf',
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _suggestions.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, index) => ActionChip(
                    label: Text(_suggestions[index],
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700)),
                    onPressed: () =>
                        setState(() => _query.text = _suggestions[index]),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _budget,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(hintText: 'Budget FCFA'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _city,
                      decoration: const InputDecoration(hintText: 'Ville'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _searching ? null : _search,
                  icon: _searching
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Chercher et comparer'),
                ),
              ),
            ],
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_error!,
                style: const TextStyle(
                    color: WaouhPalette.red, fontWeight: FontWeight.w600)),
          ),
        if (_result == null && !_searching && _error == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 28),
            child: Center(
              child: Text(
                'Vos meilleures offres apparaîtront ici.',
                style: TextStyle(
                    color: WaouhPalette.muted, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        if (_result != null) ...[
          const SizedBox(height: 14),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Meilleures options',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: WaouhPalette.ink),
                ),
              ),
              OutlinedButton.icon(
                onPressed: _watching ? null : _watch,
                icon: const Icon(Icons.notifications_active_outlined, size: 16),
                label: const Text('Surveiller'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (results.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  'Rien d’assez proche. Activez la veille.',
                  style: TextStyle(color: WaouhPalette.muted),
                ),
              ),
            ),
          for (final item in results) _ResultCard(item: item, onAsk: widget.onAsk),
        ],
      ],
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.item, required this.onAsk});

  final NexusDiscoveryItem item;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final photos = item.photoUrls;
    final score = item.scores.total.clamp(0, 100).toDouble();
    final price = _LiveNexusFindPanelState._money(item.priceMin, item.currency);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WaouhPalette.line),
        boxShadow: WaouhShadows.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photos.isNotEmpty)
            Image.network(
              photos.first,
              height: 130,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.ink),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        price,
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: WaouhPalette.ink),
                      ),
                    ),
                    if ((item.city ?? '').isNotEmpty)
                      Text(item.city!,
                          style: const TextStyle(
                              fontSize: 11, color: WaouhPalette.muted)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: score / 100,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFEAF0F8),
                    color: WaouhPalette.blue,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Pertinence ${score.round()}%',
                  style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: WaouhPalette.muted),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => onAsk(
                            'Je suis intéressé par ${item.title} ($price). Aide-moi à contacter le vendeur et à négocier.'),
                        icon: const Icon(Icons.bolt_rounded, size: 16),
                        label: const Text('Intéressé'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => onAsk(
                            'Analyse ${item.title} à $price. Est-ce un bon prix et que dois-je vérifier avant de négocier ?'),
                        icon: const Icon(Icons.psychology_alt_outlined, size: 16),
                        label: const Text('Conseil IA'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
