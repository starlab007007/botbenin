import 'live_controller.dart';
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
    while (true) {
      final all = await chat.loadMainHistory(authUserId: auth.user?.id);
      yield all.where((message) {
        if (message.articleId != match.articleId) return false;
        if (match.role != 'seller' || match.counterpartUserId == null) return true;
        final value = message.meta['counterpart_user_id'] ?? message.meta['buyer_user_id'];
        return value == null || '$value' == match.counterpartUserId;
      }).toList();
      await Future<void>.delayed(const Duration(seconds: 4));
    }
  }
}
