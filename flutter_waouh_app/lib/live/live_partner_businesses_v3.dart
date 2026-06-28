import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_business_form.dart';
import 'live_theme.dart';

class LivePartnerBusinessesScreenV3 extends StatefulWidget {
  const LivePartnerBusinessesScreenV3({super.key});

  @override
  State<LivePartnerBusinessesScreenV3> createState() => _LivePartnerBusinessesScreenV3State();
}

class _LivePartnerBusinessesScreenV3State extends State<LivePartnerBusinessesScreenV3> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final partner = context.read<legacy.PartnerController>();
      if (partner.partner == null) partner.ensurePartner();
    });
  }

  Future<void> _edit([legacy.PartnerBusiness? business]) => Navigator.of(context).push(
    MaterialPageRoute(fullscreenDialog: true, builder: (_) => LiveBusinessFormScreen(initial: business)),
  );

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(title: const Text('Mes entreprises')),
      floatingActionButton: controller.partner == null ? null : FloatingActionButton.extended(
        onPressed: () => _edit(),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Enrôler'),
      ),
      body: controller.partner == null
          ? Center(child: controller.loading ? const CircularProgressIndicator() : const Text('Préparation de votre espace…'))
          : StreamBuilder<List<legacy.PartnerBusiness>>(
              stream: controller.businesses(),
              builder: (context, snapshot) {
                final items = snapshot.data ?? const <legacy.PartnerBusiness>[];
                if (snapshot.connectionState == ConnectionState.waiting && items.isEmpty) return const Center(child: CircularProgressIndicator());
                if (items.isEmpty) {
                  return Center(child: FilledButton.icon(onPressed: () => _edit(), icon: const Icon(Icons.add_rounded), label: const Text('Enrôler une entreprise')));
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 104),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, index) {
                    final item = items[index];
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(22),
                        onTap: () => context.go('/app/partner/businesses/${item.id}/products'),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(item.name, style: WaouhText.h3),
                                if ((item.category ?? '').isNotEmpty) Text(item.category!, style: WaouhText.caption),
                              ])),
                              Chip(label: Text(item.status == 'active' ? 'active' : (item.status ?? 'pause'))),
                            ]),
                            if ((item.city ?? '').isNotEmpty) Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: Text([item.city, item.quarter].where((v) => (v ?? '').isNotEmpty).join(' · '), style: WaouhText.body.copyWith(color: WaouhPalette.muted)),
                            ),
                            const SizedBox(height: 14),
                            SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: () => context.go('/app/partner/businesses/${item.id}/products'), icon: const Icon(Icons.inventory_2_outlined), label: const Text('Voir et ajouter les produits'))),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(onPressed: () => _edit(item), icon: const Icon(Icons.edit_outlined, size: 17), label: const Text('Modifier')),
                          ]),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}
