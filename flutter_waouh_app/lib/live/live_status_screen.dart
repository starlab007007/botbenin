import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_widgets.dart';

class LiveStatusFeed extends StatefulWidget {
  const LiveStatusFeed({super.key});
  @override
  State<LiveStatusFeed> createState() => _LiveStatusFeedState();
}

class _LiveStatusFeedState extends State<LiveStatusFeed> {
  String? filter;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LiveStatusComposerScreen())),
        icon: const Icon(Icons.add_a_photo_outlined),
        label: const Text('Publier'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Wrap(spacing: 8, children: [
            _filter('Tous', null),
            _filter('Ventes', 'sell'),
            _filter('Recherches', 'buy'),
            _filter('Annonces', 'announce'),
          ]),
        ),
        Expanded(child: StreamBuilder<List<LiveStatus>>(
          stream: controller.statuses(type: filter),
          builder: (_, snapshot) {
            final statuses = snapshot.data ?? const <LiveStatus>[];
            if (statuses.isEmpty) return const Center(child: Card(child: Padding(padding: EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.auto_awesome_outlined, size: 52, color: legacy.WaouhColors.orange),
              SizedBox(height: 14),
              Text('Aucun statut actif', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
              SizedBox(height: 8),
              Text('Publiez une vente urgente, une recherche ou une promo visible 24h.', textAlign: TextAlign.center),
            ]))));
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
              itemCount: statuses.length,
              itemBuilder: (_, index) {
                final item = statuses[index];
                return Card(child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LiveStatusViewer(status: item))),
                  child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
                    if (item.mediaUrls.isNotEmpty) ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(item.mediaUrls.first, height: 76, width: 76, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _statusIcon(item.type))) else _statusIcon(item.type),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
                      if (item.caption != null && item.caption!.isNotEmpty) Text(item.caption!, maxLines: 2, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 5),
                      Text('${_statusLabel(item.type)}${item.price == null ? '' : ' · ${item.price} FCFA'}${item.location == null ? '' : ' · ${item.location}'}', style: const TextStyle(color: legacy.WaouhColors.muted, fontSize: 12)),
                    ])),
                  ])),
                ));
              },
            );
          },
        )),
      ]),
    );
  }

  Widget _filter(String label, String? value) => ChoiceChip(label: Text(label), selected: filter == value, onSelected: (_) => setState(() => filter = value));
}

Widget _statusIcon(String type) => Container(height: 76, width: 76, decoration: BoxDecoration(color: type == 'sell' ? const Color(0xFFFFE8E8) : type == 'buy' ? const Color(0xFFE5FAEE) : const Color(0xFFFFF4DB), borderRadius: BorderRadius.circular(12)), child: Icon(type == 'sell' ? Icons.sell_outlined : type == 'buy' ? Icons.search_rounded : Icons.campaign_outlined));
String _statusLabel(String type) => type == 'sell' ? 'Vente' : type == 'buy' ? 'Recherche' : 'Annonce';

class LiveStatusComposerScreen extends StatefulWidget {
  const LiveStatusComposerScreen({super.key});
  @override
  State<LiveStatusComposerScreen> createState() => _LiveStatusComposerScreenState();
}

class _LiveStatusComposerScreenState extends State<LiveStatusComposerScreen> {
  String type = 'sell';
  final title = TextEditingController();
  final price = TextEditingController();
  final city = TextEditingController();
  final caption = TextEditingController();
  final photos = <XFile>[];
  bool publishing = false;

  @override
  void initState() { super.initState(); WidgetsBinding.instance.addPostFrameCallback((_) async { city.text = await context.read<LiveWaouhController>().city; if (mounted) setState(() {}); }); }
  @override
  void dispose() { title.dispose(); price.dispose(); city.dispose(); caption.dispose(); super.dispose(); }

