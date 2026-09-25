import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Optional native push bootstrap.
///
/// WAOUH must keep working when Firebase Android configuration is intentionally
/// absent from source control. When a valid google-services configuration is
/// injected by the release environment, this service registers and refreshes
/// the FCM token through the authenticated Edge Function.
class LivePushService {
  LivePushService(this.client);

  final SupabaseClient client;
  StreamSubscription<String>? _tokenSubscription;
  StreamSubscription<AuthState>? _authSubscription;
  bool _ready = false;

  Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      _ready = true;
    } catch (error) {
      debugPrint('[WAOUH push] Firebase unavailable: $error');
      return;
    }

    try {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (error) {
      debugPrint('[WAOUH push] permission request skipped: $error');
    }

    await _registerCurrentToken();

    _tokenSubscription =
        FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      unawaited(_registerToken(token));
    });

    _authSubscription = client.auth.onAuthStateChange.listen((_) {
      unawaited(_registerCurrentToken());
    });
  }

  Future<void> _registerCurrentToken() async {
    if (!_ready || client.auth.currentUser == null) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.trim().isNotEmpty) {
        await _registerToken(token);
      }
    } catch (error) {
      debugPrint('[WAOUH push] token unavailable: $error');
    }
  }

  Future<void> _registerToken(String token) async {
    if (!_ready || client.auth.currentUser == null || token.trim().isEmpty) {
      return;
    }
    try {
      await client.functions.invoke(
        'register-device-token',
        body: <String, dynamic>{
          'fcm_token': token.trim(),
          'platform': defaultTargetPlatform == TargetPlatform.iOS
              ? 'ios'
              : 'android',
        },
      );
    } catch (error) {
      debugPrint('[WAOUH push] token registration failed: $error');
    }
  }

  Future<void> dispose() async {
    await _tokenSubscription?.cancel();
    await _authSubscription?.cancel();
  }
}
