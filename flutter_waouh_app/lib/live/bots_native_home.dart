import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'bots_native_models.dart';
import 'bots_native_service.dart';

class BotsNativeHome extends StatefulWidget {
  const BotsNativeHome({super.key});

  @override
  State<BotsNativeHome> createState() => _BotsNativeHomeState();
}

class _BotsNativeHomeState extends State<BotsNativeHome> {
  late final NativeBotsService service = NativeBotsService(Supabase.instance.client);
  late Future<NativeBotsDashboard> future = service.load();

  Future<void> refresh() async { setState(() => future = service.load()); await future; }

  Future<void> create(NativeBotsDashboard dashboard) async {
    final name = TextEditingController();
    final webhook = TextEditingController();
    final saved = await showDialog<bool>(context: context, builder: (dialog) => AlertDialog(
      title: const Text('Nouveau chatbot'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Nom du chatbot')),
        const SizedBox(height: 10),
        TextField(controller: webhook, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL du webhook', hintText: 'https://...')),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(dialog, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(dialog, true), child: const Text('Créer'))],
    ));
    if (saved != true) return;
    try {
      await service.create(dashboard: dashboard, name: name.text, webhookUrl: webhook.text);
      if (mounted) { await refresh(); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chatbot créé.'), backgroundColor: Color(0xFF159B65))); }
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error'))); }
  }

  Future<void> toggle(NativeBot bot) async { try { await service.toggle(bot); await refresh(); } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error'))); } }
  Future<void> copy(NativeBot bot) async { final url = bot.publicUrl; if (url == null || url.isEmpty) return; await Clipboard.setData(ClipboardData(text: url)); if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lien public copié.'), backgroundColor: Color(0xFF159B65))); }
  Future<void> remove(NativeBot bot) async { final yes = await showDialog<bool>(context: context, builder: (dialog) => AlertDialog(title: const Text('Supprimer le bot ?'), content: Text('« ${bot.name} » sera supprimé.'), actions: [TextButton(onPressed: () => Navigator.pop(dialog, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(dialog, true), child: const Text('Supprimer'))])); if (yes == true) { await service.delete(bot); await refresh(); } }

  @override
  Widget build(BuildContext context) => FutureBuilder<NativeBotsDashboard>(future: future, builder: (_, snapshot) {
    if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
    if (snapshot.hasError) return Center(child: FilledButton.icon(onPressed: refresh, icon: const Icon(Icons.refresh_rounded), label: const Text('Réessayer')));
    final dashboard = snapshot.data!;
    return RefreshIndicator(onRefresh: refresh, child: ListView(padding: const EdgeInsets.all(16), children: [
      _Summary(count: dashboard.items.length, limit: dashboard.limit, onCreate: () => create(dashboard)),
      const SizedBox(height: 18),
      if (dashboard.items.isEmpty) const _Empty() else ...dashboard.items.map((bot) => _Card(bot: bot, onToggle: () => toggle(bot), onCopy: () => copy(bot), onDelete: () => remove(bot))),
    ]));
  });
}

class _Summary extends StatelessWidget { const _Summary({required this.count,required this.limit,required this.onCreate}); final int count; final int limit; final VoidCallback onCreate; @override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.all(18),decoration:BoxDecoration(color:const Color(0xFF075E54),borderRadius:BorderRadius.circular(24)),child:Row(children:[Container(width:54,height:54,decoration:BoxDecoration(color:Colors.white.withOpacity(.14),shape:BoxShape.circle),child:const Icon(Icons.smart_toy_outlined,color:Color(0xFFFFA645),size:30)),const SizedBox(width:13),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Automatisations et chatbots',style:TextStyle(color:Colors.white,fontWeight:FontWeight.w900,fontSize:17)),Text('$count / $limit bots disponibles',style:const TextStyle(color:Color(0xFFC9F6E6)))])),IconButton(onPressed:onCreate,icon:const Icon(Icons.add_circle_outline_rounded,color:Colors.white))])); }
class _Empty extends StatelessWidget { const _Empty(); @override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.all(28),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(22),border:Border.all(color:const Color(0xFFDFEBE6))),child:const Column(children:[Icon(Icons.smart_toy_outlined,size:52,color:Color(0xFF6B8279)),SizedBox(height:10),Text('Aucun bot pour le moment',style:TextStyle(fontWeight:FontWeight.w900,fontSize:18)),SizedBox(height:6),Text('Créez un chatbot avec votre webhook personnalisé.',textAlign:TextAlign.center,style:TextStyle(color:Color(0xFF6B8279)))])); }
class _Card extends StatelessWidget { const _Card({required this.bot,required this.onToggle,required this.onCopy,required this.onDelete}); final NativeBot bot; final VoidCallback onToggle; final VoidCallback onCopy; final VoidCallback onDelete; @override Widget build(BuildContext context)=>Container(margin:const EdgeInsets.only(bottom:10),padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(20),border:Border.all(color:const Color(0xFFDFEBE6))),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[Icon(Icons.smart_toy_rounded,color:bot.active?const Color(0xFF159B65):const Color(0xFF6B8279)),const SizedBox(width:10),Expanded(child:Text(bot.name,style:const TextStyle(fontWeight:FontWeight.w900))),Switch(value:bot.active,onChanged:(_)=>onToggle())]),if((bot.description??'').isNotEmpty)Padding(padding:const EdgeInsets.only(top:7),child:Text(bot.description!,style:const TextStyle(color:Color(0xFF6B8279),fontSize:12))),const SizedBox(height:10),Row(children:[Expanded(child:OutlinedButton.icon(onPressed:onCopy,icon:const Icon(Icons.link_rounded,size:18),label:const Text('Copier le lien'))),const SizedBox(width:8),IconButton.filledTonal(onPressed:onDelete,icon:const Icon(Icons.delete_outline_rounded))]) ])); }
