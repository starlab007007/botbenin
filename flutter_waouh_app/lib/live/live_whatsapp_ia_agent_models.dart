import 'live_whatsapp_ia_models.dart';

class LiveWhatsAppAiAgent {
  const LiveWhatsAppAiAgent({
    required this.id,
    required this.name,
    required this.sector,
    required this.agentType,
    required this.status,
    required this.personaName,
    required this.tone,
    required this.emojis,
    required this.capabilities,
    required this.stats,
    this.wahaSessionName,
    this.websiteUrl,
    this.pausedContacts = const <String>[],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String sector;
  final String agentType;
  final String status;
  final String personaName;
  final String tone;
  final bool emojis;
  final Map<String, bool> capabilities;
  final Map<String, dynamic> stats;
  final String? wahaSessionName;
  final String? websiteUrl;
  final List<String> pausedContacts;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == 'active';
  bool get isPaused => status == 'paused';
  bool get isDraft => !isActive && !isPaused;
  int get messagesHandled => _asInt(stats['messages_handled']);
  int get handoffs => _asInt(stats['handoffs']);

  LiveWhatsAppAiAgent copyWith({
    String? status,
    String? wahaSessionName,
    Map<String, dynamic>? stats,
    List<String>? pausedContacts,
  }) => LiveWhatsAppAiAgent(
        id: id,
        name: name,
        sector: sector,
        agentType: agentType,
        status: status ?? this.status,
        personaName: personaName,
        tone: tone,
        emojis: emojis,
        capabilities: capabilities,
        stats: stats ?? this.stats,
        wahaSessionName: wahaSessionName ?? this.wahaSessionName,
        websiteUrl: websiteUrl,
        pausedContacts: pausedContacts ?? this.pausedContacts,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );

  factory LiveWhatsAppAiAgent.fromJson(Map<String, dynamic> row) {
    final persona = _map(row['persona']);
    final capabilities = _map(row['capabilities']);
    final stats = _map(row['stats']);
    final paused = row['paused_contacts'] is List
        ? (row['paused_contacts'] as List).map((item) => '$item').toList()
        : const <String>[];
    return LiveWhatsAppAiAgent(
      id: '${row['id'] ?? ''}',
      name: '${row['name'] ?? 'Agent sans nom'}',
      sector: '${row['sector'] ?? 'other'}',
      agentType: '${row['agent_type'] ?? 'commerce'}',
      status: '${row['status'] ?? 'draft'}',
      personaName: '${persona['name'] ?? 'Assistant'}',
      tone: '${persona['tone'] ?? 'professionnel'}',
      emojis: persona['emojis'] != false,
      capabilities: <String, bool>{
        'qa': capabilities['qa'] != false,
        'sell': capabilities['sell'] == true,
        'appointments': capabilities['appointments'] == true,
        'qualify': capabilities['qualify'] == true,
        'handoff': capabilities['handoff'] != false,
      },
      stats: stats,
      wahaSessionName: _nullable(row['waha_session_name']),
      websiteUrl: _nullable(row['website_url']),
      pausedContacts: paused,
      createdAt: DateTime.tryParse('${row['created_at'] ?? ''}')?.toLocal(),
      updatedAt: DateTime.tryParse('${row['updated_at'] ?? ''}')?.toLocal(),
    );
  }
}

class LiveAgentProduct {
  const LiveAgentProduct({
    required this.name,
    this.id,
    this.price,
    this.description,
    this.businessName,
    this.available = true,
  });

  final String? id;
  final String name;
  final int? price;
  final String? description;
  final String? businessName;
  final bool available;

  String get priceLabel =>
      price == null ? 'Prix sur demande' : '${_formatNumber(price!)} FCFA';

  LiveAgentProduct copyWith({String? name, int? price, String? description}) =>
      LiveAgentProduct(
        id: id,
        name: name ?? this.name,
        price: price ?? this.price,
        description: description ?? this.description,
        businessName: businessName,
        available: available,
      );

  factory LiveAgentProduct.partner(Map<String, dynamic> row) =>
      LiveAgentProduct(
        id: '${row['id'] ?? ''}',
        name: '${row['nom'] ?? row['name'] ?? ''}',
        price: _nullableInt(row['prix_min'] ?? row['price_fcfa']),
        description: _nullable(row['description']),
        businessName: _nullable(row['business_name']),
        available: row['disponible'] != false,
      );
}

class LiveAgentDocument {
  const LiveAgentDocument({
    required this.name,
    required this.storagePath,
    required this.sizeBytes,
  });

  final String name;
  final String storagePath;
  final int sizeBytes;

  String get sizeLabel => sizeBytes < 1024 * 1024
      ? '${(sizeBytes / 1024).toStringAsFixed(0)} Ko'
      : '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} Mo';
}

class LiveAgentDraft {
  LiveAgentDraft({
    required this.name,
    required this.agentType,
    required this.sector,
    required this.personaName,
    required this.tone,
    this.emojis = true,
    Map<String, bool>? capabilities,
    Set<String>? selectedPartnerProductIds,
    List<LiveAgentProduct>? manualProducts,
    List<LiveAgentDocument>? documents,
    this.websiteUrl = '',
    this.crawlSite = true,
    this.notes = '',
    this.notesUrl = '',
  })  : capabilities = capabilities ?? <String, bool>{
          'qa': true,
          'sell': true,
          'appointments': false,
          'qualify': true,
          'handoff': true,
        },
        selectedPartnerProductIds = selectedPartnerProductIds ?? <String>{},
        manualProducts = manualProducts ?? <LiveAgentProduct>[],
        documents = documents ?? <LiveAgentDocument>[];

  String name;
  String agentType;
  String sector;
  String personaName;
  String tone;
  bool emojis;
  Map<String, bool> capabilities;
  Set<String> selectedPartnerProductIds;
  List<LiveAgentProduct> manualProducts;
  List<LiveAgentDocument> documents;
  String websiteUrl;
  bool crawlSite;
  String notes;
  String notesUrl;
}

class LiveAgentMessage {
  const LiveAgentMessage({
    required this.role,
    required this.content,
    this.timestamp,
  });

  final String role;
  final String content;
  final DateTime? timestamp;

  bool get isUser => role == 'user';
  bool get isOperator => role == 'operator';

  Map<String, dynamic> toJson() => <String, dynamic>{
        'role': role,
        'content': content,
      };

  factory LiveAgentMessage.fromJson(Map<String, dynamic> row) =>
      LiveAgentMessage(
        role: '${row['role'] ?? 'assistant'}',
        content: '${row['content'] ?? ''}',
        timestamp: row['ts'] is int
            ? DateTime.fromMillisecondsSinceEpoch(row['ts'] as int)
            : DateTime.tryParse('${row['timestamp'] ?? ''}'),
      );
}

class LiveAgentConversation {
  const LiveAgentConversation({
    required this.id,
    required this.agentId,
    required this.phone,
    required this.messages,
    this.name,
    this.lastActivity,
    this.humanTakeover = false,
    this.needsHandoff = false,
  });

  final String id;
  final String agentId;
  final String phone;
  final String? name;
  final List<LiveAgentMessage> messages;
  final DateTime? lastActivity;
  final bool humanTakeover;
  final bool needsHandoff;

  String get displayName => name?.trim().isNotEmpty == true ? name! : phone;

  factory LiveAgentConversation.fromJson(Map<String, dynamic> row) {
    final raw = row['messages'] is List ? row['messages'] as List : const [];
    return LiveAgentConversation(
      id: '${row['id'] ?? ''}',
      agentId: '${row['agent_id'] ?? ''}',
      phone: '${row['wa_contact_phone'] ?? ''}',
      name: _nullable(row['wa_contact_name']),
      messages: raw.whereType<Map>().map((item) {
        return LiveAgentMessage.fromJson(Map<String, dynamic>.from(item));
      }).toList(),
      lastActivity:
          DateTime.tryParse('${row['last_activity'] ?? ''}')?.toLocal(),
      humanTakeover: row['human_takeover'] == true,
      needsHandoff: row['needs_handoff'] == true,
    );
  }
}

Map<String, dynamic> _map(dynamic value) => value is Map
    ? Map<String, dynamic>.from(value)
    : const <String, dynamic>{};

String? _nullable(dynamic value) {
  final text = '$value'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

int _asInt(dynamic value) => value is int ? value : int.tryParse('$value') ?? 0;

int? _nullableInt(dynamic value) {
  if (value == null) return null;
  return value is int ? value : int.tryParse('$value');
}

String _formatNumber(int value) {
  final valueText = '$value';
  final result = StringBuffer();
  for (var index = 0; index < valueText.length; index++) {
    if (index > 0 && (valueText.length - index) % 3 == 0) result.write(' ');
    result.write(valueText[index]);
  }
  return result.toString();
}
