class FaDocumentEntry {
  const FaDocumentEntry({
    required this.available,
    required this.reference,
    required this.canonicalName,
    required this.x,
    required this.y,
    required this.sourceFile,
    required this.sourceText,
    required this.documentTitle,
    this.documentNumber,
    this.pageStart,
    this.pageEnd,
    this.detailedPageStart,
    this.detailedPageEnd,
    this.detailedText = '',
    this.missingReason = '',
  });

  final bool available;
  final int? documentNumber;
  final String reference;
  final String canonicalName;
  final String x;
  final String y;
  final String documentTitle;
  final int? pageStart;
  final int? pageEnd;
  final String sourceFile;
  final String sourceText;
  final int? detailedPageStart;
  final int? detailedPageEnd;
  final String detailedText;
  final String missingReason;

  String get bestText => detailedText.trim().isNotEmpty
      ? '$sourceText\n\n$detailedText'.trim()
      : sourceText.trim();

  String get pageLabel {
    if (pageStart == null) return 'page non disponible';
    if (pageEnd == null || pageEnd == pageStart) return 'page $pageStart';
    return 'pages $pageStart–$pageEnd';
  }

  String get sourceLabel => '$sourceFile · $pageLabel';

  factory FaDocumentEntry.fromJson(Map<String, dynamic> json) =>
      FaDocumentEntry(
        available: json['available'] == true,
        documentNumber: (json['document_number'] as num?)?.toInt(),
        reference: '${json['reference'] ?? ''}',
        canonicalName: '${json['canonical_name'] ?? ''}',
        x: '${json['x'] ?? ''}',
        y: '${json['y'] ?? ''}',
        documentTitle: '${json['document_title'] ?? ''}',
        pageStart: (json['page_start'] as num?)?.toInt(),
        pageEnd: (json['page_end'] as num?)?.toInt(),
        sourceFile: '${json['source_file'] ?? ''}',
        sourceText: '${json['source_text'] ?? ''}',
        detailedPageStart: (json['detailed_page_start'] as num?)?.toInt(),
        detailedPageEnd: (json['detailed_page_end'] as num?)?.toInt(),
        detailedText: '${json['detailed_text'] ?? ''}',
        missingReason: '${json['missing_reason'] ?? ''}',
      );
}

enum FaChatRole { assistant, user }

class FaChatMessage {
  const FaChatMessage({
    required this.role,
    required this.text,
    this.sourceLabel,
    this.isError = false,
  });

  final FaChatRole role;
  final String text;
  final String? sourceLabel;
  final bool isError;

  bool get fromUser => role == FaChatRole.user;

  Map<String, String> toJournalJson() => <String, String>{
    'role': fromUser ? 'user' : 'assistant',
    'content': text,
    if (sourceLabel != null) 'source': sourceLabel!,
  };

  factory FaChatMessage.fromJournalJson(Map<String, dynamic> json) =>
      FaChatMessage(
        role: '${json['role']}' == 'user'
            ? FaChatRole.user
            : FaChatRole.assistant,
        text: '${json['content'] ?? ''}',
        sourceLabel: json['source'] == null ? null : '${json['source']}',
      );
}

class FaChatReply {
  const FaChatReply({
    required this.answer,
    required this.quickReplies,
    required this.mode,
    this.sourceLabel,
    this.requiresBokonon = false,
  });

  final String answer;
  final List<String> quickReplies;
  final String mode;
  final String? sourceLabel;
  final bool requiresBokonon;
}
