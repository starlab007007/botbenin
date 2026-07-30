import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_stock_chat_screen.dart';
import 'waouh_stock_models.dart';
import 'waouh_stock_repository.dart';
import 'waouh_stock_sources_screen.dart';

class WaouhStockDashboardScreen extends StatefulWidget {
  const WaouhStockDashboardScreen({super.key, required this.client});

  final SupabaseClient client;

  @override
  State<WaouhStockDashboardScreen> createState() =>
      _WaouhStockDashboardScreenState();
}

enum _StockFilter { all, healthy, low, outOfStock, untracked }

enum _ProductMenuAction { thresholds, history, reorder }

class _WaouhStockDashboardScreenState extends State<WaouhStockDashboardScreen> {
  static const _green = Color(0xFF076B5D);
  static const _deepGreen = Color(0xFF075E54);
  static const _canvas = Color(0xFFF3F8F6);
  static const _ink = Color(0xFF10211C);
  static const _muted = Color(0xFF6A7672);
  static const _line = Color(0xFFDDE9E5);
  static const _warning = Color(0xFFF1A208);
  static const _danger = Color(0xFFD94C4C);
  static const _info = Color(0xFF317BEA);

  late final WaouhStockRepository _repository =
      WaouhStockRepository(widget.client);
  final _search = TextEditingController();
  List<WaouhStockProduct> _products = const [];
  _StockFilter _filter = _StockFilter.all;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _search.addListener(_refreshFilter);
    _load();
  }

  @override
  void dispose() {
    _search
      ..removeListener(_refreshFilter)
      ..dispose();
    super.dispose();
  }

  void _refreshFilter() => setState(() {});

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final products = await _repository.fetchProducts();
      if (!mounted) return;
      setState(() => _products = products);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<WaouhStockProduct> get _visibleProducts {
    final term = _search.text.trim().toLowerCase();
    return _products.where((product) {
      final searchable = [
        product.name,
        product.category ?? '',
        product.description ?? '',
      ].join(' ').toLowerCase();
      final matchesSearch = term.isEmpty || searchable.contains(term);
      final matchesFilter = switch (_filter) {
        _StockFilter.all => true,
        _StockFilter.healthy => product.state == WaouhStockState.healthy,
        _StockFilter.low => product.state == WaouhStockState.low,
        _StockFilter.outOfStock => product.state == WaouhStockState.outOfStock,
        _StockFilter.untracked => product.state == WaouhStockState.untracked,
      };
      return matchesSearch && matchesFilter;
    }).toList();
  }

  int _count(WaouhStockState state) =>
      _products.where((item) => item.state == state).length;

  Future<void> _openChat() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => WaouhStockChatScreen(client: widget.client),
      ),
    );
  }

  Future<void> _openSources() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => WaouhStockSourcesScreen(client: widget.client),
      ),
    );
  }

  Future<void> _openPartnerProducts() async {
    await context.push('/app/partner/businesses');
    if (mounted) await _load();
  }

  Future<void> _registerMovement(
    WaouhStockProduct product, {
    required bool isEntry,
  }) async {
    final request = await showModalBottomSheet<_MovementRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MovementSheet(product: product, isEntry: isEntry),
    );
    if (request == null) return;

    try {
      await _repository.registerMovement(
        product: product,
        quantity: isEntry ? request.quantity : -request.quantity,
        movementType: isEntry ? 'in' : 'out',
        note: request.note,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isEntry
                ? 'Entrée enregistrée pour ${product.name}.'
                : 'Sortie enregistrée pour ${product.name}.',
          ),
        ),
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      _showError(error);
    }
  }

  Future<void> _updateThresholds(WaouhStockProduct product) async {
    final values = await showModalBottomSheet<_ThresholdRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ThresholdSheet(product: product),
    );
    if (values == null) return;

    try {
      await _repository.updateThresholds(
        product: product,
        minimum: values.minimum,
        target: values.target,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seuils mis à jour.')),
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      _showError(error);
    }
  }

  Future<void> _requestReorder(WaouhStockProduct product) async {
    final suggested = product.target == null
        ? (product.minimum > 0 ? product.minimum * 2 : 1)
        : (product.target! - product.safeStock).clamp(1, 1000000).toInt();
    final request = await showModalBottomSheet<_MovementRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MovementSheet(
        product: product,
        isEntry: true,
        title: 'Demande de réapprovisionnement',
        initialQuantity: suggested,
        actionLabel: 'Créer la demande',
      ),
    );
    if (request == null) return;
    try {
      await _repository.requestReorder(
        product: product,
        quantity: request.quantity,
        note: request.note,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande de réapprovisionnement créée.')),
      );
    } catch (error) {
      if (!mounted) return;
      _showError(error);
    }
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$error'
              .replaceAll('Exception:', '')
              .replaceAll('StateError:', '')
              .trim(),
        ),
        backgroundColor: _danger,
      ),
    );
  }

  void _showAlerts() {
    final alerts = _products
        .where(
          (item) =>
              item.state == WaouhStockState.low ||
              item.state == WaouhStockState.outOfStock,
        )
        .toList();
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (_) => _AlertsSheet(products: alerts),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleProducts;
    final totalUnits =
        _products.fold<int>(0, (sum, item) => sum + item.safeStock);
    final alertCount =
        _count(WaouhStockState.low) + _count(WaouhStockState.outOfStock);

    return Scaffold(
      backgroundColor: _canvas,
      appBar: AppBar(
        backgroundColor: _deepGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Stock WAOUH IA',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            Text(
              'Pilotage intelligent des stocks',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sources de données',
            onPressed: _openSources,
            icon: const Icon(Icons.hub_outlined),
          ),
          IconButton(
            tooltip: 'Alertes stock',
            onPressed: _loading ? null : _showAlerts,
            icon: Badge(
              isLabelVisible: alertCount > 0,
              label: Text('$alertCount'),
              child: const Icon(Icons.notifications_active_outlined),
            ),
          ),
          IconButton(
            tooltip: 'Actualiser',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _FailureState(error: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 120),
                    children: [
                      _HeaderSummary(
                        totalProducts: _products.length,
                        totalUnits: totalUnits,
                        low: _count(WaouhStockState.low),
                        out: _count(WaouhStockState.outOfStock),
                      ),
                      const SizedBox(height: 14),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final horizontal = constraints.maxWidth >= 620;
                          final ai = _AiBanner(onTap: _openChat);
                          final sources = _SourcesBanner(onTap: _openSources);
                          if (horizontal) {
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(child: ai),
                                const SizedBox(width: 12),
                                Expanded(child: sources),
                              ],
                            );
                          }
                          return Column(
                            children: [
                              ai,
                              const SizedBox(height: 10),
                              sources,
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 22),
                      const _SectionTitle(
                        title: 'Catalogue de stock',
                        subtitle:
                            'Recherchez, filtrez et agissez sans quitter la carte.',
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x12075E54),
                              blurRadius: 18,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: TextField(
                          controller: _search,
                          decoration: InputDecoration(
                            hintText: 'Produit, catégorie ou description',
                            prefixIcon: const Icon(Icons.search_rounded),
                            suffixIcon: _search.text.isEmpty
                                ? null
                                : IconButton(
                                    tooltip: 'Effacer',
                                    onPressed: _search.clear,
                                    icon: const Icon(Icons.close_rounded),
                                  ),
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(22),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(22),
                              borderSide: const BorderSide(color: _line),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      _FilterBar(
                        selected: _filter,
                        products: _products,
                        onChanged: (value) => setState(() => _filter = value),
                      ),
                      const SizedBox(height: 14),
                      if (visible.isEmpty)
                        _EmptyProducts(
                          filtered: _products.isNotEmpty,
                          onAdd: _openPartnerProducts,
                        )
                      else
                        ...visible.map(
                          (product) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _ProductCard(
                              product: product,
                              onEntry: () =>
                                  _registerMovement(product, isEntry: true),
                              onExit: () =>
                                  _registerMovement(product, isEntry: false),
                              onView: () => _showHistory(product),
                              onMenu: (action) {
                                switch (action) {
                                  case _ProductMenuAction.thresholds:
                                    _updateThresholds(product);
                                    break;
                                  case _ProductMenuAction.history:
                                    _showHistory(product);
                                    break;
                                  case _ProductMenuAction.reorder:
                                    _requestReorder(product);
                                    break;
                                }
                              },
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openPartnerProducts,
        backgroundColor: _deepGreen,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Ajouter un produit'),
      ),
    );
  }

  Future<void> _showHistory(WaouhStockProduct product) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _HistorySheet(repository: _repository, product: product),
    );
  }
}

class _HeaderSummary extends StatelessWidget {
  const _HeaderSummary({
    required this.totalProducts,
    required this.totalUnits,
    required this.low,
    required this.out,
  });

  final int totalProducts;
  final int totalUnits;
  final int low;
  final int out;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF064E45), Color(0xFF087466), Color(0xFF0A8B78)],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33075E54),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              CircleAvatar(
                radius: 23,
                backgroundColor: Colors.white24,
                child: Icon(Icons.inventory_2_outlined, color: Colors.white),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Vue intelligente du stock',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Les niveaux critiques et les actions prioritaires en un coup d’œil.',
                      style: TextStyle(color: Colors.white70, height: 1.3),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 760 ? 4 : 2;
              final ratio = constraints.maxWidth < 360 ? 1.18 : 1.45;
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: columns,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: ratio,
                children: [
                  _MetricCard(
                    label: 'Produits',
                    value: '$totalProducts',
                    icon: Icons.inventory_2_outlined,
                    color: Colors.white,
                  ),
                  _MetricCard(
                    label: 'Unités',
                    value:
                        NumberFormat.decimalPattern('fr_FR').format(totalUnits),
                    icon: Icons.widgets_outlined,
                    color: const Color(0xFFBCEFE6),
                  ),
                  _MetricCard(
                    label: 'Stock faible',
                    value: '$low',
                    icon: Icons.warning_amber_rounded,
                    color: const Color(0xFFFFD166),
                  ),
                  _MetricCard(
                    label: 'Ruptures',
                    value: '$out',
                    icon: Icons.remove_shopping_cart_outlined,
                    color: const Color(0xFFFF9B9B),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(.14),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const Spacer(),
              const Icon(Icons.trending_up_rounded,
                  color: Colors.white54, size: 17),
            ],
          ),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 23,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _AiBanner extends StatelessWidget {
  const _AiBanner({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFBFE3DB)),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x14075E54),
                  blurRadius: 18,
                  offset: Offset(0, 8)),
            ],
          ),
          child: const Row(
            children: [
              CircleAvatar(
                radius: 25,
                backgroundColor: Color(0xFFE0F6F1),
                foregroundColor: _WaouhStockDashboardScreenState._green,
                child: Icon(Icons.auto_awesome_rounded),
              ),
              SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Analyser avec Stock IA',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w900)),
                    SizedBox(height: 4),
                    Text(
                        'Synthèse, ruptures, réapprovisionnement et mouvements.',
                        style: TextStyle(
                            color: _WaouhStockDashboardScreenState._muted,
                            fontSize: 12,
                            height: 1.25)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_rounded,
                  color: _WaouhStockDashboardScreenState._green),
            ],
          ),
        ),
      ),
    );
  }
}

