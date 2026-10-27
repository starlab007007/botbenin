import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_frontend_modules.dart';

void main() {
  test('native catalogue and route ownership match the server and Web', () {
    final catalog = jsonDecode(
      File(
        '../supabase/functions/_shared/waouh-module-catalog.json',
      ).readAsStringSync(),
    );
    expect(moduleCatalog, catalog);
    for (final m in moduleCatalog) {
      for (final p in m['paths'] as List) {
        expect(moduleForPath('$p'), m['key']);
      }
    }
    expect(moduleForPath('/app/agents/bi/123'), 'bi');
    expect(moduleForPath('/admin/modules'), isNull);
    expect(moduleForPath('/app/profile'), isNull);
    expect(moduleForPath('/app/partner/payments/1'), 'paiements');
  });
}
