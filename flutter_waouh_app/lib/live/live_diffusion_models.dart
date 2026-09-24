class LiveDiffusionContact {
  const LiveDiffusionContact({
    required this.id,
    required this.phoneE164,
    required this.createdAt,
    this.name,
    this.tags = const [],
    this.isWhatsApp,
    this.optOut = false,
    this.archived = false,
    this.source = 'manual',
  });

  final String id;
  final String phoneE164;
  final DateTime createdAt;
  final String? name;
  final List<String> tags;
  final bool? isWhatsApp;
  final bool optOut;
  final bool archived;
  final String source;

  factory LiveDiffusionContact.fromJson(Map<String, dynamic> row) => LiveDiffusionContact(
        id: '${row['id'] ?? ''}',
        phoneE164: '${row['phone_e164'] ?? ''}',
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0),
        name: row['display_name']?.toString(),
        tags: row['tags'] is List ? (row['tags'] as List).map((item) => '$item').toList() : const [],
        isWhatsApp: row['is_whatsapp'] as bool?,
        optOut: row['opt_out'] == true,
        archived: row['archived'] == true,
        source: '${row['source'] ?? 'manual'}',
      );
}

class LiveDiffusionList {
  const LiveDiffusionList({required this.id, required this.name, this.description, this.color});
  final String id;
  final String name;
  final String? description;
  final String? color;
  factory LiveDiffusionList.fromJson(Map<String, dynamic> row) => LiveDiffusionList(
        id: '${row['id'] ?? ''}',
        name: '${row['name'] ?? 'Liste'}',
        description: row['description']?.toString(),
        color: row['color']?.toString(),
      );
}

class LiveDiffusionSession {
  const LiveDiffusionSession({
    required this.id,
    required this.name,
    required this.status,
    this.phone,
    this.qrCode,
  });
  final String id;
  final String name;
  final String status;
  final String? phone;
  final String? qrCode;
  bool get active => status == 'WORKING' || status == 'connected';
  factory LiveDiffusionSession.fromJson(Map<String, dynamic> row) => LiveDiffusionSession(
        id: '${row['id'] ?? ''}',
        name: '${row['session_name'] ?? 'Session'}',
        phone: row['phone_number']?.toString(),
        status: '${row['status'] ?? 'UNKNOWN'}',
        qrCode: row['qr_code']?.toString(),
      );
}

class LiveDiffusionCampaign {
  const LiveDiffusionCampaign({
    required this.id,
    required this.name,
    required this.type,
    required this.body,
    required this.status,
    required this.createdAt,
    this.mediaUrl,
    this.sessionId,
    this.listIds = const [],
    this.contactIds = const [],
    this.throttlePerHour = 30,
    this.minDelaySeconds = 25,
    this.maxDelaySeconds = 75,
    this.activeStart = '08:00:00',
    this.activeEnd = '20:00:00',
    this.aiVariation = true,
    this.stats = const {},
  });

  final String id;
  final String name;
  final String type;
  final String body;
  final String status;
  final DateTime createdAt;
  final String? mediaUrl;
  final String? sessionId;
  final List<String> listIds;
  final List<String> contactIds;
  final int throttlePerHour;
  final int minDelaySeconds;
  final int maxDelaySeconds;
  final String activeStart;
  final String activeEnd;
  final bool aiVariation;
  final Map<String, dynamic> stats;

  int stat(String key) => int.tryParse('${stats[key] ?? 0}') ?? 0;
  int get total => stat('total');
  int get sent => stat('sent');
  int get failed => stat('failed');
  int get queued => stat('queued');
  int get sending => stat('sending');
  int get delivered => stat('delivered');
  int get read => stat('read');
  int get replied => stat('replied');
  int get pending => stat('pending') > 0 ? stat('pending') : queued + sending;
  double get progress => total == 0 ? 0 : (sent / total).clamp(0, 1).toDouble();

  factory LiveDiffusionCampaign.fromJson(Map<String, dynamic> row) => LiveDiffusionCampaign(
        id: '${row['id'] ?? ''}',
        name: '${row['name'] ?? 'Sans titre'}',
        type: '${row['type'] ?? 'text'}',
        body: '${row['body'] ?? ''}',
        status: '${row['status'] ?? 'draft'}',
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0),
        mediaUrl: row['media_url']?.toString(),
        sessionId: row['session_id']?.toString(),
        listIds: row['list_ids'] is List ? (row['list_ids'] as List).map((item) => '$item').toList() : const [],
        contactIds: row['extra_contact_ids'] is List ? (row['extra_contact_ids'] as List).map((item) => '$item').toList() : const [],
        throttlePerHour: int.tryParse('${row['throttle_per_hour'] ?? 30}') ?? 30,
        minDelaySeconds: int.tryParse('${row['min_delay_s'] ?? 25}') ?? 25,
        maxDelaySeconds: int.tryParse('${row['max_delay_s'] ?? 75}') ?? 75,
        activeStart: '${row['active_hours_start'] ?? '08:00:00'}',
        activeEnd: '${row['active_hours_end'] ?? '20:00:00'}',
        aiVariation: row['ai_variation'] != false,
        stats: row['stats'] is Map ? Map<String, dynamic>.from(row['stats'] as Map) : const {},
      );
}

