// Modern partner module: businesses list (with the same intelligent
// soft-delete as the React app), a business form with real GPS + AI reverse
// geocoding, a products list, and a product form with real photo uploads to
// the `waouh-media` bucket. Mirrors src/app-mobile/screens/partner/*.tsx.
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';

const _businessCategories = [
  'Maquis', 'Restaurant', 'Bar / Buvette', 'Pâtisserie', 'Boulangerie',
  'Boutique mode', 'Boutique cosmétiques', 'Boutique électronique',
  'Salon de coiffure', 'Salon de beauté', 'Spa / Massage',
  'Supérette / Alimentation', 'Boucherie', 'Poissonnerie',
  'Pharmacie', 'Clinique / Cabinet', 'Quincaillerie',
  'Matériaux de construction', 'Garage / Mécanique', 'Lavage auto',
  'Station-service', 'Hôtel', 'Auberge', 'Location de voitures',
  'Transport / Taxi', 'Atelier couture', 'Cordonnerie', 'Menuiserie',
  'Soudure / Métallerie', 'Imprimerie', 'Photo / Vidéo', 'Cyber-café',
  'École / Formation', 'Crèche / Garderie', 'Agence immobilière',
  'Agence de voyage', 'Bureau de change', 'Marché / Grossiste',
  'Vendeur ambulant', 'Autre commerce',
];

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
  'demi-douzaine', 'heure', 'jour', 'séance', 'forfait',
];

const _beninCities = <String, List<String>>{
  'Cotonou': ['Cadjèhoun', 'Akpakpa', 'Fidjrossè', 'Gbégamey', 'Sainte-Rita', 'Ganhi', 'Jéricho', 'Cocotomey', 'Vodjè', 'Agla', 'Houéyiho', 'Zongo', 'Dantokpa', 'Missebo', 'Sègbéya', 'Mènontin', 'Sikècodji', 'Tokpa-Hoho', 'Akogbato', 'Vèdoko'],
  'Abomey-Calavi': ['Godomey', 'Kpota', 'Zogbadjè', 'Tankpè', 'Aïbatin', 'Calavi-Centre', 'Tokan', 'Hêvié', 'Akassato', 'Cocotomey', 'Womey', 'Glo-Djigbé'],
  'Porto-Novo': ['Akron', 'Djassin', 'Houinmè', 'Tokpota', 'Ouando', 'Avassa', 'Dowa', 'Kandèvié', 'Catchi', 'Foun-Foun'],
  'Parakou': ['Banikanni', 'Titirou', 'Zongo', 'Wansirou', 'Tourou', 'Kpébié', 'Ladji-Farani'],
  'Djougou': ['Centre', 'Bariénou', 'Sérou', 'Pélébina'],
  'Bohicon': ['Centre', 'Agbangnizoun', 'Zakpota'],
  'Lokossa': ['Centre', 'Athiémé', 'Houin'],
  'Ouidah': ['Centre', 'Tovè', 'Pahou', 'Avlékété'],
  'Abomey': ['Centre', 'Djèkpota', 'Vidolè'],
  'Sèmè-Kpodji': ['Sèmè', 'Kpodji', 'Ekpè', 'Agblangandan'],
};

void _toast(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: error ? WaouhPalette.red : null,
    ),
  );
}

/// Sticky-header full-screen form shell — mirrors NativeFormScreen.tsx
/// exactly: green sticky header, scrollable body, sticky bottom submit.
class _PartnerFormShell extends StatelessWidget {
  const _PartnerFormShell({
    required this.title,
    this.subtitle,
    required this.onSubmit,
    required this.submitLabel,
    required this.saving,
    required this.children,
    this.canSubmit = true,
  });

  final String title;
  final String? subtitle;
  final Future<void> Function() onSubmit;
  final String submitLabel;
  final bool saving;
  final bool canSubmit;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        backgroundColor: WaouhPalette.green,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: WaouhText.onDark(WaouhText.h3.copyWith(fontSize: 17))),
            if (subtitle != null) Text(subtitle!, style: WaouhText.onDarkMuted(WaouhText.caption)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.xxl),
        children: children,
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.sm, WaouhSpace.lg, WaouhSpace.sm),
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(top: BorderSide(color: WaouhPalette.line)),
          ),
          child: SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: saving || !canSubmit ? null : () => onSubmit(),
              child: saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                  : Text(submitLabel),
            ),
          ),
        ),
      ),
    );
  }
}

