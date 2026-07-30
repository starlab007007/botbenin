import 'dart:convert';

import 'package:excel/excel.dart' as xls;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../shared/waouh_analytics/waouh_analytics_report.dart';

const _biDeep = Color(0xFF064E45);
const _biTeal = Color(0xFF0B7F72);
const _biMint = Color(0xFFDFF5EF);
const _biSoft = Color(0xFFF3F8F6);
const _biInk = Color(0xFF10231F);
const _biMuted = Color(0xFF63756F);
const _biBorder = Color(0xFFD8E6E1);
const _biGold = Color(0xFFE9B95E);

class WaouhBiSmartChatScreen extends StatefulWidget {
  const WaouhBiSmartChatScreen({
    super.key,
    this.client,
    this.supabase,
  });

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
              'id,name,source_type,row_count,schema,profile,smart_mapping,created_at')
          .order('created_at', ascending: false)
          .limit(40);
      if (!mounted) return;
      setState(() {
        _sources = (data as List)
            .whereType<Map>()
            .map((item) =>
                _BiDatasource.fromJson(Map<String, dynamic>.from(item)))
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
            RegExp(r'\.(csv|txt|xlsx)$', caseSensitive: false), '');
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
          ..._sources.where((s) => s.id != source.id)
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
            const Icon(Icons.cloud_off_rounded,
                color: Color(0xFFC44E4E), size: 42),
            const SizedBox(height: 10),
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(detail,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF60736D))),
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
      backgroundColor: _biSoft,
      appBar: AppBar(
        toolbarHeight: 76,
        elevation: 0,
        backgroundColor: _biDeep,
        foregroundColor: Colors.white,
        titleSpacing: 8,
        title: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.13),
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Colors.white.withOpacity(.18)),
              ),
              child: const Icon(Icons.auto_graph_rounded, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'BI WAOUH AI',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -.3,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Analyse conversationnelle de vos données',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: IconButton(
                tooltip: 'Actualiser',
                onPressed: _loadSources,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: _biTeal,
          onRefresh: _loadSources,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final horizontal = constraints.maxWidth >= 760 ? 24.0 : 14.0;
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(horizontal, 16, horizontal, 28),
                children: [
                  _BiHeroCard(
                    sourceCount: _sources.length,
                    loading: _loading,
                  ),
                  const SizedBox(height: 14),
                  const _BiJourneyCard(),
                  const SizedBox(height: 14),
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
                  const SizedBox(height: 16),
                  _RecentSourcesCard(
                    loading: _loading,
                    sources: _sources,
                    onOpen: _openSource,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _BiHeroCard extends StatelessWidget {
  const _BiHeroCard({required this.sourceCount, required this.loading});

  final int sourceCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [_biDeep, _biTeal],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2A075E54),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -22,
            top: -30,
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(.08),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(.14),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(.2)),
                    ),
                    child: const Icon(Icons.insights_rounded,
                        color: Colors.white, size: 29),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Transformez vos données en décisions',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                            height: 1.14,
                          ),
                        ),
                        SizedBox(height: 5),
                        Text(
                          'Chargez un tableau, puis discutez naturellement avec vos indicateurs.',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13.5,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  const _HeroPill(
                      icon: Icons.file_present_rounded, label: 'CSV & Excel'),
                  const _HeroPill(
                      icon: Icons.forum_rounded, label: 'Chat BI prêt'),
                  _HeroPill(
                    icon: Icons.storage_rounded,
                    label: loading
                        ? 'Synchronisation…'
                        : '$sourceCount source${sourceCount > 1 ? 's' : ''}',
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.13),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: Colors.white.withOpacity(.16)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: Colors.white),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _BiJourneyCard extends StatelessWidget {
  const _BiJourneyCard();

  @override
  Widget build(BuildContext context) {
    return _NativeCard(
      padding: const EdgeInsets.all(15),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 520;
          final steps = const [
            _JourneyStep(
                number: '1',
                icon: Icons.upload_file_rounded,
                title: 'Charger',
                subtitle: 'CSV, Excel ou collage'),
            _JourneyStep(
                number: '2',
                icon: Icons.auto_fix_high_rounded,
                title: 'Préparer',
                subtitle: 'Données reconnues'),
            _JourneyStep(
                number: '3',
                icon: Icons.chat_bubble_rounded,
                title: 'Discuter',
                subtitle: 'Questions et analyses'),
          ];
          if (compact) {
            return Row(
              children: [
                for (var i = 0; i < steps.length; i++) ...[
                  Expanded(child: steps[i]),
                  if (i < steps.length - 1)
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 3),
                      child: Icon(Icons.chevron_right_rounded,
                          size: 18, color: _biBorder),
                    ),
                ],
              ],
            );
          }
          return Row(
            children: [
              for (var i = 0; i < steps.length; i++) ...[
                Expanded(child: steps[i]),
                if (i < steps.length - 1)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Icon(Icons.arrow_forward_rounded, color: _biBorder),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep(
      {required this.number,
      required this.icon,
      required this.title,
      required this.subtitle});
  final String number;
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _biMint,
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, color: _biTeal, size: 23),
            ),
            Positioned(
              right: -4,
              top: -5,
              child: Container(
                width: 20,
                height: 20,
                alignment: Alignment.center,
                decoration:
                    const BoxDecoration(color: _biDeep, shape: BoxShape.circle),
                child: Text(number,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        Text(title,
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: _biInk, fontWeight: FontWeight.w900, fontSize: 13)),
        const SizedBox(height: 2),
        Text(subtitle,
            maxLines: 2,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            style:
                const TextStyle(color: _biMuted, fontSize: 10.5, height: 1.2)),
      ],
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

  InputDecoration _decoration(
      {required String label, required IconData icon, String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon, color: _biTeal),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: _biBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: _biTeal, width: 1.6),
      ),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _NativeCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SmartSectionHeader(
            number: '1',
            icon: Icons.dataset_rounded,
            title: 'Chargez vos données',
            subtitle: 'Choisissez la méthode la plus rapide pour démarrer.',
          ),
          const SizedBox(height: 15),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = (constraints.maxWidth - 10) / 2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(
                    width: width,
                    child: _ImportActionCard(
                      icon: Icons.upload_file_rounded,
                      title: 'CSV / Excel',
                      subtitle: 'Importer un fichier',
                      onPressed: importing ? null : onPickFile,
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: _ImportActionCard(
                      icon: Icons.content_paste_go_rounded,
                      title: 'Coller',
                      subtitle: 'Depuis le presse-papiers',
                      onPressed: importing ? null : onPaste,
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: nameCtrl,
            decoration: _decoration(
              label: 'Nom de l’analyse',
              hint: 'Ex. Ventes juillet',
              icon: Icons.title_rounded,
            ),
          ),
          const SizedBox(height: 11),
          DropdownButtonFormField<String>(
            initialValue: sourceType,
            isExpanded: true,
            decoration: _decoration(
                label: 'Type de données', icon: Icons.table_chart_rounded),
            items: const [
              DropdownMenuItem(
                  value: 'csv_inline', child: Text('Données collées / CSV')),
              DropdownMenuItem(value: 'excel', child: Text('Excel .xlsx')),
              DropdownMenuItem(value: 'csv_url', child: Text('URL CSV')),
              DropdownMenuItem(
                  value: 'google_sheet', child: Text('Google Sheet')),
              DropdownMenuItem(value: 'json_url', child: Text('URL JSON')),
            ],
            onChanged:
                importing ? null : (v) => v == null ? null : onTypeChanged(v),
          ),
          const SizedBox(height: 11),
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: dataCtrl,
            builder: (context, value, _) {
              final hasData = value.text.trim().isNotEmpty;
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: hasData
                      ? const Color(0xFFF0FBF7)
                      : const Color(0xFFF6F8F7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: hasData ? const Color(0xFFBFE5D9) : _biBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: hasData ? _biMint : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                              hasData
                                  ? Icons.check_circle_rounded
                                  : Icons.preview_rounded,
                              color: hasData ? _biTeal : _biMuted),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  hasData
                                      ? 'Données prêtes'
                                      : 'Aperçu des données',
                                  style: const TextStyle(
                                      color: _biInk,
                                      fontWeight: FontWeight.w900)),
                              const SizedBox(height: 2),
                              Text(
                                  hasData
                                      ? 'Vous pouvez démarrer le chat BI.'
                                      : 'Importez ou collez un tableau.',
                                  style: const TextStyle(
                                      color: _biMuted, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: dataCtrl,
                      minLines: 3,
                      maxLines: 6,
                      decoration: InputDecoration(
                        hintText: 'Les premières lignes apparaîtront ici…',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: const BorderSide(color: _biBorder)),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide:
                                const BorderSide(color: _biTeal, width: 1.4)),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: importing ? null : onImport,
              style: FilledButton.styleFrom(
                backgroundColor: _biDeep,
                foregroundColor: Colors.white,
                disabledBackgroundColor: _biDeep.withOpacity(.55),
                minimumSize: const Size.fromHeight(56),
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(19)),
              ),
              icon: importing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2.4))
                  : const Icon(Icons.chat_bubble_rounded),
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                      importing
                          ? 'Préparation du chat…'
                          : 'Démarrer le chat BI',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w900)),
                  if (!importing) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 19),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _ReadyBadge(icon: Icons.summarize_rounded, label: 'Synthèse'),
              SizedBox(width: 7),
              _ReadyBadge(icon: Icons.bar_chart_rounded, label: 'Graphiques'),
              SizedBox(width: 7),
              _ReadyBadge(icon: Icons.table_rows_rounded, label: 'Tableaux'),
            ],
          ),
        ],
      ),
    );
  }
}

