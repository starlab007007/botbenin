import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';

const _productCategories = [
  'Alimentation', 'Boissons', 'Électronique', 'Mode & Vêtements',
  'Maison & Décoration', 'Beauté & Cosmétiques', 'Bureautique & Papeterie',
  'Auto & Moto', 'Téléphonie & Accessoires', 'Bébé & Enfants',
  'Sport & Loisirs', 'Bricolage & Jardin', 'Services',
];

const _productUnits = [
  'pièce', 'unité', 'kg', 'g', 'sac', 'sachet', 'paquet', 'carton',
  'litre', 'cl', 'bouteille', 'canette', 'verre', 'plat', 'assiette',
  'portion', 'menu', 'mètre', 'm²', 'rouleau', 'lot', 'douzaine',
];

class LivePartnerProductsScreenV2 extends StatelessWidget {
  const LivePartnerProductsScreenV2({super.key, required this.businessId});
  final String businessId;

  void _openForm(BuildContext context, legacy.PartnerProduct? product) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => LivePartnerProductFormV2(businessId: businessId, initial: product),
    ));
  }

  Future<void> _delete(BuildContext context, legacy.PartnerProduct product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Supprimer ce produit ?'),
        content: Text('« ${product.name} » sera retiré du catalogue WAOUH.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await legacy.supabase.from('waouh_partner_products').delete().eq('id', product.id);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Produit supprimé.')));
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(title: const Text('Produits')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: WaouhPalette.blue,
        onPressed: () => _openForm(context, null),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Ajouter'),
      ),
      body: StreamBuilder<List<legacy.PartnerProduct>>(
        stream: controller.products(businessId),
        builder: (_, snapshot) {
          final products = snapshot.data ?? const <legacy.PartnerProduct>[];
          if (snapshot.connectionState == ConnectionState.waiting && products.isEmpty) return const Center(child: CircularProgressIndicator());
          if (products.isEmpty) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: WaouhEmptyPanel(
                icon: Icons.inventory_2_outlined,
                title: 'Aucun produit',
                message: 'Ajoutez les produits visibles dans votre catalogue WAOUH.',
                actionLabel: 'Ajouter un produit',
                onAction: () => _openForm(context, null),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            itemCount: products.length,
            itemBuilder: (_, index) => _ProductCard(
              product: products[index],
              onEdit: () => _openForm(context, products[index]),
              onDelete: () => _delete(context, products[index]),
            ),
          );
        },
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onEdit, required this.onDelete});
  final legacy.PartnerProduct product;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final price = product.priceMin == null ? 'Prix sur demande' : '${_money(product.priceMin!)} F${product.unit == null || product.unit!.isEmpty ? '' : ' / ${product.unit}'}';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 82,
              height: 82,
              child: product.photos.isEmpty
                  ? const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.inventory_2_outlined))
                  : Image.network(product.photos.first, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFEAF7F1), child: Icon(Icons.broken_image_outlined))),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(product.name, style: WaouhText.h3, maxLines: 1, overflow: TextOverflow.ellipsis)),
              WaouhPill(label: product.available ? 'Dispo' : 'Indispo', background: product.available ? WaouhPalette.mint : WaouhPalette.line, foreground: product.available ? WaouhPalette.jade : WaouhPalette.muted),
            ]),
            if ((product.category ?? '').isNotEmpty) Text(product.category!, style: WaouhText.caption),
            const SizedBox(height: 4),
            Text(price, style: WaouhText.bodyStrong),
            const SizedBox(height: 8),
            Row(children: [
              OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit_outlined, size: 17), label: const Text('Modifier')),
              const SizedBox(width: 6),
              IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded, color: WaouhPalette.red)),
            ]),
          ])),
        ]),
      ),
    );
  }
}

class LivePartnerProductFormV2 extends StatefulWidget {
  const LivePartnerProductFormV2({super.key, required this.businessId, this.initial});
  final String businessId;
  final legacy.PartnerProduct? initial;

  @override
  State<LivePartnerProductFormV2> createState() => _LivePartnerProductFormV2State();
}

class _LivePartnerProductFormV2State extends State<LivePartnerProductFormV2> {
  late final _name = TextEditingController(text: widget.initial?.name ?? '');
  late final _description = TextEditingController(text: widget.initial?.description ?? '');
  late final _price = TextEditingController(text: widget.initial?.priceMin?.toString() ?? '');
  late final _stock = TextEditingController(text: widget.initial?.stock?.toString() ?? '');
  late String _category = widget.initial?.category ?? '';
  late String _unit = widget.initial?.unit ?? '';
  late bool _available = widget.initial?.available ?? true;
  late List<String> _photos = List<String>.from(widget.initial?.photos ?? const []);
  bool _saving = false;
  bool _uploading = false;

