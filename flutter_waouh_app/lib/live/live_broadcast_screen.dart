import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'live_diffusion_data.dart';
import 'live_diffusion_models.dart';
import 'live_theme.dart';

class LiveBroadcastScreen extends StatefulWidget {
  const LiveBroadcastScreen({super.key});
  @override
  State<LiveBroadcastScreen> createState() => _LiveBroadcastScreenState();
}

class _LiveBroadcastScreenState extends State<LiveBroadcastScreen> {
  late final LiveDiffusionData data = LiveDiffusionData(legacy.supabase);
  late Future<_BroadcastSnapshot> future;
  var tab = 0;

  @override
  void initState() { super.initState(); future = load(); }

  Future<_BroadcastSnapshot> load() async {
    final rows = await Future.wait([data.campaigns(), data.contacts(), data.lists(), data.sessions(), data.approvals()]);
    return _BroadcastSnapshot(rows[0] as List<LiveDiffusionCampaign>, rows[1] as List<LiveDiffusionContact>, rows[2] as List<LiveDiffusionList>, rows[3] as List<LiveDiffusionSession>, rows[4] as List<LiveDiffusionApproval>);
  }

  Future<void> refresh() async { setState(() => future = load()); await future; }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: WaouhPalette.pearl,
    appBar: AppBar(title: const Text('Diffusion WhatsApp'), actions: [IconButton(onPressed: refresh, icon: const Icon(Icons.refresh_rounded))]),
    body: FutureBuilder<_BroadcastSnapshot>(future: future, builder: (_, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) return const Center(child: CircularProgressIndicator());
      if (snapshot.hasError) return Center(child: FilledButton.icon(onPressed: refresh, icon: const Icon(Icons.refresh_rounded), label: const Text('Réessayer')));
      final state = snapshot.data ?? const _BroadcastSnapshot.empty();
      return Column(children: [
        _Nav(value: tab, onChanged: (value) => setState(() => tab = value)),
        Expanded(child: switch (tab) {
          0 => _AudienceReview(data: data, approvals: state.approvals, done: refresh),
          1 => _CampaignSummary(items: state.campaigns),
          2 => _ContactSummary(items: state.contacts, data: data, done: refresh),
          3 => _SessionSummary(items: state.sessions),
          _ => _Metrics(items: state.campaigns),
        }),
      ]);
    }),
  );
}

class _Nav extends StatelessWidget {
  const _Nav({required this.value, required this.onChanged});
  final int value; final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) {
    const tabs = [('IA', Icons.auto_awesome_rounded), ('Campagnes', Icons.send_rounded), ('Contacts', Icons.people_outline_rounded), ('Sessions', Icons.phone_android_rounded), ('Suivi', Icons.analytics_outlined)];
    return Container(color: WaouhPalette.deep, padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7), child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: List.generate(tabs.length, (i) => Padding(padding: const EdgeInsets.only(right: 7), child: ChoiceChip(selected: i == value, onSelected: (_) => onChanged(i), avatar: Icon(tabs[i].$2, size: 16, color: i == value ? WaouhPalette.deep : Colors.white), label: Text(tabs[i].$1), labelStyle: TextStyle(fontWeight: FontWeight.w800, color: i == value ? WaouhPalette.deep : Colors.white), selectedColor: Colors.white, backgroundColor: Colors.white.withOpacity(.12), side: BorderSide(color: Colors.white.withOpacity(.26))))))));
  }
}

class _AudienceReview extends StatefulWidget {
  const _AudienceReview({required this.data, required this.approvals, required this.done});
  final LiveDiffusionData data; final List<LiveDiffusionApproval> approvals; final VoidCallback done;
  @override
  State<_AudienceReview> createState() => _AudienceReviewState();
}

