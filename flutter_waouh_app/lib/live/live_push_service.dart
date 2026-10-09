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
  StreamSubscription<RemoteMessage>? _openedSubscription;
  bool _ready = false;

  /// Ouvre une route interne (renseignée par l'application au démarrage du routeur).
  static void Function(String route)? onOpenRoute;

  /// Route interne sûre portée par la notification (`route` ou `url`), sinon null.
  /// Seuls les chemins `/app/...` sont acceptés : jamais d'URL externe ni de `//`.
  static String? safeRouteFromData(Map<String, dynamic> data) {
    final raw = '${data['route'] ?? data['url'] ?? data['link'] ?? ''}'.trim();
    if (raw.isEmpty) return null;
    var path = raw;
    final uri = Uri.tryParse(raw);
    if (uri != null && uri.hasScheme) {
      const hosts = {'bot.bj', 'www.bot.bj'};
      if (!(uri.scheme == 'https' && hosts.contains(uri.host))) return null;
      path = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
    }
    if (!path.startsWith('/app/') || path.startsWith('//')) return null;
    return path;
  }

  void _openFromMessage(RemoteMessage message) {
    final route = safeRouteFromData(message.data);
    if (route != null) onOpenRoute?.call(route);
  }

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

    // Toucher une notification (application en arrière-plan ou fermée) ouvre le bon écran.
    _openedSubscription =
        FirebaseMessaging.onMessageOpenedApp.listen(_openFromMessage);
    try {
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        // Le routeur doit exister avant l'ouverture : on laisse le premier écran se monter.
        Future<void>.delayed(
          const Duration(milliseconds: 600),
          () => _openFromMessage(initial),
        );
      }
    } catch (error) {
      debugPrint('[WAOUH push] initial message unavailable: $error');
    }
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
    await _openedSubscription?.cancel();
  }
}
