import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_widgets.dart';

class LiveOtpException implements Exception {
  const LiveOtpException(this.message);
  final String message;
  @override
  String toString() => message;
}

class LiveWhatsAppOtpService {
  const LiveWhatsAppOtpService(this.client);
  final SupabaseClient client;

  String normalizePhone(String raw) {
    final compact = raw.replaceAll(RegExp(r'[^0-9+]'), '');
    if (compact.startsWith('+')) return compact;
    if (compact.startsWith('229')) return '+$compact';
    return '+229$compact';
  }

  Future<void> request(String phone) async {
    final normalized = normalizePhone(phone);
    if (normalized.replaceAll(RegExp(r'[^0-9]'), '').length < 11) {
      throw const LiveOtpException('Saisissez un numero WhatsApp valide.');
    }
    try {
      final response = await client.functions.invoke(
        'whatsapp-otp-send',
        body: {'phone': normalized},
      );
      final data = _map(response.data);
      if (data['ok'] != true || data['error'] != null) {
        throw LiveOtpException(_message(data['error']?.toString()));
      }
      final warning = data['warn']?.toString();
      if (warning == 'send_failed') {
        throw const LiveOtpException('Le code ne peut pas etre envoye sur WhatsApp pour le moment. Reessayez dans quelques instants.');
      }
      if (warning == 'waha_not_configured') {
        throw const LiveOtpException('Le canal WhatsApp de verification est temporairement indisponible.');
      }
    } on FunctionException catch (error) {
      throw LiveOtpException(_message(_code(error.details)));
    }
  }

  Future<bool> verify({required String phone, required String code}) async {
    final normalized = normalizePhone(phone);
    final cleanCode = code.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleanCode.length != 6) {
      throw const LiveOtpException('Saisissez le code a 6 chiffres recu sur WhatsApp.');
    }
    try {
      final response = await client.functions.invoke(
        'whatsapp-otp-verify',
        body: {
          'phone': normalized,
          'code': cleanCode,
          'otp': cleanCode,
        },
      );
      final data = _map(response.data);
      if (data['ok'] != true || data['error'] != null) {
        throw LiveOtpException(_message(data['error']?.toString()));
      }
      final email = data['email']?.toString();
      final token = data['email_otp']?.toString();
      if (email == null || email.isEmpty || token == null || token.isEmpty) {
        throw const LiveOtpException('Verification incomplete. Demandez un nouveau code.');
      }
      await client.auth.verifyOTP(email: email, token: token, type: OtpType.magiclink);
      return data['is_new_user'] == true;
    } on FunctionException catch (error) {
      throw LiveOtpException(_message(_code(error.details)));
    }
  }

  Future<void> completeProfile({required String fullName, String? email}) async {
    if (fullName.trim().length < 2) {
      throw const LiveOtpException('Indiquez votre nom complet.');
    }
    try {
      final response = await client.functions.invoke('whatsapp-complete-profile', body: {
        'full_name': fullName.trim(),
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      });
      final data = _map(response.data);
      if (data['error'] != null) throw LiveOtpException(_message(data['error']?.toString()));
    } on FunctionException catch (error) {
      throw LiveOtpException(_message(_code(error.details)));
    }
  }

  Map<String, dynamic> _map(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : const {};

  String? _code(dynamic details) {
    if (details is Map) return details['error']?.toString();
    try {
      final decoded = jsonDecode(details?.toString() ?? '');
      return decoded is Map ? decoded['error']?.toString() : null;
    } catch (_) {
      return details?.toString();
    }
  }

  String _message(String? code) => switch (code) {
    'no_code' => 'Aucun code actif pour ce numero. Demandez un nouveau code.',
    'expired' => 'Ce code a expire. Demandez-en un nouveau.',
    'invalid_code' => 'Code incorrect. Verifiez les 6 chiffres puis reessayez.',
    'too_many_attempts' => 'Trop de tentatives. Demandez un nouveau code.',
    'phone required' || 'invalid phone' => 'Numero WhatsApp invalide.',
    _ => 'Verification WhatsApp impossible. Reessayez.',
  };
}

class LiveWhatsAppOtpScreenV2 extends StatefulWidget {
  const LiveWhatsAppOtpScreenV2({super.key});

  @override
  State<LiveWhatsAppOtpScreenV2> createState() => _LiveWhatsAppOtpScreenV2State();
}

class _LiveWhatsAppOtpScreenV2State extends State<LiveWhatsAppOtpScreenV2> {
  final phone = TextEditingController(text: '+229');
  final code = TextEditingController();
  final fullName = TextEditingController();
  final recoveryEmail = TextEditingController();
  Timer? timer;
  int secondsLeft = 0;
  bool sent = false;
  bool isNewUser = false;
  bool loading = false;

  @override
  void dispose() {
    timer?.cancel();
    phone.dispose();
    code.dispose();
    fullName.dispose();
    recoveryEmail.dispose();
    super.dispose();
  }

