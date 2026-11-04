import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart' show WaouhColors;
import 'live_nexus_service.dart';
import 'live_deal_guidance.dart';
import 'live_product_presentation.dart';

List<dynamic> mergeRoomMessages(List<dynamic> old,List<dynamic> fresh){final all=<String,dynamic>{for(final m in [...old,...fresh])'${m['id']}':m};return all.values.toList()..sort((a,b){final n='${a['created_at']}'.compareTo('${b['created_at']}');return n!=0?n:'${a['id']}'.compareTo('${b['id']}');});}

String roomError(Object error){
 dynamic detail;String code='';
 if(error is FunctionException){detail=error.details;if(detail is Map)code='${detail['error']??''}';if(error.status==401)return 'Reconnectez-vous pour retrouver cet échange.';if(error.status==404)return 'Le service des échanges est momentanément indisponible. Réessayez.';}
 if(code.isEmpty)code=error is StateError?'${error.message}':error.toString();
 return {'offer_version_changed':'Les conditions ont changé. Relisez la nouvelle version avant de confirmer.','mandate_revision_changed':'Le mandat a changé. Actualisez avant de continuer.','initial_offer_outside_budget':'L’offre de départ doit respecter votre plafond.','takeover_required':'Reprenez la main avant d’écrire ou de proposer.','mandate_expired':'Le mandat est arrivé à échéance. Définissez un nouveau mandat.','invalid_hours':'Vérifiez les horaires du mandat.','invalid_limits':'Choisissez une durée de 1 à 168 heures et au maximum 2 relances.','module_unavailable':'Ce module est actuellement indisponible.','forbidden':'Cet échange est privé.','legacy_room_requires_reconciliation':'Un échange historique doit être relié avant de continuer.'}[code]??'Cette action n’a pas pu être confirmée. Actualisez puis réessayez.';
}

class LiveDealRoomService {
 LiveDealRoomService(this.client);
 final SupabaseClient client;
 Future<Map<String,dynamic>> call(String action,[Map<String,dynamic> payload=const {}]) async {
  final session=client.auth.currentSession;if(session==null)throw StateError('Connectez-vous pour conserver cet échange.');
  final prefs=await SharedPreferences.getInstance();
  final key='waouh.room.request.${session.user.id}.${base64Url.encode(utf8.encode(jsonEncode([action,payload])))}';
  final body=Map<String,dynamic>.from(payload);
  final read=['get','events','list'].contains(action);
  if(!read){var request=prefs.getString(key);if(request==null){final random=Random.secure();final hex=List<int>.generate(16,(_)=>random.nextInt(256)).map((n)=>n.toRadixString(16).padLeft(2,'0')).join();request='${hex.substring(0,8)}-${hex.substring(8,12)}-4${hex.substring(13,16)}-8${hex.substring(17,20)}-${hex.substring(20)}';await prefs.setString(key,request);}body['request_id']=request;}
  final result=await client.functions.invoke('waouh-deal-room',body:{'action':action,'payload':body},headers:{'Authorization':'Bearer ${session.accessToken}'});
  if(client.auth.currentUser?.id!=session.user.id)throw StateError('Votre compte a changé.');
  final data=result.data;if(data is! Map||data['ok']!=true)throw StateError('${data is Map?data['error']:'Action non confirmée'}');
  if(!read)await prefs.remove(key);
  return Map<String,dynamic>.from(data['data'] as Map);
 }
}