/// A bottom-sheet single-select picker with optional free-text entry —
/// covers NativeCategoryPicker / NativeSelectSheet in one reusable widget.
Future<String?> _pickFromSheet(
  BuildContext context, {
  required String title,
  required List<String> options,
  bool allowCustom = false,
}) {
  final custom = TextEditingController();
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(WaouhRadius.sheet)),
    ),
    builder: (context) => DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.sm),
            child: Row(
              children: [
                Expanded(child: Text(title, style: WaouhText.h2)),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          if (allowCustom)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: WaouhSpace.lg),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: custom,
                      decoration: const InputDecoration(hintText: 'Ou saisir un nouveau...'),
                    ),
                  ),
                  const SizedBox(width: WaouhSpace.sm),
                  IconButton.filled(
                    icon: const Icon(Icons.check_rounded),
                    onPressed: () {
                      if (custom.text.trim().isNotEmpty) Navigator.pop(context, custom.text.trim());
                    },
                  ),
                ],
              ),
            ),
          const SizedBox(height: WaouhSpace.sm),
          Expanded(
            child: ListView.builder(
              controller: scrollController,
              itemCount: options.length,
              itemBuilder: (context, index) {
                final option = options[index];
                return ListTile(
                  title: Text(option),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 18),
                  onTap: () => Navigator.pop(context, option),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

class _PickerField extends StatelessWidget {
  const _PickerField({required this.label, required this.value, required this.onTap, this.error, this.placeholder});
  final String label;
  final String value;
  final String? placeholder;
  final VoidCallback onTap;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
        const SizedBox(height: WaouhSpace.xs),
        InkWell(
          borderRadius: BorderRadius.circular(WaouhRadius.control),
          onTap: onTap,
          child: Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: WaouhSpace.md),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(WaouhRadius.control),
              border: Border.all(color: error != null ? WaouhPalette.red : WaouhPalette.line),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value.isEmpty ? (placeholder ?? 'Sélectionner') : value,
                    style: value.isEmpty
                        ? WaouhText.body.copyWith(color: WaouhPalette.muted)
                        : WaouhText.bodyStrong,
                  ),
                ),
                const Icon(Icons.expand_more_rounded, color: WaouhPalette.muted),
              ],
            ),
          ),
        ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(error!, style: WaouhText.caption.copyWith(color: WaouhPalette.red)),
          ),
      ],
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.controller,
    this.error,
    this.keyboardType,
    this.maxLines = 1,
    this.hint,
  });
  final String label;
  final TextEditingController controller;
  final String? error;
  final TextInputType? keyboardType;
  final int maxLines;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
        const SizedBox(height: WaouhSpace.xs),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            errorText: error,
            isDense: maxLines == 1,
          ),
        ),
      ],
    );
  }
}

/// Businesses list — FAB-style "+" entry, intelligent delete (pause vs
/// delete), and direct access to a business's product catalogue.
class LivePartnerBusinessesScreen extends StatefulWidget {
  const LivePartnerBusinessesScreen({super.key});
  @override
  State<LivePartnerBusinessesScreen> createState() => _LivePartnerBusinessesScreenState();
}

class _LivePartnerBusinessesScreenState extends State<LivePartnerBusinessesScreen> {
  @override
  void initState() {
    super.initState();
    final partner = context.read<legacy.PartnerController>();
    if (partner.partner == null) partner.ensurePartner();
  }

