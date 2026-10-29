import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_guardian.dart';

void main() {
  test(
    'Guardian preserves error handlers and ignores unauthenticated reports',
    () async {
      final client = SupabaseClient(
        'https://example.invalid',
        'public-test-key',
      );
      final originalFlutter = FlutterError.onError;
      final originalPlatform = PlatformDispatcher.instance.onError;
      var flutterCalls = 0;
      var platformCalls = 0;
      try {
        FlutterError.onError = (_) {
          flutterCalls++;
        };
        PlatformDispatcher.instance.onError = (_, __) {
          platformCalls++;
          return true;
        };
        LiveGuardian.install(client);
        LiveGuardian.install(client);
        FlutterError.onError!(
          FlutterErrorDetails(exception: StateError('private content')),
        );
        expect(
          PlatformDispatcher.instance.onError!(
            StateError('private content'),
            StackTrace.current,
          ),
          isTrue,
        );
        await LiveGuardian.report(client, 'render_error');
        expect(flutterCalls, 1);
        expect(platformCalls, 1);
        expect(client.auth.currentSession, isNull);
      } finally {
        FlutterError.onError = originalFlutter;
        PlatformDispatcher.instance.onError = originalPlatform;
        await client.dispose();
      }
    },
  );
}