class _SmartSectionHeader extends StatelessWidget {
  const _SmartSectionHeader(
      {required this.number,
      required this.icon,
      required this.title,
      required this.subtitle});
  final String number;
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
              color: _biMint, borderRadius: BorderRadius.circular(15)),
          child: Stack(
            children: [
              Center(child: Icon(icon, color: _biTeal, size: 23)),
              Positioned(
                right: -1,
                top: -1,
                child: Container(
                  width: 18,
                  height: 18,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                      color: _biDeep, shape: BoxShape.circle),
                  child: Text(number,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w900)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: _biInk)),
              const SizedBox(height: 3),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12.5, color: _biMuted, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }
}

class _ImportActionCard extends StatelessWidget {
  const _ImportActionCard(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onPressed});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _biBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                    color: _biMint, borderRadius: BorderRadius.circular(13)),
                child: Icon(icon, color: _biTeal),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: _biInk,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: _biMuted, fontSize: 10.5, height: 1.2)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: _biTeal, size: 19),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReadyBadge extends StatelessWidget {
  const _ReadyBadge({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
            color: _biMint, borderRadius: BorderRadius.circular(99)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: _biTeal),
            const SizedBox(width: 4),
            Flexible(
                child: Text(label,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: _biTeal,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800))),
          ],
        ),
      ),
    );
  }
}