class LiveDealRoomScreen extends StatefulWidget {
 const LiveDealRoomScreen({super.key,this.roomId,this.query,this.city,this.componentId,this.delegate=false,this.service,this.ownerScope,this.proposeOnOpen=false});
 final String? roomId,query,city,componentId;final bool delegate;final bool proposeOnOpen;final LiveDealRoomService? service;final String? ownerScope;
 @override State<LiveDealRoomScreen> createState()=>_LiveDealRoomScreenState();
}
class _LiveDealRoomScreenState extends State<LiveDealRoomScreen> with WidgetsBindingObserver {
 late final SupabaseClient client;late final LiveDealRoomService api;late final LiveNexusService nexus;
 late final TextEditingController query,city;final budget=TextEditingController(),message=TextEditingController();
 Map<String,dynamic>? room;List<Map<String,dynamic>> rooms=[];List<NexusDiscoveryItem> offers=[];
 bool delegationShown=false,proposalShown=false;String? draftRoom;
 String? roomId;String kind='purchase',error='',notice='';bool busy=false,searching=false,refreshing=false;int generation=0;
 Timer? timer;StreamSubscription<AuthState>? auth;String? owner;
 @override void initState(){super.initState();client=widget.service?.client??Supabase.instance.client;api=widget.service??LiveDealRoomService(client);nexus=LiveNexusService(client);query=TextEditingController(text:widget.query);city=TextEditingController(text:widget.city??'Cotonou');roomId=widget.roomId;owner=widget.ownerScope??client.auth.currentUser?.id;WidgetsBinding.instance.addObserver(this);unawaited(load());timer=Timer.periodic(const Duration(seconds:10),(_){if(WidgetsBinding.instance.lifecycleState==AppLifecycleState.resumed)unawaited(load());});auth=client.auth.onAuthStateChange.listen((_){if(owner!=(widget.ownerScope??client.auth.currentUser?.id)){owner=widget.ownerScope??client.auth.currentUser?.id;generation++;setState((){room=null;rooms=[];offers=[];message.clear();budget.clear();});unawaited(load());}});}
 @override void dispose(){timer?.cancel();auth?.cancel();WidgetsBinding.instance.removeObserver(this);for(final c in [query,city,budget,message]){c.dispose();}super.dispose();}
 @override void didChangeAppLifecycleState(AppLifecycleState state){if(state==AppLifecycleState.resumed)unawaited(load());}
 Future<void> load() async {
  if(busy||refreshing||owner==null)return;refreshing=true;final v=generation;
  try{var data=await api.call(roomId==null?'list':'get',roomId==null?{}:{'deal_room_id':roomId});
   if(roomId==null&&widget.componentId!=null){data=await api.call('adopt',{'component_id':widget.componentId});}
   if(!mounted||generation!=v)return;
   final nextId=data['deal_room_id']?.toString();if(nextId!=null&&draftRoom!=nextId){draftRoom=nextId;final prefs=await SharedPreferences.getInstance();if(!mounted||generation!=v)return;message.text=prefs.getString('waouh.room.draft.$owner.$nextId')??'';}
   setState((){error='';if(data['deal_room_id']!=null){room={...data,'messages':mergeRoomMessages(room?['deal_room_id']==data['deal_room_id']?(room?['messages'] as List? ?? []):[],data['messages'] as List? ?? [])};roomId='${data['deal_room_id']}';}else{rooms=(data['rooms'] as List? ?? []).map((e)=>Map<String,dynamic>.from(e as Map)).toList();}});if(widget.delegate&&!delegationShown&&room!=null){delegationShown=true;await mandate();}if(widget.proposeOnOpen&&!proposalShown&&room!=null){proposalShown=true;await propose();}
  }catch(e){if(mounted&&generation==v)setState(()=>error=roomError(e));}finally{refreshing=false;}
 }
 Future<Map<String,dynamic>?> act(String action,[Map<String,dynamic> p=const {}]) async {
  if(busy)return null;final v=++generation;setState((){busy=true;error='';notice='';});
  try{final d=await api.call(action,{if(roomId!=null)'deal_room_id':roomId,...p});if(!mounted||v!=generation)return null;setState((){if(d['deal_room_id']!=null){room={...d,'messages':mergeRoomMessages(room?['deal_room_id']==d['deal_room_id']?(room?['messages'] as List? ?? []):[],d['messages'] as List? ?? [])};roomId='${d['deal_room_id']}';}});return d;}
  catch(e){if(mounted&&v==generation)setState(()=>error=roomError(e));return null;}
  finally{if(mounted&&v==generation)setState(()=>busy=false);}
 }
 Future<void> search() async {if(searching||query.text.trim().length<3)return;final v=++generation;setState((){searching=true;error='';});try{final d=await nexus.searchProgressive(query:query.text,city:city.text,budgetMax:double.tryParse(budget.text),findSellers:true,discoveryKind:kind,onIndexed:(d){if(mounted&&v==generation)setState(()=>offers=d.results);});if(mounted&&v==generation)setState(()=>offers=d.results);}catch(_){if(mounted)setState(()=>error='Recherche partielle. Réessayez.');}finally{if(mounted)setState(()=>searching=false);}}
 Future<void> open(NexusDiscoveryItem item,{bool delegate=false}) async {final d=await act('open',{'fabric_id':item.fabricId,'city':city.text,'budget_max':double.tryParse(budget.text),'confirmed':!delegate});if(d!=null&&delegate&&mounted)await mandate();}
 String when(dynamic value){final date=DateTime.tryParse('$value');return date==null?'À préciser':DateFormat('dd/MM à HH:mm').format(date.toUtc().add(const Duration(hours:1)))+' · Bénin';}
 String money(dynamic n)=>n==null?'À préciser':'${(n as num).round()} F';
 Widget button(String text,VoidCallback fn,{bool primary=false,bool enabled=true})=>Padding(padding:const EdgeInsets.only(top:8),child:primary?FilledButton(onPressed:busy||!enabled?null:fn,child:Text(text)):OutlinedButton(onPressed:busy||!enabled?null:fn,child:Text(text)));
 Widget card(List<Widget> children)=>Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:children)));
 Widget field(String label,TextEditingController c,{bool number=false})=>Padding(padding:const EdgeInsets.symmetric(vertical:8),child:TextField(controller:c,onChanged:(_){if(c==message){unawaited(SharedPreferences.getInstance().then((prefs)=>prefs.setString('waouh.room.draft.$owner.$roomId',message.text)));}},keyboardType:number?TextInputType.number:TextInputType.text,decoration:InputDecoration(labelText:label,border:const OutlineInputBorder())));
 Future<Map<String,String>?> form(String title,Map<String,String> values,{Set<String> numeric=const {}}) async {
  final formOwner=owner;
  final controls=values.map((k,v)=>MapEntry(k,TextEditingController(text:v)));
  final labels={'mode':'Mode : assisted / semi_autonomous / autonomous','budget_max':'Plafond · F','initial_offer':'Offre de départ · F (facultatif)','duration_hours':'Durée en heures (1–168)','max_followups':'Relances (0–2)','active_start':'Début · HH:MM · Bénin','active_end':'Fin · HH:MM · Bénin','amount':'Prix total · F','quantity':'Quantité','scope':'Périmètre','deadline':'Remise / délai','exclusions':'Exclusions','expected_result':'Résultat attendu','payment':'Paiement convenu','text':'Votre message'};
  final result=await showDialog<Map<String,String>>(context:context,builder:(ctx)=>AlertDialog(title:Text(title),content:SizedBox(width:450,child:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,children:controls.entries.map((e)=>e.key=='mode'?DropdownButtonFormField<String>(initialValue:e.value.text,decoration:const InputDecoration(labelText:'Mode'),items:const [DropdownMenuItem(value:'assisted',child:Text('Assisté')),DropdownMenuItem(value:'semi_autonomous',child:Text('Semi-auto')),DropdownMenuItem(value:'autonomous',child:Text('Autonome'))],onChanged:(v)=>e.value.text=v!):field(labels[e.key]??e.key,e.value,number:numeric.contains(e.key))).toList()))),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Annuler')),FilledButton(onPressed:()=>Navigator.pop(ctx,controls.map((k,c)=>MapEntry(k,c.text.trim()))),child:const Text('Confirmer'))]));
  WidgetsBinding.instance.addPostFrameCallback((_){for(final c in controls.values){c.dispose();}});return mounted&&owner==formOwner?result:null;
 }
 Future<void> mandate() async {
  final r=room;if(r==null)return;
  final p=await form('Confier à Bot',{'mode':'autonomous','budget_max':budget.text,'initial_offer':'','duration_hours':'72','max_followups':'1','active_start':'08:00','active_end':'20:00'},numeric:{'budget_max','initial_offer','duration_hours','max_followups'});
  if(p==null)return;
  await act('delegate',{'mandate_revision':r['mandate_revision'],'confirmed':true,'rules':{...p,'budget_max':num.tryParse(p['budget_max']!), 'initial_offer':num.tryParse(p['initial_offer']!),'duration_hours':int.tryParse(p['duration_hours']!),'max_followups':int.tryParse(p['max_followups']!)}});
 }
 Future<void> propose() async {
  final r=room!;final a=r['agreement'] as Map?;final t=a?['terms'] as Map? ?? {};
  final values=await form('Votre proposition',{'amount':'${t['amount']??r['price']??''}','quantity':'${t['quantity']??1}','scope':'${t['scope']??r['title']}','deadline':'${t['deadline']??''}','exclusions':'${t['exclusions']??'À préciser'}','expected_result':'${t['expected_result']??r['title']}','payment':'${t['payment']??''}'},numeric:{'amount','quantity'});
  if(values!=null)await act('propose',{'version':r['current_offer_version'],'terms':{...values,'amount':num.tryParse(values['amount']!),'quantity':int.tryParse(values['quantity']!)}});
 }
 Future<void> copyInvite()async{final d=await act('invite');if(d?['token']==null)return;try{await Clipboard.setData(ClipboardData(text:'https://bot.bj/app/premium#invite=${d!['token']}'));if(mounted)setState(()=>notice='Invitation copiée. Partagez-la pour que l’interlocuteur rejoigne cet échange.');}catch(_){if(mounted)setState(()=>notice='Invitation préparée : https://bot.bj/app/premium#invite=${d!['token']}');}}
 Future<void> guideAction(String action)async{
  final r=room;if(r==null||!roomGuideActions.contains(action))return;
  final account=owner,a=r['agreement'] as Map?,version=r['current_offer_version'];
  if(action=='refresh'){await load();return;}
  if(action=='invite'){await copyInvite();return;}
  if(action=='propose'){await propose();return;}
  if(action=='message'){final p=await form('Votre message',{'text':message.text});if(p!=null)await act('message',{'text':p['text']});return;}
  if(action=='review'&&a!=null){
   final allowed=r['allowed_actions'] as List? ?? [];
   final decision=await showDialog<String>(context:context,builder:(ctx)=>AlertDialog(title:Text('Relire les conditions · Version $version'),content:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[for(final entry in (a['terms'] as Map).entries.where((e)=>e.key!='workflow_version'))Padding(padding:const EdgeInsets.only(bottom:10),child:Text('${{'amount':'Prix · F','quantity':'Quantité','scope':'Périmètre','deadline':'Remise / délai','exclusions':'Exclusions','expected_result':'Résultat attendu','payment':'Paiement'}[entry.key]??entry.key} : ${entry.value}'))])),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Fermer')),if(allowed.contains('reject'))TextButton(onPressed:()=>Navigator.pop(ctx,'reject'),child:const Text('Refuser cette version')),if(allowed.contains('accept'))FilledButton(onPressed:()=>Navigator.pop(ctx,'accept'),child:const Text('Confirmer ces conditions'))]));
   if(decision!=null&&mounted&&owner==account)await act(decision,{'version':version});return;
  }
  if(action=='rating'){final score=await showDialog<int>(context:context,builder:(ctx)=>AlertDialog(title:const Text('Évaluer cet échange'),content:Wrap(spacing:8,children:[for(var n=1;n<=5;n++)OutlinedButton(onPressed:()=>Navigator.pop(ctx,n),child:Text('$n ★'))]),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Plus tard'))]));if(score!=null&&mounted&&owner==account)await act('rating',{'rating':score});return;}
  if(action=='issue'){await showDialog<void>(context:context,builder:(ctx)=>AlertDialog(title:const Text('Problème signalé'),content:Text('${(r['evidence'] as Map?)?['issue']??'La clôture est suspendue.'}'),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Fermer'))]));return;}
  await act(action,{if(['receipt','payment_report','payment_receive','complete','approve_step'].contains(action))'version':version,if(['takeover','resume_bot','approve_step'].contains(action))'mandate_revision':r['mandate_revision'],if(action=='resume_bot')'confirmed':true,if(action=='application_submit')'confirmation':'submitted'});
 }
 @override Widget build(BuildContext context){
  final r=room,a=r?['agreement'] as Map?,allowed=(r?['allowed_actions'] as List? ?? []),bot=r?['control_mode']=='bot';
  final guide=r?['guidance'] is Map&&r?['guidance']['schema']=='waouh.room_guidance.v1'?Map<String,dynamic>.from(r!['guidance'] as Map):null;
  final expired=r?['control_mode']!='manual'&&(DateTime.tryParse('${r?['expires_at']}')?.isBefore(DateTime.now())??false);
  return Theme(data:Theme.of(context).copyWith(colorScheme:Theme.of(context).colorScheme.copyWith(primary:WaouhColors.blue)),child:Scaffold(backgroundColor:WaouhColors.pearl,appBar:AppBar(title:const Text('WAOUH'),leading:roomId==null?null:IconButton(icon:const Icon(Icons.arrow_back),onPressed:(){generation++;setState((){roomId=null;room=null;message.clear();});unawaited(load());}),actions:[IconButton(onPressed:busy?null:load,icon:const Icon(Icons.refresh))]),body:SafeArea(child:ListView(padding:const EdgeInsets.all(16),children:[
   if(notice.isNotEmpty)Card(color:const Color(0xFFECFAF6),child:Padding(padding:const EdgeInsets.all(12),child:Text(notice,style:const TextStyle(color:Color(0xFF087E70))))),if(error.isNotEmpty)Semantics(liveRegion:true,child:Text(error,style:TextStyle(color:Theme.of(context).colorScheme.error))),if(busy||searching)const LinearProgressIndicator(),
   if(roomId==null)...[
    Row(children:[Image.asset('assets/bot/bot_avatar.png',width:64),const SizedBox(width:12),const Expanded(child:Text('Que cherchez-vous ?',style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)))]),
    LiveDealGuidance(guide:searchRoomGuidance(searching,offers.isNotEmpty)),
    card([field('Votre besoin',query),field('Ville',city),field('Budget max · F',budget,number:true),DropdownButtonFormField<String>(initialValue:kind,items:const [DropdownMenuItem(value:'purchase',child:Text('Produit')),DropdownMenuItem(value:'service',child:Text('Service')),DropdownMenuItem(value:'opportunity',child:Text('Opportunité'))],onChanged:(v)=>setState(()=>kind=v!)),button('Rechercher',search,primary:true)]),
    for(final item in offers)card([LiveProductGallery(photos:item.photoUrls,title:item.title,detail:true),Text(item.title,style:const TextStyle(fontSize:19,fontWeight:FontWeight.bold)),Text(money(item.priceMin??item.priceMax),style:const TextStyle(fontSize:25,color:WaouhColors.deep)),Text('${item.city??''} · Disponibilité à confirmer'),button('Intéressé',()=>open(item),primary:true),button('Confier à Bot',()=>open(item,delegate:true))]),
    for(final row in rooms)ListTile(title:Text('${row['title']}'),trailing:const Icon(Icons.chevron_right),onTap:(){setState(()=>roomId='${row['deal_room_id']}');unawaited(load());}),
   ]else if(r!=null)...[
    if(guide!=null)LiveDealGuidance(guide:guide,busy:busy,onAction:(action)=>unawaited(guideAction(action))),
    card([if(r['product'] is Map)LiveProductPresentation(value:r['product']),Text('${r['title']}',style:const TextStyle(fontSize:22,fontWeight:FontWeight.bold)),Text(money(r['price'])),Text('${r['counterparty_name']??'Interlocuteur'}'),if(r['blocked_reason']!=null)const Text('Dossier historique : liaison à vérifier.'),Text(r['provider_joined']==true?'Interlocuteur dans l’échange':'Invitation nécessaire')]),
    card([Row(children:[Image.asset('assets/bot/bot_avatar.png',width:40),const SizedBox(width:10),Expanded(child:Text(expired?'Mandat arrivé à échéance':bot?'Bot mène l’échange':r['control_mode']=='paused'?'Bot en pause':'Vous gérez l’échange'))]),
     if(r['is_owner']==true&&r['closed']!=true&&!['accepted','completed'].contains(a?['status'])&&guide?['action']!='takeover')button(bot?'Reprendre la main':'Confier à Bot',()=>bot?act('takeover',{'mandate_revision':r['mandate_revision']}):mandate()),
     if(r['is_owner']==true&&allowed.contains('approve_step')&&guide?['action']!='approve_step')button('Autoriser la prochaine proposition / relance dans les limites du mandat',()=>act('approve_step',{'mandate_revision':r['mandate_revision'],'version':r['current_offer_version']})),
     if(r['is_owner']==true&&bot)button('Mettre en pause',()=>act('pause',{'mandate_revision':r['mandate_revision']})),
     if(r['is_owner']==true&&r['control_mode']=='paused'&&!expired&&guide?['action']!='resume_bot')button('Reprendre avec le mandat conservé',()=>act('resume_bot',{'mandate_revision':r['mandate_revision'],'confirmed':true})),
    ]),
    if(r['is_owner']==true&&r['expires_at']!=null)Text('Plafond privé : ${money((r['mandate'] as Map?)?['budget_max'])} · Mandat jusqu’au ${when(r['expires_at'])}',style:const TextStyle(fontSize:12)),
    if((r['events'] as List? ?? []).isNotEmpty)ExpansionTile(title:const Text('Activité de l’échange'),children:[for(final event in (r['events'] as List).reversed.take(5))ListTile(dense:true,title:Text('${{'bot_step':'Bot a mis à jour l’échange','takeover':'Reprise humaine','delegate':'Mandat enregistré','retry_required':'Nouvelle tentative planifiée'}[event['event_type']]??'Mise à jour enregistrée'}'),subtitle:Text(when(event['created_at'])))]),
    if(r['message_cursor']!=null)button('Messages précédents',()async{final v=generation;try{final older=await api.call('get',{'deal_room_id':roomId,'before_message':r['message_cursor']});if(mounted&&v==generation)setState(()=>room={...room!,'message_cursor':older['message_cursor'],'messages':mergeRoomMessages(older['messages'] as List,room!['messages'] as List)});}catch(_){if(mounted)setState(()=>error='Historique momentanément indisponible.');}}),
    for(final m in (r['messages'] as List? ?? []))Align(alignment:m['mine']==true?Alignment.centerRight:Alignment.centerLeft,child:Card(color:m['mine']==true?WaouhColors.sky:Colors.white,child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(m['author_kind']=='bot'?'Bot · représente le demandeur':m['mine']==true?'Vous':'Interlocuteur',style:const TextStyle(fontSize:11)),Text('${m['text']}')])))),
    if(allowed.contains('message')&&(!bot||r['is_owner']!=true))card([field('Votre message',message),button('Envoyer',()async{final d=await act('message',{'text':message.text});if(d!=null){message.clear();final prefs=await SharedPreferences.getInstance();await prefs.remove('waouh.room.draft.$owner.$roomId');}},primary:true,enabled:true)]),
    if(allowed.contains('application_prepare')&&guide?['action']!='application_prepare')button('Préparer ma démarche',()=>act('application_prepare')),
    if(allowed.contains('application_submit')&&guide?['action']!='application_submit')button('Je confirme avoir transmis mon dossier',()=>act('application_submit',{'confirmation':'submitted'})),
    if(r['evidence'] is Map&&r['evidence']['application_submitted_at']!=null)const Text('Démarche déclarée transmise. Réponse attendue.'),
    if((!bot||r['is_owner']!=true)&&allowed.contains('propose')&&guide?['action']!='propose')button('Proposer un prix / des conditions',propose),
    if(r['provider_joined']!=true&&r['is_owner']==true)...[button('Confirmer la prise de contact',()=>act('contact',{'confirmed':true})),if(guide?['action']!='invite')button('Préparer et copier l’invitation',copyInvite),button('Révoquer l’invitation',()=>act('revoke_invite'))],
    if(a==null&&r['initial_price_proposal'] is Map&&r['initial_price_proposal']['amount']!=null)card([const Text('Prix proposé par Bot'),Text(money(r['initial_price_proposal']['amount'])),Text('Proposition ${r['initial_price_proposal']['revision']} · Conditions à préciser avant l’accord.')]),
    if(allowed.contains('rating'))card([const Text('Évaluer cet échange'),Wrap(spacing:8,children:[for(var score=1;score<=5;score++)OutlinedButton(onPressed:busy?null:()=>act('rating',{'rating':score}),child:Text('$score ★'))])]),
    if(a!=null)card([Text(a['status']=='completed'?(guide!=null&&guide['status']!='completed'?'Clôture à vérifier':'Échange clôturé'):a['status']=='accepted'?'Accord confirmé':'Accord à confirmer',style:const TextStyle(fontSize:22,fontWeight:FontWeight.bold)),Text(money((a['terms'] as Map)['amount']),style:const TextStyle(fontSize:28,color:WaouhColors.deep)),Text('Version ${a['version']}'),for(final entry in (a['terms'] as Map).entries.where((e)=>e.key!='workflow_version'))Text('${{'amount':'Prix','quantity':'Quantité','scope':'Périmètre','deadline':'Remise / délai','exclusions':'Exclusions','expected_result':'Résultat attendu','payment':'Paiement'}[entry.key]??entry.key} : ${entry.value}'),Text('${a['owner_accepted_at']!=null?'✓':'○'} Demandeur · ${a['provider_accepted_at']!=null?'✓':'○'} Interlocuteur'),
     if(guide==null&&allowed.contains('accept'))button('Confirmer ces conditions',()=>act('accept',{'version':a['version']}),primary:true),if(guide==null&&allowed.contains('reject'))button('Refuser cette version',()=>act('reject',{'version':a['version']})),
     if(a['status']=='accepted')...[
      if(guide==null)const Text('Réception et paiement à confirmer ensuite.'),
      if(allowed.contains('issue'))button('Signaler un problème',()async{final p=await form('Signaler un problème',{'text':''});if(p!=null)await act('issue',{'version':a['version'],'text':p['text']});}),
      if(guide==null)for(final e in {'receipt':'Confirmer la réception','payment_report':'J’ai effectué le paiement','payment_receive':'J’ai reçu le paiement','complete':'Confirmer la clôture'}.entries)if(allowed.contains(e.key))button(e.value,()=>act(e.key,{'version':a['version']})),
     ]
    ]),
   ]
  ]))));
 }
}
