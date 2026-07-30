import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'smart_studio_service.dart';
import 'studio_catalog_media_picker.dart';
import 'studio_compat_service.dart';

class StudioCatalogManager extends StatefulWidget {
  const StudioCatalogManager({
    super.key,
    required this.agentId,
    required this.service,
    required this.smart,
    this.onChanged,
  });

  final String agentId;
  final WhatsAppIaStudioV20Service service;
  final SmartStudioService smart;
  final VoidCallback? onChanged;

  @override
  State<StudioCatalogManager> createState() => _StudioCatalogManagerState();
}

class _StudioCatalogManagerState extends State<StudioCatalogManager> {
  static const _primary = Color(0xFF0B7F72);
  static const _mint = Color(0xFFDFF5F0);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);

  String _kind = 'product';
  bool _loading = true;
  bool _busy = false;
  String? _error;
  List<StudioCatalogItem> _items = const <StudioCatalogItem>[];
  List<StudioPartnerProduct> _partnerProducts = const <StudioPartnerProduct>[];
  bool _integrityOk = true;
  String _integrityLabel = 'Contrôle des données en cours…';

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void didUpdateWidget(covariant StudioCatalogManager oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.agentId != widget.agentId) {
      unawaited(_load());
    }
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final values = await Future.wait<dynamic>([
        widget.service.loadCatalog(agentId: widget.agentId),
        widget.service.loadPartnerProducts(),
        widget.service.auditCatalogIntegrity(agentId: widget.agentId),
      ]);

      final audit = values[2] as Map<String, dynamic>;
      final diagnostics = audit['diagnostics'] is Map
          ? Map<String, dynamic>.from(audit['diagnostics'] as Map)
          : const <String, dynamic>{};
      final ok = audit['ok'] == true;
      final total = (diagnostics['manual_items'] as num?)?.toInt() ?? 0;
      final partner = (diagnostics['partner_items'] as num?)?.toInt() ?? 0;

      if (!mounted) return;
      setState(() {
        _items = values[0] as List<StudioCatalogItem>;
        _partnerProducts = values[1] as List<StudioPartnerProduct>;
        _integrityOk = ok;
        _integrityLabel = ok
            ? 'Données vérifiées · ${total + partner} élément(s)'
            : 'Anomalie détectée : actualisez ou réenregistrez les éléments concernés';
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$error';
      });
    }
  }

  Future<void> _repairIntegrity() async {
    await _run(() async {
      await widget.service.repairCatalogIntegrity(agentId: widget.agentId);
      await _load();
      widget.onChanged?.call();
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<StudioCatalogItem> get _visible =>
      _items.where((item) => item.kind == _kind).toList(growable: false);

  Future<void> _openEditor([StudioCatalogItem? initial]) async {
    if (initial?.isPartner == true) {
      await _showPartnerDetails(initial!);
      return;
    }

    final draft = await showModalBottomSheet<_CatalogDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CatalogEditorSheet(
        kind: initial?.kind ?? _kind,
        initial: initial,
      ),
    );

    if (draft == null) return;

    await _run(() async {
      final media = <StudioCatalogMedia>[...draft.existingMedia];

      for (final picked in draft.newMedia) {
        final uploaded = await widget.service.uploadCatalogMedia(
          agentId: widget.agentId,
          bytes: picked.bytes,
          filename: picked.name,
          contentType: picked.contentType,
        );
        media.add(uploaded);
      }

      final images = media.where((item) => item.isImage).take(3).toList();
      final videos = media.where((item) => item.isVideo).take(1).toList();
      final normalizedMedia = <StudioCatalogMedia>[...images, ...videos];

      await widget.service.upsertCatalogItem(
        id: initial?.id,
        agentId: widget.agentId,
        name: draft.name,
        description: draft.description,
        priceFcfa: draft.priceFcfa,
        quantity: draft.quantity,
        sku: draft.sku,
        active: draft.active,
        kind: draft.kind,
        catalogTitle: draft.catalogTitle,
        category: draft.category,
        duration: draft.duration,
        audience: draft.audience,
        startDate: draft.startDate,
        endDate: draft.endDate,
        format: draft.format,
        level: draft.level,
        unit: draft.unit,
        source: initial?.source ?? 'manual',
        media: normalizedMedia,
      );

      await _load();
      widget.onChanged?.call();
    });
  }

  Future<void> _deleteItem(StudioCatalogItem item) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(item.isPartner
                ? 'Retirer du catalogue ?'
                : 'Supprimer définitivement ?'),
            content: Text(item.name),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Annuler'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(item.isPartner ? 'Retirer' : 'Supprimer'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) return;

    await _run(() async {
      await widget.service.deleteCatalogItem(
        id: item.id,
        agentId: widget.agentId,
      );
      await _load();
      widget.onChanged?.call();
    });
  }

  Future<void> _importIntelligently() async {
    final request = await showModalBottomSheet<_CatalogImportRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CatalogImportSheet(initialKind: _kind),
    );

    if (request == null) return;

    await _run(() async {
      final imported = await widget.smart.parseCatalogImport(
        kind: request.kind,
        text: request.text,
        bytes: request.file?.bytes,
        filename: request.file?.name,
        contentType: request.file?.contentType,
      );

      if (imported.isEmpty) {
        throw StateError(
          'Aucun élément exploitable n’a été identifié dans ce contenu.',
        );
      }

      StudioCatalogMedia? importedMedia;
      final sourceFile = request.file;
      if (sourceFile != null && (sourceFile.isImage || sourceFile.isVideo)) {
        importedMedia = await widget.service.uploadCatalogMedia(
          agentId: widget.agentId,
          bytes: sourceFile.bytes,
          filename: sourceFile.name,
          contentType: sourceFile.contentType,
        );
      }

      for (var index = 0; index < imported.length; index++) {
        final item = imported[index];
        final media = index == 0 && importedMedia != null
            ? <StudioCatalogMedia>[importedMedia]
            : const <StudioCatalogMedia>[];
        await widget.service.upsertCatalogItem(
          agentId: widget.agentId,
          name: item.name,
          description: item.description,
          priceFcfa: item.priceFcfa,
          quantity: item.quantity,
          kind: item.kind,
          catalogTitle: item.catalogTitle,
          category: item.category,
          duration: item.duration,
          audience: item.audience,
          startDate: item.startDate,
          endDate: item.endDate,
          format: item.format,
          level: item.level,
          unit: item.unit,
          source: 'smart_import',
          media: media,
        );
      }

      _kind = request.kind;
      await _load();
      widget.onChanged?.call();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${imported.length} élément(s) importé(s).'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  Future<void> _syncPartnerProducts() async {
    if (_busy) return;

    List<StudioPartnerProduct> latestProducts;
    List<StudioCatalogItem> latestCatalog;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final values = await Future.wait<dynamic>([
        widget.service.loadPartnerProducts(),
        widget.service.loadCatalog(agentId: widget.agentId),
      ]);
      latestProducts = values[0] as List<StudioPartnerProduct>;
      latestCatalog = values[1] as List<StudioCatalogItem>;
      if (!mounted) return;
      setState(() {
        _partnerProducts = latestProducts;
        _items = latestCatalog;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = 'Synchronisation Partenaire impossible : $error');
      return;
    } finally {
      if (mounted) setState(() => _busy = false);
    }

    if (latestProducts.isEmpty) {
      if (!mounted) return;
      setState(() {
        _error =
            'Aucun produit Partenaire n’est rattaché à votre profil authentifié. '
            'Vérifiez votre profil Partenaire, vos entreprises et leurs produits.';
      });
      return;
    }

    final current = latestCatalog
        .where((item) => item.isPartner)
        .map((item) => item.partnerProductId)
        .whereType<String>()
        .toSet();

    // Lors de la première synchronisation, tous les produits appartenant à
    // l'utilisateur sont présélectionnés. L'utilisateur peut ensuite décocher.
    final initialSelection = current.isEmpty
        ? latestProducts.map((item) => item.id).toSet()
        : current;

    final selected = await showModalBottomSheet<Set<String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PartnerSyncSheet(
        products: latestProducts,
        selected: initialSelection,
      ),
    );

    if (selected == null) return;

    await _run(() async {
      final result = await widget.service.syncPartnerProducts(
        agentId: widget.agentId,
        productIds: selected,
        replace: true,
      );
      _kind = 'product';
      await _load();
      widget.onChanged?.call();

      if (!mounted) return;
      final synchronized = result['synchronized'] ?? selected.length;
      final available = result['available'] ?? latestProducts.length;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '$synchronized produit(s) synchronisé(s) sur $available disponible(s).',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  Future<void> _showPartnerDetails(StudioCatalogItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.name,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                  item.description ?? 'Produit synchronisé depuis Partenaire.'),
              const SizedBox(height: 12),
              const Text(
                'Les informations restent synchronisées avec le module Partenaire. Modifiez le produit à sa source ou retirez-le de cet agent.',
                style: TextStyle(color: _muted),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _deleteItem(item);
                },
                icon: const Icon(Icons.link_off_rounded),
                label: const Text('Retirer de cet agent'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(28),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFEDEA),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              _error!,
              style: const TextStyle(color: Color(0xFF8F2D25)),
            ),
          ),
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: _integrityOk
                ? const Color(0xFFE8F7F1)
                : const Color(0xFFFFF2E2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _integrityOk
                  ? const Color(0xFFBDE7D8)
                  : const Color(0xFFF4C98D),
            ),
          ),
          child: Row(
            children: [
              Icon(
                _integrityOk
                    ? Icons.verified_rounded
                    : Icons.warning_amber_rounded,
                size: 19,
                color: _integrityOk
                    ? const Color(0xFF167A58)
                    : const Color(0xFF9A5B00),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _integrityLabel,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: _integrityOk
                        ? const Color(0xFF145A43)
                        : const Color(0xFF7A4A00),
                  ),
                ),
              ),
              if (!_integrityOk)
                TextButton.icon(
                  onPressed: _busy ? null : _repairIntegrity,
                  icon: const Icon(Icons.build_circle_outlined),
                  label: const Text('Réparer'),
                )
              else
                IconButton(
                  tooltip: 'Revérifier',
                  onPressed: _busy ? null : _load,
                  icon: const Icon(Icons.refresh_rounded),
                ),
            ],
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _kindChip('product', 'Produits', Icons.inventory_2_outlined),
              const SizedBox(width: 7),
              _kindChip('training', 'Formations', Icons.school_outlined),
              const SizedBox(width: 7),
              _kindChip(
                  'presentation', 'Présentations', Icons.slideshow_outlined),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: _busy ? null : _importIntelligently,
              icon: const Icon(Icons.auto_fix_high_rounded),
              label: const Text('Importer intelligemment'),
            ),
            if (_kind == 'product')
              OutlinedButton.icon(
                onPressed: _busy ? null : _syncPartnerProducts,
                icon: const Icon(Icons.sync_rounded),
                label: const Text('Synchroniser Partenaire'),
              ),
            FilledButton.icon(
              onPressed: _busy ? null : () => _openEditor(),
              style: FilledButton.styleFrom(backgroundColor: _primary),
              icon: const Icon(Icons.add_rounded),
              label: Text('Ajouter ${_kindLabel(_kind).toLowerCase()}'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_busy) const LinearProgressIndicator(minHeight: 2),
        if (_visible.isEmpty)
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: _line),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                Icon(_kindIcon(_kind), color: _primary, size: 38),
                const SizedBox(height: 8),
                Text(
                  'Aucun ${_kindLabel(_kind).toLowerCase()}',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  _kind == 'product'
                      ? 'Ajoutez un produit avec une à trois photos.'
                      : _kind == 'training'
                          ? 'Créez un catalogue de formations avec photos et vidéo.'
                          : 'Créez une présentation visuelle avec photos et vidéo.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: _muted),
                ),
              ],
            ),
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth < 330
                  ? 1
                  : constraints.maxWidth >= 860
                      ? 3
                      : 2;
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _visible.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: columns == 1 ? 1.75 : 0.67,
                ),
                itemBuilder: (context, index) {
                  final item = _visible[index];
                  return _CatalogCard(
                    item: item,
                    onOpen: () => _openEditor(item),
                    onDelete: () => _deleteItem(item),
                  );
                },
              );
            },
          ),
      ],
    );
  }

  Widget _kindChip(String kind, String label, IconData icon) {
    final selected = _kind == kind;
    return ChoiceChip(
      selected: selected,
      selectedColor: _mint,
      side: BorderSide(color: selected ? _primary : _line),
      avatar: Icon(icon, size: 18, color: _primary),
      label: Text(label),
      onSelected: (_) => setState(() => _kind = kind),
    );
  }
}

