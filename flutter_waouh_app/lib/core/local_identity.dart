import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import 'app_config.dart';

class LocalIdentity {
  LocalIdentity._(this._prefs, this.sessionId);

  final SharedPreferences _prefs;
  final String sessionId;

  static Future<LocalIdentity> load() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(AppConfig.sessionStorageKey);
    if (id == null || id.isEmpty) {
      final suffix = Random.secure().nextInt(0x7fffffff).toRadixString(36);
      id = 'web_${DateTime.now().millisecondsSinceEpoch}_$suffix';
      await prefs.setString(AppConfig.sessionStorageKey, id);
    }
    return LocalIdentity._(prefs, id);
  }

  String? get threadCutoff => _prefs.getString(AppConfig.threadCutoffStorageKey);

  Future<void> startNewThread() => _prefs.setString(
        AppConfig.threadCutoffStorageKey,
        DateTime.now().toUtc().toIso8601String(),
      );

  Future<void> clearThreadCutoff() => _prefs.remove(AppConfig.threadCutoffStorageKey);

  int get guestMessageCount => _prefs.getInt(AppConfig.guestMessageCountStorageKey) ?? 0;

  Future<void> incrementGuestMessageCount() =>
      _prefs.setInt(AppConfig.guestMessageCountStorageKey, guestMessageCount + 1);

  Future<void> clearGuestMessageCount() =>
      _prefs.remove(AppConfig.guestMessageCountStorageKey);

  String? get city => _prefs.getString('waouh_city');

  Future<void> setCity(String value) => _prefs.setString('waouh_city', value.trim());
}
