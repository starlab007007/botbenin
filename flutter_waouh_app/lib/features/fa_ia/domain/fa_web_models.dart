import 'dart:convert';

enum FaWebFace { open, closed }

extension FaWebFaceX on FaWebFace {
  String get wireValue => this == FaWebFace.open ? 'OPEN' : 'CLOSED';
  String get trait => this == FaWebFace.open ? 'I' : 'II';
}

FaWebFace faWebFaceFrom(Object? value) {
  return '$value'.toUpperCase() == 'CLOSED' ? FaWebFace.closed : FaWebFace.open;
}

class FaWebBaseSign {
  const FaWebBaseSign({
    required this.index,
    required this.name,
    required this.pattern,
    required this.theme,
    required this.light,
    required this.shadow,
    required this.action,
  });

  final int index;
  final String name;
  final List<String> pattern;
  final String theme;
  final String light;
  final String shadow;
  final String action;
}

class FaWebResolvedSign {
  const FaWebResolvedSign({
    required this.x,
    required this.y,
    required this.columnA,
    required this.columnB,
    required this.reference,
    required this.name,
    required this.corpusKey,
  });

  final FaWebBaseSign x;
  final FaWebBaseSign y;
  final List<String> columnA;
  final List<String> columnB;
  final String reference;
  final String name;
  final String corpusKey;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'reference': reference,
        'name': name,
        'x_index': x.index,
        'y_index': y.index,
        'column_a': columnA,
        'column_b': columnB,
        'corpus_key': corpusKey,
      };
}

class FaWebFocus {
  const FaWebFocus({
    required this.key,
    required this.label,
    required this.instruction,
    required this.maxWords,
  });

  final String key;
  final String label;
  final String instruction;
  final int maxWords;
}

class FaWebChatMessage {
  const FaWebChatMessage({
    required this.role,
    required this.text,
    this.error = false,
    this.corpus = false,
  });

  final String role;
  final String text;
  final bool error;
  final bool corpus;

  bool get isUser => role == 'user';

  Map<String, dynamic> toJson() => <String, dynamic>{
        'r': role,
        't': text,
        if (error) 'e': true,
        if (corpus) 'corpus': true,
      };

  factory FaWebChatMessage.fromJson(Map<String, dynamic> json) {
    return FaWebChatMessage(
      role: '${json['r'] ?? json['role'] ?? 'assistant'}',
      text: '${json['t'] ?? json['content'] ?? ''}',
      error: json['e'] == true || json['error'] == true,
      corpus: json['corpus'] == true,
    );
  }
}

class FaWebJournalEntry {
  const FaWebJournalEntry({
    required this.id,
    required this.date,
    required this.category,
    required this.rawIntention,
    required this.intention,
    required this.faces,
    required this.sign,
    required this.messages,
    this.favorite = false,
  });

  final String id;
  final DateTime date;
  final String category;
  final String rawIntention;
  final String intention;
  final List<FaWebFace> faces;
  final FaWebResolvedSign sign;
  final List<FaWebChatMessage> messages;
  final bool favorite;

  FaWebJournalEntry copyWith({
    List<FaWebChatMessage>? messages,
    bool? favorite,
  }) {
    return FaWebJournalEntry(
      id: id,
      date: date,
      category: category,
      rawIntention: rawIntention,
      intention: intention,
      faces: faces,
      sign: sign,
      messages: messages ?? this.messages,
      favorite: favorite ?? this.favorite,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'date': date.toUtc().toIso8601String(),
        'cat': category,
        'raw': rawIntention,
        'intent': intention,
        'faces': faces.map((face) => face.wireValue).toList(),
        'sign': <String, dynamic>{
          'ref': sign.reference,
          'name': sign.name,
          'x': sign.x.index,
          'y': sign.y.index,
          'column_a': sign.columnA,
          'column_b': sign.columnB,
          'corpus_key': sign.corpusKey,
        },
        'msg': messages.map((message) => message.toJson()).toList(),
        'fav': favorite,
        'corpus_version': '2026-07-23-corpus-book-256-v14',
        'corpus_presentation_version': '2026-07-24-corpus-presentation-v15',
      };

  String encode() => jsonEncode(toJson());
}

class FaWebQuotaException implements Exception {
  const FaWebQuotaException({
    required this.reason,
    required this.message,
    required this.details,
  });

  final String reason;
  final String message;
  final Map<String, dynamic> details;

  @override
  String toString() => message;
}

class FaWebBackendException implements Exception {
  const FaWebBackendException(this.message, {this.status});

  final String message;
  final int? status;

  @override
  String toString() => message;
}
