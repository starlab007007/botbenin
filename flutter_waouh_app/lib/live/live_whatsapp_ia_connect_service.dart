import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaConnectService {
  LiveWhatsAppIaConnectService(this.client) : gateway = LiveWhatsAppIaGateway(client);

  final SupabaseClient client;
  final LiveWhatsAppIaGateway gateway;

  Future<String> fetchQr(String sessionName) async {
    try {
      final response = await client.functions.invoke('waha-session-manager', body: {
        'action': 'qr',
        'sessionName': sessionName,
      });
      final root = gateway.map(response.data);
      final nested = gateway.map(root['data']);
      final candidate = root['qrCode'] ?? root['qr'] ?? nested['qr'] ?? nested['base64'] ?? nested['data'];
      if (candidate is String && candidate.trim().isNotEmpty) return candidate.trim();
      if (root['success'] == false) {
        throw LiveWhatsAppIaException('${root['error'] ?? 'QR indisponible.'}');
      }
    } catch (error) {
      if (error is LiveWhatsAppIaException) rethrow;
      // Dashboard proxy keeps compatibility with several WAHA QR APIs.
    }

    final raw = await gateway.request(path: '/api/$sessionName/auth/qr?format=image');
    final map = gateway.map(raw);
    final candidate = map['qr'] ?? map['base64'] ?? map['image'] ?? map['qrcode'] ?? map['data'];
    if (candidate is String && candidate.trim().isNotEmpty) return candidate.trim();
    throw const LiveWhatsAppIaException(
      'QR indisponible. Démarrez la session puis réessayez.',
    );
  }

  Future<LivePairCode> pairingCode({
    required String sessionName,
    required String phone,
  }) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 8) {
      throw const LiveWhatsAppIaException(
        'Numéro invalide. Utilisez le format international, par exemple 22990000000.',
      );
    }

    final response = await client.functions.invoke('waha-session-manager', body: {
      'action': 'pair-code',
      'sessionName': sessionName,
      'phoneNumber': digits,
    });
    final root = gateway.map(response.data);
    if (root['success'] != true) {
      throw LiveWhatsAppIaException(
        '${root['error'] ?? 'Code de liaison introuvable.'}',
      );
    }

    final nested = gateway.map(root['data']);
    final code = '${root['code'] ?? nested['code'] ?? nested['pairingCode'] ?? nested['pairCode'] ?? ''}'.trim();
    if (code.isEmpty) {
      throw const LiveWhatsAppIaException('Code de liaison introuvable.');
    }
    final rawExpiry = root['expires_in'] ?? nested['expires_in'] ?? nested['expiresIn'];
    final expires = rawExpiry is int
        ? rawExpiry
        : int.tryParse('$rawExpiry') ?? 300;
    return LivePairCode(code: code, expiresIn: expires);
  }
}
