enum LiveAgentType { commerce, docs, website }

extension LiveAgentTypeLabel on LiveAgentType {
  String get value => switch (this) {
        LiveAgentType.commerce => 'commerce',
        LiveAgentType.docs => 'docs',
        LiveAgentType.website => 'website',
      };

  String get label => switch (this) {
        LiveAgentType.commerce => 'Commerce',
        LiveAgentType.docs => 'Documents',
        LiveAgentType.website => 'Site Web',
      };

  static LiveAgentType fromValue(Object? value) {
    switch ('$value'.toLowerCase()) {
      case 'docs':
        return LiveAgentType.docs;
      case 'website':
        return LiveAgentType.website;
      default:
        return LiveAgentType.commerce;
    }
  }
}

class LiveAgentException implements Exception {
  const LiveAgentException(this.message);
  final String message;
  @override
  String toString() => message;
}

class LiveAiAgent {
  const LiveAiAgent({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.sector,
    required this.persona,
    required this.capabilities,
    required this.stats,
    this.wahaSessionName,
    this.websiteUrl,
  });

  final String id;
  final String name;
  final LiveAgentType type;
  final String status;
  final String sector;
  final Map<String, Object?> persona;
  final Map<String, Object?> capabilities;
  final Map<String, Object?> stats;
  final String? wahaSessionName;
  final String? websiteUrl;

  bool get active => status == 'active';
  String get assistantName => '${persona['name'] ?? 'Assistant'}';

  factory LiveAiAgent.fromJson(Map<String, Object?> row) {
    Map<String, Object?> map(Object? value) => value is Map
        ? Map<String, Object?>.from(value)
        : const <String, Object?>{};
    return LiveAiAgent(
      id: '${row['id'] ?? ''}',
      name: '${row['name'] ?? 'Agent IA'}',
      type: LiveAgentTypeLabel.fromValue(row['agent_type']),
      status: '${row['status'] ?? 'draft'}',
      sector: '${row['sector'] ?? 'other'}',
      persona: map(row['persona']),
      capabilities: map(row['capabilities']),
      stats: map(row['stats']),
      wahaSessionName: row['waha_session_name']?.toString(),
      websiteUrl: row['website_url']?.toString(),
    );
  }
}
