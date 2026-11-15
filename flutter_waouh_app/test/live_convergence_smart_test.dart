import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/convergence/live_convergence_smart.dart';

void main() {
  test('devine la nature du besoin', () {
    expect(detectNeedKind('plombier à Cotonou demain'), 'service');
    expect(detectNeedKind('Réparer une fuite'), 'service');
    expect(detectNeedKind('stage en comptabilité'), 'announcement');
    expect(detectNeedKind('téléphone Android de marque soloking'), 'product');
    expect(detectNeedKind('riz parfumé'), 'product');
  });

  test('lit le budget écrit dans la phrase', () {
    expect(detectBudget('téléphone à 80 000 F'), 80000);
    expect(detectBudget('un frigo max 150000 fcfa'), 150000);
    expect(detectBudget('moto 500k cfa'), 500000);
    expect(detectBudget('riz parfumé'), isNull);
    expect(detectBudget('5 f'), isNull);
  });
}
