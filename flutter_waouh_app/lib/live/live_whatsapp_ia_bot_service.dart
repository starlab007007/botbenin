import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaBotService {
  LiveWhatsAppIaBotService(this.client)
      : gateway = LiveWhatsAppIaGateway(client);

  final SupabaseClient client;
  final LiveWhatsAppIaGateway gateway;

  Future<List<LiveWhatsAppBot>> listBots() async {
    final response =
        await client.from('bots').select('id,name,webhook_url').order('name');
    return (response as List)
        .whereType<Map>()
        .map((row) => LiveWhatsAppBot.fromJson(Map<String, dynamic>.from(row)))
        .where((item) => item.id.isNotEmpty)
        .toList();
  }

  Future<void> link({
    required String sessionName,
    required LiveWhatsAppBot bot,
  }) async {
    final raw = await gateway.request(path: '/api/sessions/$sessionName');
    final config = gateway.map(gateway.map(raw)['config']);
    final hooks = _hooks(config['webhooks']);
    final url = bot.webhookUrl?.trim().isNotEmpty == true
        ? bot.webhookUrl!.trim()
        : 'https://bot.bj/api/webhook/${bot.id}';
    if (!hooks.any((item) => item['url']?.toString() == url)) {
      hooks.add({
        'url': url,
        'events': [
          'message',
          'message.reaction',
          'message.status',
          'session.status'
        ],
        'hmac': false,
        'retries': 3,
      });
    }
    await gateway.request(
      path: '/api/sessions/$sessionName',
      method: 'PUT',
      body: {
        'name': sessionName,
        'config': {...config, 'webhooks': hooks}
      },
    );
  }

  Future<void> addWebhook({
    required String sessionName,
    required String value,
  }) async {
    final url = value.trim();
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
      throw const LiveWhatsAppIaException('Saisissez une URL webhook valide.');
    }
    final raw = await gateway.request(path: '/api/sessions/$sessionName');
    final config = gateway.map(gateway.map(raw)['config']);
    final hooks = _hooks(config['webhooks']);
    if (!hooks.any((item) => item['url']?.toString() == url)) {
      hooks.add({
        'url': url,
        'events': ['message', 'message.status', 'session.status'],
        'hmac': false,
        'retries': 3,
      });
    }
    await gateway.request(
      path: '/api/sessions/$sessionName',
      method: 'PUT',
      body: {
        'name': sessionName,
        'config': {...config, 'webhooks': hooks}
      },
    );
  }

  List<Map<String, dynamic>> _hooks(dynamic value) => value is List
      ? value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList()
      : <Map<String, dynamic>>[];
}
