import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

class LiveSessionStore {
  static const _sessionKey = 'waouh_web_session_id';
  static const _cityKey = 'waouh_city';
  static const _threadCutoffKey = 'waouh_main_thread_started_at';
  static const _guestCountKey = 'waouh_guest_msg_count';

  SharedPreferences? _prefs;
  String? _sessionId;

  Future<void> initialize() async {
    if (_prefs != null && _sessionId != null) return;
    _prefs = await SharedPreferences.getInstance();
    var id = _prefs!.getString(_sessionKey);
    if (id == null || id.isEmpty) {
      final token = Random.secure().nextInt(0x7fffffff).toRadixString(36);
      id = 'web_${DateTime.now().millisecondsSinceEpoch}_$token';
      await _prefs!.setString(_sessionKey, id);
    }
    _sessionId = id;
  }

  Future<String> get sessionId async {
    await initialize();
    return _sessionId!;
  }

  Future<String> get city async {
    await initialize();
    return _prefs!.getString(_cityKey) ?? '';
  }

  Future<void> setCity(String value) async {
    await initialize();
    await _prefs!.setString(_cityKey, value.trim());
  }

  Future<String?> get threadCutoff async {
    await initialize();
    return _prefs!.getString(_threadCutoffKey);
  }

  Future<void> startNewThread() async {
    await initialize();
    await _prefs!.setString(
      _threadCutoffKey,
      DateTime.now().toUtc().toIso8601String(),
    );
  }

  Future<int> get guestMessageCount async {
    await initialize();
    return _prefs!.getInt(_guestCountKey) ?? 0;
  }

  Future<void> incrementGuestMessageCount() async {
    await initialize();
    await _prefs!.setInt(_guestCountKey, (await guestMessageCount) + 1);
  }

  Future<void> clearGuestMessageCount() async {
    await initialize();
    await _prefs!.remove(_guestCountKey);
  }
}
