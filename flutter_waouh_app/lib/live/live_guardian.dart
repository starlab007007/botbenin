import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Fixed categories only: no exception, URL, message or user content.
class LiveGuardian {
  static DateTime? _lastReport;
  static bool _installed = false;
  static Future<void> report(SupabaseClient client, String code) async {
    final now = DateTime.now();
    if (_lastReport != null && now.difference(_lastReport!).inSeconds < 60)
      return;
    if (client.auth.currentSession == null) return;
    _lastReport = now;
    try {
      await client.functions
          .invoke(
            'waouh-health-check',
            body: {
              'action': 'guardian.event',
              'platform': 'flutter',
              'code': code == 'render_error'
                  ? 'render_error'
                  : 'unhandled_error',
              'surface': 'other',
            },
          )
          .timeout(const Duration(seconds: 4));
    } catch (_) {
      /* Reporting never interrupts publication or navigation. */
    }
  }

  static void install(SupabaseClient client) {
    if (_installed) return;
    _installed = true;
    final previousFlutter = FlutterError.onError;
    FlutterError.onError = (details) {
      unawaited(report(client, 'render_error'));
      (previousFlutter ?? FlutterError.presentError)(details);
    };
    final previousPlatform = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (error, stack) {
      unawaited(report(client, 'unhandled_error'));
      return previousPlatform?.call(error, stack) ?? false;
    };
  }
}
