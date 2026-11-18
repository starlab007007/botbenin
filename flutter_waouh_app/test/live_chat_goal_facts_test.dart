import 'package:flutter_test/flutter_test.dart';
import '../lib/live/live_chat_goal_facts.dart';
void main() {
  test('an explicit budget without a currency is retained', () {
    expect(LiveChatGoalFacts('Samsung S10 budget : 150000').budget,150000);
    expect(LiveChatGoalFacts('Samsung S10').budget,isNull);
  });
  test('free-form goal carries city and budget into search and Deal Room', () {
    final facts=LiveChatGoalFacts('Je cherche un Samsung S10 Cotonou budget 150000 FCFA');
    expect(facts.city,'Cotonou'); expect(facts.budget,150000);
  });
  test('an explicit city in text overrides the profile and the explicit cap is retained', () {
    final facts=LiveChatGoalFacts('iPhone 13 Porto-Novo 150 000 XOF',city:'Cotonou',budget:120000);
    expect(facts.city,'Porto-Novo');expect(facts.budget,120000);
  });
  test('a selling price is not a buyer budget', () {
    expect(LiveChatGoalFacts('Je vends Samsung S10 85000 FCFA',selling:true).budget,isNull);
  });
}
