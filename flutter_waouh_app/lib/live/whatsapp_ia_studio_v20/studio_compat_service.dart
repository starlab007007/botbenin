import 'package:supabase_flutter/supabase_flutter.dart';

class StudioSession {
  const StudioSession({
    required this.id,
    required this.sessionName,
    required this.status,
    this.phoneNumber,
    this.qrCode,
    this.lastActivity,
  });

  final String id;
  final String sessionName;
  final String status;
  final String? phoneNumber;
  final String? qrCode;
  final DateTime? lastActivity;

  bool get isConnected {
    final value = status.toLowerCase();
    return value == 'connected' || value == 'working';
  }

  factory StudioSession.fromMap(Map<String, dynamic> map) {
    return StudioSession(
      id: '${map['id'] ?? ''}',
      sessionName: '${map['session_name'] ?? ''}',
      status: '${map['status'] ?? 'disconnected'}',
      phoneNumber: map['phone_number']?.toString(),
      qrCode: map['qr_code']?.toString(),
      lastActivity: DateTime.tryParse('${map['last_activity'] ?? ''}'),
    );
  }
}

class StudioAgent {
  const StudioAgent({
    required this.id,
    required this.name,
    required this.sector,
    required this.agentType,
    required this.status,
    required this.persona,
    required this.capabilities,
    required this.stats,
    this.sessionName,
  });

  final String id;
  final String name;
  final String sector;
  final String agentType;
  final String status;
  final String? sessionName;
  final Map<String, dynamic> persona;
  final Map<String, dynamic> capabilities;
  final Map<String, dynamic> stats;

  bool get isActive => status == 'active';

  String get personaName {
    final value = '${persona['name'] ?? ''}'.trim();
    return value.isEmpty ? 'Assistant' : value;
  }

  factory StudioAgent.fromMap(Map<String, dynamic> map) {
    return StudioAgent(
      id: '${map['id'] ?? ''}',
      name: '${map['name'] ?? 'Agent IA'}',
      sector: '${map['sector'] ?? 'other'}',
      agentType: '${map['agent_type'] ?? 'commerce'}',
      status: '${map['status'] ?? 'draft'}',
      sessionName: map['waha_session_name']?.toString(),
      persona: _asMap(map['persona']),
      capabilities: _asMap(map['capabilities']),
      stats: _asMap(map['stats']),
    );
  }

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }
}

class StudioChatMessage {
  const StudioChatMessage({
    required this.role,
    required this.content,
  });

  final String role;
  final String content;

  bool get isUser => role == 'user';

  Map<String, dynamic> toApi() {
    return <String, dynamic>{
      'role': role,
      'content': content,
    };
  }
}

class WhatsAppIaStudioV20Service {
  WhatsAppIaStudioV20Service({SupabaseClient? client})
      : client = client ?? Supabase.instance.client;

  final SupabaseClient client;

