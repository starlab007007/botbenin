import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_agentic_models.dart';

class LiveAgenticRemoteService {
  LiveAgenticRemoteService(this.client);

  final SupabaseClient client;

  /// The remote plane is deliberately best-effort. The device snapshot keeps
  /// missions recoverable while an older backend is still being rolled out.
  Future<Map<String, dynamic>?> dispatch(
    String action, [
    Map<String, dynamic> payload = const <String, dynamic>{},
  ]) async {
    try {
      final response = await client.functions.invoke(
        'waouh-studio-e2e-v21465',
        body: <String, dynamic>{'action': action, 'payload': payload},
      );
      final raw = response.data;
      if (raw is! Map || raw['ok'] != true) return null;
      final data = raw['data'];
      return data is Map ? Map<String, dynamic>.from(data) : null;
    } catch (_) {
      return null;
    }
  }
}

class LiveAgenticRepository {
  LiveAgenticRepository({required this.remote});

  static const _storagePrefix = 'waouh_agentic_v1_';

  final LiveAgenticRemoteService remote;
  SharedPreferences? _preferences;

  String _key(String scope) =>
      '$_storagePrefix${base64Url.encode(utf8.encode(scope)).replaceAll('=', '')}';

  Future<SharedPreferences> _prefs() async =>
      _preferences ??= await SharedPreferences.getInstance();

  Future<WaouhAgenticSnapshot> loadLocal(String scope) async {
    final encoded = (await _prefs()).getString(_key(scope));
    if (encoded == null || encoded.trim().isEmpty) {
      return const WaouhAgenticSnapshot();
    }
    try {
      final decoded = jsonDecode(encoded);
      return decoded is Map
          ? WaouhAgenticSnapshot.fromJson(Map<String, dynamic>.from(decoded))
          : const WaouhAgenticSnapshot();
    } catch (_) {
      return const WaouhAgenticSnapshot();
    }
  }

  Future<void> saveLocal(
    String scope,
    WaouhAgenticSnapshot snapshot,
  ) async {
    await (await _prefs())
        .setString(_key(scope), jsonEncode(snapshot.toJson()));
  }

  Future<WaouhAgenticSnapshot?> loadRemote() async {
    final values = await Future.wait<
        Map<String, dynamic>?>(<Future<Map<String, dynamic>?>>[
      remote.dispatch('mission.list', const <String, dynamic>{'limit': 100}),
      remote.dispatch('watch.list', const <String, dynamic>{'limit': 100}),
      remote.dispatch('approval.list', const <String, dynamic>{'limit': 100}),
      remote.dispatch('activity.list', const <String, dynamic>{'limit': 100}),
    ]);
    if (values.every((value) => value == null)) return null;
    List<dynamic> items(Map<String, dynamic>? data, String key) {
      final raw = data?[key] ?? data?['items'];
      return raw is List ? raw : const <dynamic>[];
    }

    return WaouhAgenticSnapshot.fromJson(<String, dynamic>{
      'missions': items(values[0], 'missions'),
      'watches': items(values[1], 'watches'),
      'approvals': items(values[2], 'approvals'),
      'activity': items(values[3], 'activities'),
    });
  }

  Future<Map<String, dynamic>?> createMission(WaouhMission mission) async {
    final data = await remote.dispatch('mission.create', <String, dynamic>{
      'goal': mission.request,
      'channel': 'mobile',
      'locale': 'fr-BJ',
      'constraints': mission.criteria,
      'preferences': const <String, dynamic>{},
    });
    final missionRow = data?['mission'];
    return missionRow is Map ? Map<String, dynamic>.from(missionRow) : null;
  }

  Future<void> pauseMission(String id) async {
    await remote.dispatch('mission.pause', <String, dynamic>{'mission_id': id});
  }

  Future<void> resumeMission(String id) async {
    await remote
        .dispatch('mission.resume', <String, dynamic>{'mission_id': id});
    await remote.dispatch('mission.run', <String, dynamic>{'mission_id': id});
  }

  Future<void> cancelMission(String id) async {
    await remote
        .dispatch('mission.cancel', <String, dynamic>{'mission_id': id});
  }

  Future<Map<String, dynamic>?> createWatch(WaouhPriceWatch watch) async {
    final data = await remote.dispatch('watch.create', <String, dynamic>{
      'query': watch.title,
      if (watch.targetPrice != null) 'target_amount': watch.targetPrice,
      'currency': watch.currency,
      'check_interval_minutes': 60,
    });
    final row = data?['watch'];
    return row is Map ? Map<String, dynamic>.from(row) : null;
  }

  Future<void> updateWatch(WaouhPriceWatch watch) async {
    await remote.dispatch('watch.update', <String, dynamic>{
      'watch_id': watch.id,
      'query': watch.title,
      if (watch.targetPrice != null) 'target_amount': watch.targetPrice,
      'status': watch.enabled ? 'active' : 'paused',
    });
  }

  Future<void> deleteWatch(String id) async {
    await remote.dispatch('watch.delete', <String, dynamic>{'watch_id': id});
  }

  Future<void> resolveApproval(
    WaouhApprovalRequest approval,
    WaouhApprovalStatus status,
  ) async {
    await remote.dispatch('resolve_approval', <String, dynamic>{
      'approval_id': approval.id,
      'decision':
          status == WaouhApprovalStatus.approved ? 'approved' : 'rejected',
    });
  }
}