class _SourcesBanner extends StatelessWidget {
  const _SourcesBanner({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _WaouhStockDashboardScreenState._line),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x10075E54),
                  blurRadius: 18,
                  offset: Offset(0, 8)),
            ],
          ),
          child: const Row(
            children: [
              CircleAvatar(
                radius: 25,
                backgroundColor: Color(0xFFEAF5F2),
                foregroundColor: _WaouhStockDashboardScreenState._green,
                child: Icon(Icons.hub_outlined),
              ),
              SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Connecter des données',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w900)),
                    SizedBox(height: 4),
                    Text('CSV, Excel, Sheets, PostgreSQL et Supabase.',
                        style: TextStyle(
                            color: _WaouhStockDashboardScreenState._muted,
                            fontSize: 12,
                            height: 1.25)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_rounded,
                  color: _WaouhStockDashboardScreenState._green),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: _WaouhStockDashboardScreenState._ink,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          subtitle,
          style: const TextStyle(color: _WaouhStockDashboardScreenState._muted),
        ),
      ],
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selected,
    required this.products,
    required this.onChanged,
  });

  final _StockFilter selected;
  final List<WaouhStockProduct> products;
  final ValueChanged<_StockFilter> onChanged;

  int count(WaouhStockState state) =>
      products.where((item) => item.state == state).length;

  @override
  Widget build(BuildContext context) {
    final values = <(_StockFilter, String)>[
      (_StockFilter.all, 'Tous ${products.length}'),
      (_StockFilter.healthy, 'En stock ${count(WaouhStockState.healthy)}'),
      (_StockFilter.low, 'Faible ${count(WaouhStockState.low)}'),
      (_StockFilter.outOfStock, 'Rupture ${count(WaouhStockState.outOfStock)}'),
      (
        _StockFilter.untracked,
        'À renseigner ${count(WaouhStockState.untracked)}'
      ),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: values
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(item.$2),
                  selected: selected == item.$1,
                  onSelected: (_) => onChanged(item.$1),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.onEntry,
    required this.onExit,
    required this.onView,
    required this.onMenu,
  });

  final WaouhStockProduct product;
  final VoidCallback onEntry;
  final VoidCallback onExit;
  final VoidCallback onView;
  final ValueChanged<_ProductMenuAction> onMenu;

  Color get _stateColor => switch (product.state) {
        WaouhStockState.healthy => _WaouhStockDashboardScreenState._green,
        WaouhStockState.low => _WaouhStockDashboardScreenState._warning,
        WaouhStockState.outOfStock => _WaouhStockDashboardScreenState._danger,
        WaouhStockState.untracked => _WaouhStockDashboardScreenState._info,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _WaouhStockDashboardScreenState._line),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProductImage(url: product.photoUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            product.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _StateBadge(
                            label: product.state.label, color: _stateColor),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      product.stockLabel,
                      style: const TextStyle(
                        fontSize: 15,
                        color: _WaouhStockDashboardScreenState._muted,
                      ),
                    ),
                    if (product.category != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        product.category!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _WaouhStockDashboardScreenState._green,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF7FAF9),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Row(
              children: [
                _StockValue(
                    label: 'Actuel', value: product.stock?.toString() ?? '—'),
                _divider(),
                _StockValue(label: 'Seuil', value: '${product.minimum}'),
                _divider(),
                _StockValue(
                    label: 'Objectif',
                    value: product.target?.toString() ?? '—'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 360;
              return Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      compact: compact,
                      icon: Icons.add_rounded,
                      label: 'Entrée',
                      color: _WaouhStockDashboardScreenState._green,
                      onPressed: onEntry,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ActionButton(
                      compact: compact,
                      icon: Icons.remove_rounded,
                      label: 'Sortie',
                      color: _WaouhStockDashboardScreenState._danger,
                      onPressed: onExit,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ActionButton(
                      compact: compact,
                      icon: Icons.history_rounded,
                      label: 'Historique',
                      color: _WaouhStockDashboardScreenState._info,
                      onPressed: onView,
                    ),
                  ),
                  PopupMenuButton<_ProductMenuAction>(
                    tooltip: 'Plus d’actions',
                    onSelected: onMenu,
                    itemBuilder: (_) => const [
                      PopupMenuItem(
                        value: _ProductMenuAction.thresholds,
                        child: ListTile(
                          leading: Icon(Icons.tune_rounded),
                          title: Text('Seuils et objectif'),
                        ),
                      ),
                      PopupMenuItem(
                        value: _ProductMenuAction.history,
                        child: ListTile(
                          leading: Icon(Icons.history_rounded),
                          title: Text('Historique'),
                        ),
                      ),
                      PopupMenuItem(
                        value: _ProductMenuAction.reorder,
                        child: ListTile(
                          leading: Icon(Icons.local_shipping_outlined),
                          title: Text('Réapprovisionner'),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
          if (product.updatedAt != null) ...[
            const SizedBox(height: 9),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Mis à jour le ${DateFormat('dd/MM/yyyy à HH:mm').format(product.updatedAt!.toLocal())}',
                style: const TextStyle(
                  fontSize: 11,
                  color: _WaouhStockDashboardScreenState._muted,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _divider() => Container(
        width: 1,
        height: 32,
        color: _WaouhStockDashboardScreenState._line,
      );
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 74,
        height: 74,
        color: const Color(0xFFEAF3F0),
        child: url == null
            ? const Icon(
                Icons.inventory_2_outlined,
                color: _WaouhStockDashboardScreenState._green,
                size: 32,
              )
            : Image.network(
                url!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.inventory_2_outlined,
                  color: _WaouhStockDashboardScreenState._green,
                  size: 32,
                ),
              ),
      ),
    );
  }
}

class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 105),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _StockValue extends StatelessWidget {
  const _StockValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: _WaouhStockDashboardScreenState._muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.compact,
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });

  final bool compact;
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Tooltip(
        message: label,
        child: IconButton.outlined(
          onPressed: onPressed,
          color: color,
          icon: Icon(icon),
        ),
      );
    }
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
      ),
    );
  }
}

