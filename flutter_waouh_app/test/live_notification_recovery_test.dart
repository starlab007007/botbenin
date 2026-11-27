import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/access_policy.dart';
import 'package:waouh_app_native/live/live_push_service.dart';

void main() {
  const room = '12345678-1234-4234-8234-123456789abc';
  const old = '/app/chat?room_id=$room';
  const canonical = '/app/chat/room?room_id=$room';

  test('legacy Smart Reply and Cascade routes open the exact room', () {
    expect(canonicalWaouhRoomRoute(Uri.parse(old)), canonical);
    expect(normalizeWaouhNextRoute(old), canonical);
    expect(requiresWaouhAuthentication(Uri.parse(canonical).path), isTrue);
    expect(canonicalWaouhRoomRoute(Uri.parse(canonical)), isNull);
    expect(canonicalWaouhRoomRoute(Uri.parse('/app/chat')), isNull);
    expect(canonicalWaouhRoomRoute(Uri.parse('/app/chat?room_id=')), isNull);
  });

  test('push preserves room identity and rejects external destinations', () {
    expect(LivePushService.safeRouteFromData({'route': old}), canonical);
    expect(LivePushService.safeRouteFromData({'route': 'https://bot.bj$old'}), canonical);
    expect(LivePushService.safeRouteFromData({'room_id': room}), canonical);
    expect(LivePushService.safeRouteFromData({'route': 'https://other.invalid$old'}), isNull);
    expect(LivePushService.safeRouteFromData({'route': '//other.invalid/app/chat'}), isNull);
  });
}
