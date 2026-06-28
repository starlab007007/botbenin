import 'live_controller.dart';
import 'live_match_history_service.dart';
import 'live_models.dart';

extension LiveWaouhControllerMatches on LiveWaouhController {
  Future<LiveMatch?> resolveMatch(String key) async {
    final active = await notifications.loadMatches(auth.user?.id);
    final archived = await notifications.loadMatches(auth.user?.id, archived: true);
    for (final item in [...active, ...archived]) {
      if (item.key == key) return item;
    }
    return null;
  }

  Stream<List<LiveMessage>> matchMessages(LiveMatch match) async* {
    final history = LiveMatchHistoryService(chat.client, session);
    while (true) {
      yield await history.load(match: match, authUserId: auth.user?.id);
      await Future<void>.delayed(const Duration(seconds: 4));
    }
  }
}
