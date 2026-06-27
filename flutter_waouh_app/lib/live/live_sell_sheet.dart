import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_benin_locations.dart';
import 'live_controller.dart';
import 'live_models.dart';
import 'live_theme.dart';

class LiveSellSheet extends StatefulWidget {
  const LiveSellSheet({super.key});

  @override
  State<LiveSellSheet> createState() => _LiveSellSheetState();
}

class _LiveSellSheetState extends State<LiveSellSheet> {
  final _item = TextEditingController();
  final _price = TextEditingController();
  final _detail = TextEditingController();
  final _photos = <LiveAttachment>[];
  String _city = '';
  String _quarter = '';
  bool _gpsBusy = false;
  bool _sending = false;

  static const _suggestions = <String>[
    'iPhone', 'Samsung Galaxy', 'Ordinateur portable', 'Télévision',
    'Frigo', 'Climatiseur', 'Voiture', 'Moto', 'Terrain', 'Maison',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final city = await context.read<LiveWaouhController>().city;
      if (mounted && city.trim().isNotEmpty) setState(() => _city = city.trim());
    });
  }

  @override
  void dispose() {
    _item.dispose();
    _price.dispose();
    _detail.dispose();
    super.dispose();
  }

  String get _digits => _price.text.replaceAll(RegExp(r'\D'), '');
  bool get _ready => _item.text.trim().length > 1 && _digits.isNotEmpty && !_sending;

  Future<void> _pickImage(ImageSource source) async {
    if (_photos.length >= 2) {
      _notice('Maximum 2 photos par annonce.');
      return;
    }
    final file = await ImagePicker().pickImage(source: source, imageQuality: 82, maxWidth: 1600);
    if (file == null || !mounted) return;
    try {
      final attachment = await context.read<LiveWaouhController>().uploadChatImage(file);
      if (mounted) setState(() => _photos.add(attachment));
    } catch (error) {
      _notice('Téléversement impossible : $error');
    }
  }

  Future<void> _chooseImage() async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.camera_alt_outlined), title: const Text('Prendre une photo'), onTap: () { Navigator.pop(sheetContext); _pickImage(ImageSource.camera); }),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choisir dans la galerie'), onTap: () { Navigator.pop(sheetContext); _pickImage(ImageSource.gallery); }),
        ]),
      ),
    );
  }

  Future<void> _pickCity() async {
    final city = await pickLiveOption(context, title: 'Choisir une ville', options: liveBeninPlaces.keys.toList(), current: _city);
    if (city != null && mounted) setState(() { _city = city; _quarter = ''; });
  }

  Future<void> _pickQuarter() async {
    if (_city.isEmpty) {
      _notice('Choisissez d’abord la ville.');
      return;
    }
    final quarter = await pickLiveOption(
      context,
      title: 'Choisir un quartier',
      options: liveQuartiersForCity(_city),
      current: _quarter,
      allowCustom: true,
      customHint: 'Saisir un quartier',
    );
    if (quarter != null && mounted) setState(() => _quarter = quarter);
  }

  Future<void> _detectLocation() async {
    if (_gpsBusy) return;
    setState(() => _gpsBusy = true);
    final controller = context.read<LiveWaouhController>();
    try {
      await controller.useDeviceLocation();
      final position = controller.position;
      if (!position.available) {
        _notice(position.errorMessage ?? 'Position GPS indisponible.');
        return;
      }
      final response = await legacy.supabase.functions.invoke(
        'waouh-partner-ai',
        body: {
          'action': 'reverse_geocode',
          'payload': {'lat': position.latitude, 'lng': position.longitude},
        },
      );
      final root = response.data;
      final place = root is Map && root['data'] is Map
          ? Map<String, dynamic>.from(root['data'] as Map)
          : const <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        final city = (place['ville'] ?? '').toString().trim();
        final quarter = (place['quartier'] ?? '').toString().trim();
        if (city.isNotEmpty) _city = city;
        if (quarter.isNotEmpty) _quarter = quarter;
      });
      _notice(_city.isEmpty ? 'GPS enregistré. Choisissez votre ville.' : 'Position trouvée : $_city${_quarter.isEmpty ? '' : ' · $_quarter'}');
    } catch (error) {
      _notice('GPS indisponible : $error');
    } finally {
      if (mounted) setState(() => _gpsBusy = false);
    }
  }

  Future<void> _publish() async {
    if (!_ready) return;
    final controller = context.read<LiveWaouhController>();
    final price = int.tryParse(_digits) ?? 0;
    final text = StringBuffer('Je vends : ${_item.text.trim()}')
      ..write('\nPrix : $price FCFA');
    if (_city.isNotEmpty) text.write('\nVille : $_city');
    if (_quarter.isNotEmpty) text.write('\nQuartier : $_quarter');
    if (_detail.text.trim().isNotEmpty) text.write('\nDétail : ${_detail.text.trim()}');
    if (_photos.isNotEmpty) text.write('\n📸 ${_photos.length} photo${_photos.length > 1 ? 's' : ''} jointe${_photos.length > 1 ? 's' : ''}');

    setState(() => _sending = true);
    try {
      await controller.sendMain(
        text: text.toString(),
        attachments: List<LiveAttachment>.from(_photos),
        meta: {
          'intent': 'sell',
          'payload': 'sell',
          'source': 'flutter_sell_sheet',
          'sale': {
            'title': _item.text.trim(),
            'price': price,
            'city': _city,
            'quarter': _quarter,
            'detail': _detail.text.trim(),
            'lat': controller.position.latitude,
            'lng': controller.position.longitude,
          },
        },
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      _notice('Publication impossible : $error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _notice(String value) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: WaouhPalette.pearl,
    appBar: AppBar(
      automaticallyImplyLeading: false,
      leading: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded)),
      title: const Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text('Publier une annonce'),
        Text('Vendre un produit ou service', style: TextStyle(fontSize: 12, color: Color(0xFFC9F6E3))),
      ]),
      actions: [TextButton(onPressed: _ready ? _publish : null, child: Text(_sending ? '…' : 'Publier', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)))],
    ),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 110),
      children: [
        Text('Quoi vendre ? *', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _item, onChanged: (_) => setState(() {}), textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(hintText: 'Ex. iPhone 14 Pro 256Go')),
        const SizedBox(height: 8),
        SizedBox(height: 36, child: ListView(scrollDirection: Axis.horizontal, children: _suggestions.map((item) => Padding(padding: const EdgeInsets.only(right: 7), child: ActionChip(label: Text(item), onPressed: () => setState(() => _item.text = item)))).toList())),
        const SizedBox(height: 18),
        Text('Prix *', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(
          controller: _price,
          onChanged: (value) {
            final digits = value.replaceAll(RegExp(r'\D'), '');
            if (digits != value) _price.value = TextEditingValue(text: digits, selection: TextSelection.collapsed(offset: digits.length));
            setState(() {});
          },
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(suffixText: 'FCFA', hintText: '0'),
        ),
        const SizedBox(height: 18),
        FilledButton.icon(onPressed: _gpsBusy ? null : _detectLocation, icon: _gpsBusy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.my_location_rounded), label: const Text('Utiliser ma position GPS')),
        const SizedBox(height: 14),
        _PlaceField(label: 'Ville', value: _city, hint: 'Choisir une ville', onTap: _pickCity),
        const SizedBox(height: 14),
        _PlaceField(label: 'Quartier', value: _quarter, hint: 'Choisir un quartier', onTap: _pickQuarter),
        const SizedBox(height: 18),
        Text('Détail', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _detail, minLines: 3, maxLines: 5, decoration: const InputDecoration(hintText: 'État, marque, dimensions, conditions…')),
        const SizedBox(height: 18),
        Text('Photos (2 maximum)', style: WaouhText.bodyStrong),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          ..._photos.asMap().entries.map((entry) => Stack(children: [
            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(entry.value.url, width: 94, height: 94, fit: BoxFit.cover)),
            Positioned(right: 0, top: 0, child: IconButton(onPressed: () => setState(() => _photos.removeAt(entry.key)), icon: const CircleAvatar(radius: 12, child: Icon(Icons.close_rounded, size: 15)))),
          ])),
          if (_photos.length < 2) InkWell(onTap: _chooseImage, child: Container(width: 94, height: 94, decoration: BoxDecoration(border: Border.all(color: WaouhPalette.line), borderRadius: BorderRadius.circular(12)), child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.add_a_photo_outlined), SizedBox(height: 4), Text('Photo')]))),
        ]),
        const SizedBox(height: 22),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WaouhPalette.mint, borderRadius: BorderRadius.circular(16)),
          child: Text('Aperçu\nJe vends : ${_item.text.isEmpty ? '…' : _item.text}\nPrix : ${_digits.isEmpty ? '0' : _digits} FCFA${_city.isEmpty ? '' : '\nVille : $_city'}${_quarter.isEmpty ? '' : '\nQuartier : $_quarter'}', style: WaouhText.body),
        ),
      ],
    ),
    bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(14), child: FilledButton(onPressed: _ready ? _publish : null, child: _sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Publier l’annonce')))),
  );
}

class _PlaceField extends StatelessWidget {
  const _PlaceField({required this.label, required this.value, required this.hint, required this.onTap});
  final String label;
  final String value;
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: WaouhText.bodyStrong),
    const SizedBox(height: 6),
    InkWell(onTap: onTap, borderRadius: BorderRadius.circular(WaouhRadius.control), child: InputDecorator(decoration: const InputDecoration(prefixIcon: Icon(Icons.location_on_outlined), suffixIcon: Icon(Icons.expand_more_rounded)), child: Text(value.isEmpty ? hint : value, style: TextStyle(color: value.isEmpty ? WaouhPalette.muted : WaouhPalette.ink)))),
  ]);
}
