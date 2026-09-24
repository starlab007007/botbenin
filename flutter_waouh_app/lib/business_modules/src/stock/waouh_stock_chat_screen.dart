import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_stock_models.dart';
import 'waouh_stock_repository.dart';
import 'waouh_stock_source_models.dart';
import '../../../shared/waouh_analytics/waouh_analytics_report.dart';

class WaouhStockChatScreen extends StatefulWidget {
  const WaouhStockChatScreen({
    super.key,
    required this.client,
    this.initialDatasourceId,
    this.initialDatasourceName,
  });

  final SupabaseClient client;
  final String? initialDatasourceId;
  final String? initialDatasourceName;

  @override
  State<WaouhStockChatScreen> createState() => _WaouhStockChatScreenState();
}

class _WaouhStockChatScreenState extends State<WaouhStockChatScreen> {
  static const _green = Color(0xFF076B5D);
  static const _deepGreen = Color(0xFF075E54);
  static const _canvas = Color(0xFFF3F8F6);

  static const _allKey = '__all__';
  static const _importsKey = '__imports__';
  static const _catalogKey = '__catalog__';

  late final WaouhStockRepository _repository =
      WaouhStockRepository(widget.client);
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_StockChatMessage> _messages = [];

  List<WaouhStockDataSource> _sources = const [];
  String _analysisScope = 'all';
  String? _datasourceId;
  String? _fallbackSourceName;
  bool _loadingSources = true;
  bool _sending = false;
  bool _showQuickQuestions = true;

  static const _quickQuestions = [
    'Synthèse générale du stock',
    'Produits en rupture',
    'Produits sous le seuil minimum',
    'Que faut-il réapprovisionner ?',
    'Entrées et sorties de la semaine',
    'Stock par catégorie',
  ];

  String get _selectedKey {
    if (_analysisScope == 'source' && _datasourceId != null) {
      return _datasourceId!;
    }
    if (_analysisScope == 'imports') return _importsKey;
    if (_analysisScope == 'catalog') return _catalogKey;
    return _allKey;
  }

  String get _contextLabel {
    if (_analysisScope == 'source') {
      return _sources
              .where((source) => source.id == _datasourceId)
              .map((source) => source.name)
              .firstOrNull ??
          _fallbackSourceName ??
          'Source importée';
    }
    if (_analysisScope == 'imports') return 'Toutes les importations';
    if (_analysisScope == 'catalog') return 'Catalogue Waouh';
    return 'Catalogue Waouh + toutes les importations';
  }

  @override
  void initState() {
    super.initState();
    scheduleMicrotask(_bootstrap);
  }

