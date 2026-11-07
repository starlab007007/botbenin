import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
import 'package:waouh_app_native/live/live_reasoning.dart';

NexusDiscoveryItem offer(String id, String city, double price) => NexusDiscoveryItem.fromJson({
      'fabric_id': id,
      'source_key': 'test',
      'intent': 'SELL',
      'subject': 'Bic',
      'city': city,
      'price_min': price,
      'contact_policy': {'level': 'C2', 'label': '', 'can_auto_contact': false},
    });

void main() {
  test('Web/Flutter parity: the need is read without repeating the verb', () {
    expect(reasonQuery('Je cherche synelia'), 'synelia');
    expect(reasonQuery('je veux acheter un frigo.'), 'un frigo');
    expect(reasonQuery("Bonjour, j'ai besoin d'un plombier"), 'un plombier');
    expect(reasonQuery('un bic'), 'un bic');
    expect(planSteps(const ReasonContext(query: 'Je cherche synelia')).first.text, 'Je cherche « synelia ».');
  });

  test('Web/Flutter parity: found offers, local ones and those Bot can reach', () {
    final steps = discoveryResultSteps(
      [offer('article:a', 'Abomey-Calavi', 150), offer('external:b', 'Cotonou', 100)],
      const ReasonContext(query: 'un bic', city: 'Abomey-Calavi'),
      reachable: (r) => r.fabricId.startsWith('article:'),
    );
    expect(steps.map((s) => s.id).toList(), ['res-found', 'res-zone', 'res-reach']);
    expect(steps[0].text, '2 offres trouvées.');
    expect(steps[1].text, '1 offre à Abomey-Calavi.');
    expect(steps[2].text, contains('1 vendeur joignable'));
    expect(discoveryResultSteps(const [], const ReasonContext(query: 'x')).first.tone, ReasonTone.warn);
  });
}