class _EmptyProducts extends StatelessWidget {
  const _EmptyProducts({required this.filtered, required this.onAdd});

  final bool filtered;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _WaouhStockDashboardScreenState._line),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            size: 48,
            color: _WaouhStockDashboardScreenState._green,
          ),
          const SizedBox(height: 12),
          Text(
            filtered ? 'Aucun produit ne correspond.' : 'Aucun produit suivi.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            filtered
                ? 'Modifiez votre recherche ou vos filtres.'
                : 'Ajoutez d’abord un produit à votre activité partenaire.',
            textAlign: TextAlign.center,
            style:
                const TextStyle(color: _WaouhStockDashboardScreenState._muted),
          ),
          if (!filtered) ...[
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Ajouter un produit'),
            ),
          ],
        ],
      ),
    );
  }
}

class _FailureState extends StatelessWidget {
  const _FailureState({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded,
                size: 52, color: Colors.redAccent),
            const SizedBox(height: 12),
            const Text(
              'Stock indisponible',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 7),
            Text(
              '$error'.replaceAll('Exception:', '').trim(),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MovementRequest {
  const _MovementRequest({required this.quantity, this.note});

  final int quantity;
  final String? note;
}

class _MovementSheet extends StatefulWidget {
  const _MovementSheet({
    required this.product,
    required this.isEntry,
    this.title,
    this.initialQuantity,
    this.actionLabel,
  });

  final WaouhStockProduct product;
  final bool isEntry;
  final String? title;
  final int? initialQuantity;
  final String? actionLabel;

  @override
  State<_MovementSheet> createState() => _MovementSheetState();
}

class _MovementSheetState extends State<_MovementSheet> {
  late final _quantity = TextEditingController(
    text: widget.initialQuantity?.toString() ?? '',
  );
  final _note = TextEditingController();

  @override
  void dispose() {
    _quantity.dispose();
    _note.dispose();
    super.dispose();
  }

  void _submit() {
    final quantity = int.tryParse(_quantity.text.trim());
    if (quantity == null || quantity <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Saisissez une quantité supérieure à zéro.')),
      );
      return;
    }
    if (!widget.isEntry &&
        widget.product.stock != null &&
        quantity > widget.product.safeStock) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('La quantité dépasse le stock disponible.')),
      );
      return;
    }
    Navigator.pop(
      context,
      _MovementRequest(
        quantity: quantity,
        note: _note.text.trim().isEmpty ? null : _note.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + inset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            widget.title ??
                (widget.isEntry ? 'Entrée de stock' : 'Sortie de stock'),
            style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.product.name} · stock actuel : ${widget.product.stock?.toString() ?? 'non renseigné'}',
            style:
                const TextStyle(color: _WaouhStockDashboardScreenState._muted),
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _quantity,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Quantité',
              prefixIcon: Icon(Icons.numbers_rounded),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Motif ou note',
              prefixIcon: Icon(Icons.notes_rounded),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submit,
              icon: Icon(
                  widget.isEntry ? Icons.add_rounded : Icons.remove_rounded),
              label: Text(
                widget.actionLabel ??
                    (widget.isEntry
                        ? 'Enregistrer l’entrée'
                        : 'Enregistrer la sortie'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ThresholdRequest {
  const _ThresholdRequest({required this.minimum, this.target});

  final int minimum;
  final int? target;
}

class _ThresholdSheet extends StatefulWidget {
  const _ThresholdSheet({required this.product});

  final WaouhStockProduct product;

  @override
  State<_ThresholdSheet> createState() => _ThresholdSheetState();
}

class _ThresholdSheetState extends State<_ThresholdSheet> {
  late final _minimum =
      TextEditingController(text: '${widget.product.minimum}');
  late final _target =
      TextEditingController(text: widget.product.target?.toString() ?? '');

  @override
  void dispose() {
    _minimum.dispose();
    _target.dispose();
    super.dispose();
  }

  void _submit() {
    final minimum = int.tryParse(_minimum.text.trim());
    final target =
        _target.text.trim().isEmpty ? null : int.tryParse(_target.text.trim());
    if (minimum == null || minimum < 0 || (target != null && target < 0)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vérifiez les valeurs saisies.')),
      );
      return;
    }
    Navigator.pop(context, _ThresholdRequest(minimum: minimum, target: target));
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + inset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Seuils et objectif',
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(widget.product.name),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _minimum,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Seuil minimum',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _target,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Objectif',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _submit,
              child: const Text('Enregistrer les seuils'),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistorySheet extends StatefulWidget {
  const _HistorySheet({required this.repository, required this.product});

  final WaouhStockRepository repository;
  final WaouhStockProduct product;

  @override
  State<_HistorySheet> createState() => _HistorySheetState();
}

class _HistorySheetState extends State<_HistorySheet> {
  late Future<List<WaouhStockMovement>> _future = _load();

  Future<List<WaouhStockMovement>> _load() => widget.repository
      .fetchMovements(productId: widget.product.id, limit: 100);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .72,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 8, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Historique · ${widget.product.name}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 19, fontWeight: FontWeight.w900),
                  ),
                ),
                IconButton(
                  onPressed: () => setState(() => _future = _load()),
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<List<WaouhStockMovement>>(
              future: _future,
              builder: (_, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('${snapshot.error}'));
                }
                final values = snapshot.data ?? const [];
                if (values.isEmpty) {
                  return const Center(
                      child: Text('Aucun mouvement enregistré.'));
                }
                return ListView.separated(
                  itemCount: values.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, index) {
                    final item = values[index];
                    final color = item.isEntry
                        ? _WaouhStockDashboardScreenState._green
                        : _WaouhStockDashboardScreenState._danger;
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: color.withOpacity(.10),
                        child: Icon(
                          item.isEntry
                              ? Icons.add_rounded
                              : Icons.remove_rounded,
                          color: color,
                        ),
                      ),
                      title: Text(
                        '${item.quantity > 0 ? '+' : ''}${item.quantity} · solde ${item.balanceAfter}',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${DateFormat('dd/MM/yyyy à HH:mm').format(item.createdAt.toLocal())}'
                        '${item.note == null ? '' : '\n${item.note}'}',
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertsSheet extends StatelessWidget {
  const _AlertsSheet({required this.products});

  final List<WaouhStockProduct> products;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .62,
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(18),
            child: Text(
              'Alertes de stock',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: products.isEmpty
                ? const Center(child: Text('Aucune alerte critique.'))
                : ListView.separated(
                    itemCount: products.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, index) {
                      final product = products[index];
                      final rupture =
                          product.state == WaouhStockState.outOfStock;
                      return ListTile(
                        leading: Icon(
                          rupture
                              ? Icons.remove_shopping_cart_outlined
                              : Icons.warning_amber_rounded,
                          color: rupture
                              ? _WaouhStockDashboardScreenState._danger
                              : _WaouhStockDashboardScreenState._warning,
                        ),
                        title: Text(product.name),
                        subtitle: Text(
                          rupture
                              ? 'Produit en rupture'
                              : 'Stock ${product.safeStock} · seuil ${product.minimum}',
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