  Future<void> _delete(legacy.PartnerController controller, legacy.PartnerBusiness business) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cette entreprise ?'),
        content: Text('Si des ventes sont liées à « ${business.name} », elle sera désactivée. Sinon, supprimée définitivement.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (confirmed != true) return;
    final deleted = await controller.removeBusiness(business.id);
    if (!mounted) return;
    _toast(context, deleted ? '🗑️ Entreprise supprimée' : 'Entreprise désactivée (ventes liées)');
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    final partner = controller.partner;

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        backgroundColor: WaouhPalette.green,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Mes entreprises', style: WaouhText.onDark(WaouhText.h3.copyWith(fontSize: 17))),
            Text('Enrôlement intelligent', style: WaouhText.onDarkMuted(WaouhText.caption)),
          ],
        ),
      ),
      floatingActionButton: partner == null
          ? null
          : FloatingActionButton.extended(
              backgroundColor: WaouhPalette.blue,
              onPressed: () => _openForm(context, controller, null),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Enrôler'),
            ),
      body: partner == null
          ? Center(
              child: controller.loading
                  ? const CircularProgressIndicator()
                  : Text('Préparation de votre espace…', style: WaouhText.body.copyWith(color: WaouhPalette.muted)),
            )
          : StreamBuilder<List<legacy.PartnerBusiness>>(
              stream: controller.businesses(),
              builder: (context, snapshot) {
                final items = snapshot.data ?? const [];
                if (snapshot.connectionState == ConnectionState.waiting && items.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (items.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.all(WaouhSpace.lg),
                    child: WaouhEmptyPanel(
                      icon: Icons.storefront_rounded,
                      title: 'Aucune entreprise',
                      message: 'Touchez « Enrôler » pour ajouter votre première entreprise.',
                      actionLabel: 'Enrôler une entreprise',
                      onAction: () => _openForm(context, controller, null),
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, 100),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final business = items[index];
                    final active = business.status == 'active';
                    return Container(
                      margin: const EdgeInsets.only(bottom: WaouhSpace.md),
                      padding: const EdgeInsets.all(WaouhSpace.md),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(WaouhRadius.card),
                        boxShadow: WaouhShadows.card,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(business.name, style: WaouhText.h3, overflow: TextOverflow.ellipsis),
                                    if (business.category != null)
                                      Text(business.category!, style: WaouhText.caption),
                                  ],
                                ),
                              ),
                              WaouhPill(
                                label: business.status ?? 'pending',
                                background: active ? WaouhPalette.mint : WaouhPalette.line,
                                foreground: active ? WaouhPalette.jade : WaouhPalette.muted,
                              ),
                            ],
                          ),
                          if ((business.city ?? '').isNotEmpty) ...[
                            const SizedBox(height: WaouhSpace.sm),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: WaouhPalette.muted),
                                const SizedBox(width: 4),
                                Text(
                                  [business.city, business.quarter].where((e) => (e ?? '').isNotEmpty).join(' · '),
                                  style: WaouhText.caption,
                                ),
                              ],
                            ),
                          ],
                          if ((business.whatsapp ?? '').isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text('📞 ${business.whatsapp}', style: WaouhText.caption),
                          ],
                          const SizedBox(height: WaouhSpace.md),
                          Row(
                            children: [
                              OutlinedButton.icon(
                                onPressed: () => _openForm(context, controller, business),
                                icon: const Icon(Icons.edit_outlined, size: 16),
                                label: const Text('Modifier'),
                              ),
                              const SizedBox(width: WaouhSpace.sm),
                              IconButton(
                                onPressed: () => _delete(controller, business),
                                icon: const Icon(Icons.delete_outline_rounded, color: WaouhPalette.red),
                              ),
                              const Spacer(),
                              FilledButton.icon(
                                onPressed: () => context.push('/app/partner/businesses/${business.id}/products'),
                                icon: const Icon(Icons.inventory_2_outlined, size: 16),
                                label: const Text('Produits'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
    );
  }

  void _openForm(BuildContext context, legacy.PartnerController controller, legacy.PartnerBusiness? business) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => _BusinessFormScreen(controller: controller, initial: business)),
    );
  }
}

class _BusinessFormScreen extends StatefulWidget {
  const _BusinessFormScreen({required this.controller, this.initial});
  final legacy.PartnerController controller;
  final legacy.PartnerBusiness? initial;

  @override
  State<_BusinessFormScreen> createState() => _BusinessFormScreenState();
}

class _BusinessFormScreenState extends State<_BusinessFormScreen> {
  late final name = TextEditingController(text: widget.initial?.name ?? '');
  late final description = TextEditingController(text: widget.initial?.description ?? '');
  late final address = TextEditingController(text: widget.initial?.addressLine ?? '');
  late final whatsapp = TextEditingController(text: widget.initial?.whatsapp ?? '');
  late String category = widget.initial?.category ?? '';
  late String city = widget.initial?.city ?? '';
  late String quarter = widget.initial?.quarter ?? '';
  double? lat;
  double? lng;
  bool saving = false;
  bool gpsLoading = false;
  final Map<String, String> errors = {};

  @override
  void initState() {
    super.initState();
    lat = widget.initial?.lat;
    lng = widget.initial?.lng;
  }

