enum WaouhMissionStatus {
  planning,
  searching,
  comparing,
  watching,
  negotiating,
  awaitingApproval,
  paused,
  completed,
  failed,
  cancelled,
}

enum WaouhStepStatus { pending, running, completed, failed }

enum WaouhApprovalStatus { pending, approved, refused, expired }

enum WaouhActivityKind {
  mission,
  search,
  comparison,
  watch,
  approval,
  negotiation,
  system,
}

T _enumValue<T extends Enum>(
  List<T> values,
  dynamic raw,
  T fallback,
) {
  final name =
      '$raw'.trim().replaceAll('-', '').replaceAll('_', '').toLowerCase();
  for (final value in values) {
    if (value.name.toLowerCase() == name) return value;
  }
  return fallback;
}

DateTime _date(dynamic value, [DateTime? fallback]) =>
    DateTime.tryParse('${value ?? ''}') ?? fallback ?? DateTime.now();

String? _optional(dynamic value) {
  final text = '${value ?? ''}'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

num? _number(dynamic value) {
  if (value is num) return value;
  return num.tryParse(
    '${value ?? ''}'.replaceAll(RegExp(r'[^0-9,.-]'), '').replaceAll(',', '.'),
  );
}

class WaouhMissionStep {
  const WaouhMissionStep({
    required this.id,
    required this.label,
    this.status = WaouhStepStatus.pending,
    this.detail,
    this.updatedAt,
  });

  final String id;
  final String label;
  final WaouhStepStatus status;
  final String? detail;
  final DateTime? updatedAt;

  WaouhMissionStep copyWith({
    WaouhStepStatus? status,
    String? detail,
    DateTime? updatedAt,
  }) =>
      WaouhMissionStep(
        id: id,
        label: label,
        status: status ?? this.status,
        detail: detail ?? this.detail,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory WaouhMissionStep.fromJson(Map<String, dynamic> row) =>
      WaouhMissionStep(
        id: '${row['id'] ?? ''}',
        label: '${row['label'] ?? ''}',
        status: _enumValue(
          WaouhStepStatus.values,
          row['status'],
          WaouhStepStatus.pending,
        ),
        detail: _optional(row['detail']),
        updatedAt: row['updated_at'] == null ? null : _date(row['updated_at']),
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'label': label,
        'status': status.name,
        if (detail != null) 'detail': detail,
        if (updatedAt != null)
          'updated_at': updatedAt!.toUtc().toIso8601String(),
      };
}

class WaouhMission {
  const WaouhMission({
    required this.id,
    required this.title,
    required this.request,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.steps,
    this.summary,
    this.error,
    this.criteria = const <String, dynamic>{},
    this.resultCount = 0,
  });

  final String id;
  final String title;
  final String request;
  final WaouhMissionStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<WaouhMissionStep> steps;
  final String? summary;
  final String? error;
  final Map<String, dynamic> criteria;
  final int resultCount;

  bool get active => !<WaouhMissionStatus>{
        WaouhMissionStatus.completed,
        WaouhMissionStatus.cancelled,
      }.contains(status);

  double get progress {
    if (steps.isEmpty) return 0;
    final completed =
        steps.where((step) => step.status == WaouhStepStatus.completed).length;
    return completed / steps.length;
  }

  WaouhMission copyWith({
    String? id,
    WaouhMissionStatus? status,
    DateTime? updatedAt,
    List<WaouhMissionStep>? steps,
    String? summary,
    String? error,
    int? resultCount,
    Map<String, dynamic>? criteria,
  }) =>
      WaouhMission(
        id: id ?? this.id,
        title: title,
        request: request,
        status: status ?? this.status,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        steps: steps ?? this.steps,
        summary: summary ?? this.summary,
        error: error,
        criteria: criteria ?? this.criteria,
        resultCount: resultCount ?? this.resultCount,
      );

  factory WaouhMission.fromJson(Map<String, dynamic> row) => WaouhMission(
        id: '${row['id'] ?? ''}',
        title: '${row['title'] ?? row['goal'] ?? 'Mission WAOUH'}',
        request: '${row['request'] ?? row['goal'] ?? ''}',
        status: switch ('${row['status'] ?? ''}'.toLowerCase()) {
          'active' => WaouhMissionStatus.searching,
          'paused' => WaouhMissionStatus.paused,
          'completed' => WaouhMissionStatus.completed,
          'cancelled' => WaouhMissionStatus.cancelled,
          'failed' => WaouhMissionStatus.failed,
          _ => _enumValue(
              WaouhMissionStatus.values,
              row['status'],
              WaouhMissionStatus.planning,
            ),
        },
        createdAt: _date(row['created_at']),
        updatedAt: _date(row['updated_at']),
        steps: (row['steps'] as List? ?? const <dynamic>[])
            .whereType<Map>()
            .map((value) => WaouhMissionStep.fromJson(
                  Map<String, dynamic>.from(value),
                ))
            .toList(growable: false),
        summary: _optional(row['summary'] ?? row['last_result_summary']),
        error: _optional(row['error'] ?? row['last_error']),
        criteria: (row['criteria'] ?? row['constraints']) is Map
            ? Map<String, dynamic>.from(
                (row['criteria'] ?? row['constraints']) as Map,
              )
            : const <String, dynamic>{},
        resultCount: (row['result_count'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'title': title,
        'request': request,
        'status': status.name,
        'created_at': createdAt.toUtc().toIso8601String(),
        'updated_at': updatedAt.toUtc().toIso8601String(),
        'steps': steps.map((step) => step.toJson()).toList(),
        if (summary != null) 'summary': summary,
        if (error != null) 'error': error,
        'criteria': criteria,
        'result_count': resultCount,
      };
}

class WaouhPriceWatch {
  const WaouhPriceWatch({
    required this.id,
    required this.productId,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    this.targetPrice,
    this.lastPrice,
    this.currency = 'XOF',
    this.watchStock = true,
    this.inStock,
    this.enabled = true,
    this.city,
    this.imageUrl,
    this.lastNotifiedAt,
  });

  final String id;
  final String productId;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final num? targetPrice;
  final num? lastPrice;
  final String currency;
  final bool watchStock;
  final bool? inStock;
  final bool enabled;
  final String? city;
  final String? imageUrl;
  final DateTime? lastNotifiedAt;

  bool get targetReached =>
      enabled &&
      targetPrice != null &&
      lastPrice != null &&
      lastPrice! <= targetPrice!;

  WaouhPriceWatch copyWith({
    num? targetPrice,
    num? lastPrice,
    bool? watchStock,
    bool? inStock,
    bool? enabled,
    DateTime? updatedAt,
    DateTime? lastNotifiedAt,
  }) =>
      WaouhPriceWatch(
        id: id,
        productId: productId,
        title: title,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        targetPrice: targetPrice ?? this.targetPrice,
        lastPrice: lastPrice ?? this.lastPrice,
        currency: currency,
        watchStock: watchStock ?? this.watchStock,
        inStock: inStock ?? this.inStock,
        enabled: enabled ?? this.enabled,
        city: city,
        imageUrl: imageUrl,
        lastNotifiedAt: lastNotifiedAt ?? this.lastNotifiedAt,
      );

  factory WaouhPriceWatch.fromJson(Map<String, dynamic> row) => WaouhPriceWatch(
        id: '${row['id'] ?? ''}',
        productId:
            '${row['product_id'] ?? row['article_id'] ?? row['id'] ?? ''}',
        title: '${row['title'] ?? row['query'] ?? 'Article suivi'}',
        createdAt: _date(row['created_at']),
        updatedAt: _date(row['updated_at']),
        targetPrice: _number(row['target_price'] ?? row['target_amount']),
        lastPrice: _number(row['last_price'] ?? row['last_observed_amount']),
        currency: '${row['currency'] ?? 'XOF'}',
        watchStock: row['watch_stock'] != false,
        inStock: row['in_stock'] as bool?,
        enabled: row['enabled'] != false && row['status'] != 'paused',
        city: _optional(row['city']),
        imageUrl: _optional(row['image_url']),
        lastNotifiedAt: row['last_notified_at'] == null
            ? null
            : _date(row['last_notified_at']),
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'product_id': productId,
        'title': title,
        'created_at': createdAt.toUtc().toIso8601String(),
        'updated_at': updatedAt.toUtc().toIso8601String(),
        if (targetPrice != null) 'target_price': targetPrice,
        if (lastPrice != null) 'last_price': lastPrice,
        'currency': currency,
        'watch_stock': watchStock,
        if (inStock != null) 'in_stock': inStock,
        'enabled': enabled,
        if (city != null) 'city': city,
        if (imageUrl != null) 'image_url': imageUrl,
        if (lastNotifiedAt != null)
          'last_notified_at': lastNotifiedAt!.toUtc().toIso8601String(),
      };
}

class WaouhApprovalRequest {
  const WaouhApprovalRequest({
    required this.id,
    required this.action,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    this.missionId,
    this.expiresAt,
    this.details = const <String, dynamic>{},
  });

  final String id;
  final String action;
  final String title;
  final String description;
  final WaouhApprovalStatus status;
  final DateTime createdAt;
  final String? missionId;
  final DateTime? expiresAt;
  final Map<String, dynamic> details;

  bool get pending => status == WaouhApprovalStatus.pending && !expired;
  bool get expired => expiresAt != null && expiresAt!.isBefore(DateTime.now());

  WaouhApprovalRequest copyWith({WaouhApprovalStatus? status}) =>
      WaouhApprovalRequest(
        id: id,
        action: action,
        title: title,
        description: description,
        status: status ?? this.status,
        createdAt: createdAt,
        missionId: missionId,
        expiresAt: expiresAt,
        details: details,
      );

  factory WaouhApprovalRequest.fromJson(Map<String, dynamic> row) =>
      WaouhApprovalRequest(
        id: '${row['id'] ?? row['approval_id'] ?? ''}',
        action: '${row['action'] ?? row['action_type'] ?? ''}',
        title:
            '${row['title'] ?? row['action_summary'] ?? 'Action à approuver'}',
        description:
            '${row['description'] ?? row['message'] ?? row['action_summary'] ?? ''}',
        status: '${row['status'] ?? ''}' == 'rejected'
            ? WaouhApprovalStatus.refused
            : _enumValue(
                WaouhApprovalStatus.values,
                row['status'],
                WaouhApprovalStatus.pending,
              ),
        createdAt: _date(row['created_at']),
        missionId: _optional(row['mission_id']),
        expiresAt: row['expires_at'] == null ? null : _date(row['expires_at']),
        details: row['details'] is Map
            ? Map<String, dynamic>.from(row['details'] as Map)
            : const <String, dynamic>{},
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'action': action,
        'title': title,
        'description': description,
        'status': status.name,
        'created_at': createdAt.toUtc().toIso8601String(),
        if (missionId != null) 'mission_id': missionId,
        if (expiresAt != null)
          'expires_at': expiresAt!.toUtc().toIso8601String(),
        'details': details,
      };
}

class WaouhActivityEntry {
  const WaouhActivityEntry({
    required this.id,
    required this.kind,
    required this.title,
    required this.detail,
    required this.createdAt,
    this.missionId,
    this.metadata = const <String, dynamic>{},
  });

  final String id;
  final WaouhActivityKind kind;
  final String title;
  final String detail;
  final DateTime createdAt;
  final String? missionId;
  final Map<String, dynamic> metadata;

  factory WaouhActivityEntry.fromJson(Map<String, dynamic> row) =>
      WaouhActivityEntry(
        id: '${row['id'] ?? ''}',
        kind: _enumValue(
          WaouhActivityKind.values,
          row['kind'],
          WaouhActivityKind.system,
        ),
        title: '${row['title'] ?? row['event_type'] ?? row['action'] ?? ''}',
        detail:
            '${row['detail'] ?? row['description'] ?? row['entity_type'] ?? ''}',
        createdAt: _date(row['created_at']),
        missionId: _optional(row['mission_id']),
        metadata: row['metadata'] is Map
            ? Map<String, dynamic>.from(row['metadata'] as Map)
            : const <String, dynamic>{},
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'kind': kind.name,
        'title': title,
        'detail': detail,
        'created_at': createdAt.toUtc().toIso8601String(),
        if (missionId != null) 'mission_id': missionId,
        'metadata': metadata,
      };
}

class WaouhAgenticSnapshot {
  const WaouhAgenticSnapshot({
    this.missions = const <WaouhMission>[],
    this.watches = const <WaouhPriceWatch>[],
    this.approvals = const <WaouhApprovalRequest>[],
    this.activity = const <WaouhActivityEntry>[],
  });

  final List<WaouhMission> missions;
  final List<WaouhPriceWatch> watches;
  final List<WaouhApprovalRequest> approvals;
  final List<WaouhActivityEntry> activity;

  factory WaouhAgenticSnapshot.fromJson(Map<String, dynamic> row) =>
      WaouhAgenticSnapshot(
        missions: (row['missions'] as List? ?? const <dynamic>[])
            .whereType<Map>()
            .map((item) => WaouhMission.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false),
        watches: (row['watches'] as List? ?? const <dynamic>[])
            .whereType<Map>()
            .map((item) => WaouhPriceWatch.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false),
        approvals: (row['approvals'] as List? ?? const <dynamic>[])
            .whereType<Map>()
            .map((item) => WaouhApprovalRequest.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false),
        activity: (row['activity'] as List? ?? const <dynamic>[])
            .whereType<Map>()
            .map((item) => WaouhActivityEntry.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false),
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'missions': missions.map((item) => item.toJson()).toList(),
        'watches': watches.map((item) => item.toJson()).toList(),
        'approvals': approvals.map((item) => item.toJson()).toList(),
        'activity': activity.map((item) => item.toJson()).toList(),
      };
}
