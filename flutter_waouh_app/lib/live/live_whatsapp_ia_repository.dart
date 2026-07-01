import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaRepository {
  LiveWhatsAppIaRepository(this.client) : gateway = LiveWhatsAppIaGateway(client);

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
        .map((row) => LiveWhatsAppSession.fromDatabase(Map<String, dynamic>.from(row)))
        .where((item) => item.name.isNotEmpty)
        .toList();

    List<LiveWhatsAppSession> remote = const [];
    String? remoteError;
    try {
      final raw = await gateway.request(path: '/api/sessions');
      final source = raw is List ? raw : gateway.map(raw)['sessions'];
      remote = gateway.rows(source)
          .map(LiveWhatsAppSession.fromWaha)
          .where((item) => item.name.isNotEmpty)
          .toList();
    } catch (error) {
      remoteError = '$error';
    }

    // Do not expose other WAHA sessions. A session has to be registered to the
    // current user before Flutter displays it.
    final allowed = local.map((item) => item.name).toSet();
    final merged = <String, LiveWhatsAppSession>{for (final item in local) item.name: item};
    for (final item in remote) {
      if (!allowed.contains(item.name)) continue;
      final previous = merged[item.name];
      merged[item.name] = LiveWhatsAppSession(
        name: item.name,
        status: item.status,
        phone: item.phone ?? previous?.phone,
        createdAt: previous?.createdAt,
      );
    }
    final sessions = merged.values.toList()
      ..sort((a, b) => (b.createdAt ?? DateTime(1970)).compareTo(a.createdAt ?? DateTime(1970)));
    return LiveWhatsAppDashboard(sessions: sessions, remoteError: remoteError);
  }

  Future<LiveWhatsAppSession> create(String rawName) async {
    final raw = rawName.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    final name = raw.length > 30 ? raw.substring(0, 30) : raw;
    if (name.isEmpty) {
      throw const LiveWhatsAppIaException('Nom de session invalide.');
    }
    await gateway.request(path: '/api/sessions', method: 'POST', body: {'name': name});
    await client.from('whatsapp_accounts').upsert({
      'user_id': gateway.user.id,
      'session_name': name,
      'status': 'DISCONNECTED',
    }, onConflict: 'user_id,session_name');
    return LiveWhatsAppSession(name: name, status: 'DISCONNECTED');
  }

  Future<void> start(String name) async {
    await gateway.request(path: '/api/sessions/$name/start', method: 'POST');
    await _status(name, 'STARTING');
  }

  Future<void> stop(String name) async {
    await gateway.request(path: '/api/sessions/$name/stop', method: 'POST');
    await _status(name, 'STOPPED');
  }

  Future<void> delete(String name) async {
    try {
      await gateway.request(path: '/api/sessions/$name', method: 'DELETE');
    } finally {
      await client
          .from('whatsapp_accounts')
          .delete()
          .eq('user_id', gateway.user.id)
          .eq('session_name', name);
    }
  }

  Future<void> _status(String name, String status) => client
      .from('whatsapp_accounts')
      .update({'status': status})
      .eq('user_id', gateway.user.id)
      .eq('session_name', name);
}