  Future<void> _bootstrap() async {
    try {
      final sources = await _repository.fetchDataSources();
      if (!mounted) return;
      final requestedId = widget.initialDatasourceId?.trim();
      final hasRequested = requestedId != null &&
          requestedId.isNotEmpty &&
          sources.any((source) => source.id == requestedId);

      setState(() {
        _sources = sources;
        _loadingSources = false;
        if (hasRequested) {
          _analysisScope = 'source';
          _datasourceId = requestedId;
          _fallbackSourceName = widget.initialDatasourceName;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingSources = false;
        final requestedId = widget.initialDatasourceId?.trim();
        if (requestedId != null && requestedId.isNotEmpty) {
          _analysisScope = 'source';
          _datasourceId = requestedId;
          _fallbackSourceName = widget.initialDatasourceName;
        }
      });
    }
    await _send(_quickQuestions.first, silentUser: true);
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _changeContext(String value) async {
    if (_sending) return;
    setState(() {
      if (value == _allKey) {
        _analysisScope = 'all';
        _datasourceId = null;
      } else if (value == _importsKey) {
        _analysisScope = 'imports';
        _datasourceId = null;
      } else if (value == _catalogKey) {
        _analysisScope = 'catalog';
        _datasourceId = null;
      } else {
        _analysisScope = 'source';
        _datasourceId = value;
        _fallbackSourceName = _sources
            .where((source) => source.id == value)
            .map((source) => source.name)
            .firstOrNull;
      }
      _messages.clear();
    });
    await _send(_quickQuestions.first, silentUser: true);
  }

  Future<void> _send(String raw, {bool silentUser = false}) async {
    final question = raw.trim();
    if (question.isEmpty || _sending) return;

    if (!silentUser) {
      _messages.add(_StockChatMessage.user(question));
    }
    setState(() => _sending = true);
    _scrollToEnd();

    try {
      final result = await _repository.askStock(
        question,
        analysisScope: _analysisScope,
        datasourceId: _datasourceId,
      );
      if (!mounted) return;
      setState(() => _messages.add(_StockChatMessage.assistant(result)));
    } catch (error) {
      if (!mounted) return;
      setState(
        () => _messages.add(
          _StockChatMessage.error(
            'Impossible d’analyser « $_contextLabel » : ${_cleanError(error)}',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToEnd();
      }
    }
  }

  void _submit() {
    final value = _input.text;
    _input.clear();
    _send(value);
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _canvas,
      appBar: AppBar(
        backgroundColor: _deepGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Stock WAOUH IA',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            Text(
              'Analyse guidée · $_contextLabel',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Nouvelle analyse',
            onPressed: _sending
                ? null
                : () {
                    setState(() => _messages.clear());
                    _send(_quickQuestions.first, silentUser: true);
                  },
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            _CompactTopPanel(
              loading: _loadingSources,
              selectedKey: _selectedKey,
              sources: _sources,
              enabled: !_sending,
              showQuickQuestions: _showQuickQuestions,
              values: _quickQuestions,
              onChanged: _changeContext,
              onToggleQuestions: () =>
                  setState(() => _showQuickQuestions = !_showQuickQuestions),
              onSelected: _send,
            ),
            Expanded(
              child: _messages.isEmpty && (_sending || _loadingSources)
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 18),
                      itemCount: _messages.length + (_sending ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (_sending && index == _messages.length) {
                          return const _ThinkingBubble();
                        }
                        return _MessageBubble(
                          message: _messages[index],
                          onSuggestion: _send,
                        );
                      },
                    ),
            ),
            _Composer(
              controller: _input,
              sending: _sending || _loadingSources,
              onSend: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

class _CompactTopPanel extends StatelessWidget {
  const _CompactTopPanel({
    required this.loading,
    required this.selectedKey,
    required this.sources,
    required this.enabled,
    required this.showQuickQuestions,
    required this.values,
    required this.onChanged,
    required this.onToggleQuestions,
    required this.onSelected,
  });

  final bool loading;
  final String selectedKey;
  final List<WaouhStockDataSource> sources;
  final bool enabled;
  final bool showQuickQuestions;
  final List<String> values;
  final ValueChanged<String> onChanged;
  final VoidCallback onToggleQuestions;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F7F5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD5E8E3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE4F2EE),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.data_object_rounded,
                    color: Color(0xFF076B5D),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Contexte d’analyse',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF076B5D),
                        ),
                      ),
                      const SizedBox(height: 4),
                      DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedKey,
                          isExpanded: true,
                          borderRadius: BorderRadius.circular(18),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF13221E),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: _WaouhStockChatScreenState._allKey,
                              child: Text(
                                'Catalogue Waouh + toutes les importations',
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const DropdownMenuItem(
                              value: _WaouhStockChatScreenState._importsKey,
                              child: Text('Toutes les importations uniquement'),
                            ),
                            const DropdownMenuItem(
                              value: _WaouhStockChatScreenState._catalogKey,
                              child: Text('Catalogue Waouh uniquement'),
                            ),
                            ...sources.map(
                              (source) => DropdownMenuItem(
                                value: source.id,
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.insert_drive_file_outlined,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        '${source.name} · ${source.rowCount} lignes',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                          onChanged: !enabled || loading
                              ? null
                              : (value) {
                                  if (value != null) {
                                    onChanged(value);
                                  }
                                },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FBFA),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2ECE9)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      size: 16,
                      color: Color(0xFF076B5D),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Questions prêtes',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: onToggleQuestions,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF66736F),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        visualDensity: VisualDensity.compact,
                      ),
                      icon: Icon(
                        showQuickQuestions
                            ? Icons.expand_less_rounded
                            : Icons.expand_more_rounded,
                        size: 18,
                      ),
                      label: Text(showQuickQuestions ? 'Réduire' : 'Afficher'),
                    ),
                  ],
                ),
                AnimatedCrossFade(
                  duration: const Duration(milliseconds: 220),
                  crossFadeState: showQuickQuestions
                      ? CrossFadeState.showFirst
                      : CrossFadeState.showSecond,
                  firstChild: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: SizedBox(
                      height: 44,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemBuilder: (context, index) => _QuickChip(
                          label: values[index],
                          index: index,
                          enabled: enabled && !loading,
                          onTap: () => onSelected(values[index]),
                        ),
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemCount: values.length,
                      ),
                    ),
                  ),
                  secondChild: const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({
    required this.label,
    required this.index,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final int index;
  final bool enabled;
  final VoidCallback onTap;

  IconData _iconFor(int index) => switch (index) {
        0 => Icons.dashboard_customize_outlined,
        1 => Icons.remove_shopping_cart_outlined,
        2 => Icons.warning_amber_rounded,
        3 => Icons.local_shipping_outlined,
        4 => Icons.swap_vert_rounded,
        _ => Icons.category_outlined,
      };

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      onPressed: enabled ? onTap : null,
      backgroundColor: const Color(0xFFFFFFFF),
      disabledColor: const Color(0xFFF2F5F4),
      side: const BorderSide(color: Color(0xFFD5E8E3)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      avatar: Icon(_iconFor(index), size: 16, color: const Color(0xFF076B5D)),
      label: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFF076B5D),
        ),
      ),
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
    );
  }
}

