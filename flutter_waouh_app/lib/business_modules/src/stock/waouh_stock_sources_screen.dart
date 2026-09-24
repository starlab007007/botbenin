import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_stock_chat_screen.dart';
import 'waouh_stock_file_parser.dart';
import 'waouh_stock_repository.dart';
import 'waouh_stock_source_models.dart';

class WaouhStockSourcesScreen extends StatefulWidget {
  const WaouhStockSourcesScreen({super.key, required this.client});

  final SupabaseClient client;

  @override
  State<WaouhStockSourcesScreen> createState() =>
      _WaouhStockSourcesScreenState();
}

class _WaouhStockSourcesScreenState extends State<WaouhStockSourcesScreen> {
  static const green = Color(0xFF076B5D);
  static const deepGreen = Color(0xFF075E54);
  static const canvas = Color(0xFFF3F8F6);
  static const line = Color(0xFFDDE9E5);
  static const muted = Color(0xFF66736F);
  static const danger = Color(0xFFD94C4C);

  late final WaouhStockRepository _repository =
      WaouhStockRepository(widget.client);

  List<WaouhStockDataSource> _sources = const [];
  bool _loading = true;
  bool _working = false;
  Object? _error;

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
      final values = await _repository.fetchDataSources();
      if (!mounted) return;
      setState(() => _sources = values);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickFile() async {
    if (_working) return;
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['csv', 'xlsx'],
      withData: true,
      allowMultiple: false,
    );
    if (result == null || result.files.isEmpty) return;

    try {
      setState(() => _working = true);
      final parsed = WaouhStockFileParser.parse(result.files.single);
      if (!mounted) return;
      final mapping = await _openMapping(
        initialName: parsed.name,
        columns: parsed.columns,
        rows: parsed.rows,
        suggested: parsed.suggestedMapping,
      );
      if (mapping == null) return;
      final imported = await _repository.importFileRows(
        sourceName: mapping.sourceName,
        sourceType: parsed.sourceType,
        rows: parsed.rows,
        mapping: mapping.mapping,
      );
      if (!mounted) return;
      await _afterSuccess(imported);
      await _load();
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<_MappingResult?> _openMapping({
    required String initialName,
    required List<String> columns,
    required List<Map<String, dynamic>> rows,
    required Map<String, String?> suggested,
  }) {
    return showModalBottomSheet<_MappingResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MappingSheet(
        initialName: initialName,
        columns: columns,
        rows: rows,
        suggestedMapping: suggested,
      ),
    );
  }