class _CatalogCard extends StatelessWidget {
  const _CatalogCard({
    required this.item,
    required this.onOpen,
    required this.onDelete,
  });

  final StudioCatalogItem item;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final price = item.priceFcfa == null
        ? null
        : '${_formatNumber(item.priceFcfa!)} FCFA';
    final image = item.displayPhotoUrl;
    final hasVideo = item.media.any((media) => media.isVideo);
    final date = item.startDate == null
        ? null
        : '${item.startDate!.day.toString().padLeft(2, '0')}/'
            '${item.startDate!.month.toString().padLeft(2, '0')}/'
            '${item.startDate!.year}';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(19),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(19),
            border: Border.all(color: const Color(0xFFDCEBE7)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 5,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (image.isNotEmpty)
                      Image.network(
                        image,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _CatalogPlaceholder(
                          icon: _kindIcon(item.kind),
                        ),
                      )
                    else
                      _CatalogPlaceholder(icon: _kindIcon(item.kind)),
                    Positioned(
                      left: 8,
                      top: 8,
                      child: _CatalogBadge(
                        label: _kindLabel(item.kind),
                        icon: _kindIcon(item.kind),
                      ),
                    ),
                    if (item.isPartner)
                      const Positioned(
                        right: 8,
                        top: 8,
                        child: _CatalogBadge(
                          label: 'Partenaire',
                          icon: Icons.sync_rounded,
                        ),
                      ),
                    if (hasVideo)
                      const Center(
                        child: CircleAvatar(
                          backgroundColor: Colors.black54,
                          child: Icon(Icons.play_arrow_rounded,
                              color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 6,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 9, 8, 7),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF17211F),
                          fontWeight: FontWeight.w900,
                          fontSize: 13.5,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (price != null) price,
                          if (item.duration?.isNotEmpty == true) item.duration!,
                          if (item.format?.isNotEmpty == true) item.format!,
                          if (date != null) date,
                        ].join(' · '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF0B7F72),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (item.category?.isNotEmpty == true) ...[
                        const SizedBox(height: 3),
                        Text(
                          item.category!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF667874),
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                      const Spacer(),
                      Row(
                        children: [
                          Expanded(
                            child: TextButton.icon(
                              onPressed: onOpen,
                              icon: Icon(
                                item.isPartner
                                    ? Icons.visibility_outlined
                                    : Icons.edit_outlined,
                                size: 17,
                              ),
                              label: Text(item.isPartner ? 'Voir' : 'Modifier'),
                            ),
                          ),
                          IconButton(
                            tooltip: item.isPartner ? 'Retirer' : 'Supprimer',
                            onPressed: onDelete,
                            icon: Icon(
                              item.isPartner
                                  ? Icons.link_off_rounded
                                  : Icons.delete_outline_rounded,
                              size: 19,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CatalogPlaceholder extends StatelessWidget {
  const _CatalogPlaceholder({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFDFF5F0), Color(0xFFF4FAF8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Icon(icon, size: 44, color: const Color(0xFF0B7F72)),
    );
  }
}

class _CatalogBadge extends StatelessWidget {
  const _CatalogBadge({required this.label, required this.icon});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: const Color(0xFF0B7F72)),
          const SizedBox(width: 3),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF17211F),
              fontSize: 9.5,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class StudioProfessionalChatText extends StatelessWidget {
  const StudioProfessionalChatText({
    super.key,
    required this.text,
    required this.isUser,
  });

  final String text;
  final bool isUser;

  @override
  Widget build(BuildContext context) {
    final baseColor = isUser ? Colors.white : const Color(0xFF17211F);
    final lines = text.replaceAll('\r\n', '\n').split('\n');
    final children = <Widget>[];

    for (final raw in lines) {
      final line = raw.trimRight();
      if (line.trim().isEmpty) {
        children.add(const SizedBox(height: 7));
        continue;
      }
      final heading = RegExp(r'^(#{1,3})\s+(.+)$').firstMatch(line.trim());
      if (heading != null) {
        children.add(Padding(
          padding: const EdgeInsets.only(bottom: 4, top: 2),
          child: Text.rich(
            TextSpan(
              children: _inlineSpans(heading.group(2)!, baseColor),
              style: TextStyle(
                color: isUser ? Colors.white : const Color(0xFF0B7F72),
                fontSize: heading.group(1)!.length == 1 ? 17 : 15,
                height: 1.25,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ));
        continue;
      }
      final bullet = RegExp(r'^[-•]\s+(.+)$').firstMatch(line.trim());
      if (bullet != null) {
        children.add(Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('•  ',
                  style:
                      TextStyle(color: baseColor, fontWeight: FontWeight.w900)),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: _inlineSpans(bullet.group(1)!, baseColor),
                    style: TextStyle(
                        color: baseColor, fontSize: 13.5, height: 1.4),
                  ),
                ),
              ),
            ],
          ),
        ));
        continue;
      }
      children.add(Padding(
        padding: const EdgeInsets.only(bottom: 3),
        child: Text.rich(
          TextSpan(
            children: _inlineSpans(line, baseColor),
            style: TextStyle(color: baseColor, fontSize: 13.5, height: 1.4),
          ),
        ),
      ));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }

  static List<InlineSpan> _inlineSpans(String source, Color color) {
    final spans = <InlineSpan>[];
    final expression = RegExp(
      r'(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|_[^_\n]+_)',
    );
    var cursor = 0;
    for (final match in expression.allMatches(source)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: source.substring(cursor, match.start)));
      }
      final token = match.group(0)!;
      if (token.startsWith('**')) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: const TextStyle(fontWeight: FontWeight.w900),
        ));
      } else if (token.startsWith('__')) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: const TextStyle(
            decoration: TextDecoration.underline,
            fontWeight: FontWeight.w700,
          ),
        ));
      } else if (token.startsWith('~~')) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: const TextStyle(decoration: TextDecoration.lineThrough),
        ));
      } else if (token.startsWith('`')) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: TextStyle(
            fontFamily: 'monospace',
            backgroundColor: color.withValues(alpha: 0.10),
          ),
        ));
      } else {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic),
        ));
      }
      cursor = match.end;
    }
    if (cursor < source.length) {
      spans.add(TextSpan(text: source.substring(cursor)));
    }
    return spans;
  }
}