  @override
  void dispose() {
    name.dispose();
    description.dispose();
    address.dispose();
    whatsapp.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() => gpsLoading = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          _toast(context, 'Permission refusée. Autorisez la localisation dans les paramètres.', error: true);
        }
        return;
      }
      if (!await Geolocator.isLocationServiceEnabled()) {
        if (mounted) _toast(context, 'Activez le GPS de votre téléphone.', error: true);
        return;
      }
      if (mounted) _toast(context, '📍 Détection en cours...');
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      setState(() {
        lat = position.latitude;
        lng = position.longitude;
      });
      final geo = await widget.controller.reverseGeocode(position.latitude, position.longitude);
      if (!mounted) return;
      if (geo != null) {
        setState(() {
          if (city.isEmpty) city = geo['ville'] ?? '';
          if (quarter.isEmpty) quarter = geo['quartier'] ?? '';
          if (address.text.isEmpty) address.text = geo['adresse_complete'] ?? '';
        });
        final label = [geo['ville'], geo['quartier']].where((e) => (e ?? '').isNotEmpty).join(' · ');
        _toast(context, label.isEmpty ? '✅ Position GPS enregistrée' : '✅ Position trouvée · $label');
      } else {
        _toast(context, '✅ Position GPS enregistrée');
      }
    } catch (error) {
      if (mounted) _toast(context, 'Erreur GPS : $error', error: true);
    } finally {
      if (mounted) setState(() => gpsLoading = false);
    }
  }

  Future<void> _submit() async {
    final newErrors = <String, String>{};
    if (name.text.trim().length < 2) newErrors['name'] = 'Nom requis (min 2 caractères)';
    if (category.isEmpty) newErrors['category'] = 'Catégorie requise';
    if (city.isEmpty) newErrors['city'] = 'Ville requise';
    setState(() => errors..clear()..addAll(newErrors));
    if (newErrors.isNotEmpty) {
      _toast(context, 'Corrigez les champs en rouge', error: true);
      return;
    }
    setState(() => saving = true);
    try {
      await widget.controller.upsertBusiness(
        id: widget.initial?.id,
        name: name.text.trim(),
        category: category,
        city: city,
        quarter: quarter.isEmpty ? null : quarter,
        whatsapp: whatsapp.text.trim().isEmpty ? null : whatsapp.text.trim(),
        description: description.text.trim().isEmpty ? null : description.text.trim(),
        address: address.text.trim().isEmpty ? null : address.text.trim(),
        lat: lat,
        lng: lng,
      );
      if (!mounted) return;
      _toast(context, widget.initial != null ? '✅ Entreprise modifiée' : '✅ Entreprise enregistrée');
      Navigator.pop(context);
    } catch (error) {
      if (mounted) _toast(context, 'Erreur : $error', error: true);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gpsBusy = gpsLoading;
    return _PartnerFormShell(
      title: widget.initial != null ? "Modifier l'entreprise" : 'Nouvelle entreprise',
      subtitle: 'GPS et IA pour aller plus vite',
      saving: saving,
      submitLabel: widget.initial != null ? 'Mettre à jour' : 'Enregistrer',
      onSubmit: _submit,
      children: [
        SizedBox(
          height: 48,
          child: OutlinedButton.icon(
            onPressed: gpsBusy ? null : _detectLocation,
            icon: gpsBusy
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.my_location_rounded, size: 18),
            label: const Text('Détecter ma position'),
          ),
        ),
        const SizedBox(height: WaouhSpace.lg),
        _LabeledField(
          label: "Nom de l'entreprise *",
          controller: name,
          error: errors['name'],
          hint: 'Ex: Maquis Chez Sika',
        ),
        const SizedBox(height: WaouhSpace.md),
        _PickerField(
          label: 'Catégorie *',
          value: category,
          error: errors['category'],
          placeholder: "Type d'activité",
          onTap: () async {
            final value = await _pickFromSheet(context, title: 'Catégorie', options: _businessCategories, allowCustom: true);
            if (value != null) setState(() => category = value);
          },
        ),
        const SizedBox(height: WaouhSpace.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _PickerField(
                label: '🇧🇯 Ville *',
                value: city,
                error: errors['city'],
                onTap: () async {
                  final value = await _pickFromSheet(context, title: 'Ville', options: _beninCities.keys.toList(), allowCustom: true);
                  if (value != null) setState(() { city = value; quarter = ''; });
                },
              ),
            ),
            const SizedBox(width: WaouhSpace.sm),
            Expanded(
              child: _PickerField(
                label: 'Quartier',
                value: quarter,
                placeholder: city.isEmpty ? "Ville d'abord" : 'Saisir...',
                onTap: () async {
                  final options = _beninCities[city] ?? const [];
                  final value = await _pickFromSheet(context, title: 'Quartier', options: options, allowCustom: true);
                  if (value != null) setState(() => quarter = value);
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(label: 'Description', controller: description, maxLines: 3),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(label: 'Adresse complète', controller: address),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(
          label: 'WhatsApp',
          controller: whatsapp,
          keyboardType: TextInputType.phone,
          hint: '+229 XX XX XX XX',
        ),
        if (lat != null) ...[
          const SizedBox(height: WaouhSpace.md),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: WaouhPalette.muted),
              const SizedBox(width: 6),
              Text('GPS : ${lat!.toStringAsFixed(5)}, ${lng!.toStringAsFixed(5)}', style: WaouhText.caption),
            ],
          ),
        ],
      ],
    );
  }
}

