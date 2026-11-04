import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_deal_room.dart';
class _Service extends LiveDealRoomService {
 _Service({bool owner=true}):super(SupabaseClient('https://example.supabase.co','test-anon',authOptions:const AuthClientOptions(autoRefreshToken:false))){data['is_owner']=owner;}
 final calls=<String>[];
 Map<String,dynamic> data={'deal_room_id':'room','is_owner':true,'title':'Téléphone','price':150000,'city':'Cotonou','provider_joined':true,'control_mode':'bot','mandate_revision':2,'current_offer_version':3,'messages':[{'id':'one','text':'Historique conservé','mine':true,'author_kind':'bot','created_at':'2026-11-04T08:00:00Z'}],'allowed_actions':['delegate','takeover','message','propose','accept','reject'],'agreement':{'version':3,'status':'proposed','terms':{'amount':145000,'scope':'Téléphone','quantity':1,'deadline':'Demain','exclusions':'Livraison','expected_result':'Téléphone testé','payment':'À la remise'}}};
 @override Future<Map<String,dynamic>> call(String action,[Map<String,dynamic> p=const {}])async{calls.add(action);if(action=='takeover')data={...data,'control_mode':'manual','mandate_revision':3};return Map<String,dynamic>.from(data);}
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
 testWidgets('manual takeover keeps the same room and its history',(tester)async{
  final api=await serviceFor(tester);await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',service:api,ownerScope:'owner')));await tester.pumpAndSettle();
  expect(find.text('Historique conservé'),findsOneWidget);expect(find.text('Bot mène l’échange'),findsOneWidget);
  await tester.ensureVisible(find.text('Reprendre la main'));await tester.tap(find.text('Reprendre la main'));await tester.pumpAndSettle();
  expect(api.calls,contains('takeover'));expect(find.text('Vous gérez l’échange'),findsOneWidget);expect(find.text('Historique conservé'),findsOneWidget);
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
 testWidgets('seller can reply while the buyer delegates and no agreement is falsely confirmed',(tester)async{
  final api=await serviceFor(tester,owner:false);await tester.pumpWidget(MaterialApp(home:LiveDealRoomScreen(roomId:'room',service:api,ownerScope:'seller')));await tester.pumpAndSettle();
  expect(find.text('Reprendre la main'),findsNothing);expect(find.text('Votre message'),findsOneWidget);expect(find.text('Accord confirmé'),findsNothing);
  await tester.pumpWidget(const SizedBox.shrink());await tester.runAsync(()=>api.client.dispose());
 },timeout:const Timeout(Duration(seconds:60)));
}
