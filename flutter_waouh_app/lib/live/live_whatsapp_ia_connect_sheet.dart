import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_action_sheets.dart';
import 'live_whatsapp_ia_connect_service.dart';
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';

/// A guided WAHA connection sheet: state timeline, QR, eight-digit code and
/// raw diagnostic only when the user requests it.
Future<void> showNativeWhatsAppConnectionSheet(
  BuildContext context, {
  required String sessionName,
  required LiveWhatsAppIaRepository repository,
  required Future<void> Function() onConnected,
}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NativeConnectionSheet(
        sessionName: sessionName,
        repository: repository,
        onConnected: onConnected,
      ),
    );

class _NativeConnectionSheet extends StatefulWidget {
  const _NativeConnectionSheet({
    required this.sessionName,
    required this.repository,
    required this.onConnected,
  });

  final String sessionName;
  final LiveWhatsAppIaRepository repository;
  final Future<void> Function() onConnected;

  @override
  State<_NativeConnectionSheet> createState() => _NativeConnectionSheetState();
}

class _NativeConnectionSheetState extends State<_NativeConnectionSheet> {
  late final LiveWhatsAppIaConnectService _connect =
      LiveWhatsAppIaConnectService(LiveWhatsAppIaRepository(legacy.supabase));
  final _phone = TextEditingController();
  Timer? _poll;
  Timer? _countdown;
  Timer? _elapsed;
  String _mode = 'qr';
  String _stage = 'Création de la connexion';
  String? _qr;
  String? _pairCode;
  int _seconds = 0;
  int _elapsedSeconds = 0;
  String? _error;
  bool _busy = false;
  bool _connected = false;

  @override
  void initState() {
    super.initState();
    _loadQr();
    _poll =
        Timer.periodic(const Duration(seconds: 4), (_) => _checkConnection());
    _elapsed = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && !_connected) setState(() => _elapsedSeconds++);
    });
  }

  @override
  void dispose() {
    _phone.dispose();
    _poll?.cancel();
    _countdown?.cancel();
    _elapsed?.cancel();
    super.dispose();
  }

  Future<void> _loadQr() async {
    setState(() {
      _busy = true;
      _error = null;
      _stage = 'Démarrage WAHA';
    });
    try {
      try {
        await widget.repository.start(widget.sessionName);
      } catch (_) {
        // A running WAHA session can reject a duplicate start. We still ask for QR.
      }
      if (mounted) setState(() => _stage = 'Génération du QR Code');
      final value = await _connect.fetchQr(widget.sessionName);
      if (mounted) {
        setState(() {
          _qr = value;
          _stage = 'QR Code disponible';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _stage = 'QR indisponible';
          _error = _friendlyError('$error');
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkConnection() async {
    if (_connected) return;
    try {
      final dashboard = await widget.repository.load();
      final found =
          dashboard.sessions.where((item) => item.name == widget.sessionName);
      final session = found.isEmpty ? null : found.first;
      if (session?.isWorking == true && mounted) {
        setState(() {
          _connected = true;
          _stage = 'WhatsApp connecté';
        });
        _elapsed?.cancel();
        await widget.onConnected();
      }
    } catch (_) {
      // The explicit retry actions remain available even while remote status is down.
    }
  }

  Future<void> _getPairCode() async {
    setState(() {
      _busy = true;
      _error = null;
      _stage = 'Génération du code de liaison';
    });
    try {
      final value = await _connect.pairingCode(
        sessionName: widget.sessionName,
        phone: _phone.text,
      );
      if (!mounted) return;
      setState(() {
        _pairCode = value.code;
        _seconds = value.expiresIn;
        _stage = 'Code de liaison disponible';
      });
      _countdown?.cancel();
      _countdown = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted || _seconds <= 0) {
          _countdown?.cancel();
          return;
        }
        setState(() => _seconds--);
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          _stage = 'Code indisponible';
          _error = _friendlyError('$error');
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => WhatsAppSheetFrame(
        title: 'Connecter WhatsApp',
        child: _connected
            ? _Success(sessionName: widget.sessionName)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _ConnectionTimeline(
                    stage: _stage,
                    qrReady: _qr != null,
                    connected: _connected,
                    elapsedSeconds: _elapsedSeconds,
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F6F3),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: <Widget>[
                        _TabButton(
                          label: 'QR code',
                          icon: Icons.qr_code_rounded,
                          active: _mode == 'qr',
                          onTap: () => setState(() => _mode = 'qr'),
                        ),
                        _TabButton(
                          label: 'Code à 8 chiffres',
                          icon: Icons.key_rounded,
                          active: _mode == 'code',
                          onTap: () => setState(() => _mode = 'code'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (_mode == 'qr') _qrView() else _codeView(),
                ],
              ),
      );

  Widget _qrView() => Column(
        children: <Widget>[
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 285),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FFFC),
              border: Border.all(color: const Color(0xFFBEE6D4), width: 1.5),
              borderRadius: BorderRadius.circular(22),
            ),
            child: _busy
                ? _QrLoading(stage: _stage)
                : _qr == null
                    ? _QrUnavailable(message: _error ?? 'QR indisponible')
                    : _QrVisual(value: _qr!),
          ),
          const SizedBox(height: 14),
          const _StepBox(
            title: 'Comment scanner',
            steps: <String>[
              'Ouvrez WhatsApp sur votre téléphone',
              'Menu → Appareils connectés',
              'Touchez « Connecter un appareil »',
              'Scannez ce QR Code',
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy ? null : _loadQr,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Relancer WAHA et régénérer le QR'),
            ),
          ),
          if (_error != null) ...<Widget>[
            const SizedBox(height: 8),
            _DiagnosticDetails(message: _error!),
          ],
        ],
      );

  Widget _codeView() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'Numéro WhatsApp à lier',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _phone,
            enabled: !_busy && _pairCode == null,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.phone_android_rounded),
              hintText: '+229 90 00 00 00',
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Saisissez le numéro international du compte à connecter.',
            style: TextStyle(color: Color(0xFF6B8279), fontSize: 12.5),
          ),
          const SizedBox(height: 16),
          if (_pairCode == null)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _busy ? null : _getPairCode,
                icon: _busy
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.key_rounded),
                label: const Text('Obtenir le code'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: const Color(0xFF08756A),
                ),
              ),
            )
          else
            _PairCode(
              value: _pairCode!,
              seconds: _seconds,
              onRefresh: _getPairCode,
            ),
          if (_error != null) ...<Widget>[
            const SizedBox(height: 12),
            _DiagnosticDetails(message: _error!),
          ],
        ],
      );
}

