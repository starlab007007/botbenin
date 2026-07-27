import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../shared/waouh_business_ui.dart';
import 'waouh_stock_models.dart';
import 'waouh_stock_repository.dart';

class WaouhAgentCatalogScreen extends StatefulWidget {
  const WaouhAgentCatalogScreen({
    super.key,
    required this.client,
    required this.agentId,
  });

  final SupabaseClient client;
  final String agentId;

  @override
  State<WaouhAgentCatalogScreen> createState() =>
      _WaouhAgentCatalogScreenState();
}

class _WaouhAgentCatalogScreenState extends State<WaouhAgentCatalogScreen> {
  late final _AgentCatalogRepository _repository = _AgentCatalogRepository(
    widget.client,
  );
  late final WaouhStockRepository _stockRepository = WaouhStockRepository(
    widget.client,
  );

  List<WaouhStockProduct> _products = const [];
  Set<String> _linked = <String>{};
  Object? _error;
  bool _loading = true;
  bool _importing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final values = await Future.wait<dynamic>([
        _stockRepository.fetchProducts(),
        _repository.linkedProductIds(widget.agentId),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _products = values[0] as List<WaouhStockProduct>;
        _linked = values[1] as Set<String>;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _toggle(WaouhStockProduct product, bool selected) async {
    try {
      if (selected) {
        await _repository.link(widget.agentId, product.id);
      } else {
        await _repository.unlink(widget.agentId, product.id);
      }
      if (!mounted) {
        return;
      }
      setState(() {
        if (selected) {
          _linked.add(product.id);
        } else {
          _linked.remove(product.id);
        }
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _importImage(ImageSource source) async {
    if (_importing) {
      return;
    }

    final image = await ImagePicker().pickImage(
      source: source,
      imageQuality: 82,
      maxWidth: 2048,
    );
    if (image == null) {
      return;
    }

    setState(() {
      _importing = true;
    });

    try {
      final parsed = await _repository.parseImageCatalog(image);
      if (!mounted) {
        return;
      }
      final selected = await showModalBottomSheet<List<_AgentCatalogDraft>>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _ImportedCatalogSheet(values: parsed),
      );
      if (selected == null || selected.isEmpty) {
        return;
      }
      await _repository.saveManualProducts(widget.agentId, selected);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${selected.length} produit(s) ajouté(s) au catalogue Agent IA.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) {
        setState(() {
          _importing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final linkedCount = _linked.length;

    return WaouhBusinessUiScope(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Catalogue Agent'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton.filledTonal(
                tooltip: 'Actualiser',
                onPressed: _loading ? null : _load,
                style: IconButton.styleFrom(
                  foregroundColor: WaouhBusinessColors.jade,
                  backgroundColor: WaouhBusinessColors.jade.withValues(
                    alpha: 0.10,
                  ),
                ),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _importing ? null : () => _showImportChoices(context),
          backgroundColor: WaouhBusinessColors.jade,
          foregroundColor: Colors.white,
          icon: _importing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.document_scanner_outlined),
          label: Text(_importing ? 'Extraction…' : 'Importer'),
        ),
        body: _loading
            ? const _CatalogSkeleton()
            : _error != null
            ? WaouhFailurePanel(error: _error!, onRetry: _load)
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 108),
                  children: [
                    WaouhBusinessPageIntro(
                      title: 'Produits de l’Agent',
                      subtitle: linkedCount == 0
                          ? 'Sélectionnez les produits que l’Agent peut proposer.'
                          : '$linkedCount produit${linkedCount > 1 ? 's' : ''} associé${linkedCount > 1 ? 's' : ''}.',
                      icon: Icons.menu_book_outlined,
                      color: WaouhBusinessColors.jade,
                    ),
                    const SizedBox(height: 22),
                    WaouhIaSectionHeader(
                      title: 'Catalogue partenaire',
                      subtitle: _products.isEmpty
                          ? 'Aucun produit disponible.'
                          : 'Activez seulement les produits utiles à cet Agent.',
                      trailing: _CatalogCounter(value: linkedCount),
                    ),
                    const SizedBox(height: 12),
                    if (_products.isEmpty)
                      const _CatalogEmpty()
                    else
                      ..._products.map(
                        (product) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _CatalogProductCard(
                            product: product,
                            linked: _linked.contains(product.id),
                            onChanged: (value) => _toggle(product, value),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  void _showImportChoices(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => WaouhBusinessUiScope(
        child: SafeArea(
          child: Container(
            decoration: const BoxDecoration(
              color: WaouhBusinessColors.pearl,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: WaouhBusinessColors.line,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Importer un catalogue',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 5),
                const Text(
                  'L’IA extrait les produits de l’image sélectionnée.',
                  style: TextStyle(color: WaouhBusinessColors.muted),
                ),
                const SizedBox(height: 18),
                _ImportChoice(
                  icon: Icons.photo_camera_outlined,
                  title: 'Prendre une photo',
                  subtitle: 'Photographiez un catalogue ou une fiche produit.',
                  onTap: () {
                    Navigator.pop(sheetContext);
                    _importImage(ImageSource.camera);
                  },
                ),
                const SizedBox(height: 10),
                _ImportChoice(
                  icon: Icons.photo_library_outlined,
                  title: 'Choisir une image',
                  subtitle: 'Utilisez une image déjà enregistrée.',
                  onTap: () {
                    Navigator.pop(sheetContext);
                    _importImage(ImageSource.gallery);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CatalogCounter extends StatelessWidget {
  const _CatalogCounter({required this.value});

  final int value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: WaouhBusinessColors.jade.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      '$value associé${value > 1 ? 's' : ''}',
      style: const TextStyle(
        color: WaouhBusinessColors.jade,
        fontSize: 11.5,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _CatalogProductCard extends StatelessWidget {
  const _CatalogProductCard({
    required this.product,
    required this.linked,
    required this.onChanged,
  });

  final WaouhStockProduct product;
  final bool linked;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final statusColor = linked
        ? WaouhBusinessColors.jade
        : WaouhBusinessColors.muted;

    return WaouhBusinessSurface(
      borderColor: linked
          ? WaouhBusinessColors.jade.withValues(alpha: 0.24)
          : WaouhBusinessColors.line,
      onTap: () => onChanged(!linked),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.11),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.inventory_2_outlined, color: statusColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: WaouhBusinessColors.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${product.price == null ? 'Prix non renseigné' : '${product.price} FCFA'}'
                  '${product.stock == null ? '' : ' · ${product.stock} en stock'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: WaouhBusinessColors.muted,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 9),
                Text(
                  linked ? 'Associé à l’Agent' : 'Non associé',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Switch.adaptive(value: linked, onChanged: onChanged),
        ],
      ),
    );
  }
}

class _ImportChoice extends StatelessWidget {
  const _ImportChoice({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => WaouhBusinessSurface(
    onTap: onTap,
    child: Row(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: WaouhBusinessColors.jade.withValues(alpha: 0.11),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Icon(icon, color: WaouhBusinessColors.jade),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(
                  color: WaouhBusinessColors.muted,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
        const Icon(
          Icons.arrow_forward_rounded,
          color: WaouhBusinessColors.jade,
        ),
      ],
    ),
  );
}

class _CatalogEmpty extends StatelessWidget {
  const _CatalogEmpty();

  @override
  Widget build(BuildContext context) => const WaouhEmptyState(
    icon: Icons.inventory_2_outlined,
    title: 'Aucun produit partenaire',
    message: 'Créez votre catalogue produit avant de le relier à un Agent.',
  );
}

class _AgentCatalogDraft {
  const _AgentCatalogDraft({required this.name, this.price, this.description});

  final String name;
  final int? price;
  final String? description;

  factory _AgentCatalogDraft.fromJson(Map<String, dynamic> row) {
    return _AgentCatalogDraft(
      name: '${row['name'] ?? ''}'.trim(),
      price: row['price_fcfa'] is int
          ? row['price_fcfa'] as int
          : int.tryParse('${row['price_fcfa'] ?? ''}'),
      description: '${row['description'] ?? ''}'.trim().isEmpty
          ? null
          : '${row['description']}'.trim(),
    );
  }
}

class _AgentCatalogRepository {
  const _AgentCatalogRepository(this.client);

  final SupabaseClient client;

  String get _userId =>
      client.auth.currentUser?.id ??
      (throw StateError('Connectez-vous avant de gérer le catalogue.'));

  Future<Set<String>> linkedProductIds(String agentId) async {
    final rows = await client
        .from('waouh_ai_agent_partner_products')
        .select('product_id')
        .eq('agent_id', agentId)
        .eq('user_id', _userId);
    return (rows as List)
        .whereType<Map>()
        .map((row) => '${row['product_id'] ?? ''}')
        .where((id) => id.isNotEmpty)
        .toSet();
  }

  Future<void> link(String agentId, String productId) {
    return client.from('waouh_ai_agent_partner_products').insert({
      'agent_id': agentId,
      'product_id': productId,
      'user_id': _userId,
    });
  }

  Future<void> unlink(String agentId, String productId) {
    return client
        .from('waouh_ai_agent_partner_products')
        .delete()
        .eq('agent_id', agentId)
        .eq('product_id', productId)
        .eq('user_id', _userId);
  }

  Future<List<_AgentCatalogDraft>> parseImageCatalog(XFile image) async {
    final bytes = await image.readAsBytes();
    final response = await client.functions.invoke(
      'waouh-agent-parse-catalog',
      body: {
        'mode': 'image',
        'image_base64': base64Encode(bytes),
        'image_mime': image.mimeType ?? 'image/jpeg',
      },
    );
    if (response.data is! Map) {
      throw StateError('Réponse d’extraction invalide.');
    }
    final map = Map<String, dynamic>.from(response.data as Map);
    final error = '${map['error'] ?? ''}'.trim();
    if (error.isNotEmpty) {
      throw StateError(error);
    }
    final values = map['products'];
    if (values is! List) {
      return const [];
    }
    return values
        .whereType<Map>()
        .map(
          (item) =>
              _AgentCatalogDraft.fromJson(Map<String, dynamic>.from(item)),
        )
        .where((item) => item.name.isNotEmpty)
        .toList();
  }

  Future<void> saveManualProducts(
    String agentId,
    List<_AgentCatalogDraft> values,
  ) async {
    if (values.isEmpty) {
      return;
    }
    await client
        .from('waouh_ai_agent_products')
        .insert(
          values
              .asMap()
              .entries
              .map(
                (entry) => {
                  'agent_id': agentId,
                  'user_id': _userId,
                  'name': entry.value.name,
                  'price_fcfa': entry.value.price,
                  'description': entry.value.description,
                  'position': entry.key,
                },
              )
              .toList(),
        );
  }
}

class _ImportedCatalogSheet extends StatefulWidget {
  const _ImportedCatalogSheet({required this.values});

  final List<_AgentCatalogDraft> values;

  @override
  State<_ImportedCatalogSheet> createState() => _ImportedCatalogSheetState();
}

class _ImportedCatalogSheetState extends State<_ImportedCatalogSheet> {
  late final Set<int> _selected = Set<int>.from(
    List<int>.generate(widget.values.length, (index) => index),
  );

  @override
  Widget build(BuildContext context) {
    return WaouhBusinessUiScope(
      child: SafeArea(
        child: Container(
          height: MediaQuery.sizeOf(context).height * 0.74,
          decoration: const BoxDecoration(
            color: WaouhBusinessColors.pearl,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Produits extraits',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 20,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Sélectionnez les produits à ajouter.',
                            style: TextStyle(color: WaouhBusinessColors.muted),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: widget.values.isEmpty
                    ? const Center(
                        child: Text(
                          'Aucun produit lisible dans cette image.',
                          style: TextStyle(color: WaouhBusinessColors.muted),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: widget.values.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, index) {
                          final item = widget.values[index];
                          final selected = _selected.contains(index);
                          return WaouhBusinessSurface(
                            onTap: () {
                              setState(() {
                                if (selected) {
                                  _selected.remove(index);
                                } else {
                                  _selected.add(index);
                                }
                              });
                            },
                            borderColor: selected
                                ? WaouhBusinessColors.jade.withValues(
                                    alpha: 0.24,
                                  )
                                : WaouhBusinessColors.line,
                            child: Row(
                              children: [
                                Checkbox(
                                  value: selected,
                                  onChanged: (value) {
                                    setState(() {
                                      if (value == true) {
                                        _selected.add(index);
                                      } else {
                                        _selected.remove(index);
                                      }
                                    });
                                  },
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        '${item.price == null ? 'Prix non détecté' : '${item.price} FCFA'}'
                                        '${item.description == null ? '' : ' · ${item.description}'}',
                                        style: const TextStyle(
                                          color: WaouhBusinessColors.muted,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(
                      context,
                      _selected.map((index) => widget.values[index]).toList(),
                    ),
                    icon: const Icon(Icons.save_outlined),
                    label: Text('Ajouter ${_selected.length} produit(s)'),
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

class _CatalogSkeleton extends StatelessWidget {
  const _CatalogSkeleton();

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: const [
      _Skeleton(height: 104),
      SizedBox(height: 22),
      _Skeleton(height: 24, width: 170),
      SizedBox(height: 12),
      _Skeleton(height: 104),
      SizedBox(height: 12),
      _Skeleton(height: 104),
    ],
  );
}

class _Skeleton extends StatelessWidget {
  const _Skeleton({required this.height, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: const Color(0xFFEAF0ED),
        borderRadius: BorderRadius.circular(20),
      ),
    ),
  );
}
