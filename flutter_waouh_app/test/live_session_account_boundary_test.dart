import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:waouh_app_native/live/live_session.dart';
import 'package:waouh_app_native/live/live_offline_store.dart';

void main() {
 TestWidgetsFlutterBinding.ensureInitialized();
 setUp(() { SharedPreferences.setMockInitialValues({'theme':'dark'}); });
 test('same account reload preserves its secure session and unsent message', () async {
  await LiveSessionStore.bindAccount('a');
  final store=LiveSessionStore();final sid=await store.sessionId;
  expect(RegExp(r'^web_[0-9]+_[0-9a-f]{32}$').hasMatch(sid),true);
  final offline=LiveOfflineStore();await offline.enqueue('send_main',{'text':'private A'});
  expect(await LiveSessionStore.bindAccount('a'),false);
  expect(await LiveSessionStore().sessionId,sid);expect(await offline.pendingCount(),1);
 });
 test('switching accounts clears private cache and updates every existing session store', () async {
  await LiveSessionStore.bindAccount('a');final first=LiveSessionStore(),second=LiveSessionStore();
  final old=await first.sessionId;expect(await second.sessionId,old);
  final prefs=await SharedPreferences.getInstance();
  await prefs.setString('messages_'+old,'private');await prefs.setString('notifications_'+old,'private');
  final offline=LiveOfflineStore();await offline.enqueue('send_main',{'text':'private A'});
  expect(await LiveSessionStore.bindAccount('b'),true);
  final next=await first.sessionId;expect(next,isNot(old));expect(await second.sessionId,next);
  expect(await offline.pendingCount(),0);expect(prefs.containsKey('messages_'+old),false);
  expect(prefs.containsKey('notifications_'+old),false);expect(prefs.getString('theme'),'dark');
 });
 test('logout rotates once and keeps the next guest session stable', () async {
  await LiveSessionStore.bindAccount('a');final store=LiveSessionStore();final old=await store.sessionId;
  expect(await LiveSessionStore.bindAccount(null),true);final guest=await store.sessionId;
  expect(guest,isNot(old));expect(await LiveSessionStore.bindAccount(null),false);expect(await store.sessionId,guest);
 });
 test('a late operation cannot enqueue an old account message after a switch', () async {
  await LiveSessionStore.bindAccount('a');final epoch=LiveSessionStore.accountEpoch;final offline=LiveOfflineStore();
  await runZoned(() async {
   await LiveSessionStore.bindAccount('b');
   await expectLater(offline.enqueue('send_main',{'text':'late private A'}),throwsStateError);
  },zoneValues:{LiveSessionStore.operationEpochZoneKey:epoch});
  expect(await offline.pendingCount(),0);
 });
 test('concurrent auth callbacks are serialized and end on the last account', () async {
  await Future.wait([LiveSessionStore.bindAccount('a'),LiveSessionStore.bindAccount('b')]);
  final prefs=await SharedPreferences.getInstance();expect(prefs.getString('waouh_cache_owner_id'),'b');
  final sid=await LiveSessionStore().sessionId;expect(await LiveSessionStore().sessionId,sid);
 });
}