/// Products list for one business — thumbnail, availability badge, price
/// range, and a centered FAB-style "+" matching the React app's style.
class LivePartnerProductsScreen extends StatefulWidget {
  const LivePartnerProductsScreen({super.key, required this.businessId});
  final String businessId;

  @override
  State<LivePartnerProductsScreen> createState() => _LivePartnerProductsScreenState();
}

class _LivePartnerProductsScreenState extends State<LivePartnerProductsScreen> {
  Future<void> _delete(legacy.PartnerController controller, legacy.PartnerProduct product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce produit ?'),
        content: Text('« ${product.name} » sera supprimé.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: WaouhPalette.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await controller.removeProduct(product.id);
    if (mounted) _toast(context, 'Produit supprimé');
  }

  void _openForm(legacy.PartnerController controller, legacy.PartnerProduct? product) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _ProductFormScreen(
          controller: controller,
          businessId: widget.businessId,
          initial: product,
        ),
      ),
    );
  }

  void _openViewer(legacy.PartnerController controller, legacy.PartnerProduct product) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _ProductViewerScreen(
          controller: controller,
          product: product,
          onEditFull: () => _openForm(controller, product),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(backgroundColor: WaouhPalette.green, title: const Text('Produits')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: WaouhPalette.blue,
        onPressed: () => _openForm(controller, null),
        child: const Icon(Icons.add_rounded),
      ),
      body: StreamBuilder<List<legacy.PartnerProduct>>(
        stream: controller.products(widget.businessId),
        builder: (context, snapshot) {
          final items = snapshot.data ?? const [];
          if (snapshot.connectionState == ConnectionState.waiting && items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (items.isEmpty) {
            return Padding(
              padding: const EdgeInsets.all(WaouhSpace.lg),
              child: WaouhEmptyPanel(
                icon: Icons.inventory_2_outlined,
                title: 'Aucun produit',
                message: 'Touchez « + » pour ajouter votre premier produit.',
                actionLabel: 'Ajouter un produit',
                onAction: () => _openForm(controller, null),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, 100),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final product = items[index];
              final priceLabel = product.priceMin == null
                  ? null
                  : (product.priceMin == product.priceMax
                      ? '${_formatNumber(product.priceMin!)} F'
                      : '${_formatNumber(product.priceMin!)} - ${_formatNumber(product.priceMax ?? product.priceMin!)} F');
              return Container(
                margin: const EdgeInsets.only(bottom: WaouhSpace.md),
                padding: const EdgeInsets.all(WaouhSpace.sm + 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(WaouhRadius.card),
                  boxShadow: WaouhShadows.card,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: () => _openViewer(controller, product),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(WaouhRadius.thumb),
                        child: Container(
                          width: 76,
                          height: 76,
                          color: WaouhPalette.pearl,
                          child: product.photos.isEmpty
                              ? const Icon(Icons.image_not_supported_outlined, color: WaouhPalette.muted)
                              : Image.network(product.photos.first, fit: BoxFit.cover),
                        ),
                      ),
                    ),
                    const SizedBox(width: WaouhSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(product.name, style: WaouhText.h3, overflow: TextOverflow.ellipsis)),
                              WaouhPill(
                                label: product.available ? 'Dispo' : 'Indispo',
                                background: product.available ? WaouhPalette.mint : WaouhPalette.line,
                                foreground: product.available ? WaouhPalette.jade : WaouhPalette.muted,
                              ),
                            ],
                          ),
                          if (product.category != null) Text(product.category!, style: WaouhText.caption),
                          if (priceLabel != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text.rich(
                                TextSpan(
                                  text: priceLabel,
                                  style: WaouhText.bodyStrong,
                                  children: [
                                    if (product.unit != null)
                                      TextSpan(text: ' / ${product.unit}', style: WaouhText.caption),
                                  ],
                                ),
                              ),
                            ),
                          const SizedBox(height: WaouhSpace.sm),
                          Row(
                            children: [
                              TextButton.icon(
                                onPressed: () => _openViewer(controller, product),
                                icon: const Icon(Icons.visibility_outlined, size: 15),
                                label: const Text('Voir'),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => _openForm(controller, product),
                                icon: const Icon(Icons.edit_outlined, size: 15),
                                label: const Text('Modifier'),
                              ),
                              IconButton(
                                onPressed: () => _delete(controller, product),
                                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: WaouhPalette.red),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

String _formatNumber(num value) {
  final text = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < text.length; i++) {
    if (i > 0 && (text.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(text[i]);
  }
  return buffer.toString();
}

/// Up-to-3 photo grid uploader: shows existing photos with a remove button,
/// an "add" tile while under the max, and uploads straight to
/// `waouh-media/partner-products` exactly like ProductPhotoUploader.tsx.
class _PhotoGridUploader extends StatefulWidget {
  const _PhotoGridUploader({required this.photos, required this.onChanged, required this.controller, this.max = 3});
  final List<String> photos;
  final ValueChanged<List<String>> onChanged;
  final legacy.PartnerController controller;
  final int max;

  @override
  State<_PhotoGridUploader> createState() => _PhotoGridUploaderState();
}

class _PhotoGridUploaderState extends State<_PhotoGridUploader> {
  bool uploading = false;

  Future<void> _pick() async {
    final remaining = widget.max - widget.photos.length;
    if (remaining <= 0) return;
    final picker = ImagePicker();
    final files = await picker.pickMultiImage(imageQuality: 80);
    if (files.isEmpty) return;
    final selected = files.take(remaining).toList();
    setState(() => uploading = true);
    final urls = <String>[];
    try {
      for (final file in selected) {
        final bytes = await file.readAsBytes();
        if (bytes.length > 5 * 1024 * 1024) {
          if (mounted) _toast(context, '${file.name} dépasse 5 Mo.', error: true);
          continue;
        }
        final url = await widget.controller.uploadProductPhoto(bytes: bytes, fileName: file.name);
        urls.add(url);
      }
      widget.onChanged([...widget.photos, ...urls].take(widget.max).toList());
    } catch (error) {
      if (mounted) _toast(context, 'Échec upload : $error', error: true);
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  void _removeAt(int index) {
    final updated = [...widget.photos]..removeAt(index);
    widget.onChanged(updated);
  }

  @override
  Widget build(BuildContext context) {
    final remaining = widget.max - widget.photos.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var i = 0; i < widget.photos.length; i++)
              Padding(
                padding: const EdgeInsets.only(right: WaouhSpace.sm),
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(WaouhRadius.thumb),
                      child: Image.network(widget.photos[i], width: 84, height: 84, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: 2,
                      right: 2,
                      child: GestureDetector(
                        onTap: () => _removeAt(i),
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(color: WaouhPalette.red, shape: BoxShape.circle),
                          child: const Icon(Icons.close_rounded, size: 13, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (remaining > 0)
              GestureDetector(
                onTap: uploading ? null : _pick,
                child: Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(WaouhRadius.thumb),
                    border: Border.all(color: WaouhPalette.line, width: 1.4),
                  ),
                  child: uploading
                      ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.add_photo_alternate_outlined, color: WaouhPalette.muted),
                            const SizedBox(height: 2),
                            Text('Ajouter ($remaining)', style: WaouhText.caption, textAlign: TextAlign.center),
                          ],
                        ),
                ),
              ),
          ],
        ),
        const SizedBox(height: WaouhSpace.xs),
        Text("Jusqu'à ${widget.max} photos · 5 Mo max · JPG/PNG/WebP", style: WaouhText.caption),
      ],
    );
  }
}

class _ProductFormScreen extends StatefulWidget {
  const _ProductFormScreen({required this.controller, required this.businessId, this.initial});
  final legacy.PartnerController controller;
  final String businessId;
  final legacy.PartnerProduct? initial;

  @override
  State<_ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<_ProductFormScreen> {
  late final name = TextEditingController(text: widget.initial?.name ?? '');
  late final description = TextEditingController(text: widget.initial?.description ?? '');
  late final price = TextEditingController(text: widget.initial?.priceMin?.toInt().toString() ?? '');
  late final stock = TextEditingController(text: widget.initial?.stock?.toInt().toString() ?? '');
  late String category = widget.initial?.category ?? '';
  late String unit = widget.initial?.unit ?? '';
  late bool available = widget.initial?.available ?? true;
  late List<String> photos = [...(widget.initial?.photos ?? const [])];
  bool saving = false;

  @override
  void dispose() {
    name.dispose();
    description.dispose();
    price.dispose();
    stock.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (name.text.trim().isEmpty) {
      _toast(context, 'Nom requis', error: true);
      return;
    }
    setState(() => saving = true);
    try {
      await widget.controller.upsertProduct(
        id: widget.initial?.id,
        businessId: widget.businessId,
        name: name.text.trim(),
        description: description.text.trim().isEmpty ? null : description.text.trim(),
        category: category.isEmpty ? null : category,
        unit: unit.isEmpty ? null : unit,
        price: price.text.trim().isEmpty ? null : num.tryParse(price.text.trim()),
        stock: stock.text.trim().isEmpty ? null : int.tryParse(stock.text.trim()),
        available: available,
        photos: photos,
      );
      if (!mounted) return;
      _toast(context, widget.initial != null ? '✅ Produit modifié' : '✅ Produit ajouté');
      Navigator.pop(context);
    } catch (error) {
      if (mounted) _toast(context, 'Erreur : $error', error: true);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: name,
      builder: (context, nameValue, _) => _PartnerFormShell(
        title: widget.initial != null ? 'Modifier le produit' : 'Ajouter un produit',
        saving: saving,
        canSubmit: nameValue.text.trim().isNotEmpty,
        submitLabel: widget.initial != null ? 'Mettre à jour' : 'Enregistrer',
        onSubmit: _submit,
        children: [
          Text('Photos du produit (3 max)', style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
          const SizedBox(height: WaouhSpace.xs),
          _PhotoGridUploader(
            photos: photos,
            controller: widget.controller,
            onChanged: (value) => setState(() => photos = value),
        ),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(label: 'Nom *', controller: name),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(label: 'Description', controller: description, maxLines: 3),
        const SizedBox(height: WaouhSpace.md),
        _PickerField(
          label: 'Catégorie',
          value: category,
          placeholder: 'Choisir ou créer...',
          onTap: () async {
            final value = await _pickFromSheet(context, title: 'Catégorie', options: _productCategories, allowCustom: true);
            if (value != null) setState(() => category = value);
          },
        ),
        const SizedBox(height: WaouhSpace.md),
        _PickerField(
          label: 'Unité',
          value: unit,
          placeholder: 'kg, pièce...',
          onTap: () async {
            final value = await _pickFromSheet(context, title: 'Unité', options: _productUnits);
            if (value != null) setState(() => unit = value);
          },
        ),
        const SizedBox(height: WaouhSpace.md),
        _LabeledField(label: 'Prix (FCFA)', controller: price, keyboardType: TextInputType.number),
        const SizedBox(height: WaouhSpace.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: _LabeledField(label: 'Stock estimé', controller: stock, keyboardType: TextInputType.number),
            ),
            const SizedBox(width: WaouhSpace.sm),
            Expanded(
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: WaouhSpace.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(WaouhRadius.control),
                  border: Border.all(color: WaouhPalette.line),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Disponible', style: WaouhText.bodyStrong),
                    Switch(value: available, onChanged: (value) => setState(() => available = value)),
                  ],
                ),
              ),
            ),
          ],
        ),
        ],
      ),
    );
  }
}

