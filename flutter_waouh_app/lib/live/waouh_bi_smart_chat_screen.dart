import 'dart:convert';

import 'package:excel/excel.dart' as xls;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class WaouhBiSmartChatScreen extends StatefulWidget {
  const WaouhBiSmartChatScreen({super.key, this.client, this.supabase});

  final SupabaseClient? client;
  final SupabaseClient? supabase;

  @override
  State<WaouhBiSmartChatScreen> createState() => _WaouhBiSmartChatScreenState();
}

class _WaouhBiSmartChatScreenState extends State<WaouhBiSmartChatScreen> {
  late final SupabaseClient _client =
      widget.client ?? widget.supabase ?? Supabase.instance.client;

  final _nameCtrl = TextEditingController(text: 'Analyse');
  final _dataCtrl = TextEditingController();

  String _sourceType = 'csv_inline';
  bool _loading = true;
  bool _importing = false;
  List<_BiDatasource> _sources = <_BiDatasource>[];

  @override
  void initState() {
    super.initState();
    _loadSources();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _dataCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSources() async {
    setState(() => _loading = true);
    try {
      final data = await _client
          .from('waouh_bi_datasources')
          .select(
            'id,name,source_type,row_count,schema,profile,smart_mapping,created_at',
          )
          .order('created_at', ascending: false)
          .limit(40);
      if (!mounted) return;
      setState(() {
        _sources = (data as List)
            .whereType<Map>()
            .map(
              (item) => _BiDatasource.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList();
      });
    } catch (error) {
      _notice('Sources non chargées. Appliquez la migration BI V8.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.pickFiles(
        allowMultiple: false,
        withData: true,
        type: FileType.custom,
        allowedExtensions: const ['csv', 'txt', 'xlsx'],
      );
      final file = result?.files.single;
      final bytes = file?.bytes;
      if (file == null || bytes == null) return;

      final name = file.name;
      final lower = name.toLowerCase();
      String text;
      String sourceType;

      if (lower.endsWith('.xlsx')) {
        text = _xlsxToCsv(bytes);
        sourceType = 'excel';
      } else {
        text = utf8.decode(bytes, allowMalformed: true);
        sourceType = 'csv_inline';
      }

      setState(() {
        _sourceType = sourceType;
        _nameCtrl.text = name.replaceAll(
          RegExp(r'\.(csv|txt|xlsx)$', caseSensitive: false),
          '',
        );
        _dataCtrl.text = text;
      });

      _notice('Fichier chargé. Appuyez sur “Ouvrir le chat”.');
    } catch (error) {
      _showError('Fichier non importé', '$error');
    }
  }

  String _xlsxToCsv(List<int> bytes) {
    final excel = xls.Excel.decodeBytes(bytes);
    if (excel.tables.isEmpty)
      throw StateError('Le fichier Excel ne contient aucune feuille.');
    final sheetName = excel.tables.keys.first;
    final sheet = excel.tables[sheetName];
    if (sheet == null || sheet.rows.isEmpty)
      throw StateError('La première feuille est vide.');
    return sheet.rows.map((row) {
      return row.map((cell) {
        final value = '${cell?.value ?? ''}'.replaceAll('"', '""');
        return value.contains(';') || value.contains('\n') ? '"$value"' : value;
      }).join(';');
    }).join('\n');
  }

  Future<void> _pasteData() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim();
    if (text == null || text.isEmpty) {
      _notice('Presse-papiers vide.');
      return;
    }
    setState(() {
      _sourceType = 'csv_inline';
      _dataCtrl.text = text;
    });
  }

  Future<void> _importAndOpenChat() async {
    final raw = _dataCtrl.text.trim();
    if (raw.isEmpty) {
      _notice('Importez un fichier ou collez vos données.');
      return;
    }

    setState(() => _importing = true);
    try {
      final response = await _client.functions.invoke(
        'waouh-bi-ingest',
        body: {
          'name':
              _nameCtrl.text.trim().isEmpty ? 'Analyse' : _nameCtrl.text.trim(),
          'source_type': _sourceType,
          'csv_text': raw,
        },
      );
      final result = _asMap(response.data);
      if (result['error'] != null) throw StateError('${result['error']}');

      final source = _BiDatasource.fromJson(_asMap(result['datasource']));
      final suggestions =
          (result['suggestions'] as List?)?.map((item) => '$item').toList() ??
              _suggestions(source);

      if (!mounted) return;
      setState(() {
        _dataCtrl.clear();
        _sources = <_BiDatasource>[
          source,
          ..._sources.where((s) => s.id != source.id),
        ];
      });

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => _BiChatPage(
            client: _client,
            datasource: source,
            initialMessage:
                'Données chargées.\n${source.rowCount} lignes · ${source.schema.length} colonnes.\nCommencez la discussion avec vos données.',
            initialSuggestions: suggestions,
          ),
        ),
      );
      await _loadSources();
    } catch (error) {
      _showError('Import impossible', '$error');
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  void _openSource(_BiDatasource source) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _BiChatPage(
          client: _client,
          datasource: source,
          initialMessage: 'Discussion ouverte avec ${source.name}.',
          initialSuggestions: _suggestions(source),
        ),
      ),
    );
  }

  List<String> _suggestions(_BiDatasource source) {
    final measure =
        '${source.mapping['primary_measure'] ?? source.firstNumber ?? 'montant'}';
    final dim =
        '${source.mapping['product'] ?? source.mapping['location'] ?? source.mapping['category'] ?? source.firstDimension ?? 'categorie'}';
    final location = '${source.mapping['location'] ?? 'ville'}';
    return <String>[
      'La liste des $location',
      'Total de $measure',
      '$measure par $dim',
      source.mapping['date'] == null ? 'Top 10 $dim' : 'Évolution de $measure',
    ];
  }

  void _notice(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  void _showError(String title, String detail) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              color: Color(0xFFC44E4E),
              size: 42,
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF60736D)),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.check_rounded),
              label: const Text('Compris'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF5F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        title: const Text('BI / Analyse'),
        actions: [
          IconButton(
            onPressed: _loadSources,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
        children: [
          _CompactImportCard(
            nameCtrl: _nameCtrl,
            dataCtrl: _dataCtrl,
            sourceType: _sourceType,
            importing: _importing,
            onTypeChanged: (v) => setState(() => _sourceType = v),
            onPickFile: _pickFile,
            onPaste: _pasteData,
            onImport: _importAndOpenChat,
          ),
          const SizedBox(height: 14),
          _NativeCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle('Discussions récentes'),
                const SizedBox(height: 8),
                if (_loading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(18),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (_sources.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Aucune donnée chargée. Importez un CSV ou Excel pour démarrer.',
                    ),
                  )
                else
                  ..._sources.map(
                    (source) => _SourceTile(
                      source: source,
                      onTap: () => _openSource(source),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CompactImportCard extends StatelessWidget {
  const _CompactImportCard({
    required this.nameCtrl,
    required this.dataCtrl,
    required this.sourceType,
    required this.importing,
    required this.onTypeChanged,
    required this.onPickFile,
    required this.onPaste,
    required this.onImport,
  });

  final TextEditingController nameCtrl;
  final TextEditingController dataCtrl;
  final String sourceType;
  final bool importing;
  final ValueChanged<String> onTypeChanged;
  final VoidCallback onPickFile;
  final VoidCallback onPaste;
  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    return _NativeCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.dataset_rounded, color: Color(0xFF075E54)),
              SizedBox(width: 8),
              Text(
                'Charger les données',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: importing ? null : onPickFile,
                  icon: const Icon(Icons.attach_file_rounded),
                  label: const Text('CSV / Excel'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: importing ? null : onPaste,
                  icon: const Icon(Icons.content_paste_rounded),
                  label: const Text('Coller'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Nom',
              prefixIcon: Icon(Icons.title_rounded),
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: sourceType,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Type',
              prefixIcon: Icon(Icons.table_chart_rounded),
            ),
            items: const [
              DropdownMenuItem(
                value: 'csv_inline',
                child: Text('Données collées / CSV'),
              ),
              DropdownMenuItem(value: 'excel', child: Text('Excel .xlsx')),
              DropdownMenuItem(value: 'csv_url', child: Text('URL CSV')),
              DropdownMenuItem(
                value: 'google_sheet',
                child: Text('Google Sheet'),
              ),
              DropdownMenuItem(value: 'json_url', child: Text('URL JSON')),
            ],
            onChanged:
                importing ? null : (v) => v == null ? null : onTypeChanged(v),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: dataCtrl,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: 'Aperçu / données',
              hintText: 'Importez un fichier ou collez un tableau',
              prefixIcon: Icon(Icons.view_column_rounded),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: importing ? null : onImport,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF075E54),
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: importing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.4,
                      ),
                    )
                  : const Icon(Icons.forum_rounded),
              label: Text(importing ? 'Chargement...' : 'Ouvrir le chat'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BiChatPage extends StatefulWidget {
  const _BiChatPage({
    required this.client,
    required this.datasource,
    required this.initialMessage,
    required this.initialSuggestions,
  });

  final SupabaseClient client;
  final _BiDatasource datasource;
  final String initialMessage;
  final List<String> initialSuggestions;

  @override
  State<_BiChatPage> createState() => _BiChatPageState();
}

class _BiChatPageState extends State<_BiChatPage> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_BiMessage> _messages = <_BiMessage>[];
  bool _asking = false;

  @override
  void initState() {
    super.initState();
    _messages.add(
      _BiMessage.assistant(
        text: widget.initialMessage,
        suggestions: widget.initialSuggestions,
      ),
    );
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _ask([String? preset]) async {
    final question = (preset ?? _inputCtrl.text).trim();
    if (question.isEmpty || _asking) return;
    setState(() {
      _asking = true;
      _messages.add(_BiMessage.user(question));
      _inputCtrl.clear();
    });
    _jump();
    try {
      final response = await widget.client.functions.invoke(
        'waouh-bi-query',
        body: {'datasource_id': widget.datasource.id, 'question': question},
      );
      final data = _asMap(response.data);
      if (data['error'] != null) throw StateError('${data['error']}');
      setState(() {
        _messages.add(
          _BiMessage.assistant(
            text: '${data['answer'] ?? 'Analyse terminée.'}',
            chart: data['chart'] is Map ? _asMap(data['chart']) : null,
            table: data['table'] is Map ? _asMap(data['table']) : null,
            insights: (data['insights'] as List?)?.map((i) => '$i').toList() ??
                const <String>[],
            suggestions:
                (data['suggestions'] as List?)?.map((i) => '$i').toList() ??
                    widget.initialSuggestions,
          ),
        );
      });
    } catch (error) {
      setState(() {
        _messages.add(
          _BiMessage.assistant(
            text:
                'Analyse impossible. Vérifiez la connexion ou les fonctions BI.',
            suggestions: widget.initialSuggestions,
          ),
        );
      });
    } finally {
      if (mounted) setState(() => _asking = false);
      _jump();
    }
  }

  void _jump() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent + 280,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF5F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF075E54),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.datasource.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '${widget.datasource.rowCount} lignes',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length + (_asking ? 1 : 0),
              itemBuilder: (context, index) {
                if (_asking && index == _messages.length)
                  return const _TypingBubble();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _MessageBubble(
                    message: _messages[index],
                    onSuggestion: _ask,
                  ),
                );
              },
            ),
          ),
          _InputBar(
            controller: _inputCtrl,
            enabled: !_asking,
            onSend: () => _ask(),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.onSuggestion});

  final _BiMessage message;
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: _min(MediaQuery.sizeOf(context).width * 0.86, 720),
        ),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: user ? const Color(0xFFD9FDD3) : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(user ? 18 : 4),
              bottomRight: Radius.circular(user ? 4 : 18),
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14000000),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!user)
                const Text(
                  'WAOUH BI',
                  style: TextStyle(
                    color: Color(0xFF075E54),
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              if (!user) const SizedBox(height: 5),
              Text(
                message.text,
                style: const TextStyle(fontSize: 15, height: 1.35),
              ),
              if (message.insights.isNotEmpty)
                ...message.insights.take(3).map(
                      (i) => Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('• $i'),
                      ),
                    ),
              if (message.chart != null) ...[
                const SizedBox(height: 10),
                _ChartCard(chart: message.chart!),
              ],
              if (message.table != null) ...[
                const SizedBox(height: 10),
                _TableCard(table: message.table!),
              ],
              if (!user && message.suggestions.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: message.suggestions
                      .take(4)
                      .map(
                        (s) => ActionChip(
                          label: Text(s),
                          onPressed: () => onSuggestion(s),
                        ),
                      )
                      .toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.enabled,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        color: const Color(0xFFEFF5F3),
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
        child: Row(
          children: [
            Expanded(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(26),
                ),
                child: TextField(
                  controller: controller,
                  enabled: enabled,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => enabled ? onSend() : null,
                  decoration: const InputDecoration(
                    hintText: 'Discutez avec vos données...',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 13,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            FloatingActionButton(
              heroTag: 'bi-send',
              mini: true,
              backgroundColor: const Color(0xFF075E54),
              onPressed: enabled ? onSend : null,
              child: const Icon(Icons.send_rounded, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.chart});
  final Map<String, dynamic> chart;

  @override
  Widget build(BuildContext context) {
    final type = '${chart['type'] ?? 'table'}';
    final title = '${chart['title'] ?? 'Analyse'}';
    if (type == 'kpi') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFE7F7F1),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(
              '${chart['value'] ?? 0}',
              style: const TextStyle(
                color: Color(0xFF075E54),
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      );
    }
    final points =
        (chart['points'] is List ? chart['points'] as List : const [])
            .whereType<Map>()
            .map((e) => _Point('${e['name']}', _toDouble(e['value'])))
            .toList();
    if (points.isEmpty) return const SizedBox.shrink();
    final maxValue = points.fold<double>(
      0,
      (m, p) => p.value > m ? p.value : m,
    );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FBFA),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          ...points.take(12).map((p) {
            final ratio =
                maxValue <= 0 ? 0.0 : (p.value / maxValue).clamp(0.0, 1.0);
            return Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          p.name,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12.5),
                        ),
                      ),
                      Text(
                        _fmt(p.value),
                        style: const TextStyle(fontSize: 12.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  LinearProgressIndicator(
                    value: ratio,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(99),
                    backgroundColor: const Color(0xFFE1EFEB),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFF075E54),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _TableCard extends StatelessWidget {
  const _TableCard({required this.table});
  final Map<String, dynamic> table;

  @override
  Widget build(BuildContext context) {
    final columns =
        (table['columns'] is List ? table['columns'] as List : const [])
            .map((e) => '$e')
            .toList();
    final rows = (table['rows'] is List ? table['rows'] as List : const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    if (columns.isEmpty || rows.isEmpty) return const SizedBox.shrink();
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 34,
        dataRowMinHeight: 32,
        dataRowMaxHeight: 44,
        columns: columns.map((c) => DataColumn(label: Text(c))).toList(),
        rows: rows
            .take(25)
            .map(
              (r) => DataRow(
                cells: columns
                    .map((c) => DataCell(Text('${r[c] ?? ''}')))
                    .toList(),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) => const Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: EdgeInsets.all(8),
          child: Text('WAOUH BI analyse...'),
        ),
      );
}

class _NativeCard extends StatelessWidget {
  const _NativeCard({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(
              color: Color(0x10000000),
              blurRadius: 16,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: child,
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
      );
}

class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.source, required this.onTap});
  final _BiDatasource source;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const CircleAvatar(
          backgroundColor: Color(0xFFE1F3EE),
          child: Icon(Icons.dataset_rounded, color: Color(0xFF075E54)),
        ),
        title: Text(
          source.name,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          '${source.rowCount} lignes · ${source.schema.length} colonnes',
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      );
}

class WaouhBiWorkspaceScreen extends WaouhBiSmartChatScreen {
  const WaouhBiWorkspaceScreen({super.key, super.client, super.supabase});
}

class LiveBiAnalyticsScreen extends WaouhBiSmartChatScreen {
  const LiveBiAnalyticsScreen({super.key, super.client, super.supabase});
}

class BiAnalyticsScreen extends WaouhBiSmartChatScreen {
  const BiAnalyticsScreen({super.key, super.client, super.supabase});
}

class _BiDatasource {
  const _BiDatasource({
    required this.id,
    required this.name,
    required this.sourceType,
    required this.rowCount,
    required this.schema,
    required this.profile,
    required this.mapping,
  });
  final String id;
  final String name;
  final String sourceType;
  final int rowCount;
  final List<_ColumnInfo> schema;
  final Map<String, dynamic> profile;
  final Map<String, dynamic> mapping;
  String? get firstNumber =>
      schema.where((c) => c.type == 'number').map((c) => c.name).firstOrNull;
  String? get firstDimension =>
      schema.where((c) => c.type != 'number').map((c) => c.name).firstOrNull;
  factory _BiDatasource.fromJson(Map<String, dynamic> json) {
    final profile = _asMap(json['profile']);
    final mapping = _asMap(json['smart_mapping']).isNotEmpty
        ? _asMap(json['smart_mapping'])
        : _asMap(profile['mapping']);
    return _BiDatasource(
      id: '${json['id']}',
      name: '${json['name'] ?? 'Analyse'}',
      sourceType: '${json['source_type'] ?? 'csv'}',
      rowCount: _toInt(json['row_count']),
      schema: (json['schema'] is List ? json['schema'] as List : const [])
          .whereType<Map>()
          .map((i) => _ColumnInfo.fromJson(Map<String, dynamic>.from(i)))
          .toList(),
      profile: profile,
      mapping: mapping,
    );
  }
}

class _ColumnInfo {
  const _ColumnInfo({
    required this.name,
    required this.type,
    required this.role,
  });
  final String name;
  final String type;
  final String role;
  factory _ColumnInfo.fromJson(Map<String, dynamic> json) => _ColumnInfo(
        name: '${json['name']}',
        type: '${json['type'] ?? 'string'}',
        role: '${json['role'] ?? 'text'}',
      );
}

class _BiMessage {
  const _BiMessage({
    required this.role,
    required this.text,
    this.chart,
    this.table,
    this.insights = const <String>[],
    this.suggestions = const <String>[],
  });
  final String role;
  final String text;
  final Map<String, dynamic>? chart;
  final Map<String, dynamic>? table;
  final List<String> insights;
  final List<String> suggestions;
  factory _BiMessage.user(String text) => _BiMessage(role: 'user', text: text);
  factory _BiMessage.assistant({
    required String text,
    Map<String, dynamic>? chart,
    Map<String, dynamic>? table,
    List<String> insights = const <String>[],
    List<String> suggestions = const <String>[],
  }) =>
      _BiMessage(
        role: 'assistant',
        text: text,
        chart: chart,
        table: table,
        insights: insights,
        suggestions: suggestions,
      );
}

class _Point {
  const _Point(this.name, this.value);
  final String name;
  final double value;
}

Map<String, dynamic> _asMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
int _toInt(dynamic value) => value is int
    ? value
    : value is num
        ? value.round()
        : int.tryParse('$value') ?? 0;
double _toDouble(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
double _min(double a, double b) => a < b ? a : b;
String _fmt(double v) =>
    v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(2);

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    return it.moveNext() ? it.current : null;
  }
}
