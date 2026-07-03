import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaMobileRepository {
  LiveWhatsAppIaMobileRepository(this.client);

  final SupabaseClient client;

  User get _user {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const LiveWhatsAppIaException('Connectez-vous avant de gérer vos lignes.');
    }
    return user;
  }

  Future<LiveWhatsAppDashboard> load() async {
    final rows = await client
        .from('whatsapp_accounts')
        .select('session_name,status,phone_number,created_at')
        .eq('user_id', _user.id)
        .order('created_at', ascending: false);
    final sessions = <LiveWhatsAppSession>[];
    String? remoteError;
    for (final row in (rows as List).whereType<Map>()) {
      final local = LiveWhatsAppSession.fromDatabase(
        Map<String, dynamic>.from(row),
      );
      try {
        final current = await call('status', local.name);
        final data = current['data'] is Map
            ? Map<String, dynamic>.from(current['data'] as Map)
            : const <String, dynamic>{};
        sessions.add(LiveWhatsAppSession(
          name: local.name,
          status: '${data['status'] ?? local.status}',
          phone: _phone(data) ?? local.phone,
          createdAt: local.createdAt,
        ));
      } catch (error) {
        remoteError ??= readableError('$error');
        sessions.add(local);
      }
    }
    return LiveWhatsAppDashboard(sessions: sessions, remoteError: remoteError);
  }

  Future<LiveWhatsAppSession> create(String raw) async {
    final cleaned = raw.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    final name = cleaned.length > 30 ? cleaned.substring(0, 30) : cleaned;
    if (name.isEmpty) {
      throw const LiveWhatsAppIaException('Nom de ligne invalide.');
    }
    final response = await call('create', name);
    final data = response['data'] is Map
        ? Map<String, dynamic>.from(response['data'] as Map)
        : const <String, dynamic>{};
    return LiveWhatsAppSession(
      name: name,
      status: '${data['status'] ?? 'DISCONNECTED'}',
      phone: _phone(data),
    );
  }

  Future<void> start(String name) async {
    await call('start', name);
  }

  Future<void> stop(String name) async {
    await call('stop', name);
  }

  Future<void> delete(String name) async {
    await call('delete', name);
  }

  Future<String> qr(String name) async {
    final response = await call('qr', name);
    final value = '${response['qrCode'] ?? ''}'.trim();
    if (value.isEmpty) {
      throw const LiveWhatsAppIaException('QR indisponible. Relancez la ligne puis réessayez.');
    }
    return value;
  }

  Future<void> attachAgent(String name) async {
    await call('attach_ai', name);
  }

  Future<Map<String, dynamic>> call(String action, String sessionName) async {
    try {
      final response = await client.functions.invoke(
        'waha-session-mobile',
        body: <String, dynamic>{'action': action, 'sessionName': sessionName},
      );
      final data = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : const <String, dynamic>{};
      if (data['success'] != true) {
        throw LiveWhatsAppIaException(readableError('${data['error'] ?? ''}'));
      }
      return data;
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        readableError(error.details?.toString() ?? error.toString()),
      );
    }
  }

  String? _phone(Map<String, dynamic> data) {
    final metadata = data['config'] is Map &&
            (data['config'] as Map)['metadata'] is Map
        ? Map<String, dynamic>.from((data['config'] as Map)['metadata'] as Map)
        : const <String, dynamic>{};
    final me = data['me'] is Map
        ? Map<String, dynamic>.from(data['me'] as Map)
        : const <String, dynamic>{};
    return metadata['phone_number']?.toString() ??
        metadata['account']?.toString() ??
        me['id']?.toString();
  }
}

String readableError(String raw) {
  final text = raw.replaceFirst('LiveWhatsAppIaException: ', '').trim();
  final lower = text.toLowerCase();
  if (lower.contains('session_not_owned')) return 'Cette ligne ne vous appartient pas.';
  if (lower.contains('permission refus') || lower.contains('permission refusée')) return 'Connexion WAHA refusée. Réessayez dans un instant.';
  if (lower.contains('qr_unavailable') || lower.contains('qr indisponible')) return 'QR indisponible. Relancez la ligne puis réessayez.';
  if (lower.contains('session_name_taken')) return 'Ce nom de ligne est déjà utilisé.';
  return text.isEmpty ? 'WAHA est momentanément indisponible.' : text;
}
