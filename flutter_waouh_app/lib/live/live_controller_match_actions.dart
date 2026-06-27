import 'live_controller.dart';
import 'live_models.dart';

extension LiveWaouhMatchActions on LiveWaouhController {
  Future<void> markMatchRead(LiveMatch match) async {
    for (final notificationId in match.notificationIds) {
      await notifications.markRead(notificationId);
    }
  }
}