class _StockChatMessage {
  const _StockChatMessage._({
    required this.isUser,
    required this.text,
    required this.createdAt,
    this.result,
    this.isError = false,
  });

  factory _StockChatMessage.user(String text) => _StockChatMessage._(
        isUser: true,
        text: text,
        createdAt: DateTime.now(),
      );

  factory _StockChatMessage.assistant(WaouhStockChatResult result) =>
      _StockChatMessage._(
        isUser: false,
        text: result.answer,
        createdAt: DateTime.now(),
        result: result,
      );

  factory _StockChatMessage.error(String text) => _StockChatMessage._(
        isUser: false,
        text: text,
        createdAt: DateTime.now(),
        isError: true,
      );

  final bool isUser;
  final String text;
  final DateTime createdAt;
  final WaouhStockChatResult? result;
  final bool isError;
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.onSuggestion});

  final _StockChatMessage message;
  final ValueChanged<String> onSuggestion;

  static const _green = Color(0xFF076B5D);
  static const _line = Color(0xFFDDE9E5);
  static const _muted = Color(0xFF66736F);

  @override
  Widget build(BuildContext context) {
    final result = message.result;
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth:
              MediaQuery.sizeOf(context).width * (message.isUser ? .84 : .96),
        ),
        margin: const EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.fromLTRB(14, 14, 14, result == null ? 12 : 14),
        decoration: BoxDecoration(
          color: message.isUser
              ? _green
              : message.isError
                  ? const Color(0xFFFFECEC)
                  : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(22),
            topRight: const Radius.circular(22),
            bottomLeft: Radius.circular(message.isUser ? 22 : 8),
            bottomRight: Radius.circular(message.isUser ? 8 : 22),
          ),
          border: message.isUser ? null : Border.all(color: _line),
          boxShadow: const [
            BoxShadow(
              color: Color(0x12075E54),
              blurRadius: 14,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!message.isUser && !message.isError)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F8F5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFD5E8E3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome_rounded, size: 16, color: _green),
                    SizedBox(width: 6),
                    Text(
                      'Waouh Stock IA',
                      style: TextStyle(
                        color: _green,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            if (!message.isUser && !message.isError) const SizedBox(height: 10),
            Text(
              message.text,
              style: TextStyle(
                color: message.isUser ? Colors.white : const Color(0xFF13221E),
                height: 1.45,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (result != null) ...[
              if (result.executiveSummary.isNotEmpty &&
                  result.executiveSummary != result.summary) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Synthèse exécutive',
                  icon: Icons.summarize_rounded,
                  child: Text(
                    result.executiveSummary,
                    style: const TextStyle(
                        height: 1.42, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
              if (result.charts.isNotEmpty || result.chartSpec.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Graphiques et tendances',
                  icon: Icons.auto_graph_rounded,
                  child: WaouhAnalyticsChartsGrid(
                    charts: result.charts.isNotEmpty
                        ? result.charts
                        : <Map<String, dynamic>>[result.chartSpec],
                    accent: _green,
                  ),
                ),
              ],
              if (result.kpis.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Indicateurs clés',
                  icon: Icons.grid_view_rounded,
                  child: _KpiWrap(values: result.kpis),
                ),
              ],
              if (result.statistics.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Analyse statistique',
                  icon: Icons.functions_rounded,
                  child: _StatisticsGrid(values: result.statistics),
                ),
              ],
              if (result.tableRows.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Données analysées',
                  icon: Icons.table_chart_outlined,
                  child: _ResultTable(result: result),
                ),
              ],
              if (result.insights.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Points d’attention',
                  icon: Icons.tips_and_updates_outlined,
                  child: _BulletList(
                      values: result.insights,
                      icon: Icons.check_circle_outline_rounded),
                ),
              ],
              if (result.recommendations.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Recommandations prioritaires',
                  icon: Icons.task_alt_rounded,
                  child: _BulletList(
                      values: result.recommendations,
                      icon: Icons.arrow_circle_right_outlined),
                ),
              ],
              if (result.suggestions.isNotEmpty) ...[
                const SizedBox(height: 12),
                _PayloadSection(
                  title: 'Approfondir',
                  icon: Icons.bolt_rounded,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: result.suggestions
                        .take(4)
                        .map(
                          (item) => ActionChip(
                            label: Text(item, maxLines: 1),
                            onPressed: () => onSuggestion(item),
                            side: const BorderSide(color: Color(0xFFD5E8E3)),
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              WaouhReportActions(
                data: WaouhAnalyticsReportData(
                  title: 'Rapport Stock WAOUH IA',
                  subtitle: result.summary,
                  executiveSummary: result.executiveSummary,
                  narrative: result.answer,
                  kpis: result.kpis,
                  statistics: result.statistics,
                  recommendations: result.recommendations,
                  insights: result.insights,
                  charts: result.charts.isNotEmpty
                      ? result.charts
                      : result.chartSpec.isNotEmpty
                          ? <Map<String, dynamic>>[result.chartSpec]
                          : const <Map<String, dynamic>>[],
                  columns: result.columns,
                  rows: result.tableRows,
                ),
                accent: _green,
              ),
            ],
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                DateFormat('HH:mm').format(message.createdAt),
                style: TextStyle(
                  fontSize: 10,
                  color: message.isUser ? Colors.white70 : _muted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PayloadSection extends StatelessWidget {
  const _PayloadSection({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFA),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDDE9E5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF076B5D)),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF13221E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _StatisticsGrid extends StatelessWidget {
  const _StatisticsGrid({required this.values});

  final Map<String, dynamic> values;

  @override
  Widget build(BuildContext context) {
    final entries = <MapEntry<String, dynamic>>[];
    void append(String prefix, dynamic value, int depth) {
      if (entries.length >= 24) return;
      if (value is Map && depth < 3) {
        for (final child in value.entries) {
          append(
            prefix.isEmpty ? '${child.key}' : '$prefix · ${child.key}',
            child.value,
            depth + 1,
          );
        }
      } else {
        entries.add(MapEntry(prefix, value));
      }
    }

    for (final entry in values.entries) {
      append(entry.key, entry.value, 0);
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 520 ? 3 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: entries.take(12).length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.7,
          ),
          itemBuilder: (context, index) {
            final entry = entries[index];
            return Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFD5E8E3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _formatStatistic(entry.value),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF075E54),
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _humanize('${entry.key}'),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF66736F),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _BulletList extends StatelessWidget {
  const _BulletList({required this.values, required this.icon});

  final List<String> values;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: values.take(10).map((item) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 7),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(icon, size: 17, color: const Color(0xFF076B5D)),
              ),
              const SizedBox(width: 7),
              Expanded(child: Text(item, style: const TextStyle(height: 1.35))),
            ],
          ),
        );
      }).toList(),
    );
  }
}

