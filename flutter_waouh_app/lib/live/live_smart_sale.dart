import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../main.dart' as legacy;
import 'avatar/bot_character.dart' show botAvatarAsset;
import 'live_city_field.dart';
import 'live_guest_action_gate.dart';
import 'live_nexus_service.dart';
import 'live_smart_sale_data.dart';
import 'live_product_presentation.dart';

class LiveSmartSaleSheet extends StatelessWidget {
  const LiveSmartSaleSheet({super.key});
  @override
  Widget build(BuildContext context) {
    final m = MediaQuery.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: m.viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: (m.size.height - m.viewInsets.bottom) * .94,
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
        decoration: const BoxDecoration(
          color: Color(0xFFF9FBFF),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    ClipOval(
                      child: Image.asset(
                        botAvatarAsset,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Vendre',
                            style: TextStyle(
                              fontSize: 23,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Bot prépare votre fiche.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF718099),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Fermer',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                StreamBuilder(
                  stream: legacy.supabase.auth.onAuthStateChange,
                  builder: (context, snapshot) => LiveSmartSale(
                    key: ValueKey(legacy.supabase.auth.currentUser?.id),
                    onPublished: (sale) =>
                        Navigator.pop(context, LiveSaleHandoff.path(sale)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

typedef SaleAnalyze =
    Future<Map<String, dynamic>> Function(
      Map<String, dynamic> draft,
      bool visual,
    );
typedef SalePublish =
    Future<Map<String, dynamic>> Function(Map<String, dynamic> draft);

class LiveSmartSale extends StatefulWidget {
  const LiveSmartSale({
    super.key,
    this.initial = const {},
    required this.onPublished,
    this.owner,
    this.currentOwner,
    this.analyze,
    this.publish,
    this.autoLocate = true,
  });
  final Map<String, dynamic> initial;
  final ValueChanged<LivePublishedSale> onPublished;
  final String? owner;
  final String? Function()? currentOwner;
  final SaleAnalyze? analyze;
  final SalePublish? publish;
  final bool autoLocate;
  @override
  State<LiveSmartSale> createState() => _LiveSmartSaleState();
}

class _LiveSmartSaleState extends State<LiveSmartSale> {
  late Map<String, dynamic> _draft;
  late final String? _owner;
  late final TextEditingController _title,
      _price,
      _place,
      _description,
      _quantity,
      _unit;
  final _dirty = <String>{};
  Timer? _timer;
  int _generation = 0;
  bool _analyzing = false,
      _uploading = false,
      _publishing = false,
      _attempted = false;
  String _photoKey = '', _notice = '';
  LivePublishedSale? _published;
  Map<String, dynamic>? _priceSuggestion;
  String? get _current => widget.currentOwner != null
      ? widget.currentOwner!()
      : widget.owner ?? legacy.supabase.auth.currentUser?.id;
  bool get _valid => mounted && _owner == _current;
  List<String> get _photos =>
      List<String>.from(_draft['photos'] as List? ?? const []).take(4).toList();
  @override
  void initState() {
    super.initState();
    _owner = _current;
    _draft = liveNewSaleDraft(widget.initial);
    _dirty.addAll(
      ['price', 'condition', 'quantity', 'unit'].where(
        (key) => widget.initial[key] != null && widget.initial[key] != '',
      ),
    );
    _draft['photos'] = _photos;
    _title = TextEditingController(text: '${_draft['title']}');
    _price = TextEditingController(
      text: _draft['price'] is num ? _money(_draft['price']) : '',
    );
    _place = TextEditingController(
      text: '${_draft['location_label'] ?? ''}'.isNotEmpty
          ? '${_draft['location_label']}'
          : [
              _draft['district'],
              _draft['city'],
            ].where((v) => v != null && '$v'.isNotEmpty).join(', '),
    );
    _description = TextEditingController(text: '${_draft['description']}');
    _quantity = TextEditingController(
      text: _draft['quantity']?.toString() ?? '',
    );
    _unit = TextEditingController(text: '${_draft['unit']}');
    _schedule();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _generation++;
    for (final c in [_title, _price, _place, _description, _quantity, _unit]) {
      c.dispose();
    }
    super.dispose();
  }

  String _money(dynamic v) => '${(v as num).round()}'.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]} ',
  );
  void _sync(Map<String, dynamic> s) {
    _draft = liveMergeSaleSuggestions(_draft, s, _dirty);
    if (_title.text != '${_draft['title']}') _title.text = '${_draft['title']}';
    if (!_dirty.contains('price') && _draft['price'] != null)
      _price.text = _money(_draft['price']);
    if (_place.text.isEmpty && '${_draft['city'] ?? ''}'.isNotEmpty)
      _place.text = '${_draft['city']}';
    if (!_dirty.contains('quantity') && _draft['quantity'] != null)
      _quantity.text = '${_draft['quantity']}';
    if (!_dirty.contains('unit')) _unit.text = '${_draft['unit']}';
  }

  void _edit(String key, dynamic value) {
    setState(() {
      _dirty.add(key);
      _draft[key] = value;
      _notice = '';
      if (key == 'title') {
        if (RegExp(
              r'^(mon|ma|un|une|le|la)?\s*(téléphone|telephone|moto|ordinateur|produit|article)\s*$',
              caseSensitive: false,
            ).hasMatch('$value') ||
            '$value'.trim().isEmpty)
          _dirty.remove('title');
        for (final field in ['price', 'condition', 'quantity', 'unit']) {
          if (!_dirty.contains(field))
            _draft[field] = field == 'unit' ? '' : null;
        }
        if (!_dirty.contains('price')) _price.clear();
        if (!_dirty.contains('quantity')) _quantity.clear();
        if (!_dirty.contains('unit')) _unit.clear();
        _sync(liveSaleTextSuggestions('$value'));
      }
    });
    if (key == 'title' || key == 'condition') _schedule();
  }

  void _schedule() {
    _timer?.cancel();
    final version = ++_generation;
    _analyzing = false;
    if (_owner == null || (_title.text.trim().isEmpty && _photos.isEmpty))
      return;
    _timer = Timer(const Duration(milliseconds: 650), () async {
      if (!_valid || _publishing || _published != null) return;
      final photo = _photos.isEmpty ? '' : _photos.first;
      final visual = photo.isNotEmpty && photo != _photoKey;
      setState(() => _analyzing = true);
      try {
        final s =
            await (widget.analyze?.call(Map.from(_draft), visual) ??
                LiveNexusService(
                  legacy.supabase,
                ).analyzeSale(_owner!, Map.from(_draft), visual));
        if (!_valid || version != _generation) return;
        setState(() {
          if (visual) _photoKey = photo;
          _priceSuggestion = s['price'] is Map
              ? Map<String, dynamic>.from(s['price'] as Map)
              : null;
          _sync(s);
        });
      } catch (_) {
        if (_valid && version == _generation)
          setState(
            () => _notice = 'Vous pouvez compléter la fiche directement.',
          );
      } finally {
        if (_valid && version == _generation)
          setState(() => _analyzing = false);
      }
    });
  }

  Future<void> _add({bool camera = false}) async {
    if (_uploading || _publishing || _photos.length >= 4) return;
    if (_owner == null) {
      await requireLiveAuthentication(
        context,
        next: '/app/nexus?kind=vendre',
        actionLabel: 'ajouter les photos de votre produit',
      );
      return;
    }
    final picker = ImagePicker();
    late final List<XFile> files;
    try {
      files = camera
          ? [
              await picker.pickImage(
                source: ImageSource.camera,
                maxWidth: 1600,
                maxHeight: 1600,
                imageQuality: 82,
              ),
            ].whereType<XFile>().toList()
          : await picker.pickMultiImage(
              maxWidth: 1600,
              maxHeight: 1600,
              imageQuality: 82,
            );
    } catch (_) {
      if (_valid)
        setState(
          () => _notice = 'Photo indisponible. Choisissez une autre image.',
        );
      return;
    }
    if (!_valid || files.isEmpty) return;
    _timer?.cancel();
    _generation++;
    setState(() {
      _uploading = true;
      _analyzing = false;
      _notice = '';
    });
    final next = _photos;
    try {
      for (final file in files.take(4 - next.length)) {
        if (await file.length() > 10 * 1024 * 1024) throw StateError('photo');
        next.add(
          await LiveNexusService(legacy.supabase).uploadSharedImage(file),
        );
        if (!_valid) return;
      }
      if (_valid) setState(() => _draft['photos'] = next.take(4).toList());
    } catch (_) {
      if (_valid)
        setState(() => _notice = 'Photo non ajoutée. Essayez une autre image.');
    } finally {
      if (_valid) {
        setState(() => _uploading = false);
        _schedule();
      }
    }
  }

  void _openPublished() {
    try {
      widget.onPublished(_published!);
    } catch (_) {
      if (_valid)
        setState(
          () =>
              _notice = 'Annonce publiée. Vous pouvez reprendre la recherche.',
        );
    }
  }

  Future<void> _submit() async {
    if (_publishing || _uploading || !_valid) return;
    if (_published != null) {
      _openPublished();
      return;
    }
    setState(() => _attempted = true);
    if (_owner == null) {
      await requireLiveAuthentication(
        context,
        next: '/app/nexus?kind=vendre',
        actionLabel: 'publier votre produit',
      );
      return;
    }
    if ('${_draft['title']}'.trim().length < 3 ||
        _draft['price'] == null ||
        _draft['condition'] == null ||
        '${_draft['city'] ?? ''}'.trim().isEmpty)
      return;
    _timer?.cancel();
    _generation++;
    setState(() {
      _publishing = true;
      _analyzing = false;
      _notice = '';
    });
    final submitted = Map<String, dynamic>.from(_draft);
    try {
      final article =
          await (widget.publish?.call(submitted) ??
              LiveNexusService(
                legacy.supabase,
              ).publishSale(_owner!, submitted));
      if (_valid) {
        _published = LivePublishedSale(_owner!, {
          ...submitted,
          'article_id': article['article_id'],
        }, article);
        _draft = Map.from(_published!.draft);
        _openPublished();
      }
    } catch (_) {
      if (_valid)
        setState(
          () =>
              _notice = 'Publication non terminée. Votre fiche est conservée.',
        );
    } finally {
      if (_valid) setState(() => _publishing = false);
    }
  }

  InputDecoration _dec(String hint, {bool invalid = false, Widget? suffix}) =>
      InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF8A95A8)),
        filled: true,
        fillColor: Colors.white,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 13,
          vertical: 15,
        ),
        suffixIcon: suffix,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: invalid ? Colors.redAccent : const Color(0xFFE1E7F0),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: invalid ? Colors.redAccent : const Color(0xFFE1E7F0),
          ),
        ),
      );
  Widget _field(String label, Widget child) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Color(0xFF68768D),
        ),
      ),
      const SizedBox(height: 6),
      child,
    ],
  );
  @override
  Widget build(BuildContext context) {
    if (_published != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          LiveProductPresentation(
            value: _published!.article,
            label: 'Annonce publiée',
          ),
          if (_notice.isNotEmpty) Text(_notice),
          FilledButton(
            onPressed: _openPublished,
            child: const Text('Reprendre la recherche'),
          ),
        ],
      );
    }
    final photos = _photos;
    final blocked = _publishing || _uploading;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Votre produit',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
            Text(
              '${photos.length} / 4 photos',
              style: const TextStyle(fontSize: 11, color: Color(0xFF718099)),
            ),
          ],
        ),
        const SizedBox(height: 9),
        Row(
          children: [
            for (var i = 0; i < 4; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(
                child: AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      color: const Color(0xFFEDF3FF),
                      child: i < photos.length
                          ? Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.network(
                                  photos[i],
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.photo_outlined,
                                    color: Color(0xFF8195BE),
                                  ),
                                ),
                                Positioned(
                                  top: 0,
                                  right: 0,
                                  child: SizedBox(
                                    width: 28,
                                    height: 28,
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      tooltip: 'Retirer la photo ${i + 1}',
                                      style: IconButton.styleFrom(
                                        backgroundColor: Colors.white,
                                      ),
                                      onPressed: blocked
                                          ? null
                                          : () => setState(() {
                                              _draft['photos'] = photos
                                                ..removeAt(i);
                                              _schedule();
                                            }),
                                      icon: const Icon(Icons.close, size: 14),
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : InkWell(
                              onTap: blocked ? null : () => _add(),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (_uploading && i == photos.length)
                                    const SizedBox.square(
                                      dimension: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  else
                                    const Icon(
                                      Icons.add_photo_alternate_outlined,
                                      color: Color(0xFF6080C8),
                                      size: 23,
                                    ),
                                  const SizedBox(height: 5),
                                  Text(
                                    i == 0 ? 'Ajouter' : '${i + 1}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF718099),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        Row(
          children: [
            TextButton.icon(
              onPressed: blocked || photos.length >= 4
                  ? null
                  : () => _add(camera: true),
              icon: const Icon(Icons.camera_alt_outlined, size: 14),
              label: const Text(
                'Appareil photo',
                style: TextStyle(fontSize: 11),
              ),
            ),
            if (_analyzing)
              const Expanded(
                child: Text(
                  'Je prépare la fiche…',
                  textAlign: TextAlign.right,
                  style: TextStyle(fontSize: 10, color: Color(0xFF6480B4)),
                ),
              ),
          ],
        ),
        _field(
          'Produit',
          TextField(
            controller: _title,
            enabled: !_publishing && _published == null,
            maxLength: 200,
            decoration: _dec(
              'Ex. Samsung S25, moto, soja…',
            ).copyWith(counterText: ''),
            onChanged: (v) => _edit('title', v),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _field(
                'Prix souhaité',
                TextField(
                  controller: _price,
                  enabled: !_publishing && _published == null,
                  keyboardType: TextInputType.number,
                  decoration: _dec(
                    'Votre prix',
                    invalid: _attempted && _draft['price'] == null,
                    suffix: const Padding(
                      padding: EdgeInsets.only(top: 15, right: 10),
                      child: Text(
                        'F CFA',
                        style: TextStyle(
                          fontSize: 10,
                          color: Color(0xFF8A95A8),
                        ),
                      ),
                    ),
                  ),
                  onChanged: (v) => _edit(
                    'price',
                    double.tryParse(v.replaceAll(RegExp(r'\D'), '')),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _field(
                'État',
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  value: liveSaleConditions.containsKey(_draft['condition'])
                      ? _draft['condition']
                      : null,
                  decoration: _dec(
                    'À préciser',
                    invalid: _attempted && _draft['condition'] == null,
                  ),
                  hint: const Text(
                    'À préciser',
                    style: TextStyle(fontSize: 13),
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF182945),
                  ),
                  items: liveSaleConditions.entries
                      .map(
                        (e) => DropdownMenuItem(
                          value: e.key,
                          child: Text(e.value),
                        ),
                      )
                      .toList(),
                  onChanged: _publishing || _published != null
                      ? null
                      : (v) => _edit('condition', v),
                ),
              ),
            ),
          ],
        ),
        if ((_priceSuggestion?['observations'] as num? ?? 0) > 0)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _publishing
                  ? null
                  : () => setState(() {
                      _dirty.remove('price');
                      _draft['price'] = _priceSuggestion!['value'];
                      _price.text = _money(_draft['price']);
                    }),
              icon: const Icon(Icons.auto_awesome, size: 13),
              label: Text(
                '${_money(_priceSuggestion!['low'])}–${_money(_priceSuggestion!['high'])} F observés',
                style: const TextStyle(fontSize: 11),
              ),
            ),
          ),
        const SizedBox(height: 12),
        _field(
          'Lieu',
          IgnorePointer(
            ignoring: _publishing || _published != null,
            child: LiveCityField(
              controller: _place,
              autoLocate: widget.autoLocate,
              onChanged: () {
                if (_publishing || _published != null) return;
                setState(() {
                  _dirty.add('city');
                  _draft.addAll(liveSalePlace(_place.text));
                  _draft['latitude'] = null;
                  _draft['longitude'] = null;
                });
              },
              onCoordinatesChanged: (lat, lng) {
                if (_valid && !_publishing && _published == null)
                  setState(() {
                    _draft['latitude'] = lat;
                    _draft['longitude'] = lng;
                  });
              },
            ),
          ),
        ),
        if (_attempted && '${_draft['city'] ?? ''}'.isEmpty)
          const Text(
            'Précisez le lieu.',
            style: TextStyle(fontSize: 11, color: Colors.redAccent),
          ),
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            title: const Text(
              'Précisions',
              style: TextStyle(fontSize: 12, color: Color(0xFF718099)),
            ),
            children: [
              TextField(
                controller: _description,
                enabled: !_publishing && _published == null,
                maxLines: 3,
                maxLength: 2000,
                decoration: _dec(
                  'Modèle, défaut à signaler, accessoires…',
                ).copyWith(counterText: ''),
                onChanged: (v) => _edit('description', v),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _field(
                      'Quantité',
                      TextField(
                        controller: _quantity,
                        enabled: !_publishing && _published == null,
                        keyboardType: TextInputType.number,
                        decoration: _dec('1'),
                        onChanged: (v) => _edit('quantity', double.tryParse(v)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      'Unité',
                      TextField(
                        controller: _unit,
                        enabled: !_publishing && _published == null,
                        decoration: _dec('pièce, kg, tonne…'),
                        onChanged: (v) => _edit('unit', v),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
        if (_notice.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _notice,
              style: const TextStyle(fontSize: 12, color: Color(0xFF68768D)),
            ),
          ),
        SizedBox(
          height: 50,
          child: FilledButton(
            onPressed: blocked || _title.text.trim().length < 3
                ? null
                : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF3867EA),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(17),
              ),
            ),
            child: _publishing
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    _published == null
                        ? 'Publier et trouver'
                        : 'Reprendre la recherche',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Vérifiez les suggestions avant de publier.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 10, color: Color(0xFF8A95A8)),
        ),
      ],
    );
  }
}
