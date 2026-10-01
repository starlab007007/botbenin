import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_bot_home.dart';

void main() {
  test('Bot accueille avec trois messages courts', () {
    final lines = liveBotGreetingLines('Songbian Karim Zime');
    expect(lines, hasLength(3));
    expect(lines.first, 'Bonjour Songbian, je suis Bot.');
    for (final line in lines) {
      expect(line.length, lessThanOrEqualTo(60));
    }
  });

  test('Invité ou nom par défaut : salutation neutre', () {
    expect(liveBotGreetingLines(null).first, 'Bonjour, je suis Bot.');
    expect(liveBotGreetingLines('WaouhApp').first, 'Bonjour, je suis Bot.');
  });
}