class _AudienceReviewState extends State<_AudienceReview> {
  final name = TextEditingController(); final message = TextEditingController(text: 'Bonjour {{display_name}} 👋\nDécouvrez notre nouvelle offre à {{ville}}.'); final quota = TextEditingController(text: '100');
  final city = TextEditingController();
  var sources = <String>{'radar', 'catalog'}; var sectors = <String>{}; var cities = <String>{}; var classes = <String>{'A', 'B'}; var quality = 50.0; var intent = 0.0; var loading = false; LiveDiffusionAudiencePreview? preview;
  @override void dispose() { name.dispose(); message.dispose(); quota.dispose(); city.dispose(); super.dispose(); }
  Map<String, dynamic> get filters => {'sources': sources.toList(), 'secteurs': sectors.toList(), 'sous_categories': const [], 'keywords': '', 'villes': cities.toList(), 'classes': classes.toList(), 'min_freshness_days': 30, 'min_qualite': quality.round(), 'min_intent': intent.round()};
  Future<void> inspect() async { setState(() => loading = true); try { final value = await widget.data.preview(filters); if (mounted) setState(() => preview = value); } catch (e) { note(e.toString()); } finally { if (mounted) setState(() => loading = false); } }
  Future<void> submit() async { if (message.text.trim().isEmpty || preview == null || preview!.total == 0) return note('Prévisualisez une audience non vide et renseignez le message.'); setState(() => loading = true); try { await widget.data.submitApproval({'name': name.text.trim().isEmpty ? 'Diffusion ciblée' : name.text.trim(), 'message_template': message.text.trim(), 'filters': filters, 'quota_requested': (int.tryParse(quota.text) ?? preview!.total).clamp(1, preview!.total), 'audience_snapshot': {'total': preview!.total, 'breakdown': preview!.breakdown}}); if (mounted) { note('Demande soumise pour validation.', ok: true); widget.done(); } } catch (e) { note(e.toString()); } finally { if (mounted) setState(() => loading = false); } }
  void note(String text, {bool ok = false}) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(backgroundColor: ok ? WaouhPalette.jade : null, content: Text(text.replaceFirst('Bad state: ', ''))));
  @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 28), children: [
    _Card(title: 'Audience IA', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Sélectionnez des cibles consentantes puis demandez une validation avant exécution.', style: TextStyle(color: WaouhPalette.muted)), const SizedBox(height: 14),
      const Text('Sources', style: TextStyle(fontWeight: FontWeight.w900)), Wrap(spacing: 7, runSpacing: 7, children: ['radar', 'catalog', 'signal', 'wa_contact'].map((item) => FilterChip(label: Text(item == 'wa_contact' ? 'Contacts WhatsApp' : item), selected: sources.contains(item), onSelected: (_) => setState(() => sources.contains(item) ? sources.remove(item) : sources.add(item)))).toList()),
      const SizedBox(height: 14), const Text('Secteurs', style: TextStyle(fontWeight: FontWeight.w900)), Wrap(spacing: 7, runSpacing: 7, children: ['Mode & Beauté', 'Tech & Électronique', 'Auto & Moto', 'Immobilier', 'Alimentaire', 'Services'].map((item) => FilterChip(label: Text(item), selected: sectors.contains(item), onSelected: (_) => setState(() => sectors.contains(item) ? sectors.remove(item) : sectors.add(item)))).toList()),
      const SizedBox(height: 14), Row(children: [Expanded(child: TextField(controller: city, decoration: const InputDecoration(labelText: 'Ville'))), const SizedBox(width: 8), FilledButton(onPressed: () { if (city.text.trim().isNotEmpty) setState(() { cities.add(city.text.trim()); city.clear(); }); }, child: const Text('Ajouter'))]), if (cities.isNotEmpty) Wrap(spacing: 7, children: cities.map((item) => InputChip(label: Text(item), onDeleted: () => setState(() => cities.remove(item)))).toList()),
      const SizedBox(height: 14), _Slider(title: 'Qualité minimale', value: quality, onChanged: (value) => setState(() => quality = value)), _Slider(title: 'Intention minimale', value: intent, onChanged: (value) => setState(() => intent = value)),
      FilledButton.icon(onPressed: loading ? null : inspect, icon: const Icon(Icons.visibility_outlined), label: const Text('Prévisualiser')), if (preview != null) Padding(padding: const EdgeInsets.only(top: 12), child: _Preview(value: preview!)),
    ])),
    const SizedBox(height: 14), _Card(title: 'Demande de diffusion', child: Column(children: [TextField(controller: name, decoration: const InputDecoration(labelText: 'Nom')), const SizedBox(height: 10), TextField(controller: message, minLines: 4, maxLines: 6, decoration: const InputDecoration(labelText: 'Message')), const SizedBox(height: 10), TextField(controller: quota, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quota demandé')), const SizedBox(height: 14), FilledButton.icon(onPressed: loading ? null : submit, icon: loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded), label: const Text('Soumettre pour validation'))])),
    if (widget.approvals.isNotEmpty) ...[const SizedBox(height: 18), const Text('Demandes récentes', style: TextStyle(fontWeight: FontWeight.w900)), ...widget.approvals.take(5).map((item) => Card(child: ListTile(leading: Icon(item.status == 'approved' ? Icons.verified_outlined : Icons.pending_outlined), title: Text(item.message ?? 'Diffusion ciblée', maxLines: 1, overflow: TextOverflow.ellipsis), subtitle: Text('${item.quotaRequested} destinataires · ${item.status}'))))],
  ]);
}

class _CampaignSummary extends StatelessWidget { const _CampaignSummary({required this.items}); final List<LiveDiffusionCampaign> items; @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [const _Info(title: 'Campagnes opérationnelles', body: 'Les campagnes utilisent une session active, un quota horaire, des horaires de diffusion et l’exclusion des contacts désinscrits.', icon: Icons.verified_user_outlined), const SizedBox(height: 14), if (items.isEmpty) const _Empty(title: 'Aucune campagne', body: 'Les campagnes créées dans le système apparaîtront ici.', icon: Icons.send_outlined) else ...items.map((item) => _Campaign(item: item))]); }
class _Campaign extends StatelessWidget { const _Campaign({required this.item}); final LiveDiffusionCampaign item; @override Widget build(BuildContext context) => Card(margin: const EdgeInsets.only(bottom: 9), child: Padding(padding: const EdgeInsets.all(13), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis)), _Tag(value: item.status)]), const SizedBox(height: 3), Text(item.type, style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted)), if (item.total > 0) ...[const SizedBox(height: 9), LinearProgressIndicator(value: item.progress, minHeight: 7, borderRadius: BorderRadius.circular(99)), const SizedBox(height: 4), Text('${item.sent}/${item.total} envoyés · ${item.delivered} livrés · ${item.read} lus · ${item.failed} échecs', style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted))]]))); }
class _ContactSummary extends StatelessWidget {
  const _ContactSummary({required this.items, required this.data, required this.done});

