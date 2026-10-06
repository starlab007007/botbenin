import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/user_message.dart';

void main() {
  group('WAOUH user-facing errors', () {
    test('does not expose backend diagnostics', () {
      final message = waouhUserMessage(
        Exception('PostgrestException PGRST301 internal server error'),
        action: 'load',
      );
      expect(message.toLowerCase(), isNot(contains('postgrest')));
      expect(message.toLowerCase(), isNot(contains('pgrst')));
    });

    test('translates expired sessions', () {
      expect(
        waouhUserMessage(Exception('JWT expired 401'), action: 'load'),
        contains('session'),
      );
    });

    test('translates transport timeouts', () {
      final message = waouhUserMessage(
        Exception('Signal timed out.'),
        action: 'send',
      );
      expect(message, contains('Réessayez'));
      expect(message, isNot(contains('Signal')));
    });

    test('detects technical strings', () {
      expect(waouhLooksTechnical('PostgrestException PGRST204'), isTrue);
      expect(waouhLooksTechnical('Impossible de terminer cette action.'), isFalse);
    });
  });
}