  Future<void> _photo(ImageSource source) async {
    if (photos.length >= 2) return;
    final file = await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file != null && mounted) setState(() => photos.add(file));
  }

  Future<void> _gps() async {
    final controller = context.read<LiveWaouhController>();
    await controller.useDeviceLocation();
    if (!mounted) return;
    final position = controller.position;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(position.available ? 'Position GPS ajoutee. Indiquez aussi la ville ou le quartier.' : 'Position non disponible. Saisissez votre ville.')));
  }

  Future<void> _publish() async {
    if (title.text.trim().isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Titre obligatoire.'))); return; }
    setState(() => publishing = true);
    try {
      final controller = context.read<LiveWaouhController>();
      await controller.setCity(city.text);
      await controller.publishStatus(type: type, title: title.text, caption: caption.text, price: num.tryParse(price.text), locationText: city.text, photos: photos);
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Statut publie pour 24 heures.'))); Navigator.pop(context); }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally { if (mounted) setState(() => publishing = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: const LiveHeader(title: 'Nouveau statut', subtitle: 'Visible pendant 24h', back: true),
    body: ListView(padding: const EdgeInsets.all(18), children: [
      SegmentedButton<String>(segments: const [ButtonSegment(value: 'sell', label: Text('Vente')), ButtonSegment(value: 'buy', label: Text('Achat')), ButtonSegment(value: 'announce', label: Text('Annonce'))], selected: {type}, onSelectionChanged: (value) => setState(() => type = value.first)),
      const SizedBox(height: 18),
      TextField(controller: title, decoration: InputDecoration(labelText: type == 'sell' ? 'Titre de la vente *' : type == 'buy' ? 'Objet recherche *' : 'Titre de l annonce *')),
      const SizedBox(height: 14),
      TextField(controller: price, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: type == 'buy' ? 'Budget (FCFA)' : 'Prix (FCFA)')),
      const SizedBox(height: 14),
      Row(children: [Expanded(child: TextField(controller: city, decoration: const InputDecoration(labelText: 'Ville ou quartier'))), const SizedBox(width: 8), IconButton(onPressed: _gps, icon: const Icon(Icons.my_location), tooltip: 'Utiliser ma position GPS')]),
      const SizedBox(height: 14),
      Wrap(spacing: 8, children: ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Parakou', 'Bohicon'].map((value) => ActionChip(label: Text(value), onPressed: () => setState(() => city.text = value))).toList()),
      const SizedBox(height: 18),
      TextField(controller: caption, minLines: 3, maxLines: 5, decoration: const InputDecoration(labelText: 'Details, etat, quantite ou contact')),
      const SizedBox(height: 16),
      Row(children: [Expanded(child: OutlinedButton.icon(onPressed: photos.length >= 2 ? null : () => _photo(ImageSource.camera), icon: const Icon(Icons.camera_alt_outlined), label: const Text('Prendre photo'))), const SizedBox(width: 12), Expanded(child: OutlinedButton.icon(onPressed: photos.length >= 2 ? null : () => _photo(ImageSource.gallery), icon: const Icon(Icons.photo_outlined), label: const Text('Galerie')))]),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: photos.asMap().entries.map((entry) => Chip(label: Text('Photo ${entry.key + 1}'), onDeleted: () => setState(() => photos.removeAt(entry.key)))).toList()),
      const SizedBox(height: 26),
      FilledButton.icon(onPressed: publishing ? null : _publish, icon: publishing ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.publish_outlined), label: Text(publishing ? 'Publication...' : 'Publier · 24h')),
    ]),
  );
}

class LiveStatusViewer extends StatelessWidget {
  const LiveStatusViewer({super.key, required this.status});
  final LiveStatus status;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: legacy.WaouhColors.ink,
    body: SafeArea(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [CircleAvatar(backgroundColor: legacy.WaouhColors.jade, child: const Icon(Icons.storefront, color: Colors.white)), const SizedBox(width: 12), Expanded(child: Text(status.authorName ?? 'WAOUH', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900))), IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Colors.white))]),
      const Spacer(),
      if (status.mediaUrls.isNotEmpty) ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.network(status.mediaUrls.first, height: 240, width: double.infinity, fit: BoxFit.cover)),
      const SizedBox(height: 18),
      Text(status.title, style: const TextStyle(color: Colors.white, fontSize: 31, fontWeight: FontWeight.w900)),
      if (status.caption != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(status.caption!, style: const TextStyle(color: Colors.white70, fontSize: 17))),
      const SizedBox(height: 16),
      FilledButton.icon(onPressed: () async { await context.read<LiveWaouhController>().openStatusReply(status); if (context.mounted) context.go('/app/chat/waouh'); }, icon: const Icon(Icons.reply), label: const Text('Repondre dans WAOUH')),
    ])),
  );
}
