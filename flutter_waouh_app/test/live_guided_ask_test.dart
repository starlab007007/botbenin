import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_chat_search_screen.dart' show liveIsChatSearchGoal;
import 'package:waouh_app_native/live/live_guided_ask.dart';

const _a = '11111111-1111-4111-8111-111111111111';
const _b = '22222222-2222-4222-8222-222222222222';

Map<String, dynamic> _card(int index, [Map<String, dynamic> over = const <String, dynamic>{}]) =>
    <String, dynamic>{'id': 'r$index', 'index': index, 'title': 'Offre $index', ...over};

void main() {
  group('Recherche guidée → moteur du Chat', () {
    test('chaque entrée écrit une phrase que le Chat reconnaît comme une recherche', () {
      for (final kind in const ['acheter', 'trouver', 'demander', 'opportunite', 'service', 'prestation']) {
        final text = liveGuidedAskText(kind: kind, q: 'climatiseur 1,5 CV', city: 'Cotonou', budget: '250000');
        expect(liveIsChatSearchGoal(text, const <String, dynamic>{}), isTrue, reason: kind);
        expect(text, contains('climatiseur 1,5 CV'));
        expect(text, contains('à Cotonou'));
      }
    });

    test('le budget est écrit en clair, sauf pour une opportunité', () {
      expect(
        liveGuidedAskText(kind: 'acheter', q: 'iPhone 13', budget: 300000),
        'Je cherche à acheter iPhone 13, budget maximum 300 000 FCFA',
      );
      expect(
        liveGuidedAskText(kind: 'opportunite', q: 'appel d’offres BTP', budget: 300000),
        'Je cherche une opportunité : appel d’offres BTP',
      );
    });

    test('ni la formule ni la ville ne sont doublées', () {
      expect(
        liveGuidedAskText(kind: 'trouver', q: 'Je cherche un plombier à Porto-Novo', city: 'Porto-Novo'),
        'Je cherche un plombier à Porto-Novo',
      );
    });

    test('vendre ouvre la fiche de vente du Chat : aucune phrase', () {
      expect(liveGuidedAskText(kind: 'vendre', q: 'Ma moto'), isEmpty);
    });

    test('un lien de recherche guidée devient une demande pour le Chat', () {
      final ask = liveGuidedAskFromUri(Uri.parse('/app/nexus?q=Samsung+S25&go=1&mode=find_sellers&city=Cotonou&budget=400000'));
      expect(ask, isNotNull);
      expect(ask!.kind, 'acheter');
      expect(ask.goal, 'Samsung S25');
      expect(ask.city, 'Cotonou');
      expect(ask.budget, 400000);
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus?q=plombier&go=1&kind=service'))!.kind, 'service');
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus?q=site&go=1&kind=project'))!.kind, 'prestation');
    });

    test('tout ancien lien guidé ouvre le Chat : recherche, vente ou simple ouverture', () {
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus?q=soja&kind=trouver'))!.kind, 'trouver');
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus?q=soja&go=1&tab=lab'))!.kind, 'trouver');
      expect(liveGuidedAskFromUri(Uri.parse('/app/avatar/acheter?q=riz'))!.kind, 'acheter');
      expect(liveGuidedAskFromUri(Uri.parse('/app/avatar/demander?q=riz'))!.kind, 'demander');
      // Vente : pas de recherche, la fiche de vente du Chat s'ouvre.
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus?q=soja&go=1&kind=sale&mode=find_buyers&article_id=a')), isNull);
      expect(liveGuidedIsSell(Uri.parse('/app/nexus?q=soja&go=1&kind=sale&mode=find_buyers&article_id=a')), isTrue);
      expect(liveGuidedIsSell(Uri.parse('/app/avatar/vendre')), isTrue);
      expect(liveGuidedIsSell(Uri.parse('/app/avatar/acheter?q=riz')), isFalse);
      // Rien à lancer, ou autre écran.
      expect(liveGuidedAskFromUri(Uri.parse('/app/nexus')), isNull);
      expect(liveGuidedAskFromUri(Uri.parse('/app/missions?q=soja&go=1')), isNull);
      expect(liveGuidedIsEntryPath(Uri.parse('/app/nexus-legacy')), isTrue);
      // Lien du Chat lui-même : mêmes règles, sans passer par /app/nexus.
      expect(liveGuidedAskFromUri(Uri.parse('/app/chat/waouh?q=riz&kind=acheter'))!.kind, 'acheter');
      expect(liveGuidedIsSell(Uri.parse('/app/chat/waouh?kind=vendre')), isTrue);
      expect(liveGuidedAskFromUri(Uri.parse('/app/chat/waouh')), isNull);
      expect(liveGuidedIsEntryPath(Uri.parse('/app/avatar')), isFalse);
    });

    test('la demande survit à son passage par les métadonnées du composeur', () {
      const ask = LiveGuidedAsk(kind: 'service', text: 'Je cherche un service : plombier', goal: 'plombier', city: 'Cotonou', budget: 20000);
      final back = LiveGuidedAsk.fromMap(ask.toMap());
      expect(back!.kind, 'service');
      expect(back.goal, 'plombier');
      expect(back.budget, 20000);
      expect(LiveGuidedAsk.fromMap(null), isNull);
    });
  });

  group('Analyse du marché dans la recherche du Chat', () {
    test('les repères viennent des seules offres reçues', () {
      final brief = liveChatMarketBrief([
        _card(1, {'price': 300000, 'city': 'Cotonou'}),
        _card(2, {'price': 200000, 'city': 'Parakou'}),
        _card(3, {'price': 250000, 'city': 'Cotonou'}),
        _card(4),
      ], city: 'Cotonou', budget: 260000);
      expect(brief.total, 4);
      expect(brief.priced, 3);
      expect(brief.low, 200000);
      expect(brief.median, 250000);
      expect(brief.high, 300000);
      expect(brief.inZone, 2);
      expect(brief.overBudget, 1);
      expect(brief.advice, contains('200 000 F'));
      expect(brief.advice, contains('1 offre dépasse votre budget'));
    });

    test('le choix de Bot respecte le budget et la zone', () {
      final brief = liveChatMarketBrief([
        _card(1, {'price': 300000, 'city': 'Cotonou', 'fabric_id': 'external:x'}),
        _card(2, {'price': 240000, 'city': 'Cotonou', 'fabric_id': 'article:$_a', 'photos': ['https://img/x.jpg']}),
        _card(3, {'price': 180000, 'city': 'Parakou'}),
      ], city: 'Cotonou', budget: 260000);
      expect(brief.pick!.index, 2);
      expect(brief.pickReasons.join(' '), contains('sous votre budget'));
      expect(brief.pickReasons.join(' '), contains('Dans votre zone'));
      expect(brief.compare.map((r) => r.rank).toList(), [1, 2, 3]);
    });

    test('seules des offres identifiées et dans le budget sont confiées à Bot', () {
      expect(liveBriefDelegateId(_card(1, {'fabric_id': 'external:abc'})), 'external:abc');
      expect(liveBriefDelegateId(_card(1, {'id': _a, 'source': 'waouh'})), 'article:$_a');
      expect(liveBriefDelegateId(_card(1, {'id': _b, 'source': 'partner'})), 'catalog:$_b');
      expect(liveBriefDelegateId(_card(1, {'id': 'result-1', 'source': 'waouh'})), isNull);
      expect(liveBriefDelegateId(_card(1, {'id': _a, 'source': 'radar'})), isNull);
      expect(liveBriefDelegateId(_card(1, {'fabric_id': 'external:abc', 'intent': 'BUY'})), isNull);
      final brief = liveChatMarketBrief([
        _card(1, {'price': 500000, 'fabric_id': 'external:cher'}),
        _card(2, {'price': 200000, 'fabric_id': 'external:ok'}),
        _card(3, {'price': 210000}),
      ], budget: 250000);
      expect(brief.delegable.map((r) => r.delegateId).toList(), ['external:ok']);
    });

    test('sans prix annoncé, c’est dit clairement', () {
      final brief = liveChatMarketBrief([_card(1), _card(2)]);
      expect(brief.low, isNull);
      expect(brief.advice, contains('Aucun prix'));
      expect(brief.pickReasons, isNotEmpty);
    });

    test('les étapes suivent la recherche', () {
      expect(liveSearchStage(hasReply: false, revealed: false, results: 0), 1);
      expect(liveSearchStage(hasReply: true, revealed: false, results: 3), 2);
      expect(liveSearchStage(hasReply: true, revealed: true, results: 3), 3);
      expect(liveSearchStage(hasReply: true, revealed: true, results: 0), 2);
    });
  });
}
