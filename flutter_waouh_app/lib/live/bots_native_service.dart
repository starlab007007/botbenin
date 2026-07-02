import 'package:supabase_flutter/supabase_flutter.dart';

import 'bots_native_models.dart';

class NativeBotsService {
  const NativeBotsService(this.client);
  final SupabaseClient client;

  User get user {
    final current = client.auth.currentUser;
    if (current == null) throw StateError('Connectez-vous pour gérer vos bots.');
    return current;
  }

  Future<NativeBotsDashboard> load() async {
    var owner = await client
        .from('bot_owners')
        .select('id,max_bots')
        .eq('user_id', user.id)
        .maybeSingle();
    owner ??= await client
        .from('bot_owners')
        .insert({'user_id': user.id, 'subscription_plan': 'free', 'max_bots': 10})
        .select('id,max_bots')
        .single();
    final rows = await client
        .from('bots')
        .select('id,name,description,webhook_url,is_active,public_chat_url,created_at')
        .eq('owner_id', owner['id'])
        .order('created_at', ascending: false);
    return NativeBotsDashboard(
      ownerId: '${owner['id']}',
      limit: (owner['max_bots'] as num?)?.toInt() ?? 10,
      items: (rows as List)
          .whereType<Map>()
          .map((row) => NativeBot.fromJson(Map<String, Object?>.from(row)))
          .toList(),
    );
  }

  Future<void> create({
    required NativeBotsDashboard dashboard,
    required String name,
    required String webhookUrl,
  }) async {
    final uri = Uri.tryParse(webhookUrl.trim());
    if (name.trim().isEmpty || uri == null || !uri.hasScheme || !uri.hasAuthority) {
      throw StateError('Nom et URL webhook valide requis.');
    }
    if (dashboard.items.length >= dashboard.limit) {
      throw StateError('Limite atteinte : ${dashboard.limit} bots maximum.');
    }
    final row = await client.from('bots').insert({
      'owner_id': dashboard.ownerId,
      'name': name.trim(),
      'description': 'Chatbot automatisé avec webhook personnalisé.',
      'webhook_url': webhookUrl.trim(),
      'api_key': '',
      'chat_title': '${name.trim()} Assistant',
      'chat_context': 'automation',
      'share_enabled': true,
      'is_active': true,
    }).select('id').single();
    final publicUrl = 'https://bot.bj/chat?bot=${row['id']}&context=automation&title=${Uri.encodeComponent('${name.trim()} Assistant')}';
    await client.from('bots').update({'public_chat_url': publicUrl}).eq('id', row['id']);
  }

  Future<void> toggle(NativeBot bot) async {
    await client.from('bots').update({'is_active': !bot.active}).eq('id', bot.id);
  }

  Future<void> delete(NativeBot bot) async {
    await client.from('bots').delete().eq('id', bot.id);
  }
}
