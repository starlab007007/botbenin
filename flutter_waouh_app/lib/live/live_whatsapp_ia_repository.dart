import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaRepository {
  LiveWhatsAppIaRepository(this.client)
      : gateway = LiveWhatsAppIaGateway(client);

  final SupabaseClient client;
  final LiveWhatsAppIaGateway gateway;

  Future<LiveWhatsAppDashboard> load() async {
    final user = gateway.user;
    final response = await client
        .from('whatsapp_accounts')
        .select('id,session_name,waha_session_name,status,phone_number,created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    final local = (response as List)
        .whereType<Map>()
        .map((row) =>
            LiveWhatsAppSession.fromDatabase(Map<String, dynamic>.from(row)))
        .where((item) => item.id.isNotEmpty && item.name.isNotEmpty)
        .toList();

    String? remoteError;
    final refreshed = <String, LiveWhatsAppSession>{
      for (final item in local) item.id: item,
    };

    for (final item in local) {
      try {
        final data = await _manager(action: 'status', accountId: item.id);
        final account = _map(data['account']);
        if (account.isNotEmpty) {
          refreshed[item.id] = LiveWhatsAppSession.fromDatabase(account);
        }
      } catch (error) {
        remoteError ??= '$error';
      }
    }

    final sessions = refreshed.values.toList()
      ..sort((a, b) => (b.createdAt ?? DateTime(1970))
          .compareTo(a.createdAt ?? DateTime(1970)));
    return LiveWhatsAppDashboard(sessions: sessions, remoteError: remoteError);
  }

  Future<LiveWhatsAppSession> create(String rawName) async {
    final name = _displayName(rawName);
    if (name.isEmpty) {
      throw const LiveWhatsAppIaException('Nom de session invalide.');
    }

    final data = await _manager(action: 'create', displayName: name);
    final account = _map(data['account']);
    if (account.isEmpty) {
      throw const LiveWhatsAppIaException(
        'La session a été créée mais sa synchronisation est incomplète.',
      );
    }
    return LiveWhatsAppSession.fromDatabase(account);
  }

  Future<void> start(String accountId) async {
    await _manager(action: 'start', accountId: accountId);
  }

  Future<void> stop(String accountId) async {
    await _manager(action: 'stop', accountId: accountId);
  }

  Future<void> delete(String accountId) async {
    await _manager(action: 'delete', accountId: accountId);
  }

  Future<void> sendTest({
    required String accountId,
    required String phone,
    required String message,
  }) async {
    await _manager(
      action: 'send-test',
      accountId: accountId,
      phoneNumber: phone,
      message: message,
    );
  }

  Future<void> linkBot({
    required String accountId,
    required String botId,
  }) async {
    await _manager(action: 'link-bot', accountId: accountId, botId: botId);
  }

  Future<void> addWebhook({
    required String accountId,
    required String webhookUrl,
  }) async {
    await _manager(
      action: 'add-webhook',
      accountId: accountId,
      webhookUrl: webhookUrl,
    );
  }

  Future<Map<String, dynamic>> _manager({
    required String action,
    String? accountId,
    String? displayName,
    String? phoneNumber,
    String? message,
    String? botId,
    String? webhookUrl,
  }) async {
    try {
      final response = await client.functions.invoke(
        'waha-session-manager',
        body: {
          'action': action,
          if (accountId != null) 'accountId': accountId,
          if (displayName != null) 'displayName': displayName,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
          if (message != null) 'message': message,
          if (botId != null) 'botId': botId,
          if (webhookUrl != null) 'webhookUrl': webhookUrl,
        },
      );
      final data = _map(response.data);
      if (data['success'] != true) {
        throw LiveWhatsAppIaException(
          '${data['error'] ?? 'WAHA indisponible.'}',
        );
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

  String _displayName(String value) {
    final cleaned = value.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    return cleaned.length > 30 ? cleaned.substring(0, 30) : cleaned;
  }
}
