import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import 'waouh_presence_models.dart';
import 'waouh_presence_repository.dart';

class WaouhPresenceSiteSheet extends StatefulWidget {
  const WaouhPresenceSiteSheet({
    super.key,
    required this.repository,
    this.site,
  });

  final WaouhPresenceRepository repository;
  final WaouhPresenceSite? site;

  @override
  State<WaouhPresenceSiteSheet> createState() => _WaouhPresenceSiteSheetState();
}

class _WaouhPresenceSiteSheetState extends State<WaouhPresenceSiteSheet> {
  static const green = Color(0xFF076B5D);
  static const muted = Color(0xFF66736F);
  static const radiusChoices = [10, 25, 50, 100, 200, 500];
  static const accuracyChoices = [10, 25, 50, 100, 150, 200];
  static const countryCodes = [
    ('BJ', '+229'),
    ('TG', '+228'),
    ('CI', '+225'),
    ('SN', '+221'),
    ('CM', '+237'),
    ('FR', '+33'),
  ];

  late final TextEditingController _name = TextEditingController(
    text: widget.site?.name ?? '',
  );
  late final TextEditingController _address = TextEditingController(
    text: widget.site?.address ?? '',
  );
  late final TextEditingController _latitude = TextEditingController(
    text: widget.site == null ? '' : widget.site!.latitude.toString(),
  );
  late final TextEditingController _longitude = TextEditingController(
    text: widget.site == null ? '' : widget.site!.longitude.toString(),
  );
  late final TextEditingController _whatsLocal = TextEditingController(
    text: _localPhone(widget.site?.responsibleWhatsapp),
  );

  late int _radius = widget.site?.radiusMeters ?? 100;
  late int _accuracy = widget.site?.maxAccuracyMeters ?? 100;
  late bool _requireGeolocation = widget.site?.requireGeolocation ?? true;
  late bool _requireEmployeeCode = widget.site?.requireEmployeeCode ?? true;
  late bool _requirePin = widget.site?.requirePin ?? true;
  late bool _active = widget.site?.active ?? true;
  String _countryCode = '+229';
  bool _saving = false;
  Object? _error;

  static String _digits(String? value) =>
      (value ?? '').replaceAll(RegExp(r'\D'), '');

  static String _localPhone(String? value) {
    final digits = _digits(value);
    for (final entry in countryCodes) {
      final code = entry.$2.replaceAll('+', '');
      if (digits.startsWith(code) && digits.length > code.length) {
        return digits.substring(code.length);
      }
    }
    return digits;
  }

  @override
  void initState() {
    super.initState();
    final raw = _digits(widget.site?.responsibleWhatsapp);
    for (final entry in countryCodes) {
      final code = entry.$2.replaceAll('+', '');
      if (raw.startsWith(code) && raw.length > code.length) {
        _countryCode = entry.$2;
        break;
      }
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    _latitude.dispose();
    _longitude.dispose();
    _whatsLocal.dispose();
    super.dispose();
  }

  String _composePhone() {
    final local = _digits(_whatsLocal.text);
    if (local.isEmpty) return '';
    return '${_countryCode.replaceAll('+', '')}$local';
  }

  Future<void> _useCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw StateError('Activez le GPS du téléphone.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw StateError('Autorisation GPS requise.');
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      _latitude.text = position.latitude.toStringAsFixed(6);
      _longitude.text = position.longitude.toStringAsFixed(6);
      if (mounted) setState(() => _error = null);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    }
  }