class LiveDiffusionApproval {
  const LiveDiffusionApproval({
    required this.id,
    required this.status,
    required this.createdAt,
    this.campaignId,
    this.quotaRequested = 0,
    this.audienceSnapshot = const {},
    this.message,
  });
  final String id;
  final String status;
  final DateTime createdAt;
  final String? campaignId;
  final int quotaRequested;
  final Map<String, dynamic> audienceSnapshot;
  final String? message;
  factory LiveDiffusionApproval.fromJson(Map<String, dynamic> row) => LiveDiffusionApproval(
        id: '${row['id'] ?? ''}',
        status: '${row['status'] ?? 'pending'}',
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0),
        campaignId: row['campaign_id']?.toString(),
        quotaRequested: int.tryParse('${row['quota_requested'] ?? 0}') ?? 0,
        audienceSnapshot: row['audience_snapshot'] is Map ? Map<String, dynamic>.from(row['audience_snapshot'] as Map) : const {},
        message: row['message_template']?.toString(),
      );
}

class LiveDiffusionAudiencePreview {
  const LiveDiffusionAudiencePreview({required this.total, this.breakdown = const {}, this.sample = const []});
  final int total;
  final Map<String, dynamic> breakdown;
  final List<Map<String, dynamic>> sample;
  factory LiveDiffusionAudiencePreview.fromJson(Map<String, dynamic> row) => LiveDiffusionAudiencePreview(
        total: int.tryParse('${row['total'] ?? 0}') ?? 0,
        breakdown: row['breakdown'] is Map ? Map<String, dynamic>.from(row['breakdown'] as Map) : const {},
        sample: row['sample'] is List ? (row['sample'] as List).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList() : const [],
      );
}

class LiveAiDiffusionRequest {
  const LiveAiDiffusionRequest({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.messageTemplate,
    required this.quotaRequested,
    this.campaignId,
    this.campaignName,
    this.quotaApproved,
    this.quotaConsumed = 0,
    this.audienceTotal = 0,
    this.reason,
    this.mediaUrl,
    this.filters = const {},
    this.breakdown = const {},
    this.sent = 0,
    this.skipped = 0,
    this.lastRunAt,
  });

  final String id;
  final String status;
  final DateTime createdAt;
  final String messageTemplate;
  final int quotaRequested;
  final String? campaignId;
  final String? campaignName;
  final int? quotaApproved;
  final int quotaConsumed;
  final int audienceTotal;
  final String? reason;
  final String? mediaUrl;
  final Map<String, dynamic> filters;
  final Map<String, dynamic> breakdown;
  final int sent;
  final int skipped;
  final DateTime? lastRunAt;

  bool get pending => status == 'pending';
  bool get approved => status == 'approved';
  bool get rejected => status == 'rejected';
  bool get cancelled => status == 'cancelled';
  bool get completed => status == 'done';
  int get effectiveQuota => quotaApproved ?? quotaRequested;
  double get progress => effectiveQuota <= 0 ? 0 : (quotaConsumed / effectiveQuota).clamp(0, 1).toDouble();

  factory LiveAiDiffusionRequest.fromJson(Map<String, dynamic> row) {
    final snapshot = row['audience_snapshot'];
    final rawBreakdown = row['breakdown'] ?? (snapshot is Map ? snapshot['breakdown'] : null);
    return LiveAiDiffusionRequest(
      id: '${row['id'] ?? ''}',
      status: '${row['status'] ?? 'pending'}',
      createdAt: DateTime.tryParse('${row['created_at'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0),
      messageTemplate: '${row['message_template'] ?? ''}',
      quotaRequested: _toInt(row['quota_requested']),
      campaignId: row['campaign_id']?.toString(),
      campaignName: row['campaign_name']?.toString(),
      quotaApproved: row['quota_approved'] == null ? null : _toInt(row['quota_approved']),
      quotaConsumed: _toInt(row['quota_consumed']),
      audienceTotal: _toInt(row['audience_total'] ?? (snapshot is Map ? snapshot['total'] : 0)),
      reason: row['reason']?.toString(),
      mediaUrl: row['media_url']?.toString(),
      filters: row['audience_filters'] is Map ? Map<String, dynamic>.from(row['audience_filters'] as Map) : const {},
      breakdown: rawBreakdown is Map ? Map<String, dynamic>.from(rawBreakdown) : const {},
      sent: _toInt(row['sent']),
      skipped: _toInt(row['skipped']),
      lastRunAt: DateTime.tryParse('${row['last_run_at'] ?? ''}'),
    );
  }
}

String liveDiffusionPhone(String raw) {
  final compact = raw.replaceAll(RegExp(r'[^0-9+]'), '');
  if (compact.startsWith('+') && compact.length >= 9) return compact;
  var digits = compact.replaceAll('+', '');
  if (digits.startsWith('229')) digits = digits.substring(3);
  if (digits.length == 8 || digits.length == 10) return '+229$digits';
  return '';
}

int _toInt(dynamic value) => value is int ? value : int.tryParse('${value ?? 0}') ?? 0;
