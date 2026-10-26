import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:waouh_app_native/live/avatar/live_avatar_controller.dart';
import 'package:waouh_app_native/live/live_bot_home.dart';
import 'package:waouh_app_native/live/live_avatar_autonomy.dart';
import 'package:waouh_app_native/live/live_premium_mission.dart';

void main() {
  test(
    'negotiation requires contact permission and a coherent intervention window',
    () {
      expect(
        liveAvatarAutonomyError({
          ...defaultAvatarAutonomy,
          'allow_negotiate': true,
        }),
        isNotNull,
      );
      expect(
        liveAvatarAutonomyError({
          ...defaultAvatarAutonomy,
          'active_start': '20:00',
          'active_end': '08:00',
        }),
        isNotNull,
      );
      expect(
        liveAvatarAutonomyError({
          ...defaultAvatarAutonomy,
          'allow_contact': true,
          'allow_negotiate': true,
        }),
        isNull,
      );
    },
  );
  testWidgets('84px avatar is above the single greeting on a narrow phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 1100);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final avatar = LiveAvatarController();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: avatar,
        child: MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: BotHomeHero(
                avatarName: 'Bot',
                firstName: 'Songbian Zime',
                missionCount: 1,
                approvalCount: 0,
                activeDeals: 0,
                onAvatar: () {},
                onMissions: () {},
                onAsk: () {},
                onFindOpportunity: () {},
                onNegotiate: () {},
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Bonjour Songbian'), findsOneWidget);
    expect(find.text('Que puis-je faire pour vous ?'), findsOneWidget);
    expect(
      find.text('Je cherche, compare et négocie pour vous.'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    avatar.dispose();
  });
  testWidgets(
    'live mission exposes only observed activity and pause/resume actions',
    (tester) async {
      var paused = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LivePremiumMission(
              busy: true,
              count: 2,
              events: [LiveMissionActivity('2 premières offres reçues.')],
              onPause: () => paused = true,
            ),
          ),
        ),
      );
      await tester.tap(find.text('Mettre en pause'));
      expect(paused, isTrue);
      await tester.tap(find.text('Voir l’activité'));
      await tester.pump();
      expect(find.text('2 premières offres reçues.'), findsNWidgets(2));
      expect(tester.takeException(), isNull);
    },
  );
}
