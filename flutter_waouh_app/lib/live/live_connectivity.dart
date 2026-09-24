import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

class LiveConnectivity {
  LiveConnectivity(this._onChanged);

  final Future<void> Function(bool online) _onChanged;
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool online = true;

  Future<void> initialize() async {
    final values = await _connectivity.checkConnectivity();
    online = _hasNetwork(values);
    _subscription ??= _connectivity.onConnectivityChanged.listen((values) async {
      final next = _hasNetwork(values);
      if (next == online) return;
      online = next;
      await _onChanged(next);
    });
  }

  bool _hasNetwork(List<ConnectivityResult> values) =>
      values.isNotEmpty && !values.contains(ConnectivityResult.none);

  Future<void> dispose() async {
    await _subscription?.cancel();
  }
}