String _formatStatistic(dynamic value) {
  if (value is num) return _formatNumber(value);
  if (value is bool) return value ? 'Oui' : 'Non';
  return '$value';
}

class _KpiWrap extends StatelessWidget {
  const _KpiWrap({required this.values});
  final Map<String, num> values;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 520 ? 3 : 2;
        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: columns,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          childAspectRatio: 1.75,
          children: values.entries
              .map(
                (entry) => Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: const Color(0xFFD5E8E3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _formatNumber(entry.value),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: Color(0xFF075E54),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _humanize(entry.key),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF66736F),
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _ResultTable extends StatelessWidget {
  const _ResultTable({required this.result});

  final WaouhStockChatResult result;

  @override
  Widget build(BuildContext context) {
    final columns = result.columns.isNotEmpty
        ? result.columns
        : result.tableRows.first.keys.toList();
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFDDE9E5)),
        borderRadius: BorderRadius.circular(13),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 38,
          dataRowMaxHeight: 58,
          horizontalMargin: 12,
          columnSpacing: 20,
          columns: columns
              .map(
                (column) => DataColumn(
                  label: Text(
                    _humanize(column),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              )
              .toList(),
          rows: result.tableRows
              .take(15)
              .map(
                (row) => DataRow(
                  cells: columns
                      .map(
                        (column) => DataCell(
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 180),
                            child: Text(
                              '${row[column] ?? ''}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _ThinkingBubble extends StatelessWidget {
  const _ThinkingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDDE9E5)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text('Analyse du stock…'),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        10 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFDDE9E5))),
        boxShadow: [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: 'Question sur le stock…',
                prefixIcon: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF076B5D),
                ),
                filled: true,
                fillColor: const Color(0xFFF3F8F6),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: Color(0xFFD5E8E3)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(
                    color: Color(0xFF076B5D),
                    width: 1.4,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 50,
            height: 50,
            child: IconButton.filled(
              tooltip: 'Envoyer',
              onPressed: sending ? null : onSend,
              style: IconButton.styleFrom(
                backgroundColor: const Color(0xFF075E54),
                foregroundColor: Colors.white,
              ),
              icon: sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.arrow_upward_rounded),
            ),
          ),
        ],
      ),
    );
  }
}

String _cleanError(Object error) {
  return '$error'
      .replaceAll('Exception:', '')
      .replaceAll('StateError:', '')
      .trim();
}

String _humanize(String value) {
  final text = value.replaceAll('_', ' ').trim();
  if (text.isEmpty) return text;
  return '${text[0].toUpperCase()}${text.substring(1)}';
}

String _formatNumber(num value) {
  if (value is int || value == value.roundToDouble()) {
    return NumberFormat.decimalPattern('fr_FR').format(value.round());
  }
  return NumberFormat.decimalPattern('fr_FR').format(value);
}
