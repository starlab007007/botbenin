import 'package:flutter/material.dart';
import '../main.dart' show WaouhColors;

const roomGuideActions=<String>{'invite','review','propose','message','receipt','payment_report','payment_receive','complete','rating','issue','refresh','takeover','resume_bot','approve_step','application_prepare','application_submit','application_outcome'};
Map<String,dynamic> searchRoomGuidance(bool searching,bool hasResults)=>{
 'schema':'waouh.room_guidance.v1','phase':'search','step':1,'total':6,'status':'active','actor':searching?'bot':'you','actor_label':searching?'Bot':'À vous',
 'title':searching?'Recherche en cours':hasResults?'Choisissez une offre':'Décrivez votre besoin',
 'detail':searching?'Les offres reçues apparaissent progressivement.':hasResults?'Écrivez à l’interlocuteur ou confiez la suite à Bot.':'Le parcours se précise à partir des offres trouvées.',
 'steps':[for(final entry in ['Recherche','Contact','Négociation','Accord','Réception','Clôture'].asMap().entries){'id':'${entry.key}','label':entry.value,'state':entry.key==0?'current':'upcoming'}],'checklist':[],
};

class LiveDealGuidance extends StatefulWidget{
 const LiveDealGuidance({super.key,required this.guide,this.busy=false,this.onAction});
 final Map<String,dynamic> guide;
 final bool busy;
 final ValueChanged<String>? onAction;
 @override State<LiveDealGuidance> createState()=>_LiveDealGuidanceState();
}
class _LiveDealGuidanceState extends State<LiveDealGuidance>{
 final scroll=ScrollController();
 @override void initState(){super.initState();WidgetsBinding.instance.addPostFrameCallback((_)=>reveal());}
 @override void didUpdateWidget(covariant LiveDealGuidance old){super.didUpdateWidget(old);if(old.guide['phase']!=widget.guide['phase'])WidgetsBinding.instance.addPostFrameCallback((_)=>reveal());}
 void reveal(){if(!mounted||!scroll.hasClients)return;final target=(((widget.guide['step'] as num? ?? 1)-1)*100.0).clamp(0.0,scroll.position.maxScrollExtent).toDouble();if(MediaQuery.disableAnimationsOf(context)){scroll.jumpTo(target);}else{scroll.animateTo(target,duration:const Duration(milliseconds:220),curve:Curves.easeOut);}}
 @override void dispose(){scroll.dispose();super.dispose();}
 @override Widget build(BuildContext context){
  final g=widget.guide;if(g['schema']!='waouh.room_guidance.v1')return const SizedBox.shrink();
  final complete=g['status']=='completed',blocked=['blocked','stopped'].contains(g['status']);
  final accent=blocked?const Color(0xFF96651F):complete?const Color(0xFF087E70):WaouhColors.deep;
  final steps=g['steps'] as List? ?? [],checks=g['checklist'] as List? ?? [];
  final action=g['action']?.toString();
  return Container(margin:const EdgeInsets.only(bottom:16),padding:const EdgeInsets.all(16),decoration:BoxDecoration(borderRadius:BorderRadius.circular(24),border:Border.all(color:blocked?const Color(0xFFECD9B8):complete?const Color(0xFFBCE8DE):const Color(0xFFDBE6FA)),gradient:LinearGradient(colors:[Colors.white,blocked?const Color(0xFFFFFAF2):complete?const Color(0xFFECFAF6):const Color(0xFFF0F5FF)])),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
   Row(children:[Expanded(child:Text(complete?'Parcours terminé':'Étape ${g['step']} sur ${g['total']}',style:const TextStyle(fontSize:12,color:Color(0xFF6C7C9B),fontWeight:FontWeight.w600))),const SizedBox(width:8),Flexible(child:Container(padding:const EdgeInsets.symmetric(horizontal:10,vertical:6),decoration:BoxDecoration(color:accent.withValues(alpha:.09),borderRadius:BorderRadius.circular(30)),child:Text('${g['actor_label']}',style:TextStyle(color:accent,fontSize:12,fontWeight:FontWeight.w600))))]),
   const SizedBox(height:16),
   SingleChildScrollView(controller:scroll,scrollDirection:Axis.horizontal,child:Row(children:[for(final entry in steps.asMap().entries)Semantics(label:'${entry.value['label']} · ${entry.value['state']=='complete'?'Confirmé':entry.value['state']=='current'?'En cours':entry.value['state']=='blocked'?'Suspendu':'À venir'}',child:SizedBox(width:100,child:Row(children:[Container(width:28,height:28,decoration:BoxDecoration(shape:BoxShape.circle,color:entry.value['state']=='complete'?const Color(0xFF19B6A4):entry.value['state']=='current'?WaouhColors.blue:const Color(0xFFF1F4F9)),child:Center(child:entry.value['state']=='complete'?const Icon(Icons.check,size:16,color:Colors.white):Text('${entry.key+1}',style:TextStyle(color:entry.value['state']=='current'?Colors.white:const Color(0xFF6C7C9B),fontWeight:FontWeight.w700,fontSize:12)))),const SizedBox(width:6),Expanded(child:Text('${entry.value['label']}',style:TextStyle(fontSize:11,color:entry.value['state']=='current'?WaouhColors.deep:const Color(0xFF6C7C9B))))])))])),
   const SizedBox(height:16),Semantics(liveRegion:true,child:Text('${g['title']}',key:const ValueKey('room-guide-task'),style:const TextStyle(fontSize:21,fontWeight:FontWeight.w700,color:WaouhColors.ink))),const SizedBox(height:6),Text('${g['detail']}',style:const TextStyle(color:Color(0xFF6C7C9B),fontSize:13,height:1.5)),
   if(action!=null&&roomGuideActions.contains(action)&&widget.onAction!=null)Padding(padding:const EdgeInsets.only(top:16),child:FilledButton(onPressed:widget.busy?null:()=>widget.onAction!(action),child:Padding(padding:const EdgeInsets.symmetric(vertical:12),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[Flexible(child:Text('${g['action_label']}',textAlign:TextAlign.center)),const SizedBox(width:10),const Icon(Icons.arrow_forward,size:18)])))),
   if(widget.onAction!=null&&(g['alternatives'] as List? ?? []).isNotEmpty)Padding(padding:const EdgeInsets.only(top:8),child:Wrap(spacing:8,runSpacing:4,children:[for(final item in (g['alternatives'] as List))if(roomGuideActions.contains(item['action']))OutlinedButton(onPressed:widget.busy?null:()=>widget.onAction!('${item['action']}'),child:Text('${item['label']}',style:const TextStyle(fontSize:12)))])),
   if(checks.isNotEmpty)ExpansionTile(key:ValueKey('proofs-${g['status']}'),initiallyExpanded:!complete,tilePadding:EdgeInsets.zero,title:const Text('Confirmations enregistrées',style:TextStyle(fontSize:12)),children:[for(final item in checks)Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Row(children:[Icon(item['confirmed']==true?Icons.check_circle_outline:Icons.schedule,size:16,color:item['confirmed']==true?const Color(0xFF087E70):const Color(0xFF6C7C9B)),const SizedBox(width:8),Expanded(child:Text('${item['label']}',style:const TextStyle(fontSize:12))),Text(item['confirmed']==true?'Confirmé':'En attente',style:const TextStyle(fontSize:11,color:Color(0xFF6C7C9B)))]))]),
  ]));
 }
}