class StudioChatMediaStrip extends StatelessWidget {
  const StudioChatMediaStrip({
    super.key,
    required this.attachments,
    this.emphasizeFirst = false,
  });

  final List<StudioCatalogMedia> attachments;
  final bool emphasizeFirst;

  @override
  Widget build(BuildContext context) {
    final visible = attachments
        .where((item) =>
            item.url?.isNotEmpty == true || item.dataBase64?.isNotEmpty == true)
        .toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    final hero = emphasizeFirst ? visible.first : null;
    final rest =
        emphasizeFirst && visible.length > 1 ? visible.sublist(1) : visible;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (hero != null)
          InkWell(
            onTap: () => _showMedia(context, hero),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 160,
              width: double.infinity,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F5F3),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFDCEBE7)),
              ),
              child: Stack(
                children: [
                  Positioned.fill(child: _mediaPreview(hero)),
                  Positioned(
                    left: 10,
                    right: 10,
                    bottom: 10,
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.52),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              hero.caption?.isNotEmpty == true
                                  ? hero.caption!
                                  : 'Visuel associé',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                        if (visible.length > 1) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0B7F72),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '+${visible.length - 1}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (hero != null && rest.isNotEmpty) const SizedBox(height: 8),
        if (rest.isNotEmpty || hero == null)
          SizedBox(
            height: 104,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: rest.isNotEmpty ? rest.length : visible.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final item = rest.isNotEmpty ? rest[index] : visible[index];
                return InkWell(
                  onTap: () => _showMedia(context, item),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 122,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F5F3),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFDCEBE7)),
                    ),
                    child: _mediaPreview(item),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  static Widget _mediaPreview(StudioCatalogMedia item) {
    if (item.isImage) {
      if (item.dataBase64?.isNotEmpty == true) {
        return Image.memory(
          base64Decode(item.dataBase64!),
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined),
        );
      }
      if (item.url?.isNotEmpty == true) {
        return Image.network(
          item.url!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined),
        );
      }
    }
    final icon = item.isVideo
        ? Icons.play_circle_fill_rounded
        : item.isAudio
            ? Icons.graphic_eq_rounded
            : Icons.description_outlined;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: const Color(0xFF0B7F72), size: 40),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Text(
            item.filename,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10.5),
          ),
        ),
      ],
    );
  }

  static Future<void> _showMedia(
    BuildContext context,
    StudioCatalogMedia media,
  ) {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(media.isVideo
            ? 'Vidéo'
            : media.isAudio
                ? 'Audio'
                : media.isDocument
                    ? 'Document'
                    : 'Photo'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (media.isImage)
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: media.dataBase64?.isNotEmpty == true
                    ? Image.memory(base64Decode(media.dataBase64!),
                        fit: BoxFit.contain)
                    : Image.network(
                        media.url!,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.broken_image_outlined,
                          size: 50,
                        ),
                      ),
              )
            else ...[
              const Icon(
                Icons.play_circle_fill_rounded,
                color: Color(0xFF0B7F72),
                size: 64,
              ),
              const SizedBox(height: 8),
              const Text(
                'Copiez le lien sécurisé pour lire la vidéo dans votre navigateur.',
                textAlign: TextAlign.center,
              ),
            ],
            if (media.url?.isNotEmpty == true) ...[
              const SizedBox(height: 10),
              SelectableText(
                media.url!,
                maxLines: 4,
                style: const TextStyle(fontSize: 10.5),
              ),
            ],
          ],
        ),
        actions: [
          if (media.url?.isNotEmpty == true)
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: media.url!));
                if (context.mounted) Navigator.pop(context);
              },
              icon: const Icon(Icons.copy_rounded),
              label: const Text('Copier le lien'),
            ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }
}

