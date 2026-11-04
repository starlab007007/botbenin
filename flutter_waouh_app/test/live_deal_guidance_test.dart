import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_deal_guidance.dart';
void main(){
 final cases=(jsonDecode(File('../tests/fixtures/waouh-room-guidance.json').readAsStringSync()) as List).cast<Map<String,dynamic>>();
 for(final fixture in cases){
  testWidgets('canonical guidance ${fixture['name']} at mobile width',(tester)async{
   await tester.binding.setSurfaceSize(const Size(390,844));addTearDown(()=>tester.binding.setSurfaceSize(null));
   final g=Map<String,dynamic>.from(fixture['guidance'] as Map);final calls=<String>[];
   await tester.pumpWidget(MaterialApp(home:Scaffold(body:SingleChildScrollView(child:LiveDealGuidance(guide:g,onAction:calls.add)))));await tester.pumpAndSettle();
   expect((tester.widget<Text>(find.byKey(const ValueKey('room-guide-task')))).data,g['title']);
   expect(find.byIcon(Icons.check),findsNWidgets((g['steps'] as List).where((s)=>s['state']=='complete').length));
   if(g['action']!=null){final button=find.widgetWithText(FilledButton,'${g['action_label']}');await tester.ensureVisible(button);await tester.tap(button);await tester.pump();expect(calls,[g['action']]);}
   else{expect(find.byType(FilledButton),findsNothing);}
   expect(tester.takeException(),isNull);
  });
 }
 testWidgets('advances from receipt to closure only with new server snapshots',(tester)async{
  for(final name in ['receipt','payment_report','closure','wait_closure','completed']){
   final g=Map<String,dynamic>.from(cases.firstWhere((f)=>f['name']==name)['guidance'] as Map);
   await tester.pumpWidget(MaterialApp(home:Scaffold(body:SingleChildScrollView(child:LiveDealGuidance(guide:g,onAction:(_){ })))));await tester.pumpAndSettle();
   expect(tester.widget<Text>(find.byKey(const ValueKey('room-guide-task'))).data,g['title']);
   expect(find.text('Parcours terminé'),name=='completed'?findsOneWidget:findsNothing);
  }
 });
 testWidgets('pending request disables the primary action',(tester)async{
  final g=Map<String,dynamic>.from(cases.firstWhere((f)=>f['name']=='closure')['guidance'] as Map);
  await tester.pumpWidget(MaterialApp(home:Scaffold(body:LiveDealGuidance(guide:g,busy:true,onAction:(_){ }))));await tester.pumpAndSettle();
  expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,isNull);
 });
}
