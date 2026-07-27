class WaouhTimelinePoint {
  const WaouhTimelinePoint({required this.day, required this.count});

  final String day;
  final int count;

  factory WaouhTimelinePoint.fromJson(Map<String, dynamic> json) =>
      WaouhTimelinePoint(
        day: '${json['day'] ?? ''}',
        count: _asInt(json['count']),
      );
}

class WaouhCountedLabel {
  const WaouhCountedLabel({required this.label, required this.count});

  final String label;
  final int count;

  factory WaouhCountedLabel.fromJson(
    Map<String, dynamic> json, {
    required String labelKey,
  }) => WaouhCountedLabel(
    label: '${json[labelKey] ?? ''}',
    count: _asInt(json['count']),
  );
}

class WaouhAgentInsights {
  const WaouhAgentInsights({
    required this.totalConversations,
    required this.totalMessages,
    required this.uniqueContacts,
    required this.totalHandoffs,
    required this.conversationsPerDay,
    required this.topKeywords,
    required this.topProducts,
  });

  final int totalConversations;
  final int totalMessages;
  final int uniqueContacts;
  final int totalHandoffs;
  final List<WaouhTimelinePoint> conversationsPerDay;
  final List<WaouhCountedLabel> topKeywords;
  final List<WaouhCountedLabel> topProducts;

  factory WaouhAgentInsights.fromJson(Map<String, dynamic> json) =>
      WaouhAgentInsights(
        totalConversations: _asInt(json['total_conversations']),
        totalMessages: _asInt(json['total_messages']),
        uniqueContacts: _asInt(json['unique_contacts']),
        totalHandoffs: _asInt(json['total_handoffs']),
        conversationsPerDay: _listOfMap(
          json['conversations_per_day'],
        ).map(WaouhTimelinePoint.fromJson).toList(),
        topKeywords: _listOfMap(json['top_keywords'])
            .map((item) => WaouhCountedLabel.fromJson(item, labelKey: 'word'))
            .where((item) => item.label.isNotEmpty)
            .toList(),
        topProducts: _listOfMap(json['top_products'])
            .map((item) => WaouhCountedLabel.fromJson(item, labelKey: 'name'))
            .where((item) => item.label.isNotEmpty)
            .toList(),
      );
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('$value') ?? 0;
}

List<Map<String, dynamic>> _listOfMap(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}
