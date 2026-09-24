import 'package:flutter/material.dart';

import 'live_radar_models.dart';

class RadarFilters extends StatefulWidget {
  const RadarFilters({super.key, required this.value});
  final LiveRadarFilters value;

  @override
  State<RadarFilters> createState() => _RadarFiltersState();
}

class _RadarFiltersState extends State<RadarFilters> {
  late int _radius = widget.value.maxRadiusKm;
  late bool _photos = widget.value.photoOnly;
  late bool _verified = widget.value.verifiedOnly;
  late List<LiveRadarItemType> _types = [...widget.value.types];

  void _toggle(LiveRadarItemType item) {
    setState(() => _types.contains(item) ? _types.remove(item) : _types.add(item));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          padding: EdgeInsets.fromLTRB(18, 12, 18, 18 + MediaQuery.viewInsetsOf(context).bottom),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD9D3), borderRadius: BorderRadius.circular(99)))),
              const SizedBox(height: 16),
              const Text('Filtres Radar', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              const SizedBox(height: 16),
              const Text('Portée', style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: [5, 20, 100].map((value) => ChoiceChip(label: Text('$value km'), selected: _radius == value, onSelected: (_) => setState(() => _radius = value))).toList()),
              const SizedBox(height: 16),
              const Text('Type d’opportunité', style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: LiveRadarItemType.values.map((value) => FilterChip(label: Text(value.label), selected: _types.contains(value), onSelected: (_) => _toggle(value))).toList()),
              const SizedBox(height: 8),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: _photos, onChanged: (value) => setState(() => _photos = value), title: const Text('Avec photo uniquement')),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: _verified, onChanged: (value) => setState(() => _verified = value), title: const Text('Vendeurs vérifiés uniquement')),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(
                    context,
                    LiveRadarFilters(
                      types: _types,
                      photoOnly: _photos,
                      verifiedOnly: _verified,
                      urgent: _radius == 5,
                      autoPauseMs: null,
                    ),
                  ),
                  child: const Text('Appliquer les filtres'),
                ),
              ),
            ]),
          ),
        ),
      );
}
