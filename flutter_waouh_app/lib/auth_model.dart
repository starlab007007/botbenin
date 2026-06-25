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
  late final AuthStateSubscription sub;
  Session? session;
  bool busy = false;
  String? message;
  bool get signedIn => session != null;
  User? get user => session?.user;

  Future<void> login(String email, String secret) async {
    busy = true; message = null; notifyListeners();
    try {
      await supabase.auth.signInWithPassword(email: email.trim(), password: secret);
      session = supabase.auth.currentSession;
      await identity.clearGuestMessageCount();
    } catch (e) { message = e.toString(); rethrow; }
    finally { busy = false; notifyListeners(); }
  }

  Future<void> logout() async {
    await supabase.auth.signOut();
    session = null;
    notifyListeners();
  }

  @override
  void dispose() { sub.cancel(); super.dispose(); }
}