class _ConnectionTimeline extends StatelessWidget {
  const _ConnectionTimeline({
    required this.stage,
    required this.qrReady,
    required this.connected,
    required this.elapsedSeconds,
  });

  final String stage;
  final bool qrReady;
  final bool connected;
  final int elapsedSeconds;

  @override
  Widget build(BuildContext context) {
    final ready = qrReady || connected;
    final step = connected
        ? 4
        : ready
            ? 3
            : 2;
    const labels = <String>[
      'Session créée',
      'WAHA démarré',
      'QR disponible',
      'WhatsApp connecté',
    ];
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FAF8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDDEBE4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.sync_rounded,
                  color: Color(0xFF08756A), size: 18),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  stage,
                  style: const TextStyle(
                    color: Color(0xFF16231F),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '${elapsedSeconds ~/ 60}:${(elapsedSeconds % 60).toString().padLeft(2, '0')}',
                style:
                    const TextStyle(color: Color(0xFF62756D), fontSize: 11.5),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List<Widget>.generate(labels.length, (index) {
              final complete = index < step;
              final active = index == step - 1 && !connected;
              return Expanded(
                child: Column(
                  children: <Widget>[
                    Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: complete
                            ? const Color(0xFF08756A)
                            : const Color(0xFFE4ECE8),
                        shape: BoxShape.circle,
                      ),
                      child: complete && !active
                          ? const Icon(Icons.check_rounded,
                              color: Colors.white, size: 14)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: complete
                                    ? Colors.white
                                    : const Color(0xFF7C8D86),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      labels[index],
                      maxLines: 2,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Color(0xFF62756D), fontSize: 9.5, height: 1.1),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _QrLoading extends StatelessWidget {
  const _QrLoading({required this.stage});
  final String stage;
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const SizedBox(
              width: 38,
              height: 38,
              child: CircularProgressIndicator(color: Color(0xFF08756A)),
            ),
            const SizedBox(height: 14),
            Text(stage, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            const Text(
              'La génération peut prendre quelques secondes.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF62756D), fontSize: 12.5),
            ),
          ],
        ),
      );
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(11),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: active ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(
                  icon,
                  size: 17,
                  color: active
                      ? const Color(0xFF08756A)
                      : const Color(0xFF6B8279),
                ),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: active
                          ? const Color(0xFF075E54)
                          : const Color(0xFF6B8279),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _QrVisual extends StatelessWidget {
  const _QrVisual({required this.value});
  final String value;

  @override
  Widget build(BuildContext context) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return Center(
          child: Image.network(value,
              width: 245, height: 245, fit: BoxFit.contain));
    }
    try {
      final raw = value.contains(',') ? value.split(',').last : value;
      final bytes = base64Decode(raw.replaceAll(RegExp(r'\s+'), ''));
      return Center(
          child: Image.memory(Uint8List.fromList(bytes),
              width: 245, height: 245, fit: BoxFit.contain));
    } catch (_) {
      return const _QrUnavailable(
          message: 'Format QR non reconnu. Régénérez le code.');
    }
  }
}

class _QrUnavailable extends StatelessWidget {
  const _QrUnavailable({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.qr_code_2_rounded,
                size: 62, color: Color(0xFF6B8279)),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF6B8279), height: 1.3)),
          ],
        ),
      );
}

