import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
import 'package:waouh_app_native/live/live_essential_offer_data.dart';
import 'package:waouh_app_native/live/live_essential_offers.dart';

NexusDiscoveryItem offer(String id,{Map<String,dynamic> patch=const {}})=>NexusDiscoveryItem.fromJson({'fabric_id':id,'subject':'Stylo $id','source_key':'waouh_app','intent':'SELL','city':'Cotonou','price_min':100,'scores':{'total_score':88,'reasons':['Même zone']},'contact_policy':{'level':'C0'},...patch});
void main(){
  test('only known identities merge; masked phone and title do not identify an offer',(){
    final a=offer('article:a',patch:{'article_id':'a','subject':'Bic','evidence':{'contact_last4':'4276'}}),b=offer('external:b',patch:{'subject':'Bic','evidence':{'contact_last4':'4276'}}),copy=offer('external:copy',patch:{'article_id':'a'});
    expect(essentialUnique([a,b,copy,a]),[a,b]);
  });
  test('units must be known and matching before deriving a market median',(){
    final refs=List.generate(8,(i)=>{'url':'https://example.com/$i','price':100+i*10,'model':'Bic','unit':'pièce','comparable':true});
    final noUnit=offer('a',patch:{'model':'Bic','market_references':refs});
    expect(essentialHint(noUnit),'Unité à confirmer');expect(essentialMedian(noUnit),isNull);expect(essentialReferences(noUnit).length,5);
    expect(essentialMedian(offer('b',patch:{'model':'Bic','unit':'pièce','market_references':refs})),120);
    expect(essentialMedian(offer('c',patch:{'model':'Bic','unit':'lot','market_references':refs})),isNull);
  });
  testWidgets('320px list keeps original item actions and details are revealed only on tap',(tester)async{
    tester.view.physicalSize=const Size(320,850);tester.view.devicePixelRatio=1;addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);
    final rows=List.generate(10,(i)=>offer('article:$i'));
    NexusDiscoveryItem? continued;final selection=<String>{};
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:SingleChildScrollView(child:StatefulBuilder(builder:(context,setState)=>LiveEssentialOffers(items:rows,selected:selection,onToggle:(id)=>setState((){if(selection.contains(id)){selection.remove(id);}else if(selection.length<5){selection.add(id);}}),onContinue:(r)=>continued=r,onDelegate:(_){},onFollow:(_){}))))));
    expect(find.text('10 offres'),findsOneWidget);expect(find.text('Pourquoi ce choix ?'),findsNothing);expect(find.text('88%'),findsNothing);expect(tester.takeException(),isNull);
    await tester.tap(find.text('Voir l’offre →').first);await tester.pumpAndSettle();expect(find.text('Pourquoi ce choix ?'),findsOneWidget);
    await tester.ensureVisible(find.text('Je le veux'));await tester.tap(find.text('Je le veux'));await tester.pumpAndSettle();expect(identical(continued,rows.first),true);expect(tester.takeException(),isNull);
  });
  testWidgets('five selected offers prevent selecting a sixth and the tray stays compact',(tester)async{
    tester.view.physicalSize=const Size(320,850);tester.view.devicePixelRatio=1;addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);
    final rows=List.generate(6,(i)=>offer('article:$i'));var toggled=false;
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:SingleChildScrollView(child:LiveEssentialOffers(items:rows,selected:rows.take(5).map((r)=>r.fabricId).toSet(),onToggle:(_)=>toggled=true,onContinue:(_){},onDelegate:(_){},onFollow:(_){})),bottomNavigationBar:LiveEssentialCompareTray(items:rows.take(5).toList(),onClear:(){}))));
    final sixth=tester.widget<IconButton>(find.byWidgetPredicate((w)=>w is IconButton && w.tooltip=='Comparer : Stylo article:5'));expect(sixth.onPressed,isNull);expect(toggled,false);expect(find.text('5 / 5'),findsOneWidget);expect(tester.takeException(),isNull);
  });
}
