import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_need_domain.dart';
import 'package:waouh_app_native/live/live_seller_brief.dart';

const phone = {'subject': 'Galaxy S25 - Cell Phones - Cotonou, Benin', 'category': 'Smartphone', 'brand': 'Samsung', 'model': 'S25'};

void main() {
  test('le domaine du besoin est lu dans ses mots', () {
    expect(liveNeedDomain('un travail de secrétaire'), 'job');
    expect(liveNeedDomain('maison à louer'), 'property');
    expect(liveNeedDomain('moto occasion'), 'vehicle');
    expect(liveNeedDomain('plombier pour une fuite'), 'service');
    expect(liveSignalDomain(Map<String, dynamic>.from(phone)), 'goods');
  });

  test('un emploi ne se rapproche jamais d’un téléphone', () {
    expect(liveMatchVerdict('Je cherche une opportunité : un travail de secrétaire', Map<String, dynamic>.from(phone)).acceptable, false);
    expect(liveMatchVerdict('Je vends : ventilateur', {'subject': 'gommage corps et visage'}).acceptable, false);
    expect(liveMatchVerdict('Je vends : ventilateur', {'subject': 'Je cherche un travail de secrétaire'}).acceptable, false);
  });

  test('les vrais rapprochements restent, et le modèle demandé est distingué', () {
    expect(liveMatchVerdict('Je cherche un Galaxy S25', Map<String, dynamic>.from(phone)).exact, true);
    expect(liveMatchVerdict('iPhone 13', {'subject': 'iphone 11'}).exact, false);
    expect(liveMatchVerdict('iPhone 13', {'subject': 'iphone 11'}).acceptable, true);
    expect(liveMatchVerdict('plombier à Cotonou', {'subject': 'Plomberie et dépannage'}).acceptable, true);
    expect(liveMatchVerdict('je cherche', Map<String, dynamic>.from(phone)).acceptable, false);
  });

  test('free-form budget is not a model and repairs remain services', () {
    expect(liveNeedDomain('réparer une moto'), 'service');
    expect(liveNeedDomain('formation informatique'), 'training');
    expect(liveMatchVerdict('Samsung S10 Cotonou budget 150000 FCFA',
        {'subject': 'Samsung S10', 'city': 'Cotonou'}, place: 'Cotonou').exact, true);
  });

  test('vente : le prix demandé est situé face au marché', () {
    final high = liveSellerPriceVerdict({'asking_price': 30000, 'comparable_count': 5, 'low': 18000, 'median': 20000, 'high': 26000});
    expect(high?.tone, 'high');
    expect(high?.label, contains('au-dessus du marché'));
    final low = liveSellerPriceVerdict({'asking_price': 12000, 'comparable_count': 4, 'low': 12000, 'median': 20000, 'high': 26000});
    expect(low?.tone, 'low');
    expect(liveSellerPriceVerdict({'asking_price': 21000, 'comparable_count': 3, 'low': 18000, 'median': 20000, 'high': 26000})?.tone, 'fair');
    expect(liveSellerPriceVerdict({'asking_price': 12000, 'comparable_count': 1, 'median': 12000}), isNull);
  });

  test('les mots du gabarit de demande ne valent pas rapprochement', () {
    expect(liveMatchVerdict('Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi', {
      'subject': 'Galaxy S25 - Cell Phones', 'raw_text': "ventes achats et opportunités d'affaires au Bénin",
    }).acceptable, false);
    expect(liveMatchVerdict('Je cherche une opportunité : un stage en informatique', {'subject': 'Stage informatique · assistant'}).acceptable, true);
  });

  test('la ville ne prouve jamais la pertinence', () {
    const place = 'Abomey-Calavi';
    expect(liveMatchVerdict('Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi',
        {'subject': 'Galaxy S25 - Cell Phones - Cotonou, Benin', 'city': place}, place: place).acceptable, false);
    expect(liveMatchVerdict('Je cherche une opportunité : un poste de secrétaire à Abomey-Calavi',
        {'subject': 'Secrétaire administrative', 'city': place}, place: place).acceptable, true);
  });

  test('vente : seuls les acheteurs correspondants sont retenus', () {
    final brief = liveSellerBrief(
      [
        {'id': 'a', 'fabric_id': 'a', 'title': 'Je cherche un ventilateur', 'city': 'Cotonou', 'contactability_level': 'C3'},
        {'id': 'b', 'fabric_id': 'b', 'title': 'gommage corps et visage', 'city': 'Cotonou'},
        {'id': 'c', 'fabric_id': 'c', 'title': 'Je cherche un travail de secrétaire', 'city': 'Cotonou'},
      ],
      query: 'Je vends : ventilateur',
      city: 'Cotonou',
    );
    expect(brief.buyers.map((b) => b['id']).toList(), ['a']);
    expect(brief.reachable, 1);
    expect(brief.inZone, 1);
    expect(liveSellerBrief([], reference: {'asking_price': 12000, 'comparable_count': 1}).priceNote, contains('ne peut pas encore être situé'));
  });
}