class _CatalogDraft {
  const _CatalogDraft({
    required this.kind,
    required this.name,
    required this.description,
    required this.priceFcfa,
    required this.quantity,
    required this.sku,
    required this.active,
    required this.catalogTitle,
    required this.category,
    required this.duration,
    required this.audience,
    required this.startDate,
    required this.endDate,
    required this.format,
    required this.level,
    required this.unit,
    required this.existingMedia,
    required this.newMedia,
  });

  final String kind;
  final String name;
  final String description;
  final int? priceFcfa;
  final int quantity;
  final String sku;
  final bool active;
  final String catalogTitle;
  final String category;
  final String duration;
  final String audience;
  final DateTime? startDate;
  final DateTime? endDate;
  final String format;
  final String level;
  final String unit;
  final List<StudioCatalogMedia> existingMedia;
  final List<StudioPickedCatalogMedia> newMedia;
}

class _CatalogEditorSheet extends StatefulWidget {
  const _CatalogEditorSheet({
    required this.kind,
    this.initial,
  });

  final String kind;
  final StudioCatalogItem? initial;

  @override
  State<_CatalogEditorSheet> createState() => _CatalogEditorSheetState();
}

class _CatalogEditorSheetState extends State<_CatalogEditorSheet> {
  late String _kind = widget.initial?.kind ?? widget.kind;
  late final _name = TextEditingController(text: widget.initial?.name ?? '');
  late final _description =
      TextEditingController(text: widget.initial?.description ?? '');
  late final _price = TextEditingController(
    text: widget.initial?.priceFcfa?.toString() ?? '',
  );
  late final _quantity = TextEditingController(
    text: widget.initial?.quantity.toString() ?? '0',
  );
  late final _sku = TextEditingController(text: widget.initial?.sku ?? '');
  late final _catalogTitle =
      TextEditingController(text: widget.initial?.catalogTitle ?? '');
  late final _category =
      TextEditingController(text: widget.initial?.category ?? '');
  late final _duration =
      TextEditingController(text: widget.initial?.duration ?? '');
  late final _audience =
      TextEditingController(text: widget.initial?.audience ?? '');
  late String _format = widget.initial?.format ?? '';
  late String _level = widget.initial?.level ?? '';
  late String _unit = widget.initial?.unit ?? '';
  late DateTime? _startDate = widget.initial?.startDate;
  late DateTime? _endDate = widget.initial?.endDate;
  late bool _active = widget.initial?.active ?? true;
  late List<StudioCatalogMedia> _existing = [...?widget.initial?.media];
  final List<StudioPickedCatalogMedia> _picked = [];
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _price.dispose();
    _quantity.dispose();
    _sku.dispose();
    _catalogTitle.dispose();
    _category.dispose();
    _duration.dispose();
    _audience.dispose();
    super.dispose();
  }

  int get _imageCount =>
      _existing.where((item) => item.isImage).length +
      _picked.where((item) => item.isImage).length;

  int get _videoCount =>
      _existing.where((item) => item.isVideo).length +
      _picked.where((item) => item.isVideo).length;

  Future<void> _pickImages() async {
    if (!StudioCatalogMediaPicker.available) {
      setState(() => _error = 'Le sélecteur de fichiers n’est pas installé.');
      return;
    }
    final remaining = 3 - _imageCount;
    if (remaining <= 0) {
      setState(() => _error = 'Trois photos maximum sont autorisées.');
      return;
    }
    final files =
        await StudioCatalogMediaPicker.pickImages(maxFiles: remaining);
    if (!mounted || files.isEmpty) return;
    setState(() {
      _picked.addAll(files);
      _error = null;
    });
  }

  Future<void> _pickVideo() async {
    if (_videoCount >= 1) {
      setState(() => _error = 'Une seule vidéo est autorisée par élément.');
      return;
    }
    final file = await StudioCatalogMediaPicker.pickVideo();
    if (!mounted || file == null) return;
    setState(() {
      _picked.add(file);
      _error = null;
    });
  }

  Future<void> _pickDate({required bool start}) async {
    final current = start ? _startDate : _endDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(DateTime.now().year + 10),
      helpText: start ? 'Date de début' : 'Date de fin',
      cancelText: 'Annuler',
      confirmText: 'Choisir',
    );
    if (!mounted || picked == null) return;
    setState(() {
      if (start) {
        _startDate = picked;
        if (_endDate != null && _endDate!.isBefore(picked)) {
          _endDate = picked;
        }
      } else {
        _endDate = picked;
      }
    });
  }

  String _dateLabel(DateTime? value) {
    if (value == null) return 'Choisir';
    final day = value.day.toString().padLeft(2, '0');
    final month = value.month.toString().padLeft(2, '0');
    return '$day/$month/${value.year}';
  }

  void _submit() {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Donnez un titre à cet élément.');
      return;
    }
    if (_endDate != null &&
        _startDate != null &&
        _endDate!.isBefore(_startDate!)) {
      setState(() => _error = 'La date de fin doit suivre la date de début.');
      return;
    }
    if (_category.text.trim().isEmpty) {
      setState(() => _error = 'Choisissez une catégorie.');
      return;
    }
    Navigator.pop(
      context,
      _CatalogDraft(
        kind: _kind,
        name: name,
        description: _description.text.trim(),
        priceFcfa: int.tryParse(_price.text.replaceAll(RegExp(r'[^0-9]'), '')),
        quantity: int.tryParse(
              _quantity.text.replaceAll(RegExp(r'[^0-9-]'), ''),
            ) ??
            0,
        sku: _sku.text.trim(),
        active: _active,
        catalogTitle: _catalogTitle.text.trim(),
        category: _category.text.trim(),
        duration: _duration.text.trim(),
        audience: _audience.text.trim(),
        startDate: _startDate,
        endDate: _endDate,
        format: _format,
        level: _level,
        unit: _unit,
        existingMedia: _existing,
        newMedia: List<StudioPickedCatalogMedia>.from(_picked),
      ),
    );
  }

  List<String> _withCurrent(List<String> values, String current) {
    final output = <String>[...values];
    final clean = current.trim();
    if (clean.isNotEmpty && !output.contains(clean)) output.insert(0, clean);
    return output;
  }

  List<String> get _categoryOptions {
    switch (_kind) {
      case 'training':
        return _withCurrent(const <String>[
          'Intelligence artificielle',
          'Informatique et numérique',
          'Gestion et entrepreneuriat',
          'Santé',
          'Développement personnel',
          'Langues',
          'Technique et métier',
          'Autre formation',
        ], _category.text);
      case 'presentation':
        return _withCurrent(const <String>[
          'Présentation institutionnelle',
          'Portfolio / Réalisations',
          'Offre de services',
          'Projet',
          'Événement',
          'Témoignage / Démonstration',
          'Autre présentation',
        ], _category.text);
      default:
        return _withCurrent(const <String>[
          'Produit physique',
          'Service',
          'Alimentation',
          'Mode et beauté',
          'Électronique',
          'Maison',
          'Santé et bien-être',
          'Agriculture',
          'Autre produit',
        ], _category.text);
    }
  }

  List<String> get _catalogSuggestions {
    switch (_kind) {
      case 'training':
        return const <String>[
          'Catalogue des formations',
          'Programme annuel',
          'Formations professionnelles',
          'Ateliers et certifications',
        ];
      case 'presentation':
        return const <String>[
          'Présentation générale',
          'Portfolio',
          'Nos réalisations',
          'Nos offres',
        ];
      default:
        return const <String>[
          'Catalogue principal',
          'Produits disponibles',
          'Services',
          'Nouveautés',
          'Promotions',
        ];
    }
  }

  Widget _guidedDropdown({
    required String label,
    required String value,
    required List<String> options,
    required ValueChanged<String> onChanged,
    IconData? icon,
  }) {
    final values = _withCurrent(options, value);
    return DropdownButtonFormField<String>(
      value: value.trim().isEmpty ? null : value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: icon == null ? null : Icon(icon),
        filled: true,
        fillColor: Colors.white,
        border: const OutlineInputBorder(),
      ),
      items: values
          .map((item) => DropdownMenuItem<String>(
                value: item,
                child: Text(item, overflow: TextOverflow.ellipsis),
              ))
          .toList(),
      onChanged: (item) {
        if (item != null) onChanged(item);
      },
    );
  }

  void _prefillDescription() {
    final text = switch (_kind) {
      'training' =>
        'Objectifs :\n• Compétences visées\n• Programme principal\n• Méthode pédagogique\n• Résultat attendu',
      'presentation' =>
        'Cette présentation permet de découvrir notre activité, nos réalisations, nos avantages et les prochaines étapes.',
      _ =>
        'Caractéristiques principales :\n• Avantage 1\n• Avantage 2\n• Modalités de commande ou de livraison',
    };
    setState(() => _description.text = text);
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return FractionallySizedBox(
      heightFactor: 0.96,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: EdgeInsets.only(bottom: bottom),
          child: Column(
            children: [
              _header(
                title: widget.initial == null
                    ? 'Ajouter ${_kindLabel(_kind).toLowerCase()}'
                    : 'Modifier ${_kindLabel(_kind).toLowerCase()}',
                subtitle: 'Médias privés · informations utilisées par l’agent',
                icon: _kindIcon(_kind),
                onClose: () => Navigator.pop(context),
              ),
              if (_error != null)
                Container(
                  width: double.infinity,
                  color: const Color(0xFFFFEDEA),
                  padding: const EdgeInsets.all(10),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Color(0xFF8F2D25)),
                  ),
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    DropdownButtonFormField<String>(
                      value: _kind,
                      decoration: const InputDecoration(
                        labelText: 'Type de catalogue',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                            value: 'product', child: Text('Produit / service')),
                        DropdownMenuItem(
                            value: 'training', child: Text('Formation')),
                        DropdownMenuItem(
                            value: 'presentation', child: Text('Présentation')),
                      ],
                      onChanged: widget.initial == null
                          ? (value) => setState(() => _kind = value ?? _kind)
                          : null,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _catalogTitle,
                      decoration: InputDecoration(
                        labelText: 'Nom du catalogue ou de la collection',
                        filled: true,
                        fillColor: Colors.white,
                        border: const OutlineInputBorder(),
                        suffixIcon: PopupMenuButton<String>(
                          tooltip: 'Suggestions',
                          icon: const Icon(Icons.auto_awesome_outlined),
                          onSelected: (value) {
                            setState(() => _catalogTitle.text = value);
                          },
                          itemBuilder: (_) => _catalogSuggestions
                              .map((value) => PopupMenuItem<String>(
                                    value: value,
                                    child: Text(value),
                                  ))
                              .toList(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        labelText: _kind == 'product'
                            ? 'Nom du produit ou service'
                            : _kind == 'training'
                                ? 'Titre de la formation'
                                : 'Titre de la présentation',
                        hintText: _kind == 'product'
                            ? 'Ex. Consultation premium'
                            : _kind == 'training'
                                ? 'Ex. Initiation à l’intelligence artificielle'
                                : 'Ex. Présentation de notre entreprise',
                        filled: true,
                        fillColor: Colors.white,
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _guidedDropdown(
                      label: 'Catégorie',
                      value: _category.text,
                      options: _categoryOptions,
                      icon: Icons.category_outlined,
                      onChanged: (value) {
                        setState(() => _category.text = value);
                      },
                    ),
                    if (_kind == 'product') ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _price,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly
                              ],
                              decoration: const InputDecoration(
                                labelText: 'Prix FCFA',
                                prefixIcon: Icon(Icons.payments_outlined),
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _quantity,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly
                              ],
                              decoration: const InputDecoration(
                                labelText: 'Stock disponible',
                                prefixIcon: Icon(Icons.inventory_outlined),
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Unité de vente',
                        value: _unit,
                        options: const <String>[
                          'Unité',
                          'Pièce',
                          'Lot',
                          'Kg',
                          'Litre',
                          'Heure',
                          'Jour',
                          'Forfait',
                        ],
                        icon: Icons.straighten_outlined,
                        onChanged: (value) => setState(() => _unit = value),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _sku,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'Référence / SKU',
                          hintText: 'Généré ou fourni par votre catalogue',
                          prefixIcon: Icon(Icons.qr_code_2_outlined),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                    if (_kind == 'training') ...[
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Format de formation',
                        value: _format,
                        options: const <String>[
                          'Présentiel',
                          'En ligne',
                          'Hybride',
                          'Atelier pratique',
                          'Coaching individuel',
                        ],
                        icon: Icons.devices_outlined,
                        onChanged: (value) => setState(() => _format = value),
                      ),
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Niveau',
                        value: _level,
                        options: const <String>[
                          'Débutant',
                          'Intermédiaire',
                          'Avancé',
                          'Tous niveaux',
                        ],
                        icon: Icons.signal_cellular_alt_rounded,
                        onChanged: (value) => setState(() => _level = value),
                      ),
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Durée',
                        value: _duration.text,
                        options: const <String>[
                          '2 heures',
                          'Demi-journée',
                          '1 jour',
                          '2 jours',
                          '3 jours',
                          '1 semaine',
                          '1 mois',
                          'À votre rythme',
                        ],
                        icon: Icons.schedule_outlined,
                        onChanged: (value) {
                          setState(() => _duration.text = value);
                        },
                      ),
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Public cible',
                        value: _audience.text,
                        options: const <String>[
                          'Grand public',
                          'Débutants',
                          'Professionnels',
                          'Entrepreneurs',
                          'Étudiants',
                          'Cadres et dirigeants',
                          'Agents de santé',
                        ],
                        icon: Icons.groups_outlined,
                        onChanged: (value) {
                          setState(() => _audience.text = value);
                        },
                      ),
                    ],
                    if (_kind == 'presentation') ...[
                      const SizedBox(height: 10),
                      _guidedDropdown(
                        label: 'Format de présentation',
                        value: _format,
                        options: const <String>[
                          'Présentation générale',
                          'Portfolio',
                          'Démonstration',
                          'Étude de cas',
                          'Présentation de projet',
                          'Témoignage',
                        ],
                        icon: Icons.slideshow_outlined,
                        onChanged: (value) => setState(() => _format = value),
                      ),
                    ],
                    if (_kind != 'product') ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _pickDate(start: true),
                              icon: const Icon(Icons.calendar_month_outlined),
                              label: Text('Début : ${_dateLabel(_startDate)}'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _pickDate(start: false),
                              icon: const Icon(Icons.event_available_outlined),
                              label: Text('Fin : ${_dateLabel(_endDate)}'),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 10),
                    TextField(
                      controller: _description,
                      minLines: 4,
                      maxLines: 8,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Description détaillée',
                        hintText:
                            'Présentez clairement les bénéfices, le contenu et les modalités.',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: _prefillDescription,
                        icon: const Icon(Icons.auto_fix_high_rounded),
                        label: const Text('Préremplir une structure'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Photos ($_imageCount/3) et vidéo ($_videoCount/1)',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: _pickImages,
                          icon: const Icon(Icons.add_photo_alternate_outlined),
                          label: const Text('Ajouter des photos'),
                        ),
                        if (_kind != 'product')
                          OutlinedButton.icon(
                            onPressed: _pickVideo,
                            icon: const Icon(Icons.video_call_outlined),
                            label: const Text('Ajouter une vidéo'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _MediaEditorGrid(
                      existing: _existing,
                      picked: _picked,
                      onRemoveExisting: (index) {
                        setState(() => _existing.removeAt(index));
                      },
                      onRemovePicked: (index) {
                        setState(() => _picked.removeAt(index));
                      },
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(_kind == 'product'
                          ? 'Produit disponible'
                          : 'Visible par l’agent'),
                      value: _active,
                      onChanged: (value) => setState(() => _active = value),
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        backgroundColor: const Color(0xFF0B7F72),
                      ),
                      icon: const Icon(Icons.save_outlined),
                      label: const Text('Enregistrer'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MediaEditorGrid extends StatelessWidget {
  const _MediaEditorGrid({
    required this.existing,
    required this.picked,
    required this.onRemoveExisting,
    required this.onRemovePicked,
  });

  final List<StudioCatalogMedia> existing;
  final List<StudioPickedCatalogMedia> picked;
  final ValueChanged<int> onRemoveExisting;
  final ValueChanged<int> onRemovePicked;

  @override
  Widget build(BuildContext context) {
    if (existing.isEmpty && picked.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var index = 0; index < existing.length; index++)
          _mediaTile(
            context,
            isVideo: existing[index].isVideo,
            url: existing[index].url,
            label: existing[index].filename,
            onDelete: () => onRemoveExisting(index),
          ),
        for (var index = 0; index < picked.length; index++)
          _mediaTile(
            context,
            isVideo: picked[index].isVideo,
            bytes: picked[index].bytes,
            label: picked[index].name,
            onDelete: () => onRemovePicked(index),
          ),
      ],
    );
  }

  Widget _mediaTile(
    BuildContext context, {
    required bool isVideo,
    required String label,
    required VoidCallback onDelete,
    String? url,
    Uint8List? bytes,
  }) {
    return Stack(
      children: [
        Container(
          width: 105,
          height: 92,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: const Color(0xFFF0F5F3),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFDCEBE7)),
          ),
          child: isVideo
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.play_circle_fill_rounded, size: 34),
                    Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                )
              : bytes != null
                  ? Image.memory(bytes, fit: BoxFit.cover)
                  : url?.isNotEmpty == true
                      ? Image.network(url!, fit: BoxFit.cover)
                      : const Icon(Icons.image_outlined),
        ),
        Positioned(
          right: 2,
          top: 2,
          child: Material(
            color: Colors.black54,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: onDelete,
              customBorder: const CircleBorder(),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.close_rounded, color: Colors.white, size: 17),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CatalogImportRequest {
  const _CatalogImportRequest({
    required this.kind,
    required this.text,
    this.file,
  });

  final String kind;
  final String text;
  final StudioPickedCatalogMedia? file;
}

class _CatalogImportSheet extends StatefulWidget {
  const _CatalogImportSheet({required this.initialKind});

  final String initialKind;

  @override
  State<_CatalogImportSheet> createState() => _CatalogImportSheetState();
}

class _CatalogImportSheetState extends State<_CatalogImportSheet> {
  late String _kind = widget.initialKind;
  final _text = TextEditingController();
  StudioPickedCatalogMedia? _file;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    final file = await StudioCatalogMediaPicker.pickImportFile();
    if (!mounted) return;
    if (file == null) {
      setState(() => _error = 'Fichier non sélectionné ou trop volumineux.');
      return;
    }
    setState(() {
      _file = file;
      _error = null;
    });
  }

  void _submit() {
    if (_text.text.trim().isEmpty && _file == null) {
      setState(() => _error = 'Collez du contenu ou choisissez un fichier.');
      return;
    }
    Navigator.pop(
      context,
      _CatalogImportRequest(
        kind: _kind,
        text: _text.text.trim(),
        file: _file,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          children: [
            _header(
              title: 'Import intelligent',
              subtitle: 'Texte, photo, vidéo, PDF, CSV, JSON ou TXT',
              icon: Icons.auto_fix_high_rounded,
              onClose: () => Navigator.pop(context),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Color(0xFF8F2D25))),
            ],
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _kind,
              decoration: const InputDecoration(
                labelText: 'Contenu à créer',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(
                    value: 'product', child: Text('Produits / services')),
                DropdownMenuItem(value: 'training', child: Text('Formations')),
                DropdownMenuItem(
                    value: 'presentation', child: Text('Présentations')),
              ],
              onChanged: (value) => setState(() => _kind = value ?? _kind),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _text,
              minLines: 5,
              maxLines: 10,
              decoration: const InputDecoration(
                labelText: 'Contenu brut',
                hintText:
                    'Collez les noms, prix, descriptions, durées, publics cibles…',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: StudioCatalogMediaPicker.available ? _pickFile : null,
              icon: const Icon(Icons.attach_file_rounded),
              label: Text(_file == null ? 'Choisir un fichier' : _file!.name),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _submit,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF0B7F72),
              ),
              icon: const Icon(Icons.auto_awesome_rounded),
              label: const Text('Analyser et importer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PartnerSyncSheet extends StatefulWidget {
  const _PartnerSyncSheet({
    required this.products,
    required this.selected,
  });

  final List<StudioPartnerProduct> products;
  final Set<String> selected;

  @override
  State<_PartnerSyncSheet> createState() => _PartnerSyncSheetState();
}

class _PartnerSyncSheetState extends State<_PartnerSyncSheet> {
  late final Set<String> _selected = Set<String>.from(widget.selected);

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.9,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: Column(
          children: [
            _header(
              title: 'Synchronisation Partenaire',
              subtitle: 'Uniquement les produits appartenant à votre compte',
              icon: Icons.sync_rounded,
              onClose: () => Navigator.pop(context),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${widget.products.length} produit(s) détecté(s) · ${_selected.length} sélectionné(s)',
                      style: const TextStyle(
                        color: Color(0xFF667874),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _selected
                        ..clear()
                        ..addAll(widget.products.map((item) => item.id));
                    }),
                    child: const Text('Tout'),
                  ),
                  TextButton(
                    onPressed: () => setState(_selected.clear),
                    child: const Text('Aucun'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: widget.products.length,
                itemBuilder: (context, index) {
                  final product = widget.products[index];
                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: Color(0xFFDCEBE7)),
                    ),
                    child: CheckboxListTile(
                      value: _selected.contains(product.id),
                      activeColor: const Color(0xFF0B7F72),
                      secondary: Container(
                        width: 48,
                        height: 48,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: const Color(0xFFDFF5F0),
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: product.photoUrl?.isNotEmpty == true
                            ? Image.network(
                                product.photoUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.inventory_2_outlined,
                                  color: Color(0xFF0B7F72),
                                ),
                              )
                            : const Icon(
                                Icons.inventory_2_outlined,
                                color: Color(0xFF0B7F72),
                              ),
                      ),
                      title: Text(
                        product.name,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text([
                        if (product.businessName?.isNotEmpty == true)
                          product.businessName!,
                        if (product.category?.isNotEmpty == true)
                          product.category!,
                        if (product.priceMin != null)
                          '${_formatNumber(product.priceMin!)} FCFA',
                      ].join(' · ')),
                      onChanged: (value) {
                        setState(() {
                          if (value == true) {
                            _selected.add(product.id);
                          } else {
                            _selected.remove(product.id);
                          }
                        });
                      },
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: FilledButton.icon(
                onPressed: () =>
                    Navigator.pop(context, Set<String>.from(_selected)),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: const Color(0xFF0B7F72),
                ),
                icon: const Icon(Icons.sync_rounded),
                label: Text('Synchroniser ${_selected.length} produit(s)'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _header({
  required String title,
  required String subtitle,
  required IconData icon,
  required VoidCallback onClose,
}) {
  return Container(
    color: Colors.white,
    padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
    child: Row(
      children: [
        Container(
          width: 43,
          height: 43,
          decoration: BoxDecoration(
            color: const Color(0xFFDFF5F0),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: const Color(0xFF0B7F72)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
              Text(
                subtitle,
                style:
                    const TextStyle(color: Color(0xFF667874), fontSize: 11.5),
              ),
            ],
          ),
        ),
        IconButton(onPressed: onClose, icon: const Icon(Icons.close_rounded)),
      ],
    ),
  );
}

String _kindLabel(String kind) {
  switch (kind) {
    case 'training':
      return 'Formation';
    case 'presentation':
      return 'Présentation';
    default:
      return 'Produit';
  }
}

IconData _kindIcon(String kind) {
  switch (kind) {
    case 'training':
      return Icons.school_outlined;
    case 'presentation':
      return Icons.slideshow_outlined;
    default:
      return Icons.inventory_2_outlined;
  }
}

String _formatNumber(int value) {
  final digits = value.abs().toString();
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) buffer.write(' ');
    buffer.write(digits[index]);
  }
  return value < 0 ? '-$buffer' : buffer.toString();
}

// === WAOUH CHAT UI PREMIUM V1 — UI UNIQUEMENT ===
class StudioPremiumChatBubble extends StatelessWidget {
  const StudioPremiumChatBubble({
    super.key,
    required this.message,
    this.margin = const EdgeInsets.only(bottom: 10),
  });

  final StudioChatMessage message;
  final EdgeInsetsGeometry margin;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final assistantWidth = width < 390 ? .96 : .92;
    final userWidth = width < 390 ? .86 : .78;

    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: width * (message.isUser ? userWidth : assistantWidth),
        ),
        margin: margin,
        padding: EdgeInsets.all(message.isUser ? 12 : 13),
        decoration: BoxDecoration(
          color: message.isUser ? const Color(0xFF0B7F72) : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(22),
            topRight: const Radius.circular(22),
            bottomLeft: Radius.circular(message.isUser ? 22 : 7),
            bottomRight: Radius.circular(message.isUser ? 7 : 22),
          ),
          border: message.isUser
              ? null
              : Border.all(color: const Color(0xFFDCEBE7)),
          boxShadow: message.isUser
              ? const <BoxShadow>[]
              : const <BoxShadow>[
                  BoxShadow(
                    color: Color(0x120B7F72),
                    blurRadius: 16,
                    offset: Offset(0, 7),
                  ),
                ],
        ),
        child: StudioPremiumChatMessageContent(message: message),
      ),
    );
  }
}

class StudioPremiumChatMessageContent extends StatelessWidget {
  const StudioPremiumChatMessageContent({
    super.key,
    required this.message,
  });

  final StudioChatMessage message;

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          StudioProfessionalChatText(
            text: message.content,
            isUser: true,
          ),
          if (message.attachments.isNotEmpty) ...[
            const SizedBox(height: 9),
            StudioChatMediaStrip(attachments: message.attachments),
          ],
        ],
      );
    }

    final response = _StudioPremiumResponse.parse(
      message.content,
      message.attachments,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFE2F4EF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 18,
                color: Color(0xFF0B7F72),
              ),
            ),
            const SizedBox(width: 9),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'WAOUH IA',
                    style: TextStyle(
                      color: Color(0xFF0B7F72),
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    'Réponse intelligente',
                    style: TextStyle(
                      color: Color(0xFF667874),
                      fontSize: 10.5,
                    ),
                  ),
                ],
              ),
            ),
            if (response.cards.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F8F5),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFD5E8E3)),
                ),
                child: Text(
                  '${response.cards.length} résultat${response.cards.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                    color: Color(0xFF0B7F72),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          ],
        ),
        if (response.introduction.trim().isNotEmpty) ...[
          const SizedBox(height: 11),
          StudioProfessionalChatText(
            text: response.introduction,
            isUser: false,
          ),
        ],
        if (response.cards.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Row(
            children: [
              Icon(
                Icons.grid_view_rounded,
                size: 17,
                color: Color(0xFF0B7F72),
              ),
              SizedBox(width: 6),
              Text(
                'Sélection trouvée',
                style: TextStyle(
                  color: Color(0xFF17211F),
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          LayoutBuilder(
            builder: (context, constraints) {
              final twoColumns = constraints.maxWidth >= 600;
              final cardWidth = twoColumns
                  ? (constraints.maxWidth - 10) / 2
                  : constraints.maxWidth;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (var index = 0; index < response.cards.length; index++)
                    SizedBox(
                      width: cardWidth,
                      child: _StudioPremiumArticleCard(
                        card: response.cards[index],
                        index: index,
                        total: response.cards.length,
                      ),
                    ),
                ],
              );
            },
          ),
        ],
        if (response.conclusion.trim().isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: const Color(0xFFF7FAF9),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0xFFE1ECE9)),
            ),
            child: StudioProfessionalChatText(
              text: response.conclusion,
              isUser: false,
            ),
          ),
        ],
      ],
    );
  }
}