  LiveWhatsAppOtpService get _service => LiveWhatsAppOtpService(legacy.supabase);

  Future<void> _send() async {
    setState(() => loading = true);
    try {
      await _service.request(phone.text);
      if (!mounted) return;
      setState(() { sent = true; isNewUser = false; secondsLeft = 300; });
      _startTimer();
      _message('Code envoye sur WhatsApp. Il expire dans 5 minutes.', success: true);
    } catch (error) {
      _message(error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _verify() async {
    if (!sent) {
      _message('Demandez d abord un code WhatsApp.');
      return;
    }
    setState(() => loading = true);
    try {
      final fresh = await _service.verify(phone: phone.text, code: code.text);
      if (!mounted) return;
      if (fresh) {
        setState(() => isNewUser = true);
      } else {
        context.go(_next(context) ?? '/app/chat');
      }
    } catch (error) {
      _message(error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _complete() async {
    setState(() => loading = true);
    try {
      await _service.completeProfile(fullName: fullName.text, email: recoveryEmail.text);
      if (mounted) context.go(_next(context) ?? '/app/chat');
    } catch (error) {
      _message(error.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _startTimer() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || secondsLeft <= 0) {
        timer?.cancel();
        return;
      }
      setState(() => secondsLeft--);
    });
  }

  String? _next(BuildContext context) {
    try {
      return GoRouterState.of(context).uri.queryParameters['next'];
    } catch (_) {
      return null;
    }
  }

  void _message(String value, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      backgroundColor: success ? WaouhPalette.green : WaouhPalette.ink,
      content: Text(value),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final codeStep = sent && !isNewUser;
    final profileStep = sent && isNewUser;
    final label = !sent ? 'Recevoir le code' : profileStep ? 'Finaliser le profil' : 'Verifier';
    final action = !sent ? _send : profileStep ? _complete : _verify;
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(title: 'WhatsApp', subtitle: 'Verification securisee', back: true),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 42),
        children: [
          Container(
            height: 96,
            alignment: Alignment.center,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFE4FFF0)),
            child: const Icon(Icons.chat_rounded, size: 46, color: Color(0xFF25D366)),
          ),
          const SizedBox(height: 24),
          Text(
            !sent ? 'Connectez-vous avec WhatsApp' : profileStep ? 'Bienvenue dans WaouhApp' : 'Code recu sur WhatsApp',
            textAlign: TextAlign.center,
            style: WaouhText.h1.copyWith(fontSize: 25),
          ),
          const SizedBox(height: 10),
          Text(
            !sent
                ? 'Nous envoyons un code unique a six chiffres sur votre numero WhatsApp.'
                : profileStep
                    ? 'Ajoutez votre nom pour terminer la creation du compte.'
                    : 'Saisissez le code a 6 chiffres. Ne le partagez avec personne.',
            textAlign: TextAlign.center,
            style: WaouhText.body.copyWith(color: WaouhPalette.muted),
          ),
          const SizedBox(height: 28),
          if (!sent) TextField(
            controller: phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Numero WhatsApp', prefixIcon: Icon(Icons.phone_outlined)),
          ),
          if (codeStep) ...[
            Text('+${_service.normalizePhone(phone.text).replaceFirst('+', '')}', textAlign: TextAlign.center, style: WaouhText.bodyStrong),
            const SizedBox(height: 18),
            TextField(
              controller: code,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 29, fontWeight: FontWeight.w900, letterSpacing: 9),
              decoration: const InputDecoration(counterText: '', hintText: '000000'),
              onSubmitted: (_) => _verify(),
            ),
            const SizedBox(height: 8),
            Text(
              secondsLeft > 0 ? 'Code valide encore ${secondsLeft ~/ 60}:${(secondsLeft % 60).toString().padLeft(2, '0')}' : 'Le code a expire.',
              textAlign: TextAlign.center,
              style: WaouhText.caption,
            ),
            TextButton(
              onPressed: loading || secondsLeft > 0 ? null : _send,
              child: const Text('Renvoyer un code'),
            ),
          ],
          if (profileStep) ...[
            TextField(controller: fullName, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nom complet *', prefixIcon: Icon(Icons.person_outline))),
            const SizedBox(height: 14),
            TextField(controller: recoveryEmail, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email de recuperation (facultatif)', prefixIcon: Icon(Icons.mail_outline))),
          ],
          if (auth.error != null) ...[
            const SizedBox(height: 12),
            Text(auth.error!, textAlign: TextAlign.center, style: WaouhText.caption.copyWith(color: WaouhPalette.red)),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: loading ? null : action,
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
              child: loading ? const CircularProgressIndicator(color: Colors.white) : Text(label),
            ),
          ),
          if (sent && !profileStep) TextButton(
            onPressed: loading ? null : () => setState(() { sent = false; code.clear(); secondsLeft = 0; timer?.cancel(); }),
            child: const Text('Modifier le numero'),
          ),
        ],
      ),
    );
  }
}
