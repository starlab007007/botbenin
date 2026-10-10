import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../main.dart' as legacy;
import 'live_benin_locations.dart';
import 'live_location.dart';

const Map<String, String> _accents = {
  'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ã': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'œ': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ç': 'c', 'ñ': 'n',
};

String _fold(String s) {
  final b = StringBuffer();
  for (final ch in s.toLowerCase().trim().split('')) {
    b.write(_accents[ch] ?? ch);
  }
  return b.toString();
}

final List<String> _places = <String>[
  for (final entry in liveBeninPlaces.entries) ...[
    entry.key,
    for (final q in entry.value)
      if (q != 'Centre' && _fold(q) != _fold(entry.key)) '$q, ${entry.key}',
  ],
];

List<String> liveSuggestPlaces(String input, {int limit = 6}) {
  final q = _fold(input);
  if (q.isEmpty) return const <String>[];
  final starts = <String>[];
  final contains = <String>[];
  for (final p in _places) {
    final f = _fold(p);
    if (f.startsWith(q)) {
      starts.add(p);
    } else if (f.contains(q)) {
      contains.add(p);
    }
  }
  return [...starts, ...contains].take(limit).toList();
}

/// Champ lieu intelligent : saisie prédictive (villes et quartiers du Bénin),
/// bouton « Ma position » et remplissage automatique si la permission est déjà accordée.
class LiveCityField extends StatefulWidget {
  const LiveCityField({
    super.key,
    required this.controller,
    this.hint = 'Ville ou quartier',
    this.autoLocate = true,
    this.onChanged,
  });

  final TextEditingController controller;
  final String hint;
  final bool autoLocate;
  final VoidCallback? onChanged;

  @override
  State<LiveCityField> createState() => _LiveCityFieldState();
}

class _LiveCityFieldState extends State<LiveCityField> {
  final FocusNode _focus = FocusNode();
  bool _locating = false;
  String _notice = '';

  @override
  void initState() {
    super.initState();
    if (widget.autoLocate && widget.controller.text.trim().isEmpty) _silentLocate();
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  Future<void> _silentLocate() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse) {
        await _locate(silent: true);
      }
    } catch (_) {}
  }

  Future<void> _locate({bool silent = false}) async {
    if (_locating) return;
    setState(() {
      _locating = true;
      _notice = '';
    });
    try {
      final position = await LiveLocationService().requestCurrent();
      if (!position.available) {
        if (!silent && mounted) {
          setState(() => _notice = position.errorMessage ?? 'Position introuvable.');
        }
        return;
      }
      final res = await legacy.supabase.functions.invoke(
        'waouh-geocode',
        body: {'lat': position.latitude, 'lng': position.longitude},
      );
      final data = res.data;
      final city = data is Map ? '${data['city'] ?? ''}'.trim() : '';
      final district = data is Map ? '${data['district'] ?? ''}'.trim() : '';
      if (city.isEmpty) {
        if (!silent && mounted) setState(() => _notice = 'Position trouvée, ville inconnue. Saisissez-la.');
        return;
      }
      if (silent && widget.controller.text.trim().isNotEmpty) return;
      widget.controller.text =
          district.isNotEmpty && district != city ? '$district, $city' : city;
      widget.onChanged?.call();
    } catch (_) {
      if (!silent && mounted) setState(() => _notice = 'Position introuvable. Saisissez la ville.');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RawAutocomplete<String>(
          textEditingController: widget.controller,
          focusNode: _focus,
          optionsBuilder: (value) {
            final options = liveSuggestPlaces(value.text);
            if (options.length == 1 && _fold(options.first) == _fold(value.text)) {
              return const Iterable<String>.empty();
            }
            return options;
          },
          onSelected: (_) => widget.onChanged?.call(),
          fieldViewBuilder: (context, controller, focusNode, onSubmit) => TextField(
            controller: controller,
            focusNode: focusNode,
            onChanged: (_) => widget.onChanged?.call(),
            decoration: InputDecoration(
              hintText: widget.hint,
              prefixIcon: const Icon(Icons.place_outlined, size: 18),
              suffixIcon: _locating
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton(
                      tooltip: 'Utiliser ma position',
                      icon: const Icon(Icons.my_location_rounded, size: 20),
                      onPressed: () => _locate(),
                    ),
            ),
          ),
          optionsViewBuilder: (context, onSelected, options) => Align(
            alignment: Alignment.topLeft,
            child: Material(
              elevation: 6,
              borderRadius: BorderRadius.circular(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 240, maxWidth: 320),
                child: ListView(
                  padding: EdgeInsets.zero,
                  shrinkWrap: true,
                  children: [
                    for (final o in options)
                      ListTile(
                        dense: true,
                        leading: const Icon(Icons.place_outlined, size: 18),
                        title: Text(o, style: const TextStyle(fontWeight: FontWeight.w700)),
                        onTap: () => onSelected(o),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_notice.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(_notice,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          ),
      ],
    );
  }
}