  @override
  void dispose() {
    _name.dispose(); _description.dispose(); _price.dispose(); _stock.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    if (_photos.length >= 3) return;
    final file = await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final bytes = await file.readAsBytes();
      if (bytes.length > 5 * 1024 * 1024) throw StateError('La photo dépasse 5 Mo.');
      final url = await context.read<legacy.PartnerController>().uploadProductPhoto(bytes: bytes, fileName: file.name);
      if (mounted) setState(() => _photos = [..._photos, url]);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _choosePhoto() async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(child: Wrap(children: [
        ListTile(leading: const Icon(Icons.camera_alt_outlined), title: const Text('Prendre une photo'), onTap: () { Navigator.pop(sheetContext); _pickPhoto(ImageSource.camera); }),
        ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choisir dans la galerie'), onTap: () { Navigator.pop(sheetContext); _pickPhoto(ImageSource.gallery); }),
      ])),
    );
  }

  Future<void> _select(String title, List<String> values, ValueChanged<String> onSelect) async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: ListView(children: [
          ListTile(title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18))),
          ...values.map((value) => ListTile(title: Text(value), onTap: () => Navigator.pop(sheetContext, value))),
        ]),
      ),
    );
    if (selected != null && mounted) setState(() => onSelect(selected));
  }

  Future<void> _save() async {
    final partner = context.read<legacy.PartnerController>().partner;
    if (partner == null) return;
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Le nom du produit est requis.')));
      return;
    }
    setState(() => _saving = true);
    final price = num.tryParse(_price.text.trim().replaceAll(',', '.'));
    final stock = int.tryParse(_stock.text.trim());
    // Exact payload used by ProductFormNativeScreen.tsx. Do not send aliases
    // such as category, title, unit, price or stock: they do not exist in the
    // deployed French Supabase schema and cause PGRST204.
    final payload = <String, dynamic>{
      'nom': _name.text.trim(),
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'categorie': _category.isEmpty ? null : _category,
      'prix_min': price,
      'prix_max': price,
      'unite': _unit.isEmpty ? null : _unit,
      'disponible': _available,
      'stock_estime': stock,
      'photos': _photos,
    };
    try {
      if (widget.initial == null) {
        await legacy.supabase.from('waouh_partner_products').insert({
          ...payload,
          'partner_id': partner.id,
          'business_id': widget.businessId,
        });
      } else {
        await legacy.supabase.from('waouh_partner_products').update(payload).eq('id', widget.initial!.id);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.initial == null ? 'Produit ajouté.' : 'Produit modifié.')));
      Navigator.pop(context);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $error')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: WaouhPalette.pearl,
    appBar: AppBar(title: Text(widget.initial == null ? 'Ajouter un produit' : 'Modifier le produit')),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 110),
      children: [
        Text('Photos du produit (3 max)', style: WaouhText.bodyStrong),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          ..._photos.asMap().entries.map((entry) => Stack(children: [
            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(entry.value, width: 88, height: 88, fit: BoxFit.cover)),
            Positioned(right: 0, top: 0, child: IconButton(onPressed: () => setState(() => _photos.removeAt(entry.key)), icon: const CircleAvatar(radius: 12, backgroundColor: WaouhPalette.red, child: Icon(Icons.close_rounded, size: 15, color: Colors.white)))),
          ])),
          if (_photos.length < 3) InkWell(onTap: _uploading ? null : _choosePhoto, child: Container(width: 88, height: 88, decoration: BoxDecoration(border: Border.all(color: WaouhPalette.line), borderRadius: BorderRadius.circular(12)), child: Center(child: _uploading ? const CircularProgressIndicator() : const Icon(Icons.add_a_photo_outlined)))),
        ]),
        const SizedBox(height: 18),
        Text('Nom *', style: WaouhText.bodyStrong),
        TextField(controller: _name),
        const SizedBox(height: 14),
        _Picker(label: 'Catégorie', value: _category, hint: 'Choisir...', onTap: () => _select('Catégorie', _productCategories, (value) => _category = value)),
        const SizedBox(height: 14),
        _Picker(label: 'Unité', value: _unit, hint: 'kg, pièce...', onTap: () => _select('Unité', _productUnits, (value) => _unit = value)),
        const SizedBox(height: 14),
        Text('Prix (FCFA)', style: WaouhText.bodyStrong),
        TextField(controller: _price, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 14),
        Text('Stock estimé', style: WaouhText.bodyStrong),
        TextField(controller: _stock, keyboardType: TextInputType.number),
        const SizedBox(height: 14),
        SwitchListTile(value: _available, onChanged: (value) => setState(() => _available = value), title: const Text('Disponible')),
        const SizedBox(height: 14),
        Text('Description', style: WaouhText.bodyStrong),
        TextField(controller: _description, minLines: 3, maxLines: 5),
      ],
    ),
    bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(14), child: FilledButton(onPressed: _saving ? null : _save, child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(widget.initial == null ? 'Enregistrer' : 'Mettre à jour')))),
  );
}

class _Picker extends StatelessWidget {
  const _Picker({required this.label, required this.value, required this.hint, required this.onTap});
  final String label;
  final String value;
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: WaouhText.bodyStrong),
    const SizedBox(height: 5),
    InkWell(onTap: onTap, child: InputDecorator(decoration: const InputDecoration(suffixIcon: Icon(Icons.expand_more_rounded)), child: Text(value.isEmpty ? hint : value, style: TextStyle(color: value.isEmpty ? WaouhPalette.muted : WaouhPalette.ink)))),
  ]);
}

String _money(num value) {
  final source = value.toInt().toString();
  final buffer = StringBuffer();
  for (var index = 0; index < source.length; index++) {
    if (index > 0 && (source.length - index) % 3 == 0) buffer.write(' ');
    buffer.write(source[index]);
  }
  return buffer.toString();
}
