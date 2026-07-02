class NativeBot {
  const NativeBot({
    required this.id,
    required this.name,
    required this.active,
    this.description,
    this.webhookUrl,
    this.publicUrl,
    this.createdAt,
  });

  final String id;
  final String name;
  final bool active;
  final String? description;
  final String? webhookUrl;
  final String? publicUrl;
  final DateTime? createdAt;

  factory NativeBot.fromJson(Map<String, Object?> row) => NativeBot(
        id: '${row['id'] ?? ''}',
        name: '${row['name'] ?? 'Chatbot'}',
        active: row['is_active'] != false,
        description: row['description']?.toString(),
        webhookUrl: row['webhook_url']?.toString(),
        publicUrl: row['public_chat_url']?.toString(),
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}')?.toLocal(),
      );
}

class NativeBotsDashboard {
  const NativeBotsDashboard({required this.ownerId, required this.limit, required this.items});
  final String ownerId;
  final int limit;
  final List<NativeBot> items;
}