  Future<void> _save() async {
    final latitude = double.tryParse(_latitude.text.trim());
    final longitude = double.tryParse(_longitude.text.trim());
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Le nom du site est requis.');
      return;
    }
    if (latitude == null || longitude == null) {
      setState(() => _error = 'Les coordonnées GPS sont requises.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final value = await widget.repository.saveSite(
        siteId: widget.site?.id,
        name: _name.text.trim(),
        address: _address.text.trim(),
        latitude: latitude,
        longitude: longitude,
        radiusMeters: _radius,
        maxAccuracyMeters: _accuracy,
        requireGeolocation: _requireGeolocation,
        requireEmployeeCode: _requireEmployeeCode,
        requirePin: _requirePin,
        responsibleWhatsapp: _composePhone(),
        active: _active,
      );
      if (!mounted) return;
      Navigator.pop(context, value);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _smartField({required Widget child, required IconData icon}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Icon(icon, color: green),
        ),
        const SizedBox(width: 10),
        Expanded(child: child),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.site == null
        ? 'Ajouter un site'
        : 'Paramétrer le site';
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Material(
          color: const Color(0xFFF3F8F6),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Le QR public sera valide uniquement dans le rayon défini.',
                            style: TextStyle(color: muted),
                          ),
                        ],
                      ),
                    ),
                    IconButton.filledTonal(
                      tooltip: 'Position actuelle',
                      onPressed: _saving ? null : _useCurrentLocation,
                      icon: const Icon(Icons.my_location_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (_error != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFECEC),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text('$_error'),
                  ),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    children: [
                      _smartField(
                        icon: Icons.apartment_rounded,
                        child: TextField(
                          controller: _name,
                          enabled: !_saving,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Nom du site',
                            hintText: 'Ex: Star Lab',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _smartField(
                        icon: Icons.place_outlined,
                        child: TextField(
                          controller: _address,
                          enabled: !_saving,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Adresse',
                            hintText: 'Ex: Calavi, carrefour ...',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final compact = constraints.maxWidth < 430;
                          final first = _smartField(
                            icon: Icons.map_outlined,
                            child: TextField(
                              controller: _latitude,
                              enabled: !_saving,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                    signed: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Latitude',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          );
                          final second = _smartField(
                            icon: Icons.map_rounded,
                            child: TextField(
                              controller: _longitude,
                              enabled: !_saving,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                    signed: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Longitude',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          );
                          if (compact) {
                            return Column(
                              children: [
                                first,
                                const SizedBox(height: 12),
                                second,
                              ],
                            );
                          }
                          return Row(
                            children: [
                              Expanded(child: first),
                              const SizedBox(width: 12),
                              Expanded(child: second),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final compact = constraints.maxWidth < 430;
                          final radiusField = _smartField(
                            icon: Icons.radar_outlined,
                            child: DropdownButtonFormField<int>(
                              initialValue: _radius,
                              decoration: const InputDecoration(
                                labelText: 'Rayon autorisé',
                                border: OutlineInputBorder(),
                              ),
                              items: radiusChoices
                                  .map(
                                    (value) => DropdownMenuItem(
                                      value: value,
                                      child: Text('$value m'),
                                    ),
                                  )
                                  .toList(),
                              onChanged: _saving
                                  ? null
                                  : (value) =>
                                        setState(() => _radius = value ?? 100),
                            ),
                          );
                          final accuracyField = _smartField(
                            icon: Icons.gps_fixed_rounded,
                            child: DropdownButtonFormField<int>(
                              initialValue: _accuracy,
                              decoration: const InputDecoration(
                                labelText: 'Précision GPS max',
                                border: OutlineInputBorder(),
                              ),
                              items: accuracyChoices
                                  .map(
                                    (value) => DropdownMenuItem(
                                      value: value,
                                      child: Text('$value m'),
                                    ),
                                  )
                                  .toList(),
                              onChanged: _saving
                                  ? null
                                  : (value) => setState(
                                      () => _accuracy = value ?? 100,
                                    ),
                            ),
                          );
                          if (compact) {
                            return Column(
                              children: [
                                radiusField,
                                const SizedBox(height: 12),
                                accuracyField,
                              ],
                            );
                          }
                          return Row(
                            children: [
                              Expanded(child: radiusField),
                              const SizedBox(width: 12),
                              Expanded(child: accuracyField),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                      _smartField(
                        icon: Icons.phone_rounded,
                        child: Row(
                          children: [
                            SizedBox(
                              width: 120,
                              child: DropdownButtonFormField<String>(
                                initialValue: _countryCode,
                                decoration: const InputDecoration(
                                  labelText: 'Pays',
                                  border: OutlineInputBorder(),
                                ),
                                items: countryCodes
                                    .map(
                                      (entry) => DropdownMenuItem(
                                        value: entry.$2,
                                        child: Text('${entry.$1} ${entry.$2}'),
                                      ),
                                    )
                                    .toList(),
                                onChanged: _saving
                                    ? null
                                    : (value) => setState(
                                        () => _countryCode = value ?? '+229',
                                      ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _whatsLocal,
                                enabled: !_saving,
                                keyboardType: TextInputType.phone,
                                decoration: InputDecoration(
                                  labelText: 'WhatsApp du responsable',
                                  hintText: 'Ex: 99129919',
                                  helperText:
                                      'Le numéro complet sera enregistré en $_countryCode',
                                  border: const OutlineInputBorder(),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile(
                        value: _requireGeolocation,
                        onChanged: _saving
                            ? null
                            : (value) =>
                                  setState(() => _requireGeolocation = value),
                        activeThumbColor: green,
                        title: const Text('Exiger le GPS'),
                        subtitle: const Text(
                          'Le pointage sera refusé si la position est absente.',
                        ),
                      ),
                      SwitchListTile(
                        value: _requireEmployeeCode,
                        onChanged: _saving
                            ? null
                            : (value) =>
                                  setState(() => _requireEmployeeCode = value),
                        activeThumbColor: green,
                        title: const Text('Exiger le matricule'),
                      ),
                      SwitchListTile(
                        value: _requirePin,
                        onChanged: _saving
                            ? null
                            : (value) => setState(() => _requirePin = value),
                        activeThumbColor: green,
                        title: const Text('Exiger le PIN à 4 chiffres'),
                      ),
                      SwitchListTile(
                        value: _active,
                        onChanged: _saving
                            ? null
                            : (value) => setState(() => _active = value),
                        activeThumbColor: green,
                        title: const Text('Site actif'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save_outlined),
                    label: Text(
                      widget.site == null ? 'Créer le site' : 'Enregistrer',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
