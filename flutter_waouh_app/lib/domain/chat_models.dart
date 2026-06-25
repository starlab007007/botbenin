class ChatAttachment {
  const ChatAttachment({required this.url, required this.type});
  final String url;
  final String type;

  factory ChatAttachment.fromJson(Map<String, dynamic> json) => ChatAttachment(
        url: (json['url'] ?? '').toString(),
        type: (json['type'] ?? 'image/jpeg').toString(),
      );

  Map<String, dynamic> toJson() => {'url': url, 'type': type};
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.text,
    required this.createdAt,
    required this.direction,
    this.conversationId,
    this.attachments = const [],
    this.meta = const {},
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final String direction;
  final String? conversationId;
  final List<ChatAttachment> attachments;
  final Map<String, dynamic> meta;

  bool get isIncoming => direction == 'in' || direction == 'inbound';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final rawAttachments = json['attachments'];
    final attachments = rawAttachments is List
        ? rawAttachments
            .whereType<Map>()
            .map((row) => ChatAttachment.fromJson(Map<String, dynamic>.from(row)))
            .toList()
        : const <ChatAttachment>[];
    final rawMeta = json['meta'];
    return ChatMessage(
      id: (json['id'] ?? '').toString(),
      text: (json['text'] ?? json['content'] ?? '').toString(),
      createdAt: DateTime.tryParse((json['created_at'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      direction: (json['direction'] ?? 'in').toString(),
      conversationId: json['conversation_id']?.toString(),
      attachments: attachments,
      meta: rawMeta is Map ? Map<String, dynamic>.from(rawMeta) : const {},
    );
  }
}

class WaouhConversation {
  const WaouhConversation({
    required this.id,
    required this.updatedAt,
    this.phoneNumber,
    this.lastMessage,
    this.userId,
    this.archived = false,
  });

  final String id;
  final DateTime updatedAt;
  final String? phoneNumber;
  final String? lastMessage;
  final String? userId;
  final bool archived;

  factory WaouhConversation.fromJson(Map<String, dynamic> json) => WaouhConversation(
        id: (json['id'] ?? '').toString(),
        updatedAt: DateTime.tryParse((json['updated_at'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0),
        phoneNumber: json['phone_number']?.toString(),
        lastMessage: (json['last_message'] ?? json['last_message_text'])?.toString(),
        userId: json['user_id']?.toString(),
        archived: json['state'] == 'archived' || json['archived'] == true,
      );
}
