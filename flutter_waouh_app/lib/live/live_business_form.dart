import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_benin_locations.dart';
import 'live_location.dart';
import 'live_theme.dart';

class LiveBusinessFormScreen extends StatefulWidget {
  const LiveBusinessFormScreen({super.key, this.initial});
  final legacy.PartnerBusiness? initial;

  @override
  State<LiveBusinessFormScreen> createState() => _LiveBusinessFormScreenState();
}

class _LiveBusinessFormScreenState extends State<LiveBusinessFormScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  final _location = LiveLocationService();

  String _category = '';
  String _city = '';
  String _quarter = '';
  double? _latitude;
  double? _longitude;
  bool _gpsBusy = false;
  bool _saving = false;
  String? _formError;

  @override
  void initState() {
    super.initState();
    final item = widget.initial;
    if (item != null) {
      _name.text = item.name;
      _category = item.category ?? '';
      _city = item.city ?? '';
      _quarter = item.quarter ?? '';
      _phone.text = item.whatsapp ?? '';
      _description.text = item.description ?? '';
      _address.text = item.addressLine ?? '';
      _latitude = item.lat;
      _longitude = item.lng;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _address.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickCategory() async {
    final result = await pickLiveOption(
      context,
      title: 'Choisir une catégorie',
      options: liveBusinessCategories,
      current: _category,
      allowCustom: true,
      customHint: 'Ex. Élevage, ONG, Services numériques',
    );
    if (result != null && mounted) setState(() => _category = result);
  }

  Future<void> _pickCity() async {
    final result = await pickLiveOption(
      context,
      title: 'Choisir une ville',
      options: liveBeninPlaces.keys.toList(),
      current: _city,
    );
    if (result != null && mounted) {
      setState(() {
        _city = result;
        _quarter = '';
      });
    }
  }

  Future<void> _pickQuarter() async {
    final options = liveQuartiersForCity(_city);
    if (_city.isEmpty) {
      _message('Choisissez d’abord la ville.');
      return;
    }
    final result = await pickLiveOption(
      context,
      title: 'Choisir un quartier',
      options: options,
      current: _quarter,
      allowCustom: true,
      customHint: 'Saisir un quartier',
    );
    if (result != null && mounted) setState(() => _quarter = result);
  }

  Future<void> _detectLocation() async {
    if (_gpsBusy) return;
    setState(() => _gpsBusy = true);
    final position = await _location.requestCurrent();
    if (!mounted) return;
    if (!position.available) {
      setState(() => _gpsBusy = false);
      final action = position.permissionDeniedForever
          ? SnackBarAction(label: 'Paramètres', onPressed: _location.openAppSettings)
          : position.serviceDisabled
              ? SnackBarAction(label: 'Activer GPS', onPressed: _location.openLocationSettings)
              : null;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(position.errorMessage ?? 'Position GPS indisponible.'), action: action));
      return;
    }

    setState(() {
      _latitude = position.latitude;
      _longitude = position.longitude;
    });
    try {
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
        final detectedCity = (place['ville'] ?? '').toString().trim();
        final detectedQuarter = (place['quartier'] ?? '').toString().trim();
        final detectedAddress = (place['adresse_complete'] ?? '').toString().trim();
        if (_city.isEmpty && detectedCity.isNotEmpty) _city = detectedCity;
        if (_quarter.isEmpty && detectedQuarter.isNotEmpty) _quarter = detectedQuarter;
        if (_address.text.trim().isEmpty && detectedAddress.isNotEmpty) _address.text = detectedAddress;
      });
      _message(_city.isEmpty ? 'Position GPS enregistrée. Sélectionnez votre ville.' : 'Position trouvée : $_city${_quarter.isEmpty ? '' : ' · $_quarter'}');
    } catch (_) {
      _message('Position GPS enregistrée. La ville peut être choisie manuellement.');
    } finally {
      if (mounted) setState(() => _gpsBusy = false);
    }
  }

  Future<void> _save() async {
    final partner = context.read<legacy.PartnerController>().partner;
    if (partner == null) {
      _message('Votre profil partenaire est en cours de préparation. Réessayez dans un instant.');
      return;
    }
    if (_name.text.trim().isEmpty || _category.isEmpty || _city.isEmpty) {
      setState(() => _formError = 'Renseignez le nom, la catégorie et la ville.');
      return;
    }
    setState(() { _formError = null; _saving = true; });
    final payload = <String, dynamic>{
      // Exact columns used by BusinessFormNativeScreen.tsx / Supabase.
      'nom_entreprise': _name.text.trim(),
      'categorie': _category,
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'adresse_complete': _address.text.trim().isEmpty ? null : _address.text.trim(),
      'ville': _city,
      'quartier': _quarter.isEmpty ? null : _quarter,
      'whatsapp': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      'lat': _latitude,
      'lng': _longitude,
    };
    try {
      if (widget.initial == null) {
        await legacy.supabase.from('waouh_partner_businesses').insert({...payload, 'partner_id': partner.id});
      } else {
        await legacy.supabase.from('waouh_partner_businesses').update(payload).eq('id', widget.initial!.id);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.initial == null ? 'Entreprise enregistrée.' : 'Entreprise mise à jour.')));
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/app/partner/businesses');
      }
    } catch (error) {
      if (mounted) setState(() => _formError = 'Enregistrement impossible : $error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _message(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: WaouhPalette.pearl,
    appBar: AppBar(
      automaticallyImplyLeading: false,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: () => context.canPop() ? context.pop() : context.go('/app/partner/businesses'),
      ),
      title: Text(widget.initial == null ? 'Nouvelle entreprise' : 'Modifier l’entreprise'),
    ),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
      children: [
        Text('Enrôlement intelligent', style: WaouhText.caption),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: _gpsBusy ? null : _detectLocation,
          icon: _gpsBusy
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.my_location_rounded),
          label: Text(_gpsBusy ? 'Détection en cours…' : 'Détecter ma position'),
        ),
        if (_latitude != null && _longitude != null) Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text('GPS : ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}', style: WaouhText.caption),
        ),
        const SizedBox(height: 20),
        Text('Nom de l’entreprise *', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'Ex. Maquis Chez Sika')),
        const SizedBox(height: 16),
        _PickerField(label: 'Catégorie *', value: _category, hint: 'Type d’activité', onTap: _pickCategory),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _PickerField(label: 'Ville *', value: _city, hint: 'Choisir', onTap: _pickCity)),
          const SizedBox(width: 12),
          Expanded(child: _PickerField(label: 'Quartier', value: _quarter, hint: 'Choisir', onTap: _pickQuarter)),
        ]),
        const SizedBox(height: 16),
        Text('WhatsApp', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(prefixIcon: Icon(Icons.phone_outlined), hintText: '+229 97 00 00 00')),
        const SizedBox(height: 16),
        Text('Adresse / indication', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _address, minLines: 1, maxLines: 2, decoration: const InputDecoration(hintText: 'Rue, repère ou adresse complète')),
        const SizedBox(height: 16),
        Text('Description', style: WaouhText.bodyStrong),
        const SizedBox(height: 6),
        TextField(controller: _description, minLines: 3, maxLines: 5, decoration: const InputDecoration(hintText: 'Présentez brièvement l’entreprise')),
        if (_formError != null) Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Text(_formError!, style: const TextStyle(color: WaouhPalette.red, fontWeight: FontWeight.w700)),
        ),
      ],
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.initial == null ? 'Enregistrer' : 'Mettre à jour'),
        ),
      ),
    ),
  );
}

class _PickerField extends StatelessWidget {
  const _PickerField({required this.label, required this.value, required this.hint, required this.onTap});
  final String label;
  final String value;
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: WaouhText.bodyStrong),
    const SizedBox(height: 6),
    InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(WaouhRadius.control),
      child: InputDecorator(
        decoration: const InputDecoration(suffixIcon: Icon(Icons.expand_more_rounded)),
        child: Text(value.isEmpty ? hint : value, overflow: TextOverflow.ellipsis, style: TextStyle(color: value.isEmpty ? WaouhPalette.muted : WaouhPalette.ink)),
      ),
    ),
  ]);
}
