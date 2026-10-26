import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart' as legacy;

/// Parité Web `src/hooks/useFrontendModules.ts` : modules de navigation
/// (menu « Espace de travail ») visibles pour l'utilisateur courant, d'après
/// les réglages admin (`public.waouh_frontend_modules` /
/// `waouh_frontend_module_roles`) et son rôle. Se met à jour en direct via
/// Supabase Realtime quand un admin bascule un module, sans redémarrage de
/// l'application.
///
/// `visibleKeys == null` pendant le premier chargement ou en cas d'échec
/// réseau/RPC : les écrans consommateurs (voir `live_menu_sheet.dart`)
/// doivent alors tout afficher (fail-open), pour éviter de priver
/// l'utilisateur de modules par erreur.
class FrontendModulesController extends ChangeNotifier {
  FrontendModulesController(this.auth) {
    auth.addListener(_onAuthChanged);
    _load();
    _subscribe();
  }

  final legacy.AuthController auth;
  Set<String>? visibleKeys;

  String? _loadedForUserId;
  RealtimeChannel? _channel;

  void _onAuthChanged() {
    final uid = auth.user?.id;
    if (uid == _loadedForUserId) return;
    _load();
  }

  Future<void> _load() async {
    final uid = auth.user?.id;
    _loadedForUserId = uid;
    try {
      final data = await legacy.supabase.rpc(
        'waouh_visible_modules_for_user',
        params: {'p_user_id': uid},
      );
      if (_loadedForUserId != uid) return; // une requête plus récente a démarré
      final keys = (data as List? ?? const [])
          .map((row) => row is String ? row : '${row['waouh_visible_modules_for_user'] ?? ''}')
          .where((k) => k.isNotEmpty)
          .toSet();
      visibleKeys = keys;
    } catch (_) {
      // Échec réseau/RPC : on n'affame pas la navigation, tout reste visible.
      visibleKeys = null;
    }
    notifyListeners();
  }

  void _subscribe() {
    _channel = legacy.supabase
        .channel(
            'waouh_frontend_modules_${DateTime.now().microsecondsSinceEpoch}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'waouh_frontend_modules',
          callback: (_) => _load(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'waouh_frontend_module_roles',
          callback: (_) => _load(),
        )
        .subscribe();
  }

  @override
  void dispose() {
    auth.removeListener(_onAuthChanged);
    final c = _channel;
    _channel = null;
    if (c != null) unawaited(legacy.supabase.removeChannel(c));
    super.dispose();
  }
}
