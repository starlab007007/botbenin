import '../main.dart' as legacy;
import 'live_controller.dart';

class LiveWaouhControllerV2 extends LiveWaouhController {
  LiveWaouhControllerV2(super.auth);

  @override
  Future<void> initialize() async {
    await super.initialize();
    // Same reconciliation performed by React useWaouhIdentity. It links the
    // WAOUH identity created for this Android session to the signed-in account
    // before chat, matches and notifications are queried.
    await chat.waouhUserIds(auth.user?.id);
  }
}
