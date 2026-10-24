import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'live_convergence_contract.dart';

String convergenceMoney(dynamic n) => n == null || n == '' ? 'À préciser' : '${NumberFormat.decimalPattern('fr_FR').format(convergenceAmount(n) ?? 0)} F CFA';
Future<void> openLiveConvergence(BuildContext context, {Map<String, dynamic>? source}) => Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => LiveConvergenceScreen(source: source)));

class LiveConvergenceScreen extends StatefulWidget {
  const LiveConvergenceScreen({super.key, this.source});
  final Map<String, dynamic>? source;
  @override State<LiveConvergenceScreen> createState() => _LiveConvergenceScreenState();
}
class _LiveConvergenceScreenState extends State<LiveConvergenceScreen> {
  final client = Supabase.instance.client;
  Map<String, dynamic>? bundle, metrics;
  List<Map<String, dynamic>> missions = [], pools = [];
  String tab = 'missions', error = '', invitation = '', token = '';
  bool busy = false, consent = false;
  Map<String, String> draft = {}, groupDraft = {};
  String requestKey = DateTime.now().microsecondsSinceEpoch.toString();
  StreamSubscription<AuthState>? authSubscription;
  String? loadedAccount;
  static const kinds = {'product': 'Produit', 'service': 'Service', 'announcement': 'Annonce'};
  static const statuses = {'draft': 'Besoin à préciser', 'comparing': 'Solutions à comparer', 'agreed': 'Accord en cours', 'active': 'Réalisation en cours', 'completed': 'Résultat confirmé', 'cancelled': 'Clôturé'};
  Map<String, dynamic> get mission => convergenceMap(bundle?['mission']);
  bool get own => bundle?['is_owner'] == true;
  bool get closed => ['cancelled', 'completed'].contains(mission['status']);
  @override void initState() {
    super.initState(); _loadAccount();
    authSubscription = client.auth.onAuthStateChange.listen((_) { if (client.auth.currentUser?.id != loadedAccount) _loadAccount(); });
  }
  @override void dispose() { authSubscription?.cancel(); super.dispose(); }
  Future<dynamic> api(String action, [Map<String, dynamic> payload = const {}]) async {
    final response = await client.functions.invoke('waouh-convergence', body: {'action': action, 'payload': payload});
    final data = convergenceMap(response.data);
    if (data['ok'] != true) throw Exception(data['error'] ?? 'Impossible de poursuivre. Réessayez.');
    return data['data'];
  }
  Future<void> _loadAccount() async {
    final uid = client.auth.currentUser?.id; loadedAccount = uid;
    requestKey = DateTime.now().microsecondsSinceEpoch.toString();
    if (mounted) setState(() { bundle = null; missions = []; pools = []; metrics = null; invitation = ''; token = ''; consent = false; busy = false; error = ''; draft = {}; });
    if (uid == null) return;
    final prefs = await SharedPreferences.getInstance();
    Map<String, String> next = {'goal': '${widget.source?['title'] ?? ''}', 'city': '${widget.source?['city'] ?? ''}', 'kind': liveConvergenceKind(widget.source ?? {}), 'budget_max': '', 'deadline': '', 'landmark': '', 'criteria': ''};
    try { final saved = jsonDecode(prefs.getString('waouh.convergence.draft.$uid') ?? '{}'); if (saved is Map && saved['goal'] != null) next = saved.map((k,v) => MapEntry(k.toString(),v.toString())); } catch (_) { /* keep source seed */ }
    if (!mounted || client.auth.currentUser?.id != uid) return;
    setState(() => draft = next);
    await run('list');
  }
  Future<dynamic> run(String action, [Map<String, dynamic> payload = const {}]) async {
    if (!mounted || busy) return null;
    final uid = client.auth.currentUser?.id;
    setState(() { busy = true; error = ''; });
    try {
      final data = convergenceMap(await api(action, payload));
      if (!mounted || client.auth.currentUser?.id != uid) return null;
      setState(() {
        if (data['mission'] is Map) bundle = data;
        if (data['missions'] is List) missions = (data['missions'] as List).map(convergenceMap).toList();
        if (data['pools'] is List) pools = (data['pools'] as List).map(convergenceMap).toList();
        if (data['token'] is String) invitation = data['token'];
        if (action == 'metrics') metrics = data;
      });
      return data;
    } catch (e) {
      if (mounted && client.auth.currentUser?.id == uid) setState(() { error = e is FunctionException ? '${convergenceMap(e.details)['error'] ?? 'Vérifiez la connexion et réessayez.'}' : e.toString().replaceFirst('Exception: ', ''); });
      return null;
    } finally { if (mounted && client.auth.currentUser?.id == uid) setState(() => busy = false); }
  }
  Future<Map<String,String>?> form(String title, Map<String,String> labels, {Map<String,dynamic> initial = const {}, Set<String> numeric = const {}, Set<String> dates = const {}, bool kind = false, Future<void> Function(Map<String,String>)? changed}) async {
    final formAccount = client.auth.currentUser?.id;
    Future<void> notifyChanged(Map<String,String> value) async { if(client.auth.currentUser?.id == formAccount) await changed?.call(value); }
    final controls = {for (final k in labels.keys) k: TextEditingController(text: '${initial[k] ?? ''}')};
    final dateValues = <String,String>{};
    var kindValue = '${initial['kind'] ?? 'service'}';
    for(final key in dates){final value=DateTime.tryParse('${initial[key] ?? ''}');if(value!=null){dateValues[key]=value.toUtc().toIso8601String();controls[key]!.text=DateFormat('dd/MM/yyyy HH:mm').format(value.toLocal());}}
    Map<String,String> currentValues()=>{...controls.map((k,v)=>MapEntry(k,dateValues[k] ?? v.text)), 'kind':kindValue};
    try { final result = await showDialog<Map<String,String>>(context: context, builder: (ctx) => StatefulBuilder(builder: (_, local) => AlertDialog(title: Text(title), content: SizedBox(width: 430, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      if (kind) DropdownButtonFormField<String>(initialValue: kindValue, decoration: const InputDecoration(labelText: 'Nature'), items: kinds.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(), onChanged: (v) { if (v != null) { kindValue = v; notifyChanged(currentValues()); } }),
      ...labels.entries.map((e) => Padding(padding: const EdgeInsets.only(top: 12), child: TextField(controller: controls[e.key], decoration: InputDecoration(labelText: e.value, border: const OutlineInputBorder()), keyboardType: numeric.contains(e.key) ? TextInputType.number : TextInputType.multiline, minLines: 1, maxLines: numeric.contains(e.key) || dates.contains(e.key) ? 1 : 3, readOnly: dates.contains(e.key), onTap: dates.contains(e.key) ? () async {
        final date = await showDatePicker(context: ctx, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 730)), initialDate: DateTime.now().add(const Duration(days: 1)));
        if (date == null || !ctx.mounted) return;
        final time = await showTimePicker(context: ctx, initialTime: const TimeOfDay(hour: 18, minute: 0));
        if (time == null) return;
        final value = DateTime(date.year,date.month,date.day,time.hour,time.minute);
        dateValues[e.key] = value.toUtc().toIso8601String(); controls[e.key]!.text = DateFormat('dd/MM/yyyy HH:mm').format(value); notifyChanged(currentValues());
      } : null, onChanged: (_) => notifyChanged(currentValues())))),
    ]))), actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(ctx, {...controls.map((k,v) => MapEntry(k,dateValues[k] ?? v.text.trim())), if (kind) 'kind': kindValue}), child: const Text('Continuer'))])));
      return mounted && client.auth.currentUser?.id == formAccount ? result : null; }
    finally { WidgetsBinding.instance.addPostFrameCallback((_) { for (final c in controls.values) { c.dispose(); } }); }
  }
  Widget button(String label, VoidCallback callback, {bool enabled = true, bool primary = false}) => Padding(padding: const EdgeInsets.only(top: 8), child: primary ? FilledButton(onPressed: busy || !enabled ? null : callback, child: Text(label)) : OutlinedButton(onPressed: busy || !enabled ? null : callback, child: Text(label)));
  Widget panel(String title, List<Widget> children) => Card(margin: const EdgeInsets.only(bottom: 13), child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)), const SizedBox(height: 9), ...children])));
  Future<void> saveDraft(Map<String,String> next) async { draft = next; final uid = client.auth.currentUser?.id; if (uid != null) { final p = await SharedPreferences.getInstance(); await p.setString('waouh.convergence.draft.$uid',jsonEncode(next)); } }
  Future<void> createMission() async {
    final values = await form('Votre résultat attendu', {'goal':'Votre besoin','city':'Ville','budget_max':'Budget maximum · F CFA (facultatif)','landmark':'Quartier ou repère (privé)','deadline':'Pour quand ?','criteria':'Conditions du résultat · une par ligne'}, initial: draft, kind: true, numeric: {'budget_max'}, dates: {'deadline'}, changed: saveDraft);
    if (values == null) return; await saveDraft(values);
    final data = await run('create', {...values,'request_key':requestKey,'budget_max':convergenceAmount(values['budget_max']),'deadline':values['deadline']!.isEmpty ? null : values['deadline'],'criteria':values['criteria']!.split('\n').where((x) => x.trim().isNotEmpty).take(10).toList()});
    if (data == null) return; requestKey = DateTime.now().microsecondsSinceEpoch.toString();
    final source = widget.source;
    if (source != null && '${source['title'] ?? ''}'.isNotEmpty) {
      final planned = await run('plan_add',{'mission_id':mission['id'],'title':'Offre repérée à examiner'});
      if (planned != null && (planned['plans'] as List).isNotEmpty) await run('component_add',{'mission_id':mission['id'],'plan_id':planned['plans'][0]['id'],'title':source['title'],'kind':liveConvergenceKind(source),'source_ref':'${source['id'] ?? source['fabric_id'] ?? DateTime.now().microsecondsSinceEpoch}','source_url':source['source_url'],'amount':convergenceAmount(source['price'] ?? source['price_min']),'extra_cost':null,'unit':source['unit'] ?? 'forfait','source_snapshot':{'article_id':source['article_id'],'fabric_id':source['fabric_id'],'source':source['source']}});
    }
  }
  Future<void> addComponent(Map<String,dynamic> plan) async {
    final p = await form('Ajouter un produit ou intervenant',{'title':'Produit ou prestation','amount':'Prix total de cette partie · F CFA','extra_cost':'Frais supplémentaires (vide = inconnus)','unit':'Unité / périmètre du prix','scope':'Ce qui est inclus','exclusions':'Ce qui est exclu','source_url':'Lien source (facultatif)'},initial:{'unit':'forfait'},kind:true,numeric:{'amount','extra_cost'});
    if (p != null) await run('component_add',{...p,'mission_id':mission['id'],'plan_id':plan['id'],'source_ref':DateTime.now().microsecondsSinceEpoch.toString(),'amount':convergenceAmount(p['amount']),'extra_cost':convergenceAmount(p['extra_cost'])});
  }
  Future<void> proposeAgreement(Map<String,dynamic> c) async {
    final a = convergenceMap(c['agreement']), old = convergenceMap(a['terms']);
    final terms = await form('Fiche d’accord · nouvelle version',{'amount':'Prix total, frais inclus · F CFA','scope':'Ce qui est inclus','exclusions':'Ce qui est exclu (ou Aucune exclusion)','deadline':'Délai ou rendez-vous convenu','expected_result':'Comment constater le résultat ?'},initial:{'amount':old['amount'] ?? c['amount'],'scope':old['scope'] ?? c['scope'],'exclusions':old['exclusions'] ?? c['exclusions'],'deadline':old['deadline'],'expected_result':old['expected_result']},numeric:{'amount'});
    if (terms != null) await run('agreement_propose',{'component_id':c['id'],'terms':{...terms,'amount':convergenceAmount(terms['amount'])}});
  }
  Widget component(Map<String,dynamic> c) {
    final a = convergenceMap(c['agreement']), terms = convergenceMap(a['terms']), selected = mission['selected_plan_id'] == c['plan_id'];
    return panel('${c['title']}',[
      Text('${convergenceMoney(c['amount'])} · ${c['unit']} · frais ${convergenceMoney(c['extra_cost'])}'),
      const Text('Montants renseignés, à confirmer dans l’accord.', style: TextStyle(fontSize: 12)),
      if (own && c['provider_id'] == null && !closed) button('Inviter ce professionnel',() => run('invite',{'component_id':c['id']})),
      if (a.isNotEmpty) ...[
        const Divider(), Text('Accord · version ${a['version']}',style: const TextStyle(fontWeight: FontWeight.w600)),
        Text('${terms['scope']}\nTotal convenu : ${convergenceMoney(terms['amount'])}\nDélai : ${terms['deadline']}\nExclusions : ${terms['exclusions']}\nRésultat attendu : ${terms['expected_result']}'),
        Text('Demandeur : ${a['owner_accepted_at'] == null ? 'à confirmer' : 'accord enregistré'}\nProfessionnel : ${a['provider_accepted_at'] == null ? 'à confirmer' : 'accord enregistré'}'),
        if(a['status']=='accepted')Text('Résultat : demandeur ${a['owner_completed_at']==null?'à confirmer':'confirmé'} · professionnel ${a['provider_completed_at']==null?'à confirmer':'confirmé'}'),
        if (a['status'] == 'completed') const Text('Résultat confirmé par les deux parties') else if (!closed) ...[
          button('Confirmer cette version',() => run('agreement_accept',{'component_id':c['id'],'version':a['version']}),enabled:selected && c['provider_id'] != null && a['status'] != 'rejected' && (own ? a['owner_accepted_at'] : a['provider_accepted_at']) == null,primary:true),
          if (a['status'] == 'accepted') button(own ? 'Valider le résultat reçu' : 'Confirmer la réalisation',() => run('agreement_complete',{'component_id':c['id'],'version':a['version'],'note':'Résultat attendu confirmé dans WAOUH.'}),enabled:(own ? a['owner_completed_at'] : a['provider_completed_at']) == null),
          button('Refuser cet accord',() => run('agreement_reject',{'component_id':c['id'],'version':a['version']}),enabled:a['owner_completed_at']==null && a['provider_completed_at']==null),
        ],
        if (!selected) const Text('Le demandeur doit retenir ce chemin avant confirmation.'),
      ],
      if (!closed && a['owner_completed_at']==null && a['provider_completed_at']==null && a['status'] != 'completed') button(a.isEmpty ? 'Préparer la fiche d’accord' : 'Proposer une nouvelle version',() => proposeAgreement(c)),
      const SizedBox(height: 8), const Text('Une nouvelle version remet les confirmations à zéro. Aucun paiement n’est déclenché.',style:TextStyle(fontSize:12)),
    ]);
  }
  Widget missionView() {
    if (bundle == null) return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      panel('Quel résultat voulez-vous obtenir ?',[const Text('Produits, services et annonces. Votre brouillon est conservé pour votre compte sur cet appareil.'),button('Préciser mon besoin',createMission,primary:true)]),
      ...missions.map((m) => Card(child:ListTile(title:Text('${m['goal']}'),subtitle:Text('${m['city']} · ${statuses[m['status']] ?? m['status']}'),trailing:const Icon(Icons.chevron_right),onTap:() => run('get',{'mission_id':m['id']})))),
    ]);
    final plans = (bundle!['plans'] as List).map(convergenceMap), components = (bundle!['components'] as List).map(convergenceMap).toList();
    return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      TextButton.icon(onPressed:() { setState(() => bundle=null); run('list'); },icon:const Icon(Icons.chevron_left),label:const Text('Mes besoins')),
      button('Actualiser les confirmations',()=>run('get',{'mission_id':mission['id']})),
      panel('${mission['goal']}',[Text('${kinds[mission['kind']]} · ${mission['city']}\n${statuses[mission['status']]}${mission['budget_max'] == null ? '' : '\nBudget ${convergenceMoney(mission['budget_max'])}'}'),if (mission['criteria'] is List) ...((mission['criteria'] as List).map((x) => Text('• $x')))]),
      if(!own)const Text('Vous voyez uniquement les parties qui vous sont adressées. Les sous-totaux concernent ces parties.'),
      if(own && !closed)button('Ajuster mon budget',() async { final p=await form('Confirmer le nouveau plafond',{'budget_max':'Budget maximum · F CFA (vide = sans plafond)'},initial:{'budget_max':mission['budget_max']},numeric:{'budget_max'}); if(p!=null)run('mission_update',{'mission_id':mission['id'],'budget_max':convergenceAmount(p['budget_max'])}); }),
      if (own && !closed) panel('Chemins possibles',[const Text('Les approches proposées restent à valider. Aucun prix ni professionnel n’est inventé.'),button('Explorer avec Bot',() => run('suggest',{'mission_id':mission['id']}),enabled:plans.length<5,primary:true),button('Ajouter un chemin',() async { final p=await form('Ajouter un chemin',{'title':'Nom du chemin'}); if(p!=null)run('plan_add',{'mission_id':mission['id'],...p}); },enabled:plans.length<5)]),
      ...plans.map((plan) {
        final parts=components.where((c) => c['plan_id']==plan['id']).toList(), total=liveConvergenceTotal(parts);
        return panel('${plan['title']}',[
          if (plan['rationale'] != null) Text('${plan['rationale']}'),if(plan['origin']=='ai')const Text('Piste proposée par IA, à valider.',style:TextStyle(fontSize:12)),
          if(plan['requirements'] is List) ...((plan['requirements'] as List).map((x) => Text('À obtenir : $x'))),
          Text('${total['complete']==true ? 'Coût renseigné' : 'Sous-total connu'} : ${convergenceMoney(total['known'])}',style:const TextStyle(fontWeight:FontWeight.w600)),
          if(total['complete']!=true)const Text('Total à confirmer · frais manquants possibles.'),
          if(mission['selected_plan_id']==plan['id'])const Text('Chemin retenu') else if(own && !closed)button('Retenir ce chemin',() => run('plan_select',{'mission_id':mission['id'],'plan_id':plan['id']})),
          ...parts.map(component),if(own && !closed)button('Ajouter un produit ou intervenant',() => addComponent(plan)),
        ]);
      }),
      if(own && !closed) button('Clôturer ce besoin',() async { final ok=await showDialog<bool>(context:context,builder:(ctx)=>AlertDialog(title:const Text('Clôturer ce besoin ?'),content:const Text('Les démarches commerciales engagées restent à traiter dans leurs discussions.'),actions:[TextButton(onPressed:()=>Navigator.pop(ctx,false),child:const Text('Continuer')),TextButton(onPressed:()=>Navigator.pop(ctx,true),child:const Text('Clôturer'))]));if(ok==true)run('cancel',{'mission_id':mission['id']}); }),
    ]);
  }
  Future<void> groups() async { await run('pool_list',{'city':mission['city'] ?? draft['city'],'kind':mission['kind'] ?? draft['kind']}); }
  Widget groupView() => Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    panel('Ensemble · jusqu’à 5 participants',[const Text('Sujet, ville et échéance sont visibles. Les coordonnées, budgets et discussions restent privés. Aucune économie n’est présumée.'),
      CheckboxListTile(contentPadding:EdgeInsets.zero,value:consent,onChanged:(v)=>setState(()=>consent=v==true),title:const Text('Je participe volontairement et accepte de partager le sujet, la ville et l’échéance.',style:TextStyle(fontSize:13))),
      if(own && bundle!=null)button('Proposer un groupe pour ce besoin',() async { final p=await form('Proposer un groupe',{'topic':'Sujet public','deadline':'Échéance'},dates:{'deadline'});if(p!=null){await run('pool_create',{'mission_id':mission['id'],...p,'consent':consent});await groups();}},enabled:consent) else const Text('Ouvrez un de vos besoins pour rejoindre ou proposer un groupe.'),
      button('Actualiser les groupes compatibles',groups),
    ]),
    ...pools.map((g)=>panel('${g['topic']}',[
      Text('${g['city']} · ${g['member_count']}/5 participants · ${g['status']=='confirmed' ? 'Accord de tous enregistré' : g['status']=='cancelled' ? 'Clôturé' : 'Ouvert'}'),
      if(g['shared_cost']!=null)Text('Coût partagé proposé : ${convergenceMoney(g['shared_cost'])}\nAu nombre actuel : ${convergenceMoney((convergenceAmount(g['shared_cost']) ?? 0)/(g['member_count'] as num).clamp(1,5))} par participant\n${g['quote_scope']}\nVersion ${g['quote_version']} · valable jusqu’au ${g['quote_expires_at']}') else const Text('Coût à proposer par le professionnel.'),
      if(g['is_owner']==true && g['status']=='open' && g['provider_linked']!=true && g['shared_cost']==null)button('Inviter le professionnel',()=>run('pool_invite',{'pool_id':g['id']})),
      if(g['is_provider']==true && g['status']=='open')button('Proposer le coût partagé',() async { final p=await form('Coût partagé total',{'shared_cost':'Montant total à répartir · F CFA','scope':'Ce que couvre ce coût','expires_at':'Valable jusqu’au'},numeric:{'shared_cost'},dates:{'expires_at'});if(p!=null){await run('pool_quote',{'pool_id':g['id'],...p,'shared_cost':convergenceAmount(p['shared_cost']),'minimum_members':2});await groups();}}),
      if(g['joined']!=true && g['is_provider']!=true && own && bundle!=null && g['status']=='open')button('Rejoindre avec mon accord',() async {await run('pool_join',{'pool_id':g['id'],'mission_id':mission['id'],'consent':consent});await groups();},enabled:consent),
      if(g['joined']==true) ...[
        if(g['shared_cost']!=null && g['status']=='open')button(g['accepted_version']==g['quote_version']?'Votre accord est enregistré':'Accepter cette répartition',() async {await run('pool_accept',{'pool_id':g['id'],'version':g['quote_version']});await groups();},enabled:g['accepted_version']!=g['quote_version'],primary:true),
        button('Quitter le groupe',() async {await run('pool_leave',{'pool_id':g['id']});await groups();}),
      ],const Text('Tout changement de participants ou de proposition nécessite un nouvel accord. Aucun paiement automatique.',style:TextStyle(fontSize:12)),
    ])),
  ]);
  @override Widget build(BuildContext context) {
    final signed=client.auth.currentUser!=null;
    return Scaffold(appBar:AppBar(title:const Text('WAOUH Convergence')),body:SafeArea(child:ListView(padding:const EdgeInsets.all(15),children:[
      if(!signed)const Text('Connectez-vous pour conserver un besoin ou répondre à une invitation.') else ...[
        Wrap(spacing:7,runSpacing:7,children:{'missions':'Mes besoins','invite':'Invitation','groups':'Ensemble','pilot':'Pilote'}.entries.map((e)=>ChoiceChip(label:Text(e.value),selected:tab==e.key,onSelected:(_){setState(()=>tab=e.key);if(tab=='groups')groups();if(tab=='pilot')run('metrics');})).toList()),
        if(busy)const Padding(padding:EdgeInsets.all(12),child:LinearProgressIndicator()),if(error.isNotEmpty)Semantics(liveRegion:true,child:Padding(padding:const EdgeInsets.symmetric(vertical:12),child:Text(error,style:TextStyle(color:Theme.of(context).colorScheme.error)))),
        if(invitation.isNotEmpty)panel('Invitation privée · 7 jours',[SelectableText(invitation),const Text('Le professionnel se connecte et relit les conditions. Aucun message automatique.'),button('Copier le code',()=>Clipboard.setData(ClipboardData(text:invitation)))]),
        if(tab=='missions')missionView(),
        if(tab=='groups')groupView(),
        if(tab=='invite')panel('Répondre à une invitation',[TextField(decoration:const InputDecoration(labelText:'Code d’invitation'),onChanged:(v)=>token=v.trim()),button('Accepter l’invitation',() async {final d=await run('redeem_invite',{'token':token});if(d!=null){setState(()=>tab=d['mission']!=null?'missions':'groups');if(tab=='groups')groups();}},primary:true)]),
        if(tab=='pilot' && metrics!=null)panel('Pilote · ${metrics!['scope']=='platform'?'vue administrateur':'vos besoins'}',[
          Text('Objectif proposé : ${metrics!['target_missions']} missions et ${metrics!['target_professionals']} professionnels volontaires.'),
          ...{'missions':'Besoins créés','completed':'Résultats confirmés','agreements_confirmed':'Accords confirmés des deux côtés','professionals':'Professionnels reliés','terms_revised':'Conditions révisées','ai_requests':'Appels IA','ai_input_tokens':'Tokens IA en entrée','ai_output_tokens':'Tokens IA en sortie'}.entries.map((e)=>ListTile(contentPadding:EdgeInsets.zero,title:Text(e.value),trailing:Text('${metrics![e.key]}'))),
          Text('Délai médian de proposition d’accord : ${metrics!['quote_delay_seconds']==null?'Non disponible':'${((metrics!['quote_delay_seconds'] as num)/60).round()} min'}'),const Text('Coût IA en F CFA : non mesuré.'),
        ]),
      ],
    ])));
  }
}
