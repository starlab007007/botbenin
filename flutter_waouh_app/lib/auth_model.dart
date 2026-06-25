import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_bootstrap.dart';
import 'core/local_identity.dart';

class AuthModel extends ChangeNotifier {
  AuthModel(this.identity) {
    session = supabase.auth.currentSession;
    sub = supabase.auth.onAuthStateChange.listen((event) {
      session = event.session;
      notifyListeners();
    });
  }

  final LocalIdentity identity;
  late final StreamSubscription<AuthState> sub;
  Session? session;
  bool get signedIn => session != null;
  User? get user => session?.user;

  Future<void> logout() async {
    await supabase.auth.signOut();
    session = null;
    notifyListeners();
  }

  @override
  void dispose() { sub.cancel(); super.dispose(); }
}