  Future<void> _googleSheet() async {
    final request = await showModalBottomSheet<_RemoteRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _GoogleSheetForm(),
    );
    if (request != null) await _previewAndImport(request);
  }

  Future<void> _database({bool supabaseOnly = false}) async {
    final request = await showModalBottomSheet<_RemoteRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _DatabaseForm(supabaseOnly: supabaseOnly),
    );
    if (request != null) await _previewAndImport(request);
  }

  Future<void> _previewAndImport(_RemoteRequest request) async {
    if (_working) return;
    try {
      setState(() => _working = true);
      final preview = await _repository.previewRemoteSource(
        sourceType: request.sourceType,
        configuration: request.configuration,
        credentials: request.credentials,
      );
      if (!mounted) return;
      final mapping = await _openMapping(
        initialName: request.sourceName,
        columns: preview.columns,
        rows: preview.rows,
        suggested: preview.suggestedMapping,
      );
      if (mapping == null) return;
      final imported = await _repository.importRemoteSource(
        sourceName: mapping.sourceName,
        sourceType: request.sourceType,
        configuration: request.configuration,
        credentials: request.credentials,
        mapping: mapping.mapping,
        rememberConnection: request.rememberConnection,
      );
      if (!mounted) return;
      await _afterSuccess(imported);
      await _load();
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _sync(WaouhStockDataSource source) async {
    if (_working || !source.canSync) return;
    try {
      setState(() => _working = true);
      final result = await _repository.syncDataSource(source.id);
      if (!mounted) return;
      await _afterSuccess(result, synced: true);
      await _load();
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _delete(WaouhStockDataSource source) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer la source ?'),
        content: Text(
          'La source « ${source.name} » et ses données importées seront supprimées.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: danger),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      setState(() => _working = true);
      await _repository.deleteDataSource(source.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Source supprimée.')),
      );
      await _load();
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _afterSuccess(
    WaouhStockImportResult result, {
    bool synced = false,
  }) async {
    final openChat = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        icon: const Icon(
          Icons.auto_awesome_rounded,
          color: green,
          size: 36,
        ),
        title: Text(
          synced ? 'Source synchronisée' : 'Importation réussie',
        ),
        content: Text(
          '${result.sourceName}\n\n'
          '${result.rowCount} lignes intégrées : '
          '${result.inventoryRows} stocks et '
          '${result.movementRows} mouvements.\n\n'
          'Waouh Stock IA peut maintenant analyser cette importation.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Plus tard'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.chat_bubble_outline_rounded),
            label: const Text('Ouvrir le chat IA'),
          ),
        ],
      ),
    );
    if (!mounted || openChat != true) return;
    await _openChat(
      datasourceId: result.datasourceId,
      datasourceName: result.sourceName,
    );
  }

  Future<void> _openChat({
    String? datasourceId,
    String? datasourceName,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => WaouhStockChatScreen(
          client: widget.client,
          initialDatasourceId: datasourceId,
          initialDatasourceName: datasourceName,
        ),
      ),
    );
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
        backgroundColor: danger,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: canvas,
      appBar: AppBar(
        backgroundColor: deepGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sources Stock IA',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
            Text('Importer, connecter et analyser',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Ouvrir Stock IA',
            onPressed: _working ? null : () => _openChat(),
            icon: const Icon(Icons.auto_awesome_rounded),
          ),
          IconButton(
            tooltip: 'Actualiser',
            onPressed: _working ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 40),
              children: [
                _IntroCard(onOpenChat: _working ? null : () => _openChat()),
                const SizedBox(height: 16),
                const Text('Choisissez une source',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text('Chaque carte ouvre directement le parcours adapté.',
                    style: TextStyle(color: muted)),
                const SizedBox(height: 12),
                LayoutBuilder(
                  builder: (_, constraints) {
                    final columns = constraints.maxWidth >= 820 ? 4 : 2;
                    final ratio = constraints.maxWidth < 360 ? .88 : 1.05;
                    return GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: columns,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: ratio,
                      children: [
                        _SourceActionCard(
                            icon: Icons.upload_file_rounded,
                            title: 'CSV / Excel',
                            subtitle: 'Importer un fichier local',
                            badge: 'Fichier',
                            onTap: _working ? null : _pickFile),
                        _SourceActionCard(
                            icon: Icons.table_chart_outlined,
                            title: 'Google Sheets',
                            subtitle: 'Connecter un tableau partagé',
                            badge: 'Cloud',
                            onTap: _working ? null : _googleSheet),
                        _SourceActionCard(
                            icon: Icons.storage_rounded,
                            title: 'PostgreSQL',
                            subtitle: 'Lire une table distante',
                            badge: 'Base',
                            onTap: _working ? null : () => _database()),
                        _SourceActionCard(
                            icon: Icons.cloud_outlined,
                            title: 'Supabase',
                            subtitle: 'Analyser une table via API',
                            badge: 'API',
                            onTap: _working
                                ? null
                                : () => _database(supabaseOnly: true)),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 22),
                Row(
                  children: [
                    const Expanded(
                        child: Text('Sources connectées',
                            style: TextStyle(
                                fontSize: 21, fontWeight: FontWeight.w900))),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                          color: const Color(0xFFE1F4EF),
                          borderRadius: BorderRadius.circular(999)),
                      child: Text('${_sources.length}',
                          style: const TextStyle(
                              color: green, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (_loading)
                  const Padding(
                      padding: EdgeInsets.all(28),
                      child: Center(child: CircularProgressIndicator()))
                else if (_error != null)
                  _ErrorCard(error: _error!, onRetry: _load)
                else if (_sources.isEmpty)
                  const _EmptySources()
                else
                  ..._sources.map(
                    (source) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _DataSourceCard(
                        source: source,
                        onAnalyze: !_working && source.isReady
                            ? () => _openChat(
                                datasourceId: source.id,
                                datasourceName: source.name)
                            : null,
                        onSync: source.canSync && !_working
                            ? () => _sync(source)
                            : null,
                        onDelete: _working ? null : () => _delete(source),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (_working)
            Positioned.fill(
              child: ColoredBox(
                color: Colors.black.withOpacity(.14),
                child: const Center(
                  child: Card(
                    child: Padding(
                      padding: EdgeInsets.all(18),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        CircularProgressIndicator(),
                        SizedBox(width: 14),
                        Text('Traitement des données…')
                      ]),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard({required this.onOpenChat});
  final VoidCallback? onOpenChat;

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
              color: Color(0x30075E54), blurRadius: 22, offset: Offset(0, 10))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              CircleAvatar(
                  radius: 25,
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.hub_outlined, color: Colors.white)),
              SizedBox(width: 13),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Un seul moteur Stock IA',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w900)),
                      SizedBox(height: 4),
                      Text(
                          'Connectez vos sources, préparez les données puis interrogez-les dans le même chat.',
                          style:
                              TextStyle(color: Colors.white70, height: 1.35)),
                    ]),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Row(
            children: [
              Expanded(child: _JourneyStep(number: '1', label: 'Connecter')),
              SizedBox(width: 8),
              Expanded(child: _JourneyStep(number: '2', label: 'Synchroniser')),
              SizedBox(width: 8),
              Expanded(child: _JourneyStep(number: '3', label: 'Analyser')),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onOpenChat,
              style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: _WaouhStockSourcesScreenState.deepGreen,
                  padding: const EdgeInsets.symmetric(vertical: 13)),
              icon: const Icon(Icons.auto_awesome_rounded),
              label: const Text('Ouvrir le chat Stock IA'),
            ),
          ),
        ],
      ),
    );
  }
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep({required this.number, required this.label});
  final String number;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
      decoration: BoxDecoration(
          color: Colors.white.withOpacity(.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white24)),
      child: Column(children: [
        CircleAvatar(
            radius: 12,
            backgroundColor: Colors.white,
            foregroundColor: _WaouhStockSourcesScreenState.deepGreen,
            child: Text(number,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w900))),
        const SizedBox(height: 5),
        Text(label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

class _SourceActionCard extends StatelessWidget {
  const _SourceActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String badge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: _WaouhStockSourcesScreenState.line),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x10075E54),
                  blurRadius: 14,
                  offset: Offset(0, 6))
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                      backgroundColor: const Color(0xFFE5F5F1),
                      foregroundColor: _WaouhStockSourcesScreenState.green,
                      child: Icon(icon)),
                  const Spacer(),
                  Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: const Color(0xFFF1F6F4),
                          borderRadius: BorderRadius.circular(999)),
                      child: Text(badge,
                          style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: _WaouhStockSourcesScreenState.green))),
                ],
              ),
              const Spacer(),
              Text(title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 15)),
              const SizedBox(height: 4),
              Text(subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _WaouhStockSourcesScreenState.muted,
                      fontSize: 11,
                      height: 1.25)),
              const SizedBox(height: 8),
              const Row(children: [
                Text('Configurer',
                    style: TextStyle(
                        color: _WaouhStockSourcesScreenState.green,
                        fontSize: 11,
                        fontWeight: FontWeight.w800)),
                Spacer(),
                Icon(Icons.arrow_forward_rounded,
                    size: 17, color: _WaouhStockSourcesScreenState.green)
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _DataSourceCard extends StatelessWidget {
  const _DataSourceCard({
    required this.source,
    required this.onAnalyze,
    required this.onSync,
    required this.onDelete,
  });

  final WaouhStockDataSource source;
  final VoidCallback? onAnalyze;
  final VoidCallback? onSync;
  final VoidCallback? onDelete;

  Color get statusColor {
    if (source.hasError) return _WaouhStockSourcesScreenState.danger;
    if (source.status == 'importing') return Colors.orange;
    return _WaouhStockSourcesScreenState.green;
  }

  @override
  Widget build(BuildContext context) {
    final date = source.lastSyncedAt ?? source.createdAt;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _WaouhStockSourcesScreenState.line),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: statusColor.withOpacity(.10),
            child: Icon(_sourceIcon(source.sourceType), color: statusColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        source.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusPill(
                      label: source.hasError
                          ? 'Erreur'
                          : source.isReady
                              ? 'Prête'
                              : source.status,
                      color: statusColor,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${source.sourceType.label} · ${source.rowCount} lignes',
                  style: const TextStyle(
                    color: _WaouhStockSourcesScreenState.muted,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Synchronisée le '
                  '${DateFormat('dd/MM/yyyy HH:mm').format(date.toLocal())}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: _WaouhStockSourcesScreenState.muted,
                  ),
                ),
                if (source.lastError != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    source.lastError!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: _WaouhStockSourcesScreenState.danger,
                    ),
                  ),
                ],
              ],
            ),
          ),
          IconButton(
            tooltip: 'Analyser cette source avec Waouh Stock IA',
            onPressed: onAnalyze,
            icon: const Icon(Icons.auto_awesome_rounded),
          ),
          IconButton(
            tooltip: source.canSync
                ? 'Synchroniser maintenant'
                : 'Cette source doit être réimportée',
            onPressed: onSync,
            icon: const Icon(Icons.sync_rounded),
          ),
          PopupMenuButton<String>(
            enabled: onDelete != null,
            onSelected: (_) => onDelete?.call(),
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete_outline_rounded),
                  title: Text('Supprimer'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _sourceIcon(WaouhStockSourceType type) => switch (type) {
        WaouhStockSourceType.csv => Icons.description_outlined,
        WaouhStockSourceType.excel => Icons.grid_on_outlined,
        WaouhStockSourceType.googleSheet => Icons.table_chart_outlined,
        WaouhStockSourceType.postgres => Icons.storage_rounded,
        WaouhStockSourceType.supabase => Icons.cloud_outlined,
      };
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _EmptySources extends StatelessWidget {
  const _EmptySources();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _WaouhStockSourcesScreenState.line),
      ),
      child: const Column(
        children: [
          Icon(
            Icons.cloud_upload_outlined,
            size: 46,
            color: _WaouhStockSourcesScreenState.green,
          ),
          SizedBox(height: 10),
          Text(
            'Aucune source importée',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          SizedBox(height: 5),
          Text(
            'Choisissez CSV / Excel, Google Sheets, PostgreSQL ou Supabase.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _WaouhStockSourcesScreenState.muted),
          ),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFFFECEC),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('$error', textAlign: TextAlign.center),
            const SizedBox(height: 10),
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

class _MappingResult {
  const _MappingResult({required this.sourceName, required this.mapping});

  final String sourceName;
  final Map<String, String?> mapping;
}

class _MappingSheet extends StatefulWidget {
  const _MappingSheet({
    required this.initialName,
    required this.columns,
    required this.rows,
    required this.suggestedMapping,
  });

  final String initialName;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final Map<String, String?> suggestedMapping;

  @override
  State<_MappingSheet> createState() => _MappingSheetState();
}

class _MappingSheetState extends State<_MappingSheet> {
  late final _name = TextEditingController(text: widget.initialName);
  late final Map<String, String?> _mapping = {
    for (final key in waouhStockCanonicalFields.keys)
      key: widget.suggestedMapping[key],
  };

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _submit() {
    if (_name.text.trim().isEmpty) {
      _message('Donnez un nom à la source.');
      return;
    }
    if ((_mapping['name'] ?? '').isEmpty) {
      _message('Associez obligatoirement la colonne Nom du produit.');
      return;
    }
    final hasInventory = (_mapping['quantity'] ?? '').isNotEmpty;
    final hasMovement = (_mapping['movement_quantity'] ?? '').isNotEmpty &&
        (_mapping['movement_type'] ?? '').isNotEmpty;
    if (!hasInventory && !hasMovement) {
      _message(
        'Associez soit Stock actuel, soit Type et Quantité du mouvement.',
      );
      return;
    }
    Navigator.pop(
      context,
      _MappingResult(
        sourceName: _name.text.trim(),
        mapping: _mapping,
      ),
    );
  }

  void _message(String value) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(value)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .92,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 14, 16, 16 + inset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(child: _Handle()),
            const SizedBox(height: 14),
            const Text(
              'Associer les colonnes',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            const Text(
              'Vérifiez la détection automatique avant l’import.',
              style: TextStyle(color: _WaouhStockSourcesScreenState.muted),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                labelText: 'Nom de la source',
                prefixIcon: Icon(Icons.drive_file_rename_outline),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: [
                  ...waouhStockCanonicalFields.entries.map(
                    (field) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: DropdownButtonFormField<String>(
                        value: _mapping[field.key] ?? '',
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: field.value,
                          border: const OutlineInputBorder(),
                        ),
                        items: [
                          const DropdownMenuItem<String>(
                            value: '',
                            child: Text('Non utilisé'),
                          ),
                          ...widget.columns.map(
                            (column) => DropdownMenuItem<String>(
                              value: column,
                              child: Text(
                                column,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ],
                        onChanged: (value) => setState(
                          () => _mapping[field.key] =
                              value == null || value.isEmpty ? null : value,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Aperçu',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  _PreviewTable(
                    columns: widget.columns,
                    rows: widget.rows.take(5).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.check_rounded),
                label: const Text('Importer et analyser'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewTable extends StatelessWidget {
  const _PreviewTable({required this.columns, required this.rows});

  final List<String> columns;
  final List<Map<String, dynamic>> rows;

  @override
  Widget build(BuildContext context) {
    final shown = columns.take(6).toList();
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: _WaouhStockSourcesScreenState.line),
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 36,
          dataRowMaxHeight: 52,
          columns: shown
              .map(
                (column) => DataColumn(
                  label: Text(
                    column,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              )
              .toList(),
          rows: rows
              .map(
                (row) => DataRow(
                  cells: shown
                      .map(
                        (column) => DataCell(
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 150),
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

class _RemoteRequest {
  const _RemoteRequest({
    required this.sourceName,
    required this.sourceType,
    required this.configuration,
    required this.credentials,
    required this.rememberConnection,
  });

  final String sourceName;
  final WaouhStockSourceType sourceType;
  final Map<String, dynamic> configuration;
  final Map<String, dynamic> credentials;
  final bool rememberConnection;
}

class _GoogleSheetForm extends StatefulWidget {
  const _GoogleSheetForm();

  @override
  State<_GoogleSheetForm> createState() => _GoogleSheetFormState();
}

class _GoogleSheetFormState extends State<_GoogleSheetForm> {
  final _name = TextEditingController(text: 'Google Sheet Stock');
  final _url = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _url.dispose();
    super.dispose();
  }

  void _submit() {
    if (_name.text.trim().isEmpty || !_url.text.contains('docs.google.com')) {
      _message('Saisissez un nom et un lien Google Sheets valide.');
      return;
    }
    Navigator.pop(
      context,
      _RemoteRequest(
        sourceName: _name.text.trim(),
        sourceType: WaouhStockSourceType.googleSheet,
        configuration: {'url': _url.text.trim()},
        credentials: const {},
        rememberConnection: true,
      ),
    );
  }

  void _message(String value) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(value)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(18, 16, 18, 18 + inset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Center(child: _Handle()),
          const SizedBox(height: 16),
          const Text(
            'Connecter Google Sheets',
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          const Text(
            'La feuille doit être partagée en lecture par lien ou publiée.',
            style: TextStyle(color: _WaouhStockSourcesScreenState.muted),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: 'Nom de la source',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _url,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'Lien Google Sheets',
              hintText: 'https://docs.google.com/spreadsheets/d/…',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.visibility_outlined),
              label: const Text('Tester et afficher l’aperçu'),
            ),
          ),
        ],
      ),
    );
  }
}

class _DatabaseForm extends StatefulWidget {
  const _DatabaseForm({this.supabaseOnly = false});

  final bool supabaseOnly;

  @override
  State<_DatabaseForm> createState() => _DatabaseFormState();
}

class _DatabaseFormState extends State<_DatabaseForm> {
  late WaouhStockSourceType _type = widget.supabaseOnly
      ? WaouhStockSourceType.supabase
      : WaouhStockSourceType.postgres;
  final _name = TextEditingController(text: 'Base Stock');
  final _hostOrUrl = TextEditingController();
  final _port = TextEditingController(text: '5432');
  final _database = TextEditingController();
  final _username = TextEditingController();
  final _passwordOrKey = TextEditingController();
  final _schema = TextEditingController(text: 'public');
  final _table = TextEditingController();
  bool _remember = true;
  bool _obscure = true;

  bool get _isSupabase => _type == WaouhStockSourceType.supabase;

  @override
  void dispose() {
    for (final controller in [
      _name,
      _hostOrUrl,
      _port,
      _database,
      _username,
      _passwordOrKey,
      _schema,
      _table,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _submit() {
    final name = _name.text.trim();
    final table = _table.text.trim();
    final schema = _schema.text.trim().isEmpty ? 'public' : _schema.text.trim();
    if (name.isEmpty || table.isEmpty) {
      _message('Le nom de la source et la table sont obligatoires.');
      return;
    }

    if (_isSupabase) {
      final url = _hostOrUrl.text.trim();
      final apiKey = _passwordOrKey.text.trim();
      if (!url.startsWith('https://') || apiKey.isEmpty) {
        _message('Saisissez l’URL Supabase et la clé API.');
        return;
      }
      Navigator.pop(
        context,
        _RemoteRequest(
          sourceName: name,
          sourceType: _type,
          configuration: {'url': url, 'schema': schema, 'table': table},
          credentials: {'api_key': apiKey},
          rememberConnection: _remember,
        ),
      );
      return;
    }

    final port = int.tryParse(_port.text.trim());
    if (_hostOrUrl.text.trim().isEmpty ||
        port == null ||
        _database.text.trim().isEmpty ||
        _username.text.trim().isEmpty ||
        _passwordOrKey.text.isEmpty) {
      _message('Complétez tous les paramètres PostgreSQL.');
      return;
    }
    Navigator.pop(
      context,
      _RemoteRequest(
        sourceName: name,
        sourceType: _type,
        configuration: {
          'host': _hostOrUrl.text.trim(),
          'port': port,
          'database': _database.text.trim(),
          'username': _username.text.trim(),
          'schema': schema,
          'table': table,
          'ssl_mode': 'require',
        },
        credentials: {'password': _passwordOrKey.text},
        rememberConnection: _remember,
      ),
    );
  }

  void _message(String value) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(value)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .90,
      child: Padding(
        padding: EdgeInsets.fromLTRB(18, 14, 18, 18 + inset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(child: _Handle()),
            const SizedBox(height: 14),
            const Text(
              'Connecter une base de données',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            const Text(
              'Connexion en lecture seule. Les secrets mémorisés sont chiffrés.',
              style: TextStyle(color: _WaouhStockSourcesScreenState.muted),
            ),
            const SizedBox(height: 12),
            if (!widget.supabaseOnly)
              SegmentedButton<WaouhStockSourceType>(
                segments: const [
                  ButtonSegment(
                    value: WaouhStockSourceType.postgres,
                    label: Text('PostgreSQL'),
                    icon: Icon(Icons.storage_rounded),
                  ),
                  ButtonSegment(
                    value: WaouhStockSourceType.supabase,
                    label: Text('Supabase'),
                    icon: Icon(Icons.cloud_outlined),
                  ),
                ],
                selected: {_type},
                onSelectionChanged: (values) =>
                    setState(() => _type = values.first),
              ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: [
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(
                      labelText: 'Nom de la source',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _hostOrUrl,
                    keyboardType:
                        _isSupabase ? TextInputType.url : TextInputType.text,
                    decoration: InputDecoration(
                      labelText:
                          _isSupabase ? 'URL du projet Supabase' : 'Hôte',
                      hintText: _isSupabase
                          ? 'https://xxxxx.supabase.co'
                          : 'db.exemple.com',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  if (!_isSupabase) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _port,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            decoration: const InputDecoration(
                              labelText: 'Port',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 4,
                          child: TextField(
                            controller: _database,
                            decoration: const InputDecoration(
                              labelText: 'Base',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _username,
                      decoration: const InputDecoration(
                        labelText: 'Utilisateur en lecture seule',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordOrKey,
                    obscureText: _obscure,
                    decoration: InputDecoration(
                      labelText:
                          _isSupabase ? 'Clé API Supabase' : 'Mot de passe',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _schema,
                          decoration: const InputDecoration(
                            labelText: 'Schéma',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _table,
                          decoration: const InputDecoration(
                            labelText: 'Table',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    value: _remember,
                    onChanged: (value) => setState(() => _remember = value),
                    title: const Text('Mémoriser pour synchroniser'),
                    subtitle: const Text(
                      'Le secret est chiffré côté Edge Function.',
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('Tester et afficher l’aperçu'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Handle extends StatelessWidget {
  const _Handle();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 4,
      decoration: BoxDecoration(
        color: Colors.black26,
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}
