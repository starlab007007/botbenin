import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/access_policy.dart';

void main() {
  group('WAOUH access policy', () {
    test('keeps discovery routes public and personal actions private', () {
      expect(requiresWaouhAuthentication('/app/chat'), isFalse);
      expect(requiresWaouhAuthentication('/app/avatar'), isFalse);
      expect(requiresWaouhAuthentication('/app/nexus'), isFalse);
      expect(requiresWaouhAuthentication('/app/presence/checkin'), isFalse);
      expect(requiresWaouhAuthentication('/app/chat/waouh'), isTrue);
      expect(requiresWaouhAuthentication('/app/avatar/acheter'), isTrue);
      expect(requiresWaouhAuthentication('/app/diffusion'), isTrue);
      expect(requiresWaouhAuthentication('/app/profile'), isTrue);
      expect(requiresWaouhAuthentication('/app/notifications'), isTrue);
    });

    test('rejects external and auth-loop redirects', () {
      expect(normalizeWaouhNextRoute('https://example.com'), defaultPublicWaouhPath);
      expect(normalizeWaouhNextRoute('//example.com'), defaultPublicWaouhPath);
      expect(normalizeWaouhNextRoute('/app/auth/email'), defaultPublicWaouhPath);
    });

    test('preserves safe internal destinations', () {
      expect(
        normalizeWaouhNextRoute('/app/chat/42?from=radar'),
        '/app/chat/42?from=radar',
      );
      expect(
        buildWaouhAuthRoute('/app/diffusion'),
        '/app/auth?next=%2Fapp%2Fdiffusion',
      );
    });
  });
}
