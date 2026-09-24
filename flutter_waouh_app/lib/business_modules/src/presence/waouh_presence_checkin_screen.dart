import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_presence_models.dart';
import 'waouh_presence_repository.dart';

class WaouhPresenceCheckInScreen extends StatefulWidget {
  const WaouhPresenceCheckInScreen({
    super.key,
    required this.client,
    this.initialAction = WaouhPresenceAction.arrival,
  });

  final SupabaseClient client;
  final WaouhPresenceAction initialAction;

  @override
  State<WaouhPresenceCheckInScreen> createState() =>
      _WaouhPresenceCheckInScreenState();
}

class _WaouhPresenceCheckInScreenState
    extends State<WaouhPresenceCheckInScreen> {
  static const green = Color(0xFF076B5D);

  late final WaouhPresenceRepository _repository = WaouhPresenceRepository(
    widget.client,
  );
  late WaouhPresenceAction _action = widget.initialAction;
  final _scanner = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final _employeeCode = TextEditingController();
  final _pin = TextEditingController();

  bool _handling = false;
  bool _success = false;
  String? _message;
  String? _pendingPayload;
  WaouhPresenceQrPreview? _preview;

  @override
  void dispose() {
    _scanner.dispose();
    _employeeCode.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final raw = capture.barcodes
        .map((barcode) => barcode.rawValue?.trim())
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .firstOrNull;
    if (raw == null) return;
    await _prepare(raw);
  }

  Future<void> _prepare(String payload) async {
    if (_handling) return;
    setState(() {
      _handling = true;
      _success = false;
      _message = 'Lecture et validation du QR…';
    });
    await _scanner.stop();

    try {
      final preview = await _repository.previewQr(payload);
      if (!mounted) return;
      setState(() {
        _preview = preview;
        _pendingPayload = payload;
        _message = preview.identityRequired
            ? 'QR valide. Saisissez le matricule et le PIN pour ${_action.label.toLowerCase()}.'
            : 'QR valide. Vérification du GPS…';
      });
      if (!preview.identityRequired) {
        await _record();
      } else {
        setState(() => _handling = false);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _handling = false;
        _message = _clean(error);
      });
      await _scanner.start();
    }
  }

  Future<void> _record() async {
    final payload = _pendingPayload;
    if (payload == null) return;

    final preview = _preview;
    if (preview?.identityRequired == true) {
      if (preview!.requireEmployeeCode && _employeeCode.text.trim().isEmpty) {
        _notice('Saisissez votre matricule.');
        return;
      }
      if (preview.requirePin &&
          !RegExp(r'^\d{4}$').hasMatch(_pin.text.trim())) {
        _notice('Saisissez votre PIN à 4 chiffres.');
        return;
      }
    }

    try {
      setState(() {
        _handling = true;
        _message = 'Vérification du GPS…';
      });
      final position = await _position(
        required: preview?.requireGeolocation ?? true,
      );
      if (!mounted) return;
      setState(() => _message = 'Enregistrement de ${_action.label}…');

      final result = await _repository.record(
        qrPayload: payload,
        action: _action,
        latitude: position?.latitude ?? 0,
        longitude: position?.longitude ?? 0,
        accuracyMeters: position?.accuracy ?? 0,
        employeeCode: _employeeCode.text,
        pin: _pin.text,
      );
      if (!mounted) return;
      setState(() {
        _success = true;
        _message = result.message;
        _handling = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _handling = false;
        _success = false;
        _message = _clean(error);
      });
      await _scanner.start();
    }
  }

  Future<Position?> _position({required bool required}) async {
    if (!required) return null;
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw StateError('Activez le GPS du téléphone.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw StateError(
        'Autorisation GPS bloquée. Ouvrez les paramètres du téléphone.',
      );
    }
    if (permission == LocationPermission.denied) {
      throw StateError('Autorisation GPS requise.');
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
  }

  Future<void> _manual() async {
    final controller = TextEditingController();
    final payload = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Saisir le contenu du QR'),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Lien web court ou URL Supabase du QR',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Continuer'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (payload != null && payload.isNotEmpty) {
      await _prepare(payload);
    }
  }

  void _reset() {
    setState(() {
      _pendingPayload = null;
      _preview = null;
      _message = null;
      _success = false;
      _handling = false;
      _employeeCode.clear();
      _pin.clear();
    });
    _scanner.start();
  }

  void _notice(String value) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));
  }

  String _clean(Object error) => '$error'
      .replaceAll('StateError:', '')
      .replaceAll('Exception:', '')
      .trim();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        title: const Text('Scanner Présence QR'),
        actions: [
          IconButton(
            tooltip: 'Saisie manuelle',
            onPressed: _handling ? null : _manual,
            icon: const Icon(Icons.keyboard_alt_outlined),
          ),
          IconButton(
            tooltip: 'Lampe',
            onPressed: () => _scanner.toggleTorch(),
            icon: const Icon(Icons.flashlight_on_outlined),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _scanner, onDetect: _onDetect),
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white, width: 3),
              ),
            ),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: SafeArea(
              child: Container(
                margin: const EdgeInsets.all(12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.70),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: WaouhPresenceAction.values.map((action) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(action.label),
                          selected: _action == action,
                          onSelected: _handling
                              ? null
                              : (_) => setState(() => _action = action),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Container(
                margin: const EdgeInsets.all(14),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: (_success ? green : Colors.black).withValues(
                    alpha: 0.90,
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_preview != null)
                      Text(
                        _preview!.siteName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                    if (_preview != null) const SizedBox(height: 4),
                    if (_preview?.radiusMeters != null)
                      Text(
                        'Rayon autorisé : ${_preview!.radiusMeters} m',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      _message ??
                          'Cadrez le QR de présence ou saisissez le lien manuellement.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (_preview?.identityRequired == true && !_success) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _employeeCode,
                              enabled: !_handling,
                              textCapitalization: TextCapitalization.characters,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'Matricule',
                                labelStyle: const TextStyle(
                                  color: Colors.white70,
                                ),
                                filled: true,
                                fillColor: Colors.white12,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _pin,
                              enabled: !_handling,
                              obscureText: true,
                              maxLength: 4,
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'PIN',
                                counterText: '',
                                labelStyle: const TextStyle(
                                  color: Colors.white70,
                                ),
                                filled: true,
                                fillColor: Colors.white12,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _handling ? null : _record,
                          child: Text('Valider ${_action.label}'),
                        ),
                      ),
                    ],
                    if (_handling) ...[
                      const SizedBox(height: 10),
                      const CircularProgressIndicator(color: Colors.white),
                    ],
                    if (_success) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _reset,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Nouveau pointage'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text('Terminer'),
                            ),
                          ),
                        ],
                      ),
                    ] else if (_message != null &&
                        !_handling &&
                        _preview?.identityRequired != true) ...[
                      const SizedBox(height: 10),
                      OutlinedButton(
                        onPressed: _reset,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
