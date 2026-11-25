import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/native_auth_links.dart';

void main() {
  test('OAuth callback stays exclusively with Supabase, never the router', () {
    expect(nativeRouteForLink(Uri.parse('$nativeOAuthRedirect?code=private')), isNull);
    expect(nativeRouteForLink(Uri.parse('$nativeOAuthRedirect#error=denied')), isNull);
  });
  test('ordinary BOT.BJ links still open the requested screen', () {
    expect(nativeRouteForLink(Uri.parse('https://bot.bj/app/deal-room/123')), '/app/deal-room/123');
    expect(nativeRouteForLink(Uri.parse('https://www.bot.bj/app/auth?next=%2Fapp%2Fchat')), '/app/auth?next=%2Fapp%2Fchat');
  });
  test('reject untrusted origins and callback credentials in web routes', () {
    for (final value in [
      'https://bot.bj.evil.test/app/chat',
      'http://bot.bj/app/chat',
      'https://bot.bj@evil.test/app/chat',
      'https://bot.bj:444/app/chat',
      'https://bot.bj/application',
      'https://bot.bj/app/auth?code=private',
      'https://bot.bj/app/auth#access_token=private',
    ]) {
      expect(nativeRouteForLink(Uri.parse(value)), isNull, reason: value);
    }
  });
}