class _StepBox extends StatelessWidget {
  const _StepBox({required this.title, required this.steps});
  final String title;
  final List<String> steps;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF5FAF8),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 7),
            ...steps.asMap().entries.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '${item.key + 1}. ${item.value}',
                      style: const TextStyle(
                          color: Color(0xFF5C746B), fontSize: 12.5),
                    ),
                  ),
                ),
          ],
        ),
      );
}

class _PairCode extends StatelessWidget {
  const _PairCode(
      {required this.value, required this.seconds, required this.onRefresh});
  final String value;
  final int seconds;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF9F2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFBEE6D4)),
        ),
        child: Column(
          children: <Widget>[
            const Text('Votre code à 8 chiffres',
                style: TextStyle(
                    color: Color(0xFF08756A), fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            SelectableText(value,
                style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 5,
                    color: Color(0xFF075E54))),
            const SizedBox(height: 8),
            Text(
                'Expire dans ${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}',
                style: const TextStyle(color: Color(0xFF5C746B))),
            const SizedBox(height: 14),
            const _StepBox(title: 'Sur votre téléphone', steps: <String>[
              'Ouvrez WhatsApp',
              'Appareils liés → Lier un appareil',
              'Choisissez « Lier avec un numéro »',
              'Saisissez le code affiché',
            ]),
            const SizedBox(height: 12),
            OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Régénérer le code')),
          ],
        ),
      );
}

class _DiagnosticDetails extends StatelessWidget {
  const _DiagnosticDetails({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7E6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFF0D69A)),
        ),
        child: Text(
          message,
          style: const TextStyle(
              color: Color(0xFF705E35), fontSize: 12, height: 1.3),
        ),
      );
}

class _Success extends StatelessWidget {
  const _Success({required this.sessionName});
  final String sessionName;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(30),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF9F2),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFC5EBD9)),
        ),
        child: Column(
          children: <Widget>[
            const Icon(Icons.check_circle_rounded,
                color: Color(0xFF159B65), size: 56),
            const SizedBox(height: 12),
            const Text('WhatsApp est connecté',
                style: TextStyle(
                    color: Color(0xFF08756A),
                    fontWeight: FontWeight.w900,
                    fontSize: 19)),
            const SizedBox(height: 6),
            Text(
                'La ligne « $sessionName » peut maintenant recevoir des messages.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF476C61), height: 1.3)),
          ],
        ),
      );
}

String _friendlyError(String raw) {
  final lower = raw.toLowerCase();
  if (lower.contains('credentials') || lower.contains('dashboard')) {
    return 'WAHA ne peut pas s’authentifier. Vérifiez les secrets WAHA_DASHBOARD_USERNAME et WAHA_DASHBOARD_PASSWORD dans Supabase.';
  }
  if (lower.contains('permission')) {
    return 'Votre compte n’a pas la permission de gérer cette session WhatsApp.';
  }
  if (lower.contains('qr fetch failed')) {
    return 'WAHA a démarré mais ne retourne pas encore de QR Code. Relancez WAHA puis réessayez.';
  }
  return raw.replaceFirst('LiveWhatsAppIaException: ', '');
}
