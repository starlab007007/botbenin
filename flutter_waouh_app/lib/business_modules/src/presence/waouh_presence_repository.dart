import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_presence_models.dart';

class WaouhPresenceRepository {
  const WaouhPresenceRepository(this.client);

  final SupabaseClient client;

  String get _userId {
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Connectez-vous pour utiliser Présence QR.');
    }
    return user.id;
  }

  Future<void> claimMemberships() async {
    await client.rpc('waouh_presence_claim_memberships_v5');
  }

  Future<List<WaouhPresenceSite>> fetchSites() async {
    await claimMemberships();
    final rows = await client
        .from('waouh_presence_sites')
        .select()
        .order('created_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) => WaouhPresenceSite.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<WaouhPresenceDashboard> fetchDashboard({String? siteId}) async {
    final raw = await client.rpc(
      'waouh_presence_dashboard_v5',
      params: {'p_site_id': siteId},
    );
    if (raw is! Map) {
      throw StateError('Tableau de bord Présence QR invalide.');
    }
    return WaouhPresenceDashboard.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<List<WaouhPresenceMember>> fetchMembers(String siteId) async {
    final rows = await client
        .from('waouh_presence_members')
        .select()
        .eq('site_id', siteId)
        .order('display_name');
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              WaouhPresenceMember.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<List<WaouhPresenceEvent>> fetchEvents({
    String? siteId,
    int limit = 100,
  }) async {
    var query = client
        .from('waouh_presence_events')
        .select(
          'id,site_id,member_id,action,occurred_at,inside_radius,'
          'distance_meters,accuracy_meters,'
          'waouh_presence_sites(name),'
          'waouh_presence_members(display_name)',
        );
    if (siteId != null && siteId.isNotEmpty) {
      query = query.eq('site_id', siteId);
    }
    final rows = await query
        .order('occurred_at', ascending: false)
        .limit(limit);
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              WaouhPresenceEvent.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<WaouhPresenceSite> saveSite({
    String? siteId,
    required String name,
    String? address,
    required double latitude,
    required double longitude,
    required int radiusMeters,
    required int maxAccuracyMeters,
    required bool requireGeolocation,
    required bool requireEmployeeCode,
    required bool requirePin,
    String? responsibleWhatsapp,
    bool active = true,
  }) async {
    _userId;
    final cleanName = name.trim();
    if (cleanName.isEmpty) {
      throw ArgumentError.value(name, 'name', 'Nom du site obligatoire');
    }
    if (latitude < -90 || latitude > 90) {
      throw ArgumentError.value(latitude, 'latitude', 'Latitude invalide');
    }
    if (longitude < -180 || longitude > 180) {
      throw ArgumentError.value(longitude, 'longitude', 'Longitude invalide');
    }
    if (radiusMeters < 10 || radiusMeters > 10000) {
      throw ArgumentError.value(
        radiusMeters,
        'radiusMeters',
        'Rayon compris entre 10 et 10 000 mètres',
      );
    }

    final function = siteId == null
        ? 'waouh_presence_create_site_v5'
        : 'waouh_presence_update_site_v5';
    final params = <String, dynamic>{
      if (siteId != null) 'p_site_id': siteId,
      'p_name': cleanName,
      'p_address': _nullable(address),
      'p_latitude': latitude,
      'p_longitude': longitude,
      'p_radius_meters': radiusMeters,
      'p_max_accuracy_meters': maxAccuracyMeters,
      'p_require_geolocation': requireGeolocation,
      'p_require_employee_code': requireEmployeeCode,
      'p_require_pin': requirePin,
      'p_responsible_whatsapp': _nullable(responsibleWhatsapp),
      'p_active': active,
    };
    final raw = await client.rpc(function, params: params);
    return WaouhPresenceSite.fromJson(
      _singleMap(raw, 'Réponse de configuration du site invalide.'),
    );
  }

  Future<WaouhPresenceMember> saveMember({
    required String siteId,
    String? memberId,
    required String displayName,
    String? employeeCode,
    String? email,
    String? phone,
    required String role,
    String? pin,
  }) async {
    final clean = displayName.trim();
    if (clean.isEmpty) {
      throw ArgumentError.value(
        displayName,
        'displayName',
        'Nom du membre obligatoire',
      );
    }
    if (pin != null &&
        pin.trim().isNotEmpty &&
        !RegExp(r'^\d{4}$').hasMatch(pin.trim())) {
      throw ArgumentError.value(pin, 'pin', 'Le PIN doit contenir 4 chiffres');
    }

    final raw = await client.rpc(
      'waouh_presence_upsert_member_v5',
      params: {
        'p_site_id': siteId,
        'p_member_id': memberId,
        'p_display_name': clean,
        'p_employee_code': _nullable(employeeCode),
        'p_email': _nullable(email),
        'p_phone': _nullable(phone),
        'p_role': role,
        'p_pin': _nullable(pin),
      },
    );
    return WaouhPresenceMember.fromJson(
      _singleMap(raw, 'Réponse de gestion de l’équipe invalide.'),
    );
  }

  Future<void> setMemberStatus({
    required String memberId,
    required String status,
  }) async {
    await client.rpc(
      'waouh_presence_set_member_status_v5',
      params: {'p_member_id': memberId, 'p_status': status},
    );
  }

  Future<WaouhPresenceQrToken> createQrToken(
    WaouhPresenceSite site, {
    int validityMinutes = 60,
    int useLimit = 500,
  }) async {
    final data = await _invoke('waouh-presence-qr-create', {
      'site_id': site.id,
      'validity_minutes': validityMinutes,
      'use_limit': useLimit,
      'replace_active': true,
    });
    return WaouhPresenceQrToken.fromJson(data);
  }

  Future<WaouhPresenceQrPreview> previewQr(String qrPayload) async {
    final data = await _invoke('waouh-presence-qr-preview', {
      'qr_payload': qrPayload,
    });
    return WaouhPresenceQrPreview.fromJson(data);
  }

  Future<WaouhPresenceRecordResult> record({
    required String qrPayload,
    required WaouhPresenceAction action,
    required double latitude,
    required double longitude,
    required double accuracyMeters,
    String? employeeCode,
    String? pin,
  }) async {
    final data = await _invoke('waouh-presence-checkin', {
      'qr_payload': qrPayload,
      'action': action.wireName,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy_meters': accuracyMeters,
      'employee_code': _nullable(employeeCode),
      'pin': _nullable(pin),
    });
    return WaouhPresenceRecordResult.fromJson(data);
  }

  Future<Map<String, dynamic>> _invoke(
    String functionName,
    Map<String, dynamic> body,
  ) async {
    late final FunctionResponse response;
    try {
      response = await client.functions.invoke(functionName, body: body);
    } on FunctionException catch (error) {
      throw StateError(_functionMessage(error));
    }
    final raw = response.data;
    if (raw is! Map) {
      throw StateError('Réponse $functionName invalide.');
    }
    final data = Map<String, dynamic>.from(raw);
    if ('${data['error'] ?? ''}'.trim().isNotEmpty) {
      final message = _detail(data);
      throw StateError(
        message.isEmpty ? 'Opération Présence QR impossible.' : message,
      );
    }
    return data;
  }
}

Map<String, dynamic> _singleMap(dynamic value, String errorMessage) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  if (value is List && value.length == 1 && value.first is Map) {
    return Map<String, dynamic>.from(value.first as Map);
  }
  throw StateError(errorMessage);
}

String? _nullable(String? value) {
  final text = value?.trim() ?? '';
  return text.isEmpty ? null : text;
}

String _functionMessage(FunctionException error) {
  final detail = _detail(error.details);
  if (detail.isNotEmpty) return detail;
  final reason = (error.reasonPhrase ?? '').trim();
  if (reason.isNotEmpty) return reason;
  return 'Le service Présence QR a retourné une erreur '
      '${error.status}.';
}

String _detail(dynamic value) {
  if (value == null) return '';
  if (value is String) {
    final text = value.trim();
    return text == '[object Object]' ? '' : text;
  }
  if (value is Map) {
    for (final key in const ['message', 'error', 'details', 'hint', 'code']) {
      if (value.containsKey(key)) {
        final text = _detail(value[key]);
        if (text.isNotEmpty) return text;
      }
    }
    return value.entries
        .map((entry) {
          final text = _detail(entry.value);
          return text.isEmpty ? '' : '${entry.key}: $text';
        })
        .where((text) => text.isNotEmpty)
        .join(' · ');
  }
  if (value is Iterable) {
    return value.map(_detail).where((text) => text.isNotEmpty).join(' · ');
  }
  return value.toString().trim();
}