class _RecentSourcesCard extends StatelessWidget {
  const _RecentSourcesCard(
      {required this.loading, required this.sources, required this.onOpen});
  final bool loading;
  final List<_BiDatasource> sources;
  final ValueChanged<_BiDatasource> onOpen;

  @override
  Widget build(BuildContext context) {
    return _NativeCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SmartSectionHeader(
            number: '2',
            icon: Icons.history_rounded,
            title: 'Discussions récentes',
            subtitle: 'Reprenez une analyse en un seul geste.',
          ),
          const SizedBox(height: 14),
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: CircularProgressIndicator(color: _biTeal),
              ),
            )
          else if (sources.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                  color: const Color(0xFFF7F9F8),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _biBorder)),
              child: const Column(
                children: [
                  Icon(Icons.chat_bubble_outline_rounded,
                      color: _biMuted, size: 38),
                  SizedBox(height: 9),
                  Text('Aucune discussion pour le moment',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: _biInk, fontWeight: FontWeight.w900)),
                  SizedBox(height: 4),
                  Text(
                      'Chargez un CSV ou un fichier Excel pour créer votre premier chat BI.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: _biMuted, fontSize: 12.5, height: 1.3)),
                ],
              ),
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final twoColumns = constraints.maxWidth >= 680;
                final itemWidth = twoColumns
                    ? (constraints.maxWidth - 12) / 2
                    : constraints.maxWidth;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    for (final source in sources)
                      SizedBox(
                        width: itemWidth,
                        child: _SourceTile(
                            source: source, onTap: () => onOpen(source)),
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
    _messages.add(_BiMessage.assistant(
        text: widget.initialMessage, suggestions: widget.initialSuggestions));
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
        _messages.add(_BiMessage.assistant(
          text: '${data['answer'] ?? 'Analyse terminée.'}',
          chart: data['chart'] is Map ? _asMap(data['chart']) : null,
          charts: (data['charts'] as List?)
                  ?.whereType<Map>()
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList() ??
              const <Map<String, dynamic>>[],
          table: data['table'] is Map ? _asMap(data['table']) : null,
          insights: (data['insights'] as List?)?.map((i) => '$i').toList() ??
              const <String>[],
          kpis: data['kpis'] is Map
              ? (data['kpis'] as Map).map(
                  (key, value) => MapEntry('$key', _toDouble(value)),
                )
              : const <String, num>{},
          statistics: data['statistics'] is Map
              ? Map<String, dynamic>.from(data['statistics'] as Map)
              : const <String, dynamic>{},
          recommendations: (data['recommendations'] as List?)
                  ?.map((item) => '$item')
                  .where((item) => item.trim().isNotEmpty)
                  .toList() ??
              const <String>[],
          executiveSummary:
              '${data['executive_summary'] ?? data['summary'] ?? ''}'.trim(),
          suggestions:
              (data['suggestions'] as List?)?.map((i) => '$i').toList() ??
                  widget.initialSuggestions,
        ));
      });
    } catch (error) {
      setState(() {
        _messages.add(_BiMessage.assistant(
          text:
              'Analyse impossible. Vérifiez la connexion ou les fonctions BI.',
          suggestions: widget.initialSuggestions,
        ));
      });
    } finally {
      if (mounted) setState(() => _asking = false);
      _jump();
    }
  }

  void _jump() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent + 280,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _biSoft,
      appBar: AppBar(
        toolbarHeight: 74,
        elevation: 0,
        backgroundColor: _biDeep,
        foregroundColor: Colors.white,
        titleSpacing: 2,
        title: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(.13),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.query_stats_rounded, size: 23),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.datasource.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.datasource.rowCount} lignes · ${widget.datasource.schema.length} colonnes',
                    style: const TextStyle(
                        fontSize: 11.5,
                        color: Colors.white70,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          _BiDatasetStrip(datasource: widget.datasource),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 18),
              itemCount: _messages.length + (_asking ? 1 : 0),
              itemBuilder: (context, index) {
                if (_asking && index == _messages.length)
                  return const _TypingBubble();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _MessageBubble(
                    message: _messages[index],
                    onSuggestion: _ask,
                    reportTitle:
                        'Rapport BI WAOUH AI — ${widget.datasource.name}',
                    reportSubtitle:
                        '${widget.datasource.rowCount} lignes · ${widget.datasource.schema.length} colonnes',
                  ),
                );
              },
            ),
          ),
          _InputBar(
              controller: _inputCtrl, enabled: !_asking, onSend: () => _ask()),
        ],
      ),
    );
  }
}

