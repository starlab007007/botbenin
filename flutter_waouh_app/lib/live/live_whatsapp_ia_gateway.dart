import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppIaGateway {
  const LiveWhatsAppIaGateway(this.client);

  final SupabaseClient client;

  User get user {
    final value = client.auth.currentUser;
    if (value == null) {
      throw const LiveWhatsAppIaException(
        'Connectez-vous pour gérer vos sessions WhatsApp IA.',
      );
    }
    return value;
  }

  Future<dynamic> request({
    required String path,
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    user;
    final response = await client.functions
        .invoke('waha-dashboard-proxy', body: {
          'path': path,
          'method': method,
          if (body != null) 'body': body,
        })
        .timeout(const Duration(seconds: 30));
    final data = response.data;
    if (data is Map && data['error'] != null) {
      throw LiveWhatsAppIaException('${data['message'] ?? data['error']}');
    }
    return data;
  }

  Map<String, dynamic> map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : const <String, dynamic>{};

  List<Map<String, dynamic>> rows(dynamic value) => value is List
      ? value.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList()
      : const <Map<String, dynamic>>[];
}
