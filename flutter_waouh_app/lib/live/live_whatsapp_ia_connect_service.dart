import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaConnectService {
  LiveWhatsAppIaConnectService(this.client);

  final SupabaseClient client;

  Future<String> fetchQr({required String accountId}) async {
    final data = await _call({'action': 'qr', 'accountId': accountId});
    final nested = _map(data['data']);
    final candidate = data['qrCode'] ??
        data['qr'] ??
        nested['qr'] ??
        nested['base64'] ??
        nested['image'] ??
        nested['data'];
    if (candidate is String && candidate.trim().isNotEmpty) {
      return candidate.trim();
    }
    throw const LiveWhatsAppIaException('QR indisponible. Réessayez dans un instant.');
  }

  Future<LivePairCode> pairingCode({
    required String accountId,
    required String phone,
  }) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 8) {
      throw const LiveWhatsAppIaException(
        'Numéro invalide. Utilisez le format international, par exemple 22990000000.',
      );
    }

    final data = await _call({
      'action': 'pair-code',
      'accountId': accountId,
      'phoneNumber': digits,
    });
    final nested = _map(data['data']);
    final code = '${data['code'] ?? nested['code'] ?? nested['pairingCode'] ?? nested['pairCode'] ?? ''}'.trim();
    if (code.isEmpty) {
      throw const LiveWhatsAppIaException('Code de liaison introuvable.');
    }
    final rawExpiry =
        data['expires_in'] ?? nested['expires_in'] ?? nested['expiresIn'];
    final expires = rawExpiry is int ? rawExpiry : int.tryParse('$rawExpiry') ?? 300;
    return LivePairCode(code: code, expiresIn: expires);
  }

  Future<Map<String, dynamic>> _call(Map<String, dynamic> body) async {
    try {
      final response = await client.functions.invoke(
        'waha-session-manager',
        body: body,
      );
      final data = _map(response.data);
      if (data['success'] != true) {
        throw LiveWhatsAppIaException('${data['error'] ?? 'WAHA indisponible.'}');
      }
      return data;
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        error.details?.toString() ?? error.toString(),
      );
    }
  }

  Map<String, dynamic> _map(dynamic value) => value is Map
      ? Map<String, dynamic>.from(value)
      : const <String, dynamic>{};
}
