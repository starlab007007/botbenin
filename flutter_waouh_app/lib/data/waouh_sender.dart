import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/local_identity.dart';
import '../domain/chat_models.dart';

class WaouhSender {
  WaouhSender(this._client, this._identity);

  final SupabaseClient _client;
  final LocalIdentity _identity;

  Future<void> sendMainMessage({
    required String text,
    required List<ChatAttachment> attachments,
    double? latitude,
    double? longitude,
    String city = '',
    Map<String, dynamic> meta = const {},
  }) async {
    if (text.trim().isEmpty && attachments.isEmpty) return;
    final result = await _client.functions.invoke('waouh-channel-in', body: {
      'channel': 'web',
      'sessionId': _identity.sessionId,
      'text': text.trim(),
      'attachments': attachments.map((item) => item.toJson()).toList(),
      'lat': latitude,
      'lng': longitude,
      'city': city.trim(),
      'authUserId': _client.auth.currentUser?.id,
      'meta': meta,
    });
    final data = result.data;
    if (data is Map && data['ok'] == false) {
      throw StateError((data['error'] ?? 'Envoi WAOUH impossible').toString());
    }
  }

  Future<void> sendConversationMessage(String conversationId, String text) async {
    if (text.trim().isEmpty) return;
    await _client.functions.invoke('waouh-operator-send', body: {
      'conversation_id': conversationId,
      'message': text.trim(),
      'auth_user_id': _client.auth.currentUser?.id,
      'source': 'flutter_native',
    });
  }
}
