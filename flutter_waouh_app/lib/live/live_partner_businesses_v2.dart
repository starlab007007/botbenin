import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';

class LivePartnerBusinessesScreenV2 extends StatefulWidget {
  const LivePartnerBusinessesScreenV2({super.key});

  @override
  State<LivePartnerBusinessesScreenV2> createState() => _LivePartnerBusinessesScreenV2State();
}

class _LivePartnerBusinessesScreenV2State extends State<LivePartnerBusinessesScreenV2> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final controller = context.read<legacy.PartnerController>();
      if (controller.partner == null) controller.ensurePartner();
    });
  }

  void _openProducts(legacy.PartnerBusiness business) {
    context.go('/app/partner/businesses/${business.id}/products');
  }

  void _openCreate() {
    legacy.showBusinessForm(context);
  }

  Future<void> _edit(legacy.PartnerController controller, legacy.PartnerBusiness business) async {
    final name = TextEditingController(text: business.name);
    final category = TextEditingController(text: business.category ?? '');
    final city = TextEditingController(text: business.city ?? '');
    final quarter = TextEditingController(text: business.quarter ?? '');
    final whatsapp = TextEditingController(text: business.whatsapp ?? '');
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(sheetContext).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Modifier l’entreprise', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              const SizedBox(height: 14),
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nom *')),
              const SizedBox(height: 10),
              TextField(controller: category, decoration: const InputDecoration(labelText: 'Catégorie *')),
              const SizedBox(height: 10),
              TextField(controller: city, decoration: const InputDecoration(labelText: 'Ville *')),
              const SizedBox(height: 10),
              TextField(controller: quarter, decoration: const InputDecoration(labelText: 'Quartier')),
              const SizedBox(height: 10),
              TextField(controller: whatsapp, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'WhatsApp')),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () async {
                  if (name.text.trim().isEmpty || category.text.trim().isEmpty || city.text.trim().isEmpty) return;
                  await controller.upsertBusiness(
                    id: business.id,
                    name: name.text.trim(),
                    category: category.text.trim(),
                    city: city.text.trim(),
                    quarter: quarter.text.trim().isEmpty ? null : quarter.text.trim(),
                    whatsapp: whatsapp.text.trim().isEmpty ? null : whatsapp.text.trim(),
                    description: business.description,
                    address: business.addressLine,
                    lat: business.lat,
                    lng: business.lng,
                  );
                  if (sheetContext.mounted) Navigator.pop(sheetContext, true);
                },
                child: const Text('Enregistrer'),
              ),
            ]),
          ),
        ),
      ),
    );
    name.dispose(); category.dispose(); city.dispose(); quarter.dispose(); whatsapp.dispose();
    if (saved == true && mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entreprise mise à jour.')));
  }

  Future<void> _delete(legacy.PartnerController controller, legacy.PartnerBusiness business) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Supprimer cette entreprise ?'),
        content: Text('Le catalogue et les données liées à « ${business.name} » seront désactivés ou supprimés selon les ventes existantes.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (yes != true) return;
    final deleted = await controller.removeBusiness(business.id);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(deleted ? 'Entreprise supprimée.' : 'Entreprise désactivée car des ventes sont liées.')));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text('Mes entreprises'),
          Text('Enrôlement intelligent', style: TextStyle(fontSize: 13, color: Color(0xFFC9F6E3))),
        ]),
      ),
      floatingActionButton: controller.partner == null ? null : FloatingActionButton.extended(
        backgroundColor: WaouhPalette.blue,
        onPressed: _openCreate,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Enrôler'),
      ),
      body: controller.partner == null
          ? Center(child: controller.loading ? const CircularProgressIndicator() : const Text('Préparation de votre espace…'))
          : StreamBuilder<List<legacy.PartnerBusiness>>(
              stream: controller.businesses(),
              builder: (_, snapshot) {
                final businesses = snapshot.data ?? const <legacy.PartnerBusiness>[];
                if (snapshot.connectionState == ConnectionState.waiting && businesses.isEmpty) return const Center(child: CircularProgressIndicator());
                if (businesses.isEmpty) {
                  return Center(child: WaouhEmptyPanel(
                    icon: Icons.storefront_rounded,
                    title: 'Aucune entreprise',
                    message: 'Enrôlez votre entreprise, puis ajoutez ses produits au catalogue WAOUH.',
                    actionLabel: 'Enrôler une entreprise',
                    onAction: _openCreate,
                  ));
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  itemCount: businesses.length,
                  itemBuilder: (_, index) => _BusinessCard(
                    business: businesses[index],
                    onProducts: () => _openProducts(businesses[index]),
                    onEdit: () => _edit(controller, businesses[index]),
                    onDelete: () => _delete(controller, businesses[index]),
                  ),
                );
              },
            ),
    );
  }
}

class _BusinessCard extends StatelessWidget {
  const _BusinessCard({required this.business, required this.onProducts, required this.onEdit, required this.onDelete});
  final legacy.PartnerBusiness business;
  final VoidCallback onProducts;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final active = business.status == 'active';
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onProducts,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(business.name, style: WaouhText.h3),
                if ((business.category ?? '').isNotEmpty) Text(business.category!, style: WaouhText.caption),
              ])),
              WaouhPill(label: active ? 'active' : (business.status ?? 'pause'), background: active ? WaouhPalette.mint : WaouhPalette.line, foreground: active ? WaouhPalette.jade : WaouhPalette.muted),
            ]),
            if ((business.city ?? '').isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(children: [const Icon(Icons.location_on_outlined, size: 17, color: WaouhPalette.muted), const SizedBox(width: 5), Expanded(child: Text([business.city, business.quarter].where((value) => (value ?? '').isNotEmpty).join(' · '), style: WaouhText.body.copyWith(color: WaouhPalette.muted)))]),
            ],
            if ((business.whatsapp ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(children: [const Icon(Icons.phone_outlined, size: 17, color: WaouhPalette.muted), const SizedBox(width: 5), Text(business.whatsapp!, style: WaouhText.body.copyWith(color: WaouhPalette.muted))]),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(onPressed: onProducts, icon: const Icon(Icons.inventory_2_outlined), label: const Text('Voir et ajouter les produits')),
            ),
            const SizedBox(height: 8),
            Row(children: [
              OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit_outlined, size: 17), label: const Text('Modifier')),
              const SizedBox(width: 8),
              IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded, color: WaouhPalette.red), tooltip: 'Supprimer'),
            ]),
          ]),
        ),
      ),
    );
  }
}