class _BiDatasetStrip extends StatelessWidget {
  const _BiDatasetStrip({required this.datasource});
  final _BiDatasource datasource;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _DatasetChip(
                icon: Icons.table_rows_rounded,
                label: '${datasource.rowCount} lignes'),
            const SizedBox(width: 7),
            _DatasetChip(
                icon: Icons.view_column_rounded,
                label: '${datasource.schema.length} colonnes'),
            const SizedBox(width: 7),
            _DatasetChip(
                icon: Icons.check_circle_rounded,
                label: 'Chat BI prêt',
                highlighted: true),
          ],
        ),
      ),
    );
  }
}

class _DatasetChip extends StatelessWidget {
  const _DatasetChip(
      {required this.icon, required this.label, this.highlighted = false});
  final IconData icon;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: highlighted ? _biMint : const Color(0xFFF5F8F7),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(
            color: highlighted ? const Color(0xFFB9E3D7) : _biBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: highlighted ? _biTeal : _biMuted),
          const SizedBox(width: 5),
          Text(label,
              style: TextStyle(
                  color: highlighted ? _biTeal : _biMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.onSuggestion,
    required this.reportTitle,
    required this.reportSubtitle,
  });

  final _BiMessage message;
  final ValueChanged<String> onSuggestion;
  final String reportTitle;
  final String reportSubtitle;

  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    final maxWidth = _min(MediaQuery.sizeOf(context).width * .9, 760);
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!user) ...[
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                  color: _biDeep, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.auto_graph_rounded,
                  color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
          ],
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth - (user ? 0 : 42)),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: user ? _biDeep : Colors.white,
                border: user ? null : Border.all(color: _biBorder),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(user ? 21 : 7),
                  topRight: const Radius.circular(21),
                  bottomLeft: const Radius.circular(21),
                  bottomRight: Radius.circular(user ? 7 : 21),
                ),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x10000000),
                      blurRadius: 12,
                      offset: Offset(0, 4))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!user) ...[
                    const Row(
                      children: [
                        Text('WAOUH BI',
                            style: TextStyle(
                                color: _biTeal,
                                fontWeight: FontWeight.w900,
                                fontSize: 11.5,
                                letterSpacing: .5)),
                        Spacer(),
                        Icon(Icons.verified_rounded, size: 15, color: _biTeal),
                      ],
                    ),
                    const SizedBox(height: 7),
                  ],
                  Text(
                    message.text,
                    style: TextStyle(
                      color: user ? Colors.white : _biInk,
                      fontSize: 15,
                      height: 1.42,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (!user && message.executiveSummary.isNotEmpty) ...[
                    const SizedBox(height: 11),
                    _ExecutiveSummaryCard(text: message.executiveSummary),
                  ],
                  if (!user &&
                      (message.charts.isNotEmpty || message.chart != null)) ...[
                    const SizedBox(height: 11),
                    WaouhAnalyticsChartsGrid(
                      charts: message.charts.isNotEmpty
                          ? message.charts
                          : <Map<String, dynamic>>[message.chart!],
                      accent: _biTeal,
                    ),
                  ],
                  if (!user && message.kpis.isNotEmpty) ...[
                    const SizedBox(height: 11),
                    _BiKpiGrid(values: message.kpis),
                  ],
                  if (!user && message.statistics.isNotEmpty) ...[
                    const SizedBox(height: 11),
                    _BiStatisticsGrid(values: message.statistics),
                  ],
                  if (message.insights.isNotEmpty) ...[
                    const SizedBox(height: 11),
                    _InsightGrid(insights: message.insights),
                  ],
                  if (!user && message.recommendations.isNotEmpty) ...[
                    const SizedBox(height: 11),
                    _BiRecommendationCard(values: message.recommendations),
                  ],
                  if (message.table != null) ...[
                    const SizedBox(height: 11),
                    _TableCard(table: message.table!),
                  ],
                  if (!user && message.suggestions.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        Icon(Icons.bolt_rounded, size: 17, color: _biGold),
                        SizedBox(width: 5),
                        Text('Questions prêtes',
                            style: TextStyle(
                                color: _biInk,
                                fontSize: 12,
                                fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _ChatSuggestionGrid(
                        suggestions: message.suggestions,
                        onSuggestion: onSuggestion),
                  ],
                  if (!user && message.hasAnalysisPayload) ...[
                    const SizedBox(height: 12),
                    WaouhReportActions(
                      data: WaouhAnalyticsReportData(
                        title: reportTitle,
                        subtitle: reportSubtitle,
                        executiveSummary: message.executiveSummary,
                        narrative: message.text,
                        kpis: message.kpis,
                        statistics: message.statistics,
                        recommendations: message.recommendations,
                        insights: message.insights,
                        charts: message.charts.isNotEmpty
                            ? message.charts
                            : message.chart != null
                                ? <Map<String, dynamic>>[message.chart!]
                                : const <Map<String, dynamic>>[],
                        columns: message.tableColumns,
                        rows: message.tableRows,
                      ),
                      accent: _biTeal,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExecutiveSummaryCard extends StatelessWidget {
  const _ExecutiveSummaryCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE8F8F3), Color(0xFFF8FCFA)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFC7E8DE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.summarize_rounded, size: 17, color: _biTeal),
              SizedBox(width: 6),
              Text(
                'Synthèse exécutive',
                style: TextStyle(
                  color: _biDeep,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          Text(
            text,
            style: const TextStyle(
              color: _biInk,
              fontSize: 12.5,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _BiKpiGrid extends StatelessWidget {
  const _BiKpiGrid({required this.values});

  final Map<String, num> values;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FBFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _biBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.grid_view_rounded, size: 17, color: _biTeal),
              SizedBox(width: 6),
              Text(
                'Indicateurs clés',
                style: TextStyle(
                  color: _biInk,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 520 ? 3 : 2;
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: columns,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1.7,
                children: values.entries.take(12).map((entry) {
                  return Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(color: _biBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _fmt(entry.value.toDouble()),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _biDeep,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _biHumanize(entry.key),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _biMuted,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _BiStatisticsGrid extends StatelessWidget {
  const _BiStatisticsGrid({required this.values});

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
    if (entries.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FBFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _biBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.functions_rounded, size: 17, color: _biTeal),
              SizedBox(width: 6),
              Text(
                'Analyse statistique',
                style: TextStyle(
                  color: _biInk,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          LayoutBuilder(
            builder: (context, constraints) {
              final two = constraints.maxWidth >= 420;
              final width =
                  two ? (constraints.maxWidth - 8) / 2 : constraints.maxWidth;
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: entries.take(12).map((entry) {
                  return SizedBox(
                    width: width,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(color: _biBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _biFormatStatistic(entry.value),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: _biDeep,
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _biHumanize('${entry.key}'),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: _biMuted,
                              fontSize: 10,
                              height: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _BiRecommendationCard extends StatelessWidget {
  const _BiRecommendationCard({required this.values});

  final List<String> values;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFAEF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0DCAC)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.task_alt_rounded, size: 17, color: Color(0xFF9A6A18)),
              SizedBox(width: 6),
              Text(
                'Recommandations prioritaires',
                style: TextStyle(
                  color: _biInk,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...values.take(10).toList().asMap().entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 21,
                    height: 21,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE9B95E),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      '${entry.key + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      entry.value,
                      style: const TextStyle(
                        color: _biInk,
                        fontSize: 12.5,
                        height: 1.35,
                        fontWeight: FontWeight.w600,
                      ),
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

String _biFormatStatistic(dynamic value) {
  if (value is num) return _fmt(value.toDouble());
  if (value is bool) return value ? 'Oui' : 'Non';
  return '$value';
}

String _biHumanize(String value) {
  final text = value.replaceAll('_', ' ').trim();
  if (text.isEmpty) return text;
  return '${text[0].toUpperCase()}${text.substring(1)}';
}

class _InsightGrid extends StatelessWidget {
  const _InsightGrid({required this.insights});
  final List<String> insights;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final two = constraints.maxWidth >= 460;
        final width =
            two ? (constraints.maxWidth - 8) / 2 : constraints.maxWidth;
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final insight in insights.take(4))
              SizedBox(
                width: width,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: const Color(0xFFF4F8F7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _biBorder)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.lightbulb_rounded,
                          color: _biGold, size: 17),
                      const SizedBox(width: 7),
                      Expanded(
                          child: Text(insight,
                              style: const TextStyle(
                                  color: _biInk,
                                  fontSize: 12.5,
                                  height: 1.3,
                                  fontWeight: FontWeight.w600))),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ChatSuggestionGrid extends StatelessWidget {
  const _ChatSuggestionGrid(
      {required this.suggestions, required this.onSuggestion});
  final List<String> suggestions;
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final two = constraints.maxWidth >= 430;
        final width =
            two ? (constraints.maxWidth - 8) / 2 : constraints.maxWidth;
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final suggestion in suggestions.take(4))
              SizedBox(
                width: width,
                child: OutlinedButton(
                  onPressed: () => onSuggestion(suggestion),
                  style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    foregroundColor: _biTeal,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 11, vertical: 11),
                    side: const BorderSide(color: Color(0xFFBFDCD4)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    backgroundColor: const Color(0xFFF7FBFA),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                      const SizedBox(width: 7),
                      Expanded(
                          child: Text(suggestion,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800))),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _InputBar extends StatelessWidget {
  const _InputBar(
      {required this.controller, required this.enabled, required this.onSend});

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: _biBorder)),
          boxShadow: [
            BoxShadow(
                color: Color(0x10000000), blurRadius: 14, offset: Offset(0, -4))
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                    color: const Color(0xFFF4F7F6),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: _biBorder)),
                child: TextField(
                  controller: controller,
                  enabled: enabled,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => enabled ? onSend() : null,
                  decoration: const InputDecoration(
                    hintText: 'Posez une question à vos données…',
                    hintStyle: TextStyle(color: _biMuted, fontSize: 13.5),
                    prefixIcon: Icon(Icons.auto_awesome_rounded,
                        color: _biTeal, size: 20),
                    border: InputBorder.none,
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 8, vertical: 13),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                  color: enabled ? _biDeep : _biMuted.withOpacity(.45),
                  borderRadius: BorderRadius.circular(17)),
              child: IconButton(
                tooltip: 'Envoyer',
                onPressed: enabled ? onSend : null,
                icon:
                    const Icon(Icons.arrow_upward_rounded, color: Colors.white),
              ),
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
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [Color(0xFFE8F8F3), Color(0xFFF6FBF9)]),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFC7E8DE)),
        ),
        child: Row(
          children: [
            Container(
                width: 45,
                height: 45,
                decoration: BoxDecoration(
                    color: _biMint, borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.analytics_rounded, color: _biTeal)),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          color: _biMuted,
                          fontWeight: FontWeight.w800,
                          fontSize: 12)),
                  const SizedBox(height: 3),
                  Text('${chart['value'] ?? 0}',
                      style: const TextStyle(
                          color: _biDeep,
                          fontSize: 27,
                          fontWeight: FontWeight.w900)),
                ],
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
    final maxValue =
        points.fold<double>(0, (m, p) => p.value > m ? p.value : m);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: const Color(0xFFF7FBFA),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _biBorder)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                      color: _biMint, borderRadius: BorderRadius.circular(11)),
                  child: const Icon(Icons.bar_chart_rounded,
                      color: _biTeal, size: 19)),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(title,
                      style: const TextStyle(
                          color: _biInk, fontWeight: FontWeight.w900))),
            ],
          ),
          const SizedBox(height: 12),
          ...points.take(12).map((p) {
            final ratio =
                maxValue <= 0 ? 0.0 : (p.value / maxValue).clamp(0.0, 1.0);
            return Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(p.name,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  color: _biInk,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600))),
                      const SizedBox(width: 8),
                      Text(_fmt(p.value),
                          style: const TextStyle(
                              color: _biDeep,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: ratio,
                    minHeight: 9,
                    borderRadius: BorderRadius.circular(99),
                    backgroundColor: const Color(0xFFE3EFEB),
                    valueColor: const AlwaysStoppedAnimation<Color>(_biTeal),
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
    return Container(
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _biBorder)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(13, 12, 13, 6),
            child: Row(
              children: [
                Icon(Icons.table_view_rounded, color: _biTeal, size: 19),
                SizedBox(width: 7),
                Text('Tableau de résultats',
                    style: TextStyle(
                        color: _biInk,
                        fontWeight: FontWeight.w900,
                        fontSize: 13)),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor: MaterialStatePropertyAll(Color(0xFFF0F7F5)),
              headingRowHeight: 38,
              dataRowMinHeight: 34,
              dataRowMaxHeight: 48,
              columnSpacing: 24,
              columns: columns
                  .map((c) => DataColumn(
                      label: Text(c,
                          style: const TextStyle(
                              color: _biDeep, fontWeight: FontWeight.w900))))
                  .toList(),
              rows: rows
                  .take(25)
                  .map((r) => DataRow(
                      cells: columns
                          .map((c) => DataCell(Text('${r[c] ?? ''}',
                              style: const TextStyle(
                                  color: _biInk, fontSize: 12.5))))
                          .toList()))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                  color: _biDeep, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.auto_graph_rounded,
                  color: Colors.white, size: 18)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: _biBorder)),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: _biTeal)),
                SizedBox(width: 9),
                Text('WAOUH BI analyse vos données…',
                    style: TextStyle(
                        color: _biMuted,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NativeCard extends StatelessWidget {
  const _NativeCard(
      {required this.child, this.padding = const EdgeInsets.all(14)});
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: const Color(0xFFE4ECE9)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x0D000000), blurRadius: 20, offset: Offset(0, 8))
        ],
      ),
      child: child,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontWeight: FontWeight.w900, fontSize: 17, color: _biInk));
}

class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.source, required this.onTap});
  final _BiDatasource source;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FBFA),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _biBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                          color: _biMint,
                          borderRadius: BorderRadius.circular(15)),
                      child: const Icon(Icons.dataset_rounded,
                          color: _biTeal, size: 24)),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(source.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: _biInk,
                                fontWeight: FontWeight.w900,
                                fontSize: 14.5,
                                height: 1.2)),
                        const SizedBox(height: 4),
                        Text(
                            '${source.rowCount} lignes · ${source.schema.length} colonnes',
                            style:
                                const TextStyle(color: _biMuted, fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                        color: _biMint,
                        borderRadius: BorderRadius.circular(99)),
                    child: const Text('PRÊT',
                        style: TextStyle(
                            color: _biTeal,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: .4)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onTap,
                      style: FilledButton.styleFrom(
                          backgroundColor: _biDeep,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          minimumSize: const Size.fromHeight(43),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14))),
                      icon: const Icon(Icons.chat_bubble_rounded, size: 18),
                      label: const Text('Ouvrir Chat BI',
                          style: TextStyle(
                              fontWeight: FontWeight.w900, fontSize: 12.5)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                      width: 43,
                      height: 43,
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: _biBorder)),
                      child: const Icon(Icons.arrow_forward_rounded,
                          color: _biTeal, size: 20)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
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
  const _BiDatasource(
      {required this.id,
      required this.name,
      required this.sourceType,
      required this.rowCount,
      required this.schema,
      required this.profile,
      required this.mapping});
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
        mapping: mapping);
  }
}

