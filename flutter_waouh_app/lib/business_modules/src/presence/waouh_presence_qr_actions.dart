import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import 'waouh_presence_models.dart';
import 'waouh_presence_repository.dart';

class WaouhPresenceQrScreen extends StatefulWidget {
  const WaouhPresenceQrScreen({
    super.key,
    required this.repository,
    required this.site,
  });

  final WaouhPresenceRepository repository;
  final WaouhPresenceSite site;

  @override
  State<WaouhPresenceQrScreen> createState() => _WaouhPresenceQrScreenState();
}

class _WaouhPresenceQrScreenState extends State<WaouhPresenceQrScreen> {
  static const green = Color(0xFF076B5D);

  int _minutes = 60;
  int _useLimit = 500;
  WaouhPresenceQrToken? _token;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _generate();
  }

  Future<void> _generate() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await widget.repository.createQrToken(
        widget.site,
        validityMinutes: _minutes,
        useLimit: _useLimit,
      );
      if (!mounted) return;
      setState(() => _token = token);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _copy() async {
    final payload = _token?.payload;
    if (payload == null || payload.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: payload));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Lien public du QR copié.')));
  }

  Future<void> _share() async {
    final payload = _token?.payload;
    if (payload == null || payload.isEmpty) return;
    await Share.share(
      'QR de présence · ${widget.site.name}\n'
      'Scannez ce QR avec n’importe quel lecteur QR pour ouvrir la page web de pointage.\n\n'
      '$payload',
      subject: 'QR de présence · ${widget.site.name}',
    );
  }

  Future<Uint8List> _pdf() async {
    final token = _token;
    if (token == null) {
      throw StateError('QR indisponible.');
    }
    final document = pw.Document();
    document.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (_) => pw.Center(
          child: pw.Column(
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              pw.Text(
                'WAOUH · PRESENCE QR',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 20),
              pw.BarcodeWidget(
                barcode: pw.Barcode.qrCode(),
                data: token.payload,
                width: 260,
                height: 260,
              ),
              pw.SizedBox(height: 16),
              pw.Text(
                widget.site.name,
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Text('Rayon autorise : ${widget.site.radiusMeters} m'),
              pw.Text(
                'Expire le ${DateFormat('dd/MM/yyyy HH:mm').format(token.expiresAt.toLocal())}',
              ),
              pw.SizedBox(height: 10),
              pw.Text('Le QR ouvre une page web publique de pointage.'),
            ],
          ),
        ),
      ),
    );
    return document.save();
  }

  Future<void> _print() async {
    await Printing.layoutPdf(onLayout: (_) => _pdf());
  }

  Duration get _remaining {
    final expires = _token?.expiresAt;
    if (expires == null) return Duration.zero;
    final diff = expires.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  @override
  Widget build(BuildContext context) {
    final token = _token;
    final remaining = _remaining;
    final expires = token?.expiresAt;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F8F6),
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        title: const Text('QR de présence'),
        actions: [
          IconButton(
            onPressed: token == null ? null : _copy,
            icon: const Icon(Icons.copy_rounded),
          ),
          IconButton(
            onPressed: token == null ? null : _share,
            icon: const Icon(Icons.share_outlined),
          ),
          IconButton(
            onPressed: token == null ? null : _print,
            icon: const Icon(Icons.print_outlined),
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: const Color(0xFFDDE9E5)),
              ),
              child: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(60),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : _error != null
                  ? Column(
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 52,
                          color: Colors.redAccent,
                        ),
                        const SizedBox(height: 12),
                        Text('$_error', textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: _generate,
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Réessayer'),
                        ),
                      ],
                    )
                  : token == null
                  ? const Text('QR indisponible.')
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'QR public de présence',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAF5F2),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            'Ce QR ouvre une page web publique. Les employés peuvent scanner sans installer l’application. Le pointage ne sera validé que dans un rayon de ${widget.site.radiusMeters} m autour du site.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: green,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: QrImageView(
                            data: token.payload,
                            size: 280,
                            eyeStyle: const QrEyeStyle(
                              eyeShape: QrEyeShape.square,
                              color: green,
                            ),
                            dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: Color(0xFF10211C),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          widget.site.name,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        if (widget.site.address != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            widget.site.address!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF66736F)),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: remaining == Duration.zero
                                  ? const Color(0xFFFFECEC)
                                  : const Color(0xFFEAF5F2),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              remaining == Duration.zero
                                  ? 'QR expiré'
                                  : 'Expire dans '
                                        '${remaining.inMinutes.toString().padLeft(2, '0')}:'
                                        '${remaining.inSeconds.remainder(60).toString().padLeft(2, '0')}',
                              style: TextStyle(
                                color: remaining == Duration.zero
                                    ? Colors.redAccent
                                    : green,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        if (expires != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Expiration : ${DateFormat('dd/MM/yyyy HH:mm').format(expires.toLocal())}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF66736F)),
                          ),
                        ],
                        const SizedBox(height: 16),
                        SelectableText(
                          token.payload,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: green,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 16),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final compact = constraints.maxWidth < 420;
                            final durationField = DropdownButtonFormField<int>(
                              initialValue: _minutes,
                              decoration: const InputDecoration(
                                labelText: 'Durée',
                                border: OutlineInputBorder(),
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 15,
                                  child: Text('15 min'),
                                ),
                                DropdownMenuItem(
                                  value: 30,
                                  child: Text('30 min'),
                                ),
                                DropdownMenuItem(
                                  value: 60,
                                  child: Text('1 heure'),
                                ),
                                DropdownMenuItem(
                                  value: 240,
                                  child: Text('4 heures'),
                                ),
                                DropdownMenuItem(
                                  value: 720,
                                  child: Text('12 heures'),
                                ),
                              ],
                              onChanged: (value) =>
                                  setState(() => _minutes = value ?? 60),
                            );
                            final useLimitField = DropdownButtonFormField<int>(
                              initialValue: _useLimit,
                              decoration: const InputDecoration(
                                labelText: 'Utilisations',
                                border: OutlineInputBorder(),
                              ),
                              items: const [
                                DropdownMenuItem(value: 1, child: Text('1')),
                                DropdownMenuItem(value: 50, child: Text('50')),
                                DropdownMenuItem(
                                  value: 500,
                                  child: Text('500'),
                                ),
                                DropdownMenuItem(
                                  value: 5000,
                                  child: Text('5 000'),
                                ),
                              ],
                              onChanged: (value) =>
                                  setState(() => _useLimit = value ?? 500),
                            );

                            if (compact) {
                              return Column(
                                children: [
                                  durationField,
                                  const SizedBox(height: 12),
                                  useLimitField,
                                ],
                              );
                            }
                            return Row(
                              children: [
                                Expanded(child: durationField),
                                const SizedBox(width: 12),
                                Expanded(child: useLimitField),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _generate,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Générer un nouveau QR'),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
