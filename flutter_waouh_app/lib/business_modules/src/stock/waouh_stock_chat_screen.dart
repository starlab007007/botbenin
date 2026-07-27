import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_stock_models.dart';
import 'waouh_stock_repository.dart';
import 'waouh_stock_source_models.dart';

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
  static const _line = Color(0xFFDDE9E5);

  static const _allKey = '__all__';
  static const _importsKey = '__imports__';
  static const _catalogKey = '__catalog__';

  late final WaouhStockRepository _repository = WaouhStockRepository(
    widget.client,
  );
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_StockChatMessage> _messages = [];

  List<WaouhStockDataSource> _sources = const [];
  String _analysisScope = 'all';
  String? _datasourceId;
  String? _fallbackSourceName;
  bool _loadingSources = true;
  bool _sending = false;

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
    return 'Catalogue + importations';
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
      final hasRequested =
          requestedId != null &&
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
            'Impossible d’analyser « $_contextLabel » : '
            '${_cleanError(error)}',
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
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Waouh Stock IA',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            Text(
              'Analyse : $_contextLabel',
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
            _ScopeSelector(
              loading: _loadingSources,
              selectedKey: _selectedKey,
              sources: _sources,
              enabled: !_sending,
              onChanged: _changeContext,
            ),
            _QuickQuestions(
              values: _quickQuestions,
              enabled: !_sending && !_loadingSources,
              onSelected: _send,
            ),
            Expanded(
              child: _messages.isEmpty && (_sending || _loadingSources)
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(12, 14, 12, 24),
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

class _ScopeSelector extends StatelessWidget {
  const _ScopeSelector({
    required this.loading,
    required this.selectedKey,
    required this.sources,
    required this.enabled,
    required this.onChanged,
  });

  final bool loading;
  final String selectedKey;
  final List<WaouhStockDataSource> sources;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      child: DropdownButtonFormField<String>(
        value: selectedKey,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: 'Données analysées',
          prefixIcon: const Icon(Icons.data_object_rounded),
          filled: true,
          fillColor: const Color(0xFFF3F8F6),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFDDE9E5)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFDDE9E5)),
          ),
        ),
        items: [
          const DropdownMenuItem(
            value: _WaouhStockChatScreenState._allKey,
            child: Text('Catalogue Waouh + toutes les importations'),
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
                  const Icon(Icons.insert_drive_file_outlined, size: 18),
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
                if (value != null) onChanged(value);
              },
      ),
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

  factory _StockChatMessage.user(String text) =>
      _StockChatMessage._(isUser: true, text: text, createdAt: DateTime.now());

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

class _QuickQuestions extends StatelessWidget {
  const _QuickQuestions({
    required this.values,
    required this.enabled,
    required this.onSelected,
  });

  final List<String> values;
  final bool enabled;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      color: Colors.white,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        scrollDirection: Axis.horizontal,
        itemCount: values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) => ActionChip(
          avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
          label: Text(values[index]),
          onPressed: enabled ? () => onSelected(values[index]) : null,
        ),
      ),
    );
  }
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
              MediaQuery.sizeOf(context).width * (message.isUser ? .82 : .94),
        ),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: message.isUser
              ? _green
              : message.isError
              ? const Color(0xFFFFECEC)
              : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(message.isUser ? 18 : 4),
            bottomRight: Radius.circular(message.isUser ? 4 : 18),
          ),
          border: message.isUser ? null : Border.all(color: _line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!message.isUser && !message.isError)
              const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.auto_awesome_rounded, size: 17, color: _green),
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
            if (!message.isUser && !message.isError) const SizedBox(height: 9),
            Text(
              message.text,
              style: TextStyle(
                color: message.isUser ? Colors.white : const Color(0xFF13221E),
                height: 1.42,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (result != null && result.kpis.isNotEmpty) ...[
              const SizedBox(height: 13),
              _KpiWrap(values: result.kpis),
            ],
            if (result != null && result.tableRows.isNotEmpty) ...[
              const SizedBox(height: 13),
              _ResultTable(result: result),
            ],
            if (result != null && result.insights.isNotEmpty) ...[
              const SizedBox(height: 13),
              const Text(
                'Points d’attention',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              ...result.insights.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 5),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(
                          Icons.check_circle_outline_rounded,
                          size: 17,
                          color: _green,
                        ),
                      ),
                      const SizedBox(width: 7),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
              ),
            ],
            if (result != null && result.suggestions.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children: result.suggestions
                    .take(4)
                    .map(
                      (item) => ActionChip(
                        label: Text(item, maxLines: 1),
                        onPressed: () => onSuggestion(item),
                      ),
                    )
                    .toList(),
              ),
            ],
            const SizedBox(height: 7),
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

class _KpiWrap extends StatelessWidget {
  const _KpiWrap({required this.values});

  final Map<String, num> values;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: values.entries
          .map(
            (entry) => Container(
              constraints: const BoxConstraints(minWidth: 90),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F8F5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formatNumber(entry.value),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _humanize(entry.key),
                    style: const TextStyle(fontSize: 10),
                  ),
                ],
              ),
            ),
          )
          .toList(),
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
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFDDE9E5))),
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
                hintText: 'Posez une question sur votre stock…',
                filled: true,
                fillColor: const Color(0xFFF3F8F6),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            tooltip: 'Envoyer',
            onPressed: sending ? null : onSend,
            icon: const Icon(Icons.send_rounded),
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
