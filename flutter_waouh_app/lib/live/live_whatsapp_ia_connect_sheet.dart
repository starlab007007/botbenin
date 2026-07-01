import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_whatsapp_ia_action_sheets.dart';
import 'live_whatsapp_ia_connect_service.dart';
import 'live_whatsapp_ia_models.dart';
import 'live_whatsapp_ia_repository.dart';

Future<void> showNativeWhatsAppConnectionSheet(
  BuildContext context, {
  required String sessionName,
  required LiveWhatsAppIaRepository repository,
  required Future<void> Function() onConnected,
}) => showModalBottomSheet<void>(
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
      LiveWhatsAppIaConnectService(legacy.supabase);
  final _phone = TextEditingController();
  Timer? _poll;
  Timer? _countdown;
  String _mode = 'qr';
  String? _qr;
  String? _pairCode;
  int _seconds = 0;
  String? _error;
  bool _busy = false;
  bool _connected = false;

  @override
  void initState() {
    super.initState();
    _loadQr();
    _poll = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _checkConnection(),
    );
  }

  @override
  void dispose() {
    _phone.dispose();
    _poll?.cancel();
    _countdown?.cancel();
    super.dispose();
  }

  Future<void> _loadQr() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      try {
        await widget.repository.start(widget.sessionName);
      } catch (_) {
        // A running session may reject a duplicate start request.
      }
      final value = await _connect.fetchQr(widget.sessionName);
      if (mounted) setState(() => _qr = value);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkConnection() async {
    if (_connected) return;
    try {
      final dashboard = await widget.repository.load();
      LiveWhatsAppSession? found;
      for (final item in dashboard.sessions) {
        if (item.name == widget.sessionName) {
          found = item;
          break;
        }
      }
      if (found?.isWorking == true && mounted) {
        setState(() => _connected = true);
        await widget.onConnected();
      }
    } catch (_) {
      // Keep the connection flow open; the user can retry manually.
    }
  }

  Future<void> _getPairCode() async {
    setState(() {
      _busy = true;
      _error = null;
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
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => WhatsAppSheetFrame(
        title: 'Connecter WhatsApp IA',
        child: _connected
            ? _Success(sessionName: widget.sessionName)
            : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F6F3),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(children: [
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
                  ]),
                ),
                const SizedBox(height: 18),
                if (_mode == 'qr') _qrView() else _codeView(),
              ]),
      );

  Widget _qrView() => Column(children: [
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
              ? const Center(child: CircularProgressIndicator())
              : _qr == null
                  ? _QrUnavailable(message: _error ?? 'QR indisponible')
                  : _QrVisual(value: _qr!),
        ),
        const SizedBox(height: 14),
        const _StepBox(
          title: 'Comment scanner',
          steps: [
            'Ouvrez WhatsApp sur votre téléphone',
            'Menu → Appareils connectés',
            'Touchez « Connecter un appareil »',
            'Scannez ce code QR',
          ],
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _busy ? null : _loadQr,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Régénérer le QR'),
          ),
        ),
      ]);

  Widget _codeView() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Numéro WhatsApp à lier', style: TextStyle(fontWeight: FontWeight.w900)),
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
          _PairCode(value: _pairCode!, seconds: _seconds, onRefresh: _getPairCode),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!.replaceFirst('LiveWhatsAppIaException: ', ''),
            style: const TextStyle(color: Color(0xFFD94747)),
          ),
        ],
      ]);
}

class _TabButton extends StatelessWidget {
  const _TabButton({required this.label, required this.icon, required this.active, required this.onTap});
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
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(icon, size: 17, color: active ? const Color(0xFF08756A) : const Color(0xFF6B8279)),
              const SizedBox(width: 5),
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, color: active ? const Color(0xFF075E54) : const Color(0xFF6B8279), fontWeight: FontWeight.w900))),
            ]),
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
      return Center(child: Image.network(value, width: 245, height: 245, fit: BoxFit.contain));
    }
    try {
      final raw = value.contains(',') ? value.split(',').last : value;
      final bytes = base64Decode(raw.replaceAll(RegExp(r'\s+'), ''));
      return Center(child: Image.memory(Uint8List.fromList(bytes), width: 245, height: 245, fit: BoxFit.contain));
    } catch (_) {
      return const _QrUnavailable(message: 'Format QR non reconnu. Régénérez le code.');
    }
  }
}

class _QrUnavailable extends StatelessWidget {
  const _QrUnavailable({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.qr_code_2_rounded, size: 62, color: Color(0xFF6B8279)), const SizedBox(height: 12), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF6B8279)))]));
}

class _StepBox extends StatelessWidget {
  const _StepBox({required this.title, required this.steps});
  final String title;
  final List<String> steps;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFF5FAF8), borderRadius: BorderRadius.circular(16)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 7), ...steps.asMap().entries.map((item) => Padding(padding: const EdgeInsets.only(bottom: 4), child: Text('${item.key + 1}. ${item.value}', style: const TextStyle(color: Color(0xFF5C746B), fontSize: 12.5)))).toList()]));
}

class _PairCode extends StatelessWidget {
  const _PairCode({required this.value, required this.seconds, required this.onRefresh});
  final String value;
  final int seconds;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: const Color(0xFFEAF9F2), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFBEE6D4))), child: Column(children: [const Text('Votre code à 8 chiffres', style: TextStyle(color: Color(0xFF08756A), fontWeight: FontWeight.w900)), const SizedBox(height: 10), SelectableText(value, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: 5, color: Color(0xFF075E54))), const SizedBox(height: 8), Text('Expire dans ${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}', style: const TextStyle(color: Color(0xFF5C746B))), const SizedBox(height: 14), const _StepBox(title: 'Sur votre téléphone', steps: ['Ouvrez WhatsApp', 'Appareils liés → Lier un appareil', 'Choisissez « Lier avec un numéro »', 'Saisissez le code affiché']), const SizedBox(height: 12), OutlinedButton.icon(onPressed: onRefresh, icon: const Icon(Icons.refresh_rounded), label: const Text('Régénérer le code'))]));
}

class _Success extends StatelessWidget {
  const _Success({required this.sessionName});
  final String sessionName;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(30), decoration: BoxDecoration(color: const Color(0xFFEAF9F2), borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFC5EBD9))), child: Column(children: [const Icon(Icons.check_circle_rounded, color: Color(0xFF159B65), size: 62), const SizedBox(height: 12), const Text('Connexion réussie', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)), const SizedBox(height: 5), Text('La session $sessionName est active.', textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF4B7363))) ]));
}
