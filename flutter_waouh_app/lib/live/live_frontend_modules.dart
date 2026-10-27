import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart' as legacy;
import 'live_module_catalog.dart';
export 'live_module_catalog.dart';

String? moduleForPath(String value) {
  final path =
      Uri.tryParse(value)?.path.replaceFirst(RegExp(r'/$'), '') ?? value;
  final normalized = path.isEmpty ? '/' : path;
  final candidates = <Map<String, String>>[
    for (final row in moduleCatalog)
      for (final p in row['paths'] as List)
        {'key': '${row['key']}', 'path': '$p'},
  ]..sort((a, b) => b['path']!.length.compareTo(a['path']!.length));
  for (final row in candidates) {
    final p = row['path']!;
    if (normalized == p || (p != '/' && normalized.startsWith('$p/')))
      return row['key'];
  }
  return null;
}

class FrontendModulesController extends ChangeNotifier
    with WidgetsBindingObserver {
  FrontendModulesController(this.auth) {
    auth.addListener(_onAuthChanged);
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
    _channel = legacy.supabase
        .channel('module-policy-${DateTime.now().microsecondsSinceEpoch}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'waouh_module_revision',
          callback: (_) => _load(),
        )
        .subscribe();
  }
  final legacy.AuthController auth;
  Set<String> visibleKeys = {};
  Set<String> accessKeys = {};
  bool loading = true, error = false, _disposed = false;
  int _generation = 0;
  String? _owner;
  Timer? _timer;
  RealtimeChannel? _channel;
  bool canAccess(String key) => accessKeys.contains(key);
  void _onAuthChanged() {
    if (auth.user?.id != _owner) {
      _generation++;
      visibleKeys = {};
      accessKeys = {};
      loading = true;
      error = false;
      notifyListeners();
      _load();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  Future<void> reload() => _load();
  Future<void> _load() async {
    final version = ++_generation;
    _owner = auth.user?.id;
    try {
      final raw = await legacy.supabase.rpc('waouh_module_policy');
      if (_disposed || version != _generation) return;
      final rows = (raw as List).whereType<Map>();
      visibleKeys = {
        for (final r in rows)
          if (r['visible'] == true && r['access_enabled'] == true)
            '${r['module_key']}',
      };
      accessKeys = {
        for (final r in rows)
          if (r['access_enabled'] == true) '${r['module_key']}',
      };
      error = false;
    } catch (_) {
      if (_disposed || version != _generation) return;
      visibleKeys = {};
      accessKeys = {};
      error = true;
    }
    loading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    auth.removeListener(_onAuthChanged);
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    if (_channel != null) legacy.supabase.removeChannel(_channel!);
    super.dispose();
  }
}

class LiveModuleAccessGate extends StatelessWidget {
  const LiveModuleAccessGate({
    super.key,
    required this.path,
    required this.child,
    required this.onProfile,
  });
  final String path;
  final Widget child;
  final VoidCallback onProfile;
  @override
  Widget build(BuildContext context) {
    final key = moduleForPath(path);
    if (key == null) return child;
    final policy = context.watch<FrontendModulesController>();
    if (policy.loading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (policy.error || !policy.canAccess(key))
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    policy.error
                        ? 'Accès momentanément indisponible'
                        : 'Module indisponible',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    policy.error
                        ? 'Vérifiez votre connexion et réessayez.'
                        : 'Ce module n’est pas accessible à votre compte.',
                    textAlign: TextAlign.center,
                  ),
                  TextButton(
                    onPressed: policy.reload,
                    child: const Text('Réessayer'),
                  ),
                  TextButton(
                    onPressed: onProfile,
                    child: const Text('Mon compte'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    return child;
  }
}