  final List<LiveDiffusionContact> items;
  final LiveDiffusionData data;
  final VoidCallback done;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _Info(
            title: 'Gestion du consentement',
            body: 'Les contacts désinscrits ou archivés sont exclus par le backend.',
            icon: Icons.lock_outline_rounded,
          ),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const _Empty(
              title: 'Aucun contact',
              body: 'Ajoutez un contact depuis le bouton + dans ce module.',
              icon: Icons.people_outline_rounded,
            )
          else
            ...items.map(
              (item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Icon(item.optOut ? Icons.block_rounded : Icons.person_outline_rounded),
                  ),
                  title: Text(item.name?.isNotEmpty == true ? item.name! : item.phoneE164),
                  subtitle: Text(item.optOut ? '${item.phoneE164} · désinscrit' : item.phoneE164),
                  trailing: IconButton(
                    onPressed: () async {
                      await data.updateContact(item.id, optOut: !item.optOut);
                      done();
                    },
                    icon: Icon(item.optOut ? Icons.check_circle_outline_rounded : Icons.block_rounded),
                  ),
                ),
              ),
            ),
        ],
      );
}

class _SessionSummary extends StatelessWidget { const _SessionSummary({required this.items}); final List<LiveDiffusionSession> items; @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [const _Info(title: 'Sessions WhatsApp', body: 'Une session WORKING doit être active pour les campagnes classiques.', icon: Icons.phone_android_rounded), const SizedBox(height: 14), if (items.isEmpty) const _Empty(title: 'Aucune session', body: 'Connectez votre compte dans IA.', icon: Icons.qr_code_rounded) else ...items.map((item) => Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(leading: Icon(Icons.phone_iphone_rounded, color: item.active ? WaouhPalette.jade : WaouhPalette.orange), title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w900)), subtitle: Text(item.phone ?? 'QR à connecter'), trailing: _Tag(value: item.status)))), const SizedBox(height: 12), FilledButton.icon(onPressed: () => context.go('/app/whatsapp'), icon: const Icon(Icons.qr_code_rounded), label: const Text('Gérer dans IA'))]); }
class _Metrics extends StatelessWidget { const _Metrics({required this.items}); final List<LiveDiffusionCampaign> items; @override Widget build(BuildContext context) { final values = [('Planifiés', items.fold(0, (x, y) => x + y.total)), ('Envoyés', items.fold(0, (x, y) => x + y.sent)), ('Livrés', items.fold(0, (x, y) => x + y.delivered)), ('Lus', items.fold(0, (x, y) => x + y.read)), ('Réponses', items.fold(0, (x, y) => x + y.replied))]; return ListView(padding: const EdgeInsets.all(16), children: [GridView.count(shrinkWrap: true, crossAxisCount: 2, childAspectRatio: 1.9, mainAxisSpacing: 8, crossAxisSpacing: 8, physics: const NeverScrollableScrollPhysics(), children: values.map((item) => Card(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Text('${item.$2}', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)), Text(item.$1, style: const TextStyle(fontSize: 12, color: WaouhPalette.muted))]))).toList())]); } }
class _Card extends StatelessWidget { const _Card({required this.title, required this.child}); final String title; final Widget child; @override Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)), const SizedBox(height: 12), child]))); }
class _Slider extends StatelessWidget { const _Slider({required this.title, required this.value, required this.onChanged}); final String title; final double value; final ValueChanged<double> onChanged; @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), const Spacer(), Text('${value.round()}')]), Slider(value: value, min: 0, max: 100, divisions: 20, onChanged: onChanged)]); }
class _Preview extends StatelessWidget { const _Preview({required this.value}); final LiveDiffusionAudiencePreview value; @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFEAF9F1), borderRadius: BorderRadius.circular(12)), child: Text('${value.total} contacts estimés${value.sample.isNotEmpty ? ' · exemple masqué : ${value.sample.first['phone_masked'] ?? '—'}' : ''}', style: const TextStyle(fontWeight: FontWeight.w800))); }
class _Tag extends StatelessWidget { const _Tag({required this.value}); final String value; @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: WaouhPalette.mint, borderRadius: BorderRadius.circular(99)), child: Text(value, style: const TextStyle(color: WaouhPalette.jade, fontSize: 10.5, fontWeight: FontWeight.w900))); }
class _Info extends StatelessWidget { const _Info({required this.title, required this.body, required this.icon}); final String title; final String body; final IconData icon; @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(13)), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: WaouhPalette.orange), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text(body, style: const TextStyle(color: WaouhPalette.muted, fontSize: 12))]))])); }
class _Empty extends StatelessWidget { const _Empty({required this.title, required this.body, required this.icon}); final String title; final String body; final IconData icon; @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 55), child: Column(children: [Icon(icon, size: 52, color: WaouhPalette.muted), const SizedBox(height: 12), Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)), const SizedBox(height: 6), Text(body, textAlign: TextAlign.center, style: const TextStyle(color: WaouhPalette.muted))])); }
class _BroadcastSnapshot { const _BroadcastSnapshot(this.campaigns, this.contacts, this.lists, this.sessions, this.approvals); const _BroadcastSnapshot.empty() : campaigns = const [], contacts = const [], lists = const [], sessions = const [], approvals = const []; final List<LiveDiffusionCampaign> campaigns; final List<LiveDiffusionContact> contacts; final List<LiveDiffusionList> lists; final List<LiveDiffusionSession> sessions; final List<LiveDiffusionApproval> approvals; }
