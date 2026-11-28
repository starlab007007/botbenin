import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_deal_room.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
class _Service extends LiveDealRoomService {
 _Service({bool owner=true}):super(SupabaseClient('https://example.supabase.co','test-anon',authOptions:const AuthClientOptions(autoRefreshToken:false))){data['is_owner']=owner;}
 final calls=<String>[];final requests=<Map<String,dynamic>>[];
 Map<String,dynamic> data={'deal_room_id':'room','is_owner':true,'title':'Téléphone','price':150000,'city':'Cotonou','provider_joined':true,'control_mode':'bot','mandate_revision':2,'current_offer_version':3,'messages':[{'id':'one','text':'Historique conservé','mine':true,'author_kind':'bot','created_at':'2026-11-04T08:00:00Z'}],'allowed_actions':['delegate','takeover','message','propose','accept','reject'],'agreement':{'version':3,'status':'proposed','terms':{'amount':145000,'scope':'Téléphone','quantity':1,'deadline':'Demain','exclusions':'Livraison','expected_result':'Téléphone testé','payment':'À la remise'}}};
 @override Future<Map<String,dynamic>> call(String action,[Map<String,dynamic> p=const {}])async{calls.add(action);requests.add({'action':action,...p});if(action=='accept'&&p['version']!=data['current_offer_version'])throw StateError('offer_version_changed');if(action=='takeover')data={...data,'control_mode':'manual','mandate_revision':3};return Map<String,dynamic>.from(data);}
}
Future<_Service> serviceFor(WidgetTester tester,{bool owner=true})async{
 final service=await tester.runAsync(()async{
  final service=_Service(owner:owner);
  // Supabase initializes its auth lock asynchronously; use a real clock for that fixture.
  await Future<void>.delayed(const Duration(milliseconds:10));
  return service;
 });
 return service!;
}
void main(){
 setUp((){SharedPreferences.setMockInitialValues({});});
 test('merging replayed messages keeps one copy in chronological order',(){
 final result=mergeRoomMessages([{'id':'b','created_at':'2026-11-04T09:00:00Z'}],[{'id':'a','created_at':'2026-11-04T08:00:00Z'},{'id':'b','created_at':'2026-11-04T09:00:00Z'}]);
 expect(result.map((m)=>m['id']).toList(),['a','b']);
 });
 testWidgets('Confier à Bot opens without contacting, then delegates with up to 3 fallback offers',(tester)async{
  final api=await serviceFor(tester);
  NexusDiscoveryItem offer(String id)=>NexusDiscoveryItem.fromJson({'fabric_id':id,'subject':'Stylos','city':'Cotonou'});
  final id=await tester.runAsync(()=>delegateRoomToBot(api,fabricId:'a',city:'Cotonou',budgetMax:5000,alternates:[offer('a'),offer('b'),offer('c'),offer('d'),offer('e')]));
  expect(id,'room');expect(api.calls,['open','delegate']);
  expect(api.requests.first['confirmed'],false);
  final delegate=api.requests.last;
  expect(delegate['confirmed'],true);expect(delegate['mandate_revision'],2);
  final rules=delegate['rules'] as Map;
  expect(rules['mode'],'autonomous');expect(rules['budget_max'],5000);
  expect((rules['cascade_candidates'] as List).map((c)=>c['fabric_id']).toList(),['b','c','d']);
  expect(rules['cascade_max_steps'],4);
  await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
 testWidgets('publisher answers a transmitted application from the room',(tester)async{
  final api=await serviceFor(tester,owner:false);
  api.data={...api.data,'kind':'announcement','control_mode':'manual','agreement':null,'current_offer_version':0,'allowed_actions':['message','application_outcome'],'evidence':{'application_prepared_at':'ok','application_submitted_at':'ok'}};
  await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',service:api,ownerScope:'owner')));await tester.pumpAndSettle();
  final reply=find.widgetWithText(FilledButton,'Répondre au dossier');
  await tester.scrollUntilVisible(reply.hitTestable(),120,scrollable:find.byType(Scrollable).first);
  await tester.pumpAndSettle();
  expect(reply.hitTestable(),findsOneWidget);
  await tester.tap(reply.hitTestable());await tester.pumpAndSettle();
  final sheet=find.byType(BottomSheet);
  expect(sheet,findsOneWidget);
  await tester.enterText(find.descendant(of:sheet,matching:find.byType(TextField)),'Entretien lundi');await tester.pumpAndSettle();
  final retain=find.descendant(of:sheet,matching:find.widgetWithText(FilledButton,'Retenir ce dossier'));
  await tester.ensureVisible(retain);await tester.pumpAndSettle();
  expect(retain.hitTestable(),findsOneWidget);
  await tester.tap(retain.hitTestable());await tester.pumpAndSettle();
  expect(api.calls,contains('application_outcome'));
  final sent=api.requests.lastWhere((r)=>r['action']=='application_outcome');
  expect(sent['outcome'],'retained');expect(sent['text'],'Entretien lundi');
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
 testWidgets('manual takeover keeps the same room and its history',(tester)async{
  final api=await serviceFor(tester);await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',service:api,ownerScope:'owner')));await tester.pumpAndSettle();
  expect(find.text('Historique conservé'),findsOneWidget);expect(find.text('Bot mène l’échange'),findsOneWidget);
  await tester.ensureVisible(find.text('Reprendre la main'));await tester.tap(find.text('Reprendre la main'));await tester.pumpAndSettle();
  expect(api.calls,contains('takeover'));
  final takeover=api.requests.singleWhere((r)=>r['action']=='takeover');
  expect(takeover['deal_room_id'],'room');expect(takeover['mandate_revision'],2);
  expect(api.calls, isNot(contains('open')));
  expect(find.text('Vous gérez l’échange'),findsOneWidget);expect(find.text('Historique conservé'),findsOneWidget);
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
 testWidgets('seller can reply while the buyer delegates and no agreement is falsely confirmed',(tester)async{
  final api=await serviceFor(tester,owner:false);await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',service:api,ownerScope:'seller')));await tester.pumpAndSettle();
  expect(find.text('Reprendre la main'),findsNothing);
  expect(find.text('Accord confirmé'),findsNothing);
  final composer=find.byWidgetPredicate((w)=>w is TextField&&w.decoration?.labelText=='Votre message');
  await tester.scrollUntilVisible(composer.hitTestable(),120,scrollable:find.byType(Scrollable).first);
  await tester.pumpAndSettle();
  expect(composer.hitTestable(),findsOneWidget);
  await tester.enterText(composer,'Le téléphone est disponible.');await tester.pumpAndSettle();
  final send=find.widgetWithText(FilledButton,'Envoyer');
  await tester.scrollUntilVisible(send.hitTestable(),80,scrollable:find.byType(Scrollable).first);
  await tester.pumpAndSettle();
  await tester.tap(send.hitTestable());await tester.pumpAndSettle();
  expect(api.requests.lastWhere((r)=>r['action']=='message')['text'],'Le téléphone est disponible.');
  expect(api.calls,isNot(contains('accept')));
  expect(api.calls,isNot(contains('takeover')));
  expect(find.text('Accord confirmé'),findsNothing);
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
 testWidgets('a versioned notification opens the review and a new offer requires a fresh review',(tester)async{
  final api=await serviceFor(tester);
  final fixtures=jsonDecode(File('../tests/fixtures/waouh-room-guidance.json').readAsStringSync()) as List;
  final fixture=fixtures.firstWhere((f)=>f['name']=='review') as Map;
  api.data={...api.data,...Map<String,dynamic>.from(fixture['room'] as Map),
   'current_offer_version':2,'guidance':fixture['guidance'],'agreement_total':{'amount':150000,'fees':5000}};
  await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',decisionVersion:'2',service:api,ownerScope:'owner')));
  await tester.pumpAndSettle();
  expect(find.text('Relire les conditions'),findsOneWidget);
  expect(find.textContaining('Total ·'),findsOneWidget);
  final confirm=find.widgetWithText(FilledButton,'Confirmer la version 2');
  expect(confirm,findsOneWidget);
  api.data={...api.data,'current_offer_version':3,'agreement':{...(api.data['agreement'] as Map),'version':3}};
  await tester.tap(find.byIcon(Icons.refresh));await tester.pumpAndSettle();
  expect(confirm,findsNothing);
  expect(find.textContaining('Les conditions ont changé'),findsOneWidget);
  expect(api.calls, isNot(contains('accept')));
  final review=find.widgetWithText(FilledButton,'Relire la version 3');
  await tester.ensureVisible(review);await tester.pumpAndSettle();
  await tester.tap(review);await tester.pumpAndSettle();
  final confirmLatest=find.widgetWithText(FilledButton,'Confirmer la version 3');
  await tester.ensureVisible(confirmLatest);await tester.pumpAndSettle();
  await tester.tap(confirmLatest);await tester.pumpAndSettle();
  expect(api.requests.lastWhere((r)=>r['action']=='accept')['version'],3);
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));

}
