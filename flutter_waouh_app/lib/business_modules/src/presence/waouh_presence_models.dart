enum WaouhPresenceAction { arrival, breakStart, breakEnd, departure }

extension WaouhPresenceActionX on WaouhPresenceAction {
  String get wireName => switch (this) {
    WaouhPresenceAction.arrival => 'arrival',
    WaouhPresenceAction.breakStart => 'break_start',
    WaouhPresenceAction.breakEnd => 'break_end',
    WaouhPresenceAction.departure => 'departure',
  };

  String get label => switch (this) {
    WaouhPresenceAction.arrival => 'Arrivée',
    WaouhPresenceAction.breakStart => 'Début pause',
    WaouhPresenceAction.breakEnd => 'Retour pause',
    WaouhPresenceAction.departure => 'Départ',
  };

  static WaouhPresenceAction fromWireName(String value) => switch (value) {
    'break_start' => WaouhPresenceAction.breakStart,
    'break_end' => WaouhPresenceAction.breakEnd,
    'departure' || 'check_out' => WaouhPresenceAction.departure,
    _ => WaouhPresenceAction.arrival,
  };
}

class WaouhPresenceSite {
  const WaouhPresenceSite({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    required this.active,
    required this.requireGeolocation,
    required this.requireEmployeeCode,
    required this.requirePin,
    required this.maxAccuracyMeters,
    required this.timezone,
    required this.createdAt,
    this.address,
    this.responsibleWhatsapp,
  });

  final String id;
  final String name;
  final String? address;
  final double latitude;
  final double longitude;
  final int radiusMeters;
  final int maxAccuracyMeters;
  final bool active;
  final bool requireGeolocation;
  final bool requireEmployeeCode;
  final bool requirePin;
  final String timezone;
  final String? responsibleWhatsapp;
  final DateTime createdAt;