  User _requireUser() {
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Vous devez être connecté.');
    }
    return user;
  }

  Future<List<StudioSession>> loadSessions() async {
    final user = _requireUser();
    final data = await client
        .from('whatsapp_accounts')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    return (data as List<dynamic>)
        .whereType<Map>()
        .map(
          (item) => StudioSession.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<List<StudioAgent>> loadAgents() async {
    final user = _requireUser();
    final data = await client
        .from('waouh_ai_agents')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    return (data as List<dynamic>)
        .whereType<Map>()
        .map(
          (item) => StudioAgent.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<void> createSession({
    required String sessionName,
    String? phoneNumber,
  }) async {
    final response = await client.functions.invoke(
      'waha-session-manager',
      body: <String, dynamic>{
        'action': 'create',
        'sessionName': sessionName,
        if (phoneNumber != null && phoneNumber.trim().isNotEmpty)
          'phoneNumber': phoneNumber.trim(),
      },
    );

    final data = _responseMap(response.data);
    if (data['success'] == false) {
      throw StateError(
        '${data['error'] ?? 'Création de ligne impossible.'}',
      );
    }
  }

  Future<void> startSession(String sessionName) async {
    final response = await client.functions.invoke(
      'waha-session-manager',
      body: <String, dynamic>{
        'action': 'start',
        'sessionName': sessionName,
      },
    );

    final data = _responseMap(response.data);
    if (data['success'] == false) {
      throw StateError(
        '${data['error'] ?? 'Démarrage de ligne impossible.'}',
      );
    }
  }

  Future<String?> getQrCode(String sessionName) async {
    final response = await client.functions.invoke(
      'waha-session-manager',
      body: <String, dynamic>{
        'action': 'qr',
        'sessionName': sessionName,
      },
    );

    final data = _responseMap(response.data);
    if (data['success'] == false) {
      throw StateError(
        '${data['error'] ?? 'QR WhatsApp indisponible.'}',
      );
    }

    final qr = data['qrCode'] ?? data['qr_code'] ?? data['qr'];
    final value = '$qr'.trim();
    return value.isEmpty || value == 'null' ? null : value;
  }

  Future<StudioAgent> createAgent({
    required String name,
    required String personaName,
    required String tone,
    required String sector,
    required String agentType,
    required Map<String, dynamic> capabilities,
    String? knowledge,
    String? websiteUrl,
  }) async {
    final user = _requireUser();

    final row = <String, dynamic>{
      'user_id': user.id,
      'name': name.trim(),
      'sector': sector,
      'template_id': sector,
      'agent_type': agentType,
      'website_url': agentType == 'website' ? websiteUrl?.trim() : null,
      'persona': <String, dynamic>{
        'name': personaName.trim(),
        'tone': tone.trim().isEmpty ? 'chaleureux' : tone.trim(),
        'emojis': true,
      },
      'capabilities': capabilities,
      'status': 'testing',
    };

    final data =
        await client.from('waouh_ai_agents').insert(row).select().single();

    final agent = StudioAgent.fromMap(
      Map<String, dynamic>.from(data),
    );

    final text = knowledge?.trim() ?? '';
    if (text.isNotEmpty) {
      await client.functions.invoke(
        'waouh-agent-ingest',
        body: <String, dynamic>{
          'agent_id': agent.id,
          'source_type': 'text',
          'text': text,
        },
      );
    }

    if (agentType == 'website' && (websiteUrl?.trim().isNotEmpty ?? false)) {
      await client.functions.invoke(
        'waouh-agent-ingest',
        body: <String, dynamic>{
          'agent_id': agent.id,
          'source_type': 'website',
          'url': websiteUrl!.trim(),
          'crawl': true,
        },
      );
    }

    return agent;
  }

  Future<String> testAgent({
    required String agentId,
    required String message,
    required List<StudioChatMessage> history,
  }) async {
    final response = await client.functions.invoke(
      'waouh-agent-chat',
      body: <String, dynamic>{
        'agent_id': agentId,
        'message': message.trim(),
        'history': history.map((item) => item.toApi()).toList(),
        'persist': false,
      },
    );

    final data = _responseMap(response.data);
    if (data['error'] != null) {
      throw StateError('${data['error']}');
    }

    final reply = '${data['reply'] ?? ''}'.trim();
    if (reply.isEmpty) {
      throw StateError('Gemini Flash a retourné une réponse vide.');
    }
    return reply;
  }

  Future<void> deployAgent({
    required String agentId,
    required String sessionName,
  }) async {
    await client.from('waouh_ai_agents').update(<String, dynamic>{
      'waha_session_name': sessionName,
      'status': 'active',
    }).eq('id', agentId);
  }

  Future<void> saveAsDraft(String agentId) async {
    await client.from('waouh_ai_agents').update(<String, dynamic>{
      'status': 'draft',
    }).eq('id', agentId);
  }

  Future<void> toggleAgent(StudioAgent agent) async {
    await client.from('waouh_ai_agents').update(<String, dynamic>{
      'status': agent.isActive ? 'paused' : 'active',
    }).eq('id', agent.id);
  }

  Future<void> linkAgentToSession({
    required String agentId,
    required String sessionName,
  }) async {
    await client.from('waouh_ai_agents').update(<String, dynamic>{
      'waha_session_name': sessionName,
    }).eq('id', agentId);
  }

  static String normalizeSessionName(String value) {
    var output = value.trim().toLowerCase();
    const accents = <String, String>{
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ä': 'a',
      'ã': 'a',
      'ç': 'c',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'ö': 'o',
      'õ': 'o',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'ÿ': 'y',
    };

    accents.forEach((key, replacement) {
      output = output.replaceAll(key, replacement);
    });

    output = output
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');

    if (output.isEmpty) {
      output = 'ligne-${DateTime.now().millisecondsSinceEpoch}';
    }
    return output;
  }

  static Map<String, dynamic> _responseMap(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }
}
