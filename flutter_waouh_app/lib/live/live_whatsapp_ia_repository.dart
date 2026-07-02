import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

/// Repositaire des sessions WAHA. Les actions principales passent par
/// `waha-session-manager` afin de centraliser l’authentification, les erreurs
/// WAHA et la persistance des états dans whatsapp_accounts.
class LiveWhatsAppIaRepository {
  LiveWhatsAppIaRepository(this.client)
      : gateway = LiveWhatsAppIaGateway(client);

  final SupabaseClient client;
  final LiveWhatsAppIaGateway gateway;

  Future<LiveWhatsAppDashboard> load() async {
    final user = gateway.user;
    final response = await client
        .from('whatsapp_accounts')
        .select('id,session_name,status,phone_number,created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    final local = (response as List)
        .whereType<Map>()
        .map((row) =>
            LiveWhatsAppSession.fromDatabase(Map<String, dynamic>.from(row)))
        .where((item) => item.name.isNotEmpty)
        .toList();

    String? remoteError;
    final refreshed = <String, LiveWhatsAppSession>{
      for (final item in local) item.name: item
    };
    for (final item in local) {
      try {
        final data = await _manager(action: 'status', sessionName: item.name);
        final raw = data['data'];
        final map = raw is Map
            ? Map<String, dynamic>.from(raw)
            : const <String, dynamic>{};
        refreshed[item.name] = LiveWhatsAppSession(
          name: item.name,
          status: '${map['status'] ?? item.status}',
          phone: _phoneFromWaha(map) ?? item.phone,
          createdAt: item.createdAt,
        );
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
    final raw = rawName.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    final name = raw.length > 30 ? raw.substring(0, 30) : raw;
    if (name.isEmpty) {
      throw const LiveWhatsAppIaException('Nom de session invalide.');
    }
    final data = await _manager(action: 'create', sessionName: name);
    final body = data['data'];
    final map = body is Map
        ? Map<String, dynamic>.from(body)
        : const <String, dynamic>{};
    return LiveWhatsAppSession(
      name: name,
      status: '${map['status'] ?? 'DISCONNECTED'}',
      phone: _phoneFromWaha(map),
    );
  }

  Future<void> start(String name) async {
    await _manager(action: 'start', sessionName: name);
  }

  Future<void> stop(String name) async {
    await _manager(action: 'stop', sessionName: name);
  }

  Future<void> delete(String name) async {
    await _manager(action: 'delete', sessionName: name);
  }

  Future<Map<String, dynamic>> _manager({
    required String action,
    required String sessionName,
  }) async {
    try {
      final response = await client.functions.invoke(
        'waha-session-manager',
        body: {'action': action, 'sessionName': sessionName},
      );
      final data = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      if (data['success'] != true) {
        throw LiveWhatsAppIaException(
            '${data['error'] ?? 'WAHA indisponible.'}');
      }
      return data;
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        error.details?.toString() ?? error.toString(),
      );
    }
  }

  String? _phoneFromWaha(Map<String, dynamic> row) {
    final config = row['config'] is Map
        ? Map<String, dynamic>.from(row['config'] as Map)
        : const <String, dynamic>{};
    final metadata = config['metadata'] is Map
        ? Map<String, dynamic>.from(config['metadata'] as Map)
        : const <String, dynamic>{};
    return metadata['phone_number']?.toString() ??
        metadata['account']?.toString() ??
        row['me']?['id']?.toString();
  }
}