  factory WaouhPresenceSite.fromJson(Map<String, dynamic> json) {
    return WaouhPresenceSite(
      id: '${json['id'] ?? ''}',
      name: _text(json['name']) ?? 'Site',
      address: _text(json['address']),
      latitude: _double(json['latitude']),
      longitude: _double(json['longitude']),
      radiusMeters: _int(json['radius_meters'], fallback: 100),
      maxAccuracyMeters: _int(json['max_accuracy_meters'], fallback: 100),
      active: json['active'] != false,
      requireGeolocation: json['require_geolocation'] != false,
      requireEmployeeCode: json['require_employee_code'] == true,
      requirePin: json['require_pin'] == true,
      timezone: _text(json['timezone']) ?? 'Africa/Porto-Novo',
      responsibleWhatsapp: _text(json['responsible_whatsapp']),
      createdAt:
          DateTime.tryParse('${json['created_at'] ?? ''}') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class WaouhPresenceMember {
  const WaouhPresenceMember({
    required this.id,
    required this.siteId,
    required this.displayName,
    required this.employeeCode,
    required this.role,
    required this.status,
    required this.createdAt,
    this.email,
    this.phone,
    this.memberUserId,
  });

  final String id;
  final String siteId;
  final String displayName;
  final String employeeCode;
  final String? email;
  final String? phone;
  final String? memberUserId;
  final String role;
  final String status;
  final DateTime createdAt;

  bool get isManager => role == 'manager';
  bool get isActive => status == 'active';

  factory WaouhPresenceMember.fromJson(Map<String, dynamic> json) {
    return WaouhPresenceMember(
      id: '${json['id'] ?? ''}',
      siteId: '${json['site_id'] ?? ''}',
      displayName: _text(json['display_name']) ?? 'Membre',
      employeeCode: _text(json['employee_code']) ?? '—',
      email: _text(json['member_email']),
      phone: _text(json['member_phone']),
      memberUserId: _text(json['member_user_id']),
      role: _text(json['role']) ?? 'employee',
      status: _text(json['status']) ?? 'active',
      createdAt:
          DateTime.tryParse('${json['created_at'] ?? ''}') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class WaouhPresenceEvent {
  const WaouhPresenceEvent({
    required this.id,
    required this.siteId,
    required this.siteName,
    required this.memberName,
    required this.action,
    required this.occurredAt,
    required this.insideRadius,
    this.distanceMeters,
    this.accuracyMeters,
  });

  final String id;
  final String siteId;
  final String siteName;
  final String memberName;
  final WaouhPresenceAction action;
  final DateTime occurredAt;
  final bool insideRadius;
  final double? distanceMeters;
  final double? accuracyMeters;

  factory WaouhPresenceEvent.fromJson(Map<String, dynamic> json) {
    final site = json['waouh_presence_sites'];
    final member = json['waouh_presence_members'];
    return WaouhPresenceEvent(
      id: '${json['id'] ?? ''}',
      siteId: '${json['site_id'] ?? ''}',
      siteName: site is Map
          ? _text(site['name']) ?? 'Site'
          : _text(json['site_name']) ?? 'Site',
      memberName: member is Map
          ? _text(member['display_name']) ?? 'Membre'
          : _text(json['member_name']) ?? 'Membre',
      action: WaouhPresenceActionX.fromWireName('${json['action'] ?? ''}'),
      occurredAt:
          DateTime.tryParse('${json['occurred_at'] ?? ''}') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      insideRadius: json['inside_radius'] != false,
      distanceMeters: _nullableDouble(json['distance_meters']),
      accuracyMeters: _nullableDouble(json['accuracy_meters']),
    );
  }
}

class WaouhPresenceDashboard {
  const WaouhPresenceDashboard({
    required this.siteCount,
    required this.activeMembers,
    required this.presentNow,
    required this.eventsToday,
    required this.recentEvents,
  });

  final int siteCount;
  final int activeMembers;
  final int presentNow;
  final int eventsToday;
  final List<WaouhPresenceEvent> recentEvents;

  factory WaouhPresenceDashboard.fromJson(Map<String, dynamic> json) {
    return WaouhPresenceDashboard(
      siteCount: _int(json['site_count']),
      activeMembers: _int(json['active_members']),
      presentNow: _int(json['present_now']),
      eventsToday: _int(json['events_today']),
      recentEvents: _mapList(
        json['recent_events'],
      ).map(WaouhPresenceEvent.fromJson).toList(),
    );
  }
}

class WaouhPresenceQrToken {
  const WaouhPresenceQrToken({
    required this.payload,
    required this.siteName,
    required this.expiresAt,
    required this.useLimit,
    required this.useCount,
  });

  final String payload;
  final String siteName;
  final DateTime expiresAt;
  final int useLimit;
  final int useCount;

  factory WaouhPresenceQrToken.fromJson(Map<String, dynamic> json) {
    return WaouhPresenceQrToken(
      payload: '${json['qr_payload'] ?? ''}',
      siteName: _text(json['site_name']) ?? 'Site',
      expiresAt: DateTime.parse('${json['expires_at']}'),
      useLimit: _int(json['use_limit'], fallback: 500),
      useCount: _int(json['use_count']),
    );
  }
}

class WaouhPresenceQrPreview {
  const WaouhPresenceQrPreview({
    required this.siteId,
    required this.siteName,
    required this.expiresAt,
    required this.identityRequired,
    required this.requireEmployeeCode,
    required this.requirePin,
    required this.requireGeolocation,
    required this.radiusMeters,
    this.address,
    this.memberName,
  });

  final String siteId;
  final String siteName;
  final String? address;
  final DateTime expiresAt;
  final bool identityRequired;
  final bool requireEmployeeCode;
  final bool requirePin;
  final bool requireGeolocation;
  final int radiusMeters;
  final String? memberName;

  factory WaouhPresenceQrPreview.fromJson(Map<String, dynamic> json) {
    return WaouhPresenceQrPreview(
      siteId: '${json['site_id'] ?? ''}',
      siteName: _text(json['site_name']) ?? 'Site',
      address: _text(json['address']),
      expiresAt: DateTime.parse('${json['expires_at']}'),
      identityRequired: json['identity_required'] == true,
      requireEmployeeCode: json['require_employee_code'] == true,
      requirePin: json['require_pin'] == true,
      requireGeolocation: json['require_geolocation'] != false,
      radiusMeters: _int(json['radius_meters'], fallback: 100),
      memberName: _text(json['member_name']),
    );
  }
}

class WaouhPresenceRecordResult {
  const WaouhPresenceRecordResult({
    required this.message,
    required this.alreadyRecorded,
    required this.event,
  });

  final String message;
  final bool alreadyRecorded;
  final WaouhPresenceEvent event;

  factory WaouhPresenceRecordResult.fromJson(Map<String, dynamic> json) {
    final rawEvent = json['event'];
    if (rawEvent is! Map) {
      throw StateError('Évènement de présence absent.');
    }
    return WaouhPresenceRecordResult(
      message: _text(json['message']) ?? 'Présence enregistrée.',
      alreadyRecorded: json['already_recorded'] == true,
      event: WaouhPresenceEvent.fromJson(Map<String, dynamic>.from(rawEvent)),
    );
  }
}

int _int(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}') ?? fallback;
}

double _double(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

double? _nullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse('$value');
}

String? _text(dynamic value) {
  final text = '${value ?? ''}'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

List<Map<String, dynamic>> _mapList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}