class _StudioPremiumArticleCard extends StatelessWidget {
  const _StudioPremiumArticleCard({
    required this.card,
    required this.index,
    required this.total,
  });

  final _StudioPremiumArticle card;
  final int index;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFA),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDCEBE7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildVisual(context),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  card.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF17211F),
                    fontSize: 15,
                    height: 1.22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (card.subtitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    card.subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF667874),
                      fontSize: 11.5,
                      height: 1.3,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                if (card.metadata.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: card.metadata
                        .take(4)
                        .map(
                          (value) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: const Color(0xFFD5E8E3),
                              ),
                            ),
                            child: Text(
                              value,
                              style: const TextStyle(
                                color: Color(0xFF0B7F72),
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
                if (card.body.trim().isNotEmpty) ...[
                  const SizedBox(height: 9),
                  StudioProfessionalChatText(
                    text: card.body,
                    isUser: false,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisual(BuildContext context) {
    final media = card.media;
    return InkWell(
      onTap: media == null
          ? null
          : () => StudioChatMediaStrip._showMedia(context, media),
      child: SizedBox(
        height: 158,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (media != null)
              StudioChatMediaStrip._mediaPreview(media)
            else
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFE2F4EF), Color(0xFFF4FAF8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.photo_outlined,
                  size: 42,
                  color: Color(0xFF6C9F95),
                ),
              ),
            Positioned(
              left: 9,
              top: 9,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xE60B7F72),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${index + 1}/$total',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
            if (media != null)
              Positioned(
                right: 9,
                top: 9,
                child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: const Color(0xD9FFFFFF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    media.isVideo
                        ? Icons.play_arrow_rounded
                        : media.isAudio
                            ? Icons.graphic_eq_rounded
                            : media.isDocument
                                ? Icons.description_outlined
                                : Icons.zoom_out_map_rounded,
                    size: 17,
                    color: const Color(0xFF0B7F72),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StudioPremiumResponse {
  const _StudioPremiumResponse({
    required this.introduction,
    required this.cards,
    required this.conclusion,
  });

  final String introduction;
  final List<_StudioPremiumArticle> cards;
  final String conclusion;

  static _StudioPremiumResponse parse(
    String text,
    List<StudioCatalogMedia> attachments,
  ) {
    final normalized = text.replaceAll('\r\n', '\n').trim();
    if (attachments.isEmpty) {
      return _StudioPremiumResponse(
        introduction: normalized,
        cards: const <_StudioPremiumArticle>[],
        conclusion: '',
      );
    }

    final parsed = _splitSections(normalized);
    final sections = parsed.sections;
    final count = attachments.length > sections.length
        ? attachments.length
        : sections.length;
    final cards = <_StudioPremiumArticle>[];

    for (var index = 0; index < count; index++) {
      final section = index < sections.length ? sections[index] : null;
      final media = index < attachments.length ? attachments[index] : null;
      final mediaTitle = _cleanFilename(
        media?.caption?.trim().isNotEmpty == true
            ? media!.caption!
            : media?.filename ?? '',
      );
      final title = section?.title.trim().isNotEmpty == true
          ? section!.title.trim()
          : mediaTitle.isNotEmpty
              ? mediaTitle
              : 'Article ${index + 1}';
      final detail = _extractDetails(section?.body ?? '');
      cards.add(
        _StudioPremiumArticle(
          title: title,
          subtitle: detail.subtitle,
          body: detail.body,
          metadata: detail.metadata,
          media: media,
        ),
      );
    }

    return _StudioPremiumResponse(
      introduction: parsed.introduction,
      cards: cards,
      conclusion: parsed.conclusion,
    );
  }

  static _StudioParsedSections _splitSections(String source) {
    if (source.trim().isEmpty) {
      return const _StudioParsedSections(
        introduction: '',
        sections: <_StudioRawSection>[],
        conclusion: '',
      );
    }

    final lines = source.split('\n');
    final intro = <String>[];
    final sections = <_StudioRawSection>[];
    var currentTitle = '';
    var currentBody = <String>[];

    final headingPattern = RegExp(r'^#{1,3}\s+(.+)$');
    final numberedPattern = RegExp(r'^\s*\d{1,2}[\.)]\s+(.+)$');
    final entityPattern = RegExp(
      r'^\s*(?:article|produit|service|formation|présentation|presentation|offre|solution)\s*(?:n[°o]?\s*)?\d*\s*[:\-–]\s*(.+)$',
      caseSensitive: false,
    );

    void flush() {
      if (currentTitle.trim().isEmpty &&
          currentBody.join('\n').trim().isEmpty) {
        return;
      }
      sections.add(
        _StudioRawSection(
          title: currentTitle.trim(),
          body: currentBody.join('\n').trim(),
        ),
      );
      currentTitle = '';
      currentBody = <String>[];
    }

    for (final raw in lines) {
      final trimmed = raw.trim();
      final heading = headingPattern.firstMatch(trimmed);
      final numbered = numberedPattern.firstMatch(trimmed);
      final entity = entityPattern.firstMatch(trimmed);
      final title = heading?.group(1) ?? numbered?.group(1) ?? entity?.group(1);

      if (title != null && title.trim().isNotEmpty) {
        if (currentTitle.isNotEmpty || currentBody.isNotEmpty) {
          flush();
        }
        currentTitle = title.trim();
        continue;
      }

      if (sections.isEmpty && currentTitle.isEmpty) {
        intro.add(raw);
      } else {
        currentBody.add(raw);
      }
    }
    flush();

    if (sections.isEmpty) {
      return _StudioParsedSections(
        introduction: source,
        sections: const <_StudioRawSection>[],
        conclusion: '',
      );
    }

    var introduction = intro.join('\n').trim();
    var conclusion = '';
    if (sections.length > 1) {
      final lastTitle = sections.last.title.toLowerCase();
      if (lastTitle.contains('conclusion') ||
          lastTitle.contains('conseil') ||
          lastTitle.contains('recommandation')) {
        final last = sections.removeLast();
        conclusion = '### ${last.title}\n${last.body}'.trim();
      }
    }

    return _StudioParsedSections(
      introduction: introduction,
      sections: sections,
      conclusion: conclusion,
    );
  }

  static _StudioArticleDetails _extractDetails(String body) {
    final lines = body.split('\n');
    final metadata = <String>[];
    final content = <String>[];
    var subtitle = '';
    final metaPattern = RegExp(
      r'^\s*(prix|tarif|catégorie|categorie|type|durée|duree|format|niveau|public|audience|date|lieu|disponibilité|disponibilite|unité|unite)\s*[:\-]\s*(.+)$',
      caseSensitive: false,
    );

    for (final raw in lines) {
      final line = raw.trim();
      final match =
          metaPattern.firstMatch(line.replaceFirst(RegExp(r'^[-•]\s*'), ''));
      if (match != null) {
        final key = match.group(1)!;
        final value = match.group(2)!.trim();
        metadata.add('${_capitalize(key)} : $value');
        continue;
      }
      if (subtitle.isEmpty &&
          line.isNotEmpty &&
          !line.startsWith('-') &&
          line.length <= 95) {
        subtitle = line.replaceAll(RegExp(r'\*+|_+'), '').trim();
        continue;
      }
      content.add(raw);
    }

    return _StudioArticleDetails(
      subtitle: subtitle,
      body: content.join('\n').trim(),
      metadata: metadata,
    );
  }

  static String _cleanFilename(String value) {
    return value
        .replaceAll(RegExp(r'\.[A-Za-z0-9]{2,5}$'), '')
        .replaceAll(RegExp(r'[_\-]+'), ' ')
        .trim();
  }

  static String _capitalize(String value) {
    if (value.isEmpty) return value;
    return '${value[0].toUpperCase()}${value.substring(1)}';
  }
}

class _StudioParsedSections {
  const _StudioParsedSections({
    required this.introduction,
    required this.sections,
    required this.conclusion,
  });

  final String introduction;
  final List<_StudioRawSection> sections;
  final String conclusion;
}

class _StudioRawSection {
  const _StudioRawSection({required this.title, required this.body});
  final String title;
  final String body;
}

class _StudioArticleDetails {
  const _StudioArticleDetails({
    required this.subtitle,
    required this.body,
    required this.metadata,
  });
  final String subtitle;
  final String body;
  final List<String> metadata;
}

class _StudioPremiumArticle {
  const _StudioPremiumArticle({
    required this.title,
    required this.subtitle,
    required this.body,
    required this.metadata,
    required this.media,
  });

  final String title;
  final String subtitle;
  final String body;
  final List<String> metadata;
  final StudioCatalogMedia? media;
}
// === FIN WAOUH CHAT UI PREMIUM V1 ===
