import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/avatar/bot_character.dart';
import 'package:waouh_app_native/live/avatar/live_avatar_controller.dart';
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

  test("Le troisième message annonce l'activité réelle", () {
    expect(liveBotActivityLine(), isNull);
    expect(liveBotActivityLine(missions: 2), "J'ai 2 missions en cours pour vous.");
    expect(liveBotActivityLine(deals: 1), 'Je suis 1 Deal Room pour vous.');
    expect(
      liveBotGreetingLines('Zime', liveBotActivityLine(missions: 1))[2],
      "J'ai 1 mission en cours pour vous.",
    );
  });

  test("Bot salue, parle, puis pose sa question", () {
    BotExpression at(int shown) =>
        liveBotGreetingExpression(shown: shown, lineCount: 3, instant: false);
    expect(at(0), BotExpression.hello);
    expect(at(1), BotExpression.talk);
    expect(at(2), BotExpression.talk);
    expect(at(3), BotExpression.ask);
    expect(at(4), BotExpression.ask);
    expect(
      liveBotGreetingExpression(shown: 4, lineCount: 3, instant: true),
      BotExpression.idle,
    );
    expect(
      liveBotGreetingExpression(shown: 4, lineCount: 3, instant: true, missions: 2),
      BotExpression.work,
    );
  });

  test("Chaque état de présence a une expression", () {
    for (final state in LiveAvatarPresenceState.values) {
      expect(botExpressionForPresence(state), isA<BotExpression>());
    }
    expect(botExpressionForPresence(LiveAvatarPresenceState.negotiating), BotExpression.work);
    expect(botExpressionForPresence(LiveAvatarPresenceState.done), BotExpression.win);
  });

  testWidgets('Le personnage Bot se dessine dans toutes ses expressions', (tester) async {
    for (final expression in BotExpression.values) {
      await tester.pumpWidget(
        MaterialApp(
          home: Center(child: BotCharacter(expression: expression, size: 160)),
        ),
      );
      await tester.pump(const Duration(milliseconds: 700));
      expect(find.byType(BotCharacter), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
    await tester.pumpWidget(const SizedBox());
  });
}