class _ProductViewerScreen extends StatefulWidget {
  const _ProductViewerScreen({required this.controller, required this.product, this.onEditFull});
  final legacy.PartnerController controller;
  final legacy.PartnerProduct product;
  final VoidCallback? onEditFull;

  @override
  State<_ProductViewerScreen> createState() => _ProductViewerScreenState();
}

class _ProductViewerScreenState extends State<_ProductViewerScreen> {
  late List<String> photos = [...widget.product.photos];
  bool editingPhotos = false;
  bool saving = false;

  Future<void> _savePhotos() async {
    setState(() => saving = true);
    try {
      await widget.controller.updateProductPhotos(widget.product.id, photos);
      if (mounted) {
        _toast(context, 'Photos mises à jour');
        setState(() => editingPhotos = false);
      }
    } catch (error) {
      if (mounted) _toast(context, 'Erreur : $error', error: true);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final priceLabel = product.priceMin == null
        ? null
        : (product.priceMin == product.priceMax
            ? '${_formatNumber(product.priceMin!)} F'
            : '${_formatNumber(product.priceMin!)} - ${_formatNumber(product.priceMax ?? product.priceMin!)} F');

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        backgroundColor: WaouhPalette.green,
        title: Text(product.name, overflow: TextOverflow.ellipsis),
      ),
      body: ListView(
        padding: const EdgeInsets.all(WaouhSpace.lg),
        children: [
          if (photos.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(WaouhRadius.card),
              child: AspectRatio(
                aspectRatio: 1.4,
                child: Image.network(photos.first, fit: BoxFit.cover),
              ),
            )
          else
            Container(
              height: 180,
              decoration: BoxDecoration(color: WaouhPalette.line, borderRadius: BorderRadius.circular(WaouhRadius.card)),
              child: const Icon(Icons.image_not_supported_outlined, size: 36, color: WaouhPalette.muted),
            ),
          if (photos.length > 1) ...[
            const SizedBox(height: WaouhSpace.sm),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: photos.length - 1,
                separatorBuilder: (_, __) => const SizedBox(width: WaouhSpace.sm),
                itemBuilder: (context, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(WaouhRadius.thumb),
                  child: Image.network(photos[index + 1], width: 64, height: 64, fit: BoxFit.cover),
                ),
              ),
            ),
          ],
          const SizedBox(height: WaouhSpace.lg),
          if (editingPhotos) ...[
            _PhotoGridUploader(
              photos: photos,
              controller: widget.controller,
              onChanged: (value) => setState(() => photos = value),
            ),
            const SizedBox(height: WaouhSpace.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => setState(() {
                    photos = [...widget.product.photos];
                    editingPhotos = false;
                  }),
                  child: const Text('Annuler'),
                ),
                const SizedBox(width: WaouhSpace.sm),
                FilledButton(
                  onPressed: saving ? null : _savePhotos,
                  child: saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Enregistrer'),
                ),
              ],
            ),
          ] else
            OutlinedButton.icon(
              onPressed: () => setState(() => editingPhotos = true),
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Changer les photos'),
            ),
          const SizedBox(height: WaouhSpace.lg),
          Wrap(
            spacing: WaouhSpace.sm,
            runSpacing: WaouhSpace.sm,
            children: [
              WaouhPill(
                label: product.available ? 'Disponible' : 'Indisponible',
                background: product.available ? WaouhPalette.mint : WaouhPalette.line,
                foreground: product.available ? WaouhPalette.jade : WaouhPalette.muted,
              ),
              if (product.category != null)
                WaouhPill(label: product.category!, background: WaouhPalette.sky, foreground: WaouhPalette.blue),
              if (product.stock != null)
                WaouhPill(label: 'Stock : ${product.stock!.toInt()}', background: WaouhPalette.amber, foreground: WaouhPalette.orange),
            ],
          ),
          if (priceLabel != null) ...[
            const SizedBox(height: WaouhSpace.md),
            Text.rich(
              TextSpan(
                text: priceLabel,
                style: WaouhText.h2,
                children: [
                  if (product.unit != null) TextSpan(text: ' / ${product.unit}', style: WaouhText.caption),
                ],
              ),
            ),
          ],
          if ((product.description ?? '').isNotEmpty) ...[
            const SizedBox(height: WaouhSpace.md),
            Text(product.description!, style: WaouhText.body.copyWith(color: WaouhPalette.muted)),
          ],
          if (widget.onEditFull != null) ...[
            const SizedBox(height: WaouhSpace.xl),
            SizedBox(
              height: 48,
              width: double.infinity,
              child: FilledButton.tonalIcon(
                onPressed: widget.onEditFull,
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('Modifier toutes les infos'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