class _ColumnInfo {
  const _ColumnInfo(
      {required this.name, required this.type, required this.role});
  final String name;
  final String type;
  final String role;
  factory _ColumnInfo.fromJson(Map<String, dynamic> json) => _ColumnInfo(
      name: '${json['name']}',
      type: '${json['type'] ?? 'string'}',
      role: '${json['role'] ?? 'text'}');
}

class _BiMessage {
  const _BiMessage({
    required this.role,
    required this.text,
    this.chart,
    this.charts = const <Map<String, dynamic>>[],
    this.table,
    this.insights = const <String>[],
    this.kpis = const <String, num>{},
    this.statistics = const <String, dynamic>{},
    this.recommendations = const <String>[],
    this.executiveSummary = '',
    this.suggestions = const <String>[],
  });

  final String role;
  final String text;
  final Map<String, dynamic>? chart;
  final List<Map<String, dynamic>> charts;
  final Map<String, dynamic>? table;
  final List<String> insights;
  final Map<String, num> kpis;
  final Map<String, dynamic> statistics;
  final List<String> recommendations;
  final String executiveSummary;
  final List<String> suggestions;

  bool get hasAnalysisPayload =>
      chart != null ||
      charts.isNotEmpty ||
      table != null ||
      insights.isNotEmpty ||
      kpis.isNotEmpty ||
      statistics.isNotEmpty ||
      recommendations.isNotEmpty;

  List<String> get tableColumns {
    final value = table?['columns'];
    if (value is! List) return const <String>[];
    return value.map((item) => '$item').toList();
  }

  List<Map<String, dynamic>> get tableRows {
    final value = table?['rows'];
    if (value is! List) return const <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  factory _BiMessage.user(String text) => _BiMessage(role: 'user', text: text);

  factory _BiMessage.assistant({
    required String text,
    Map<String, dynamic>? chart,
    List<Map<String, dynamic>> charts = const <Map<String, dynamic>>[],
    Map<String, dynamic>? table,
    List<String> insights = const <String>[],
    Map<String, num> kpis = const <String, num>{},
    Map<String, dynamic> statistics = const <String, dynamic>{},
    List<String> recommendations = const <String>[],
    String executiveSummary = '',
    List<String> suggestions = const <String>[],
  }) =>
      _BiMessage(
        role: 'assistant',
        text: text,
        chart: chart,
        charts: charts,
        table: table,
        insights: insights,
        kpis: kpis,
        statistics: statistics,
        recommendations: recommendations,
        executiveSummary: executiveSummary,
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
