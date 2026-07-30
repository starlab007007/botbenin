import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import 'smart_document_picker.dart';
import 'smart_studio_service.dart';
import 'smart_studio_wizard.dart';
import 'studio_auth_sheet.dart';
import 'studio_country_codes.dart';
import 'studio_error_mapper.dart';
import 'studio_compat_service.dart';
import 'studio_catalog_manager.dart';
import 'studio_catalog_media_picker.dart';
import 'studio_product_image_picker.dart';

class LiveWhatsAppIaNativeScreen extends StatefulWidget {
  const LiveWhatsAppIaNativeScreen({super.key});

  @override
  State<LiveWhatsAppIaNativeScreen> createState() =>
      _LiveWhatsAppIaNativeScreenState();
}

class _LiveWhatsAppIaNativeScreenState
    extends State<LiveWhatsAppIaNativeScreen> {
  static const _background = Color(0xFFF4FAF8);
  static const _primary = Color(0xFF0B7F72);
  static const _primaryDark = Color(0xFF075F57);
  static const _mint = Color(0xFFDFF5F0);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);
  static const _danger = Color(0xFFB5473C);

  final WhatsAppIaStudioV20Service _service = WhatsAppIaStudioV20Service();

  late final SmartStudioService _smart =
      SmartStudioService(client: _service.client);

  List<StudioSession> _sessions = <StudioSession>[];
  List<StudioAgent> _agents = <StudioAgent>[];
  List<StudioCatalogItem> _catalog = <StudioCatalogItem>[];
  List<StudioDocumentItem> _documents = <StudioDocumentItem>[];
  List<StudioHistoryItem> _history = <StudioHistoryItem>[];
  List<StudioPartnerProduct> _partnerProducts = <StudioPartnerProduct>[];

  StreamSubscription<dynamic>? _authSubscription;
  Timer? _timer;

  bool _authenticated = false;
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  int _tab = 0;
  String? _resourceAgentId;
  final Set<String> _deletingSessionNames = <String>{};

  @override
  void initState() {
    super.initState();

    _authenticated = _service.isAuthenticated;

    _authSubscription = _service.authStateChanges.listen((event) {
      if (!mounted) return;

      final authenticated = _service.isAuthenticated;

      setState(() {
        _authenticated = authenticated;
        _error = null;

        if (!authenticated) {
          _clearPrivateData();
          _loading = false;
        }
      });

      if (authenticated) {
        _load();
      }
    });

    if (_authenticated) {
      _load();
    } else {
      _loading = false;
    }

    _timer = Timer.periodic(
      const Duration(seconds: 25),
      (_) {
        if (_authenticated) {
          _load(silent: true);
        }
      },
    );
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  void _clearPrivateData() {
    _sessions = <StudioSession>[];
    _agents = <StudioAgent>[];
    _catalog = <StudioCatalogItem>[];
    _documents = <StudioDocumentItem>[];
    _history = <StudioHistoryItem>[];
    _partnerProducts = <StudioPartnerProduct>[];
    _resourceAgentId = null;
  }

  Future<bool> _ensureAuthenticated() async {
    if (_service.isAuthenticated) {
      return true;
    }

    final authenticated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const StudioAuthenticationSheet(),
    );

    if (authenticated == true && _service.isAuthenticated) {
      if (mounted) {
        setState(() => _authenticated = true);
      }
      await _load();
      return true;
    }

    return false;
  }

  Future<void> _load({
    bool silent = false,
  }) async {
    if (!_service.isAuthenticated) {
      if (!mounted) return;

      setState(() {
        _authenticated = false;
        _loading = false;
        _refreshing = false;
        _clearPrivateData();
      });
      return;
    }

    if (!mounted) return;

    setState(() {
      if (silent) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      final first = await Future.wait<dynamic>([
        _service.loadSessions(),
        _service.loadAgents(),
      ]);

      final sessions = first[0] as List<StudioSession>;
      final agents = first[1] as List<StudioAgent>;

      final selectedAgentId = _resolveResourceAgent(
        agents,
        _resourceAgentId,
      );

      final second = await Future.wait<dynamic>([
        _service.loadCatalog(
          agentId: selectedAgentId,
        ),
        _service.loadDocuments(
          agentId: selectedAgentId,
        ),
        _service.loadHistory(),
        _service.loadPartnerProducts(),
      ]);

      if (!mounted) return;

      setState(() {
        _authenticated = true;
        _sessions = sessions;
        _agents = agents;
        _resourceAgentId = selectedAgentId;
        _catalog = second[0] as List<StudioCatalogItem>;
        _documents = second[1] as List<StudioDocumentItem>;
        _history = second[2] as List<StudioHistoryItem>;
        _partnerProducts = second[3] as List<StudioPartnerProduct>;
        _loading = false;
        _refreshing = false;
        _error = null;
      });
    } on StudioAuthenticationRequiredException {
      if (!mounted) return;

      setState(() {
        _authenticated = false;
        _loading = false;
        _refreshing = false;
        _clearPrivateData();
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _refreshing = false;
        _error = _friendlyError(error);
      });
    }
  }

  String? _resolveResourceAgent(
    List<StudioAgent> agents,
    String? current,
  ) {
    if (agents.isEmpty) return null;

    if (current != null && agents.any((item) => item.id == current)) {
      return current;
    }

    return agents.first.id;
  }

  String _friendlyError(Object error) {
    return StudioErrorMapper.message(error);
  }

  Future<void> _openLineWizard() async {
    if (!await _ensureAuthenticated()) return;

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SmartStudioWizardSheet(
        agentOnly: false,
      ),
    );

    if (changed == true) {
      await _load();
    }
  }

  Future<void> _openAgentWizard() async {
    if (!await _ensureAuthenticated()) return;

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SmartStudioWizardSheet(
        agentOnly: true,
      ),
    );

    if (changed == true) {
      await _load();
    }
  }

  Future<void> _manageSession(
    StudioSession session,
  ) async {
    if (!await _ensureAuthenticated()) return;

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SessionManagerSheet(
        service: _service,
        session: session,
      ),
    );

    if (changed == true) {
      await _load();
    }
  }

  Future<void> _editAgent(
    StudioAgent agent,
  ) async {
    if (!await _ensureAuthenticated()) return;

    final changes = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AgentEditSheet(agent: agent),
    );

    if (changes == null) return;

    await _runAction(() async {
      await _service.updateAgent(
        agentId: agent.id,
        changes: changes,
      );
      await _load(silent: true);
    });
  }

  Future<void> _testAgent(
    StudioAgent agent,
  ) async {
    if (!await _ensureAuthenticated()) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AgentTestSheet(
        service: _service,
        agent: agent,
      ),
    );
  }

  Future<void> _deployAgent(
    StudioAgent agent,
  ) async {
    if (!await _ensureAuthenticated()) return;

    final connected = _sessions.where((item) => item.isConnected).toList();

    if (connected.isEmpty) {
      _showMessage(
        'Connectez d’abord une ligne WhatsApp.',
      );
      return;
    }

    final selected = await showModalBottomSheet<StudioSession>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.white,
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(
            16,
            18,
            16,
            24,
          ),
          children: [
            const Text(
              'Choisir une ligne connectée',
              style: TextStyle(
                color: _ink,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            for (final session in connected)
              ListTile(
                leading: const Icon(
                  Icons.check_circle_rounded,
                  color: _primary,
                ),
                title: Text(session.title),
                subtitle: Text(session.sessionName),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  Navigator.pop(context, session);
                },
              ),
          ],
        ),
      ),
    );

    if (selected == null) return;

    await _runAction(() async {
      await _service.deployAgent(
        agentId: agent.id,
        sessionName: selected.sessionName,
      );
      await _load(silent: true);
    });
  }

  Future<void> _toggleAgent(
    StudioAgent agent,
  ) async {
    await _runAction(() async {
      await _service.toggleAgent(agent);
      await _load(silent: true);
    });
  }

  Future<void> _deleteAgent(
    StudioAgent agent,
  ) async {
    final confirmed = await _confirm(
      title: 'Supprimer cet agent ?',
      message: 'L’agent, son catalogue et ses associations '
          'seront supprimés.',
      confirmLabel: 'Supprimer',
    );

    if (!confirmed) return;

    _showMessage(
      'Suppression de l’agent en cours…',
    );

    await _runAction(() async {
      await _service.deleteAgent(agent.id);
      await _load(silent: true);

      _showMessage(
        'Agent supprimé.',
      );
    });
  }

  Future<void> _shareAgent(StudioAgent agent) async {
    if (!await _ensureAuthenticated()) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AgentShareSheet(
        service: _service,
        agent: agent,
      ),
    );
  }

  Future<void> _openProductEditor({
    StudioCatalogItem? item,
  }) async {
    if (!await _ensureAuthenticated()) return;

    final agentId = _resourceAgentId;

    if (agentId == null) {
      _showMessage(
        'Créez d’abord un agent IA.',
      );
      return;
    }

    final input = await showModalBottomSheet<_ProductInput>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductEditorSheet(
        initial: item,
      ),
    );

    if (input == null) return;

    await _runAction(() async {
      var photoUrl = input.existingPhotoUrl;

      if (input.image != null) {
        photoUrl = await _service.uploadProductImage(
          agentId: agentId,
          bytes: input.image!.bytes,
          filename: input.image!.name,
          contentType: input.image!.contentType,
        );
      }

      await _service.upsertCatalogItem(
        id: item?.id,
        agentId: agentId,
        name: input.name,
        description: input.description,
        priceFcfa: input.priceFcfa,
        quantity: input.quantity,
        photoUrl: photoUrl,
        sku: input.sku,
        active: input.active,
      );

      await _load(silent: true);
    });
  }

  Future<void> _deleteCatalogItem(
    StudioCatalogItem item,
  ) async {
    final confirmed = await _confirm(
      title: 'Supprimer ce produit ?',
      message: item.name,
      confirmLabel: 'Supprimer',
    );

    if (!confirmed) return;

    await _runAction(() async {
      await _service.deleteCatalogItem(
        id: item.id,
        agentId: item.agentId,
      );
      await _load(silent: true);
    });
  }

  Future<void> _analyzeCatalog() async {
    final agentId = _resourceAgentId;

    if (agentId == null) {
      _showMessage('Créez d’abord un agent.');
      return;
    }

    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CatalogAnalyzerSheet(),
    );

    if (text == null || text.trim().isEmpty) return;

    await _runAction(() async {
      final products = await _smart.parseCatalogText(text);

      for (final product in products) {
        await _service.upsertCatalogItem(
          agentId: agentId,
          name: product.name,
          description: product.description,
          priceFcfa: product.priceFcfa,
        );
      }

      await _load(silent: true);

      _showMessage(
        '${products.length} produit(s) analysé(s) et ajouté(s).',
      );
    });
  }

  Future<void> _importPartnerProducts() async {
    final agentId = _resourceAgentId;

    if (agentId == null) {
      _showMessage('Créez d’abord un agent.');
      return;
    }

    if (_partnerProducts.isEmpty) {
      _showMessage(
        'Aucun produit Partenaire ne vous appartient.',
      );
      return;
    }

    final selected = await showModalBottomSheet<Set<String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PartnerProductPickerSheet(
        products: _partnerProducts,
      ),
    );

    if (selected == null || selected.isEmpty) return;

    await _runAction(() async {
      await _service.linkPartnerProducts(
        agentId: agentId,
        productIds: selected,
      );

      _showMessage(
        '${selected.length} produit(s) lié(s) à l’agent.',
      );

      await _load(silent: true);
    });
  }

  Future<void> _uploadDocuments() async {
    if (!await _ensureAuthenticated()) return;

    final agentId = _resourceAgentId;

    if (agentId == null) {
      _showMessage('Créez d’abord un agent.');
      return;
    }

    if (!SmartDocumentPicker.available) {
      _showMessage(
        'La sélection de fichiers n’est pas disponible.',
      );
      return;
    }

    final picked = await SmartDocumentPicker.pickDocuments();

    if (picked.isEmpty) return;

    await _runAction(() async {
      for (final document in picked) {
        await _service.uploadDocument(
          agentId: agentId,
          bytes: document.bytes,
          filename: document.name,
          contentType: document.contentType,
        );
      }

      await _load(silent: true);
    });
  }

  Future<void> _showDocumentDetails(
    StudioDocumentItem document,
  ) async {
    if (!await _ensureAuthenticated()) return;

    String? signedUrl;
    String? loadError;

    try {
      signedUrl = await _service.getDocumentSignedUrl(
        agentId: document.agentId,
        storagePath: document.storagePath,
      );
    } catch (error) {
      loadError = _friendlyError(error);
    }

    if (!mounted) return;

    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => FractionallySizedBox(
        heightFactor: 0.78,
        child: Material(
          color: _background,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(28),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _sheetHeader(
                title: 'Détail du document',
                subtitle: document.name,
                icon: Icons.description_outlined,
                onClose: () {
                  Navigator.of(sheetContext).pop();
                },
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    28,
                  ),
                  children: [
                    _documentInfoRow(
                      icon: Icons.insert_drive_file_outlined,
                      label: 'Nom',
                      value: document.name,
                    ),
                    _documentInfoRow(
                      icon: Icons.data_usage_rounded,
                      label: 'Taille',
                      value: _formatBytes(document.sizeBytes),
                    ),
                    _documentInfoRow(
                      icon: Icons.category_outlined,
                      label: 'Type',
                      value: document.mimeType ?? 'Document',
                    ),
                    _documentInfoRow(
                      icon: Icons.task_alt_rounded,
                      label: 'Statut',
                      value: document.status,
                    ),
                    if (document.createdAt != null)
                      _documentInfoRow(
                        icon: Icons.schedule_rounded,
                        label: 'Ajouté le',
                        value: _formatDate(document.createdAt!),
                      ),
                    const SizedBox(height: 10),
                    if (signedUrl?.isNotEmpty == true) ...[
                      Container(
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: _line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Lien sécurisé valable 10 minutes',
                              style: TextStyle(
                                color: _ink,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 7),
                            SelectableText(
                              signedUrl!,
                              maxLines: 4,
                              style: const TextStyle(
                                color: _muted,
                                fontSize: 11,
                              ),
                            ),
                            const SizedBox(height: 7),
                            OutlinedButton.icon(
                              onPressed: () async {
                                await Clipboard.setData(
                                  ClipboardData(text: signedUrl!),
                                );
                                if (!sheetContext.mounted) return;
                                ScaffoldMessenger.of(sheetContext).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Lien sécurisé copié.',
                                    ),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                              icon: const Icon(Icons.copy_rounded),
                              label: const Text('Copier le lien'),
                            ),
                          ],
                        ),
                      ),
                    ] else if (loadError != null)
                      _sheetError(loadError),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(sheetContext).pop('rename');
                            },
                            icon: const Icon(Icons.edit_outlined),
                            label: const Text('Renommer'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(sheetContext).pop('delete');
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _danger,
                            ),
                            icon: const Icon(
                              Icons.delete_outline_rounded,
                            ),
                            label: const Text('Supprimer'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (action == 'rename') {
      await _renameDocument(document);
    } else if (action == 'delete') {
      await _deleteDocument(document);
    }
  }

  Widget _documentInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: _line),
      ),
      child: Row(
        children: [
          Icon(icon, color: _primary, size: 20),
          const SizedBox(width: 9),
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: const TextStyle(
                color: _muted,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: _ink,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _renameDocument(
    StudioDocumentItem document,
  ) async {
    final controller = TextEditingController(
      text: document.name,
    );

    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Renommer le document'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Nouveau nom',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop(
                controller.text.trim(),
              );
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );

    controller.dispose();

    if (name == null || name.isEmpty) return;

    await _runAction(() async {
      await _service.renameDocument(
        agentId: document.agentId,
        storagePath: document.storagePath,
        name: name,
      );
      await _load(silent: true);
    });
  }

  Future<void> _deleteDocument(
    StudioDocumentItem document,
  ) async {
    final confirmed = await _confirm(
      title: 'Supprimer ce document ?',
      message: document.name,
      confirmLabel: 'Supprimer',
    );

    if (!confirmed) return;

    await _runAction(() async {
      await _service.deleteDocument(
        agentId: document.agentId,
        storagePath: document.storagePath,
      );
      await _load(silent: true);
    });
  }

  Future<void> _clearHistory() async {
    final confirmed = await _confirm(
      title: 'Effacer l’historique ?',
      message: 'Les activités enregistrées pour vos agents '
          'seront supprimées.',
      confirmLabel: 'Effacer',
    );

    if (!confirmed) return;

    await _runAction(() async {
      await _service.clearHistory();
      await _load(silent: true);
    });
  }

  Future<void> _changeResourceAgent(
    String? agentId,
  ) async {
    if (agentId == null) return;

    setState(() {
      _resourceAgentId = agentId;
      _loading = true;
    });

    try {
      final values = await Future.wait<dynamic>([
        _service.loadCatalog(agentId: agentId),
        _service.loadDocuments(agentId: agentId),
      ]);

      if (!mounted) return;

      setState(() {
        _catalog = values[0] as List<StudioCatalogItem>;
        _documents = values[1] as List<StudioDocumentItem>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = _friendlyError(error);
      });
    }
  }

  Future<void> _runAction(
    Future<void> Function() action,
  ) async {
    if (!await _ensureAuthenticated()) return;

    try {
      await action();
    } catch (error) {
      _showMessage(
        _friendlyError(error),
        error: true,
      );
    }
  }

  Future<bool> _confirm({
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      useRootNavigator: true,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop(false);
            },
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop(true);
            },
            style: FilledButton.styleFrom(
              backgroundColor: _danger,
            ),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );

    return result == true;
  }

  Future<void> _deleteSessionFromList(
    StudioSession session,
  ) async {
    if (_deletingSessionNames.contains(session.sessionName)) {
      return;
    }

    final confirmed = await _confirm(
      title: 'Supprimer cette ligne ?',
      message: '${session.title}\n\nLa session sera supprimée dans WAHA '
          'et dans votre compte.',
      confirmLabel: 'Supprimer',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _deletingSessionNames.add(session.sessionName);
    });

    _showMessage('Suppression de la ligne en cours…');

    try {
      await _service.deleteSession(session.sessionName);

      if (!mounted) return;

      setState(() {
        _sessions.removeWhere(
          (item) => item.sessionName == session.sessionName,
        );
        _deletingSessionNames.remove(session.sessionName);
      });

      _showMessage('Ligne supprimée dans WAHA et dans l’application.');

      // Reconcile silently without blocking the interface.
      unawaited(_load(silent: true));
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _deletingSessionNames.remove(session.sessionName);
      });

      _showMessage(
        _friendlyError(error),
        error: true,
      );
    }
  }

  void _showMessage(
    String message, {
    bool error = false,
  }) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? _danger : _primaryDark,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        top: false,
        child: _authenticated
            ? RefreshIndicator(
                color: _primary,
                onRefresh: _load,
                child: _authenticatedBody(),
              )
            : _authenticationRequiredBody(),
      ),
    );
  }

  Widget _authenticationRequiredBody() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
      children: [
        _buildHeader(authenticated: false),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _line),
          ),
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: _mint,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_person_outlined,
                  color: _primary,
                  size: 36,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Connectez-vous pour continuer',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _ink,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 7),
              const Text(
                'Chaque utilisateur voit et gère uniquement ses '
                'propres lignes WhatsApp, agents, catalogues, '
                'documents et activités.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _muted,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: () {
                  _ensureAuthenticated();
                },
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(54),
                  backgroundColor: _primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(17),
                  ),
                ),
                icon: const Icon(Icons.login_rounded),
                label: const Text(
                  'S’authentifier',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _featureGrid(),
      ],
    );
  }

  Widget _authenticatedBody() {
    final connected = _sessions.where((item) => item.isConnected).length;
    final active = _agents.where((item) => item.isActive).length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 30),
      children: [
        _buildHeader(authenticated: true),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = (constraints.maxWidth - 9) / 2;

            return Wrap(
              spacing: 9,
              runSpacing: 9,
              children: [
                _metric(
                  width: width,
                  icon: Icons.qr_code_2_rounded,
                  value: '${_sessions.length}',
                  label: 'Lignes',
                ),
                _metric(
                  width: width,
                  icon: Icons.link_rounded,
                  value: '$connected',
                  label: 'Connectées',
                ),
                _metric(
                  width: width,
                  icon: Icons.smart_toy_rounded,
                  value: '$active',
                  label: 'Agents actifs',
                ),
                _metric(
                  width: width,
                  icon: Icons.folder_copy_outlined,
                  value: '${_catalog.length + _documents.length}',
                  label: 'Ressources',
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        _quickActions(),
        const SizedBox(height: 14),
        _tabs(),
        const SizedBox(height: 12),
        if (_loading)
          const SizedBox(
            height: 190,
            child: Center(
              child: CircularProgressIndicator(
                color: _primary,
              ),
            ),
          )
        else if (_error != null)
          _errorPanel()
        else
          _tabContent(),
      ],
    );
  }

  Widget _buildHeader({
    required bool authenticated,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 370;

        return Container(
          padding: EdgeInsets.fromLTRB(
            compact ? 13 : 16,
            14,
            8,
            14,
          ),
          decoration: BoxDecoration(
            color: _primary,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x20075F57),
                blurRadius: 22,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: compact ? 42 : 47,
                height: compact ? 42 : 47,
                decoration: BoxDecoration(
                  color: const Color(0xFFBDF1E6),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: _primaryDark,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Studio IA WhatsApp',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: compact ? 18 : 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      authenticated
                          ? 'Toutes vos fonctionnalités au même endroit'
                          : 'Connexion sécurisée et ressources privées',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: const Color(0xFFD6F5EE),
                        fontSize: compact ? 10.5 : 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (!authenticated)
                IconButton(
                  onPressed: () {
                    _ensureAuthenticated();
                  },
                  color: Colors.white,
                  tooltip: 'Se connecter',
                  icon: const Icon(Icons.login_rounded),
                ),
              if (authenticated && _refreshing)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _metric({
    required double width,
    required IconData icon,
    required String value,
    required String label,
  }) {
    return SizedBox(
      width: width,
      child: Container(
        height: 76,
        padding: const EdgeInsets.symmetric(
          horizontal: 10,
          vertical: 9,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _line),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: _mint,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 20,
                color: _primary,
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 19,
                      height: 1,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _muted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickActions() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 9) / 2;

        return Wrap(
          spacing: 9,
          runSpacing: 9,
          children: [
            _actionButton(
              width: width,
              icon: Icons.add_link_rounded,
              label: 'Ligne +',
              primary: true,
              onTap: _openLineWizard,
            ),
            _actionButton(
              width: width,
              icon: Icons.smart_toy_outlined,
              label: 'Agent +',
              onTap: _openAgentWizard,
            ),
            _actionButton(
              width: width,
              icon: Icons.add_box_outlined,
              label: 'Catalogue +',
              onTap: () {
                setState(() => _tab = 2);
              },
            ),
            _actionButton(
              width: width,
              icon: Icons.upload_file_outlined,
              label: 'Document +',
              onTap: _uploadDocuments,
            ),
          ],
        );
      },
    );
  }

  Widget _actionButton({
    required double width,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool primary = false,
  }) {
    return SizedBox(
      width: width,
      height: 53,
      child: FilledButton.icon(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: primary ? _primary : _mint,
          foregroundColor: primary ? Colors.white : _primaryDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(17),
          ),
        ),
        icon: Icon(icon, size: 20),
        label: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _tabs() {
    const labels = <String>[
      'Lignes',
      'Agents',
      'Catalogue',
      'Documents',
      'Historique',
    ];

    const icons = <IconData>[
      Icons.qr_code_2_rounded,
      Icons.smart_toy_rounded,
      Icons.inventory_2_outlined,
      Icons.description_outlined,
      Icons.history_rounded,
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 7.0;
        final itemWidth = (constraints.maxWidth - (spacing * 2)) / 3;

        return Wrap(
          spacing: spacing,
          runSpacing: 7,
          children: List<Widget>.generate(
            labels.length,
            (index) {
              final selected = _tab == index;

              return SizedBox(
                width: itemWidth,
                height: 47,
                child: Material(
                  color: selected ? _primary : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    onTap: () {
                      setState(() => _tab = index);
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selected ? _primary : _line,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            icons[index],
                            size: 17,
                            color: selected ? Colors.white : _primary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              labels[index],
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: selected ? Colors.white : _ink,
                                fontSize: 10.5,
                                fontWeight: selected
                                    ? FontWeight.w900
                                    : FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _tabContent() {
    switch (_tab) {
      case 0:
        return _sessionsPanel();
      case 1:
        return _agentsPanel();
      case 2:
        return _catalogPanel();
      case 3:
        return _documentsPanel();
      default:
        return _historyPanel();
    }
  }

  Widget _sessionsPanel() {
    if (_sessions.isEmpty) {
      return _emptyPanel(
        icon: Icons.qr_code_2_rounded,
        title: 'Aucune ligne WhatsApp',
        message: 'Créez une ligne puis connectez-la par QR '
            'ou par code de numéro.',
        button: 'Créer une ligne',
        action: _openLineWizard,
      );
    }

    return Column(
      children: [
        for (final session in _sessions) ...[
          _resourceCard(
            leading: session.isConnected
                ? Icons.check_circle_rounded
                : Icons.qr_code_2_rounded,
            active: session.isConnected,
            title: session.title,
            subtitle: '${session.sessionName} · ${session.status}',
            status: _deletingSessionNames.contains(session.sessionName)
                ? 'Suppression…'
                : session.isConnected
                    ? 'Connectée'
                    : 'À gérer',
            onTap: () => _manageSession(session),
            menu: _deletingSessionNames.contains(
              session.sessionName,
            )
                ? const SizedBox.square(
                    dimension: 40,
                    child: Center(
                      child: SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      ),
                    ),
                  )
                : PopupMenuButton<String>(
                    tooltip: 'Actions',
                    onSelected: (value) async {
                      if (value == 'manage') {
                        await _manageSession(session);
                      } else if (value == 'stop') {
                        await _runAction(() async {
                          await _service.stopSession(
                            session.sessionName,
                          );
                          await _load(silent: true);
                        });
                      } else if (value == 'disconnect') {
                        await _runAction(() async {
                          await _service.disconnectSession(
                            session.sessionName,
                          );
                          await _load(silent: true);
                        });
                      } else if (value == 'delete') {
                        await _deleteSessionFromList(session);
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem<String>(
                        value: 'manage',
                        child: Text('Gérer la connexion'),
                      ),
                      PopupMenuItem<String>(
                        value: 'stop',
                        child: Text('Arrêter'),
                      ),
                      PopupMenuItem<String>(
                        value: 'disconnect',
                        child: Text('Déconnecter'),
                      ),
                      PopupMenuItem<String>(
                        value: 'delete',
                        child: Text('Supprimer'),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 9),
        ],
      ],
    );
  }

  Widget _agentsPanel() {
    if (_agents.isEmpty) {
      return _emptyPanel(
        icon: Icons.smart_toy_outlined,
        title: 'Aucun agent IA',
        message: 'Créez un agent depuis des documents, '
            'un site, un catalogue ou des connaissances.',
        button: 'Créer un agent',
        action: _openAgentWizard,
      );
    }

    return Column(
      children: [
        for (final agent in _agents) ...[
          _resourceCard(
            leading: Icons.smart_toy_rounded,
            active: agent.isActive,
            title: agent.name,
            subtitle:
                '${agent.personaName} · ${agent.sessionName ?? 'non connecté'}',
            status: agent.isActive ? 'Actif' : agent.status,
            onTap: () => _testAgent(agent),
            menu: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: 'Partager le Web Chat',
                  onPressed: () => _shareAgent(agent),
                  icon: const Icon(Icons.share_rounded),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Actions',
                  onSelected: (value) async {
                    if (value == 'test') {
                      await _testAgent(agent);
                    } else if (value == 'share') {
                      await _shareAgent(agent);
                    } else if (value == 'edit') {
                      await _editAgent(agent);
                    } else if (value == 'deploy') {
                      await _deployAgent(agent);
                    } else if (value == 'toggle') {
                      await _toggleAgent(agent);
                    } else if (value == 'delete') {
                      await _deleteAgent(agent);
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem<String>(
                      value: 'test',
                      child: Text('Tester'),
                    ),
                    const PopupMenuItem<String>(
                      value: 'share',
                      child: Text('Partager le Web Chat'),
                    ),
                    const PopupMenuItem<String>(
                      value: 'edit',
                      child: Text('Modifier'),
                    ),
                    const PopupMenuItem<String>(
                      value: 'deploy',
                      child: Text('Connecter à une ligne'),
                    ),
                    PopupMenuItem<String>(
                      value: 'toggle',
                      child: Text(
                        agent.isActive ? 'Mettre en pause' : 'Activer',
                      ),
                    ),
                    const PopupMenuItem<String>(
                      value: 'delete',
                      child: Text('Supprimer'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 9),
        ],
      ],
    );
  }

  Widget _catalogPanel() {
    if (_agents.isEmpty) {
      return _emptyPanel(
        icon: Icons.inventory_2_outlined,
        title: 'Catalogue indisponible',
        message: 'Créez un agent avant d’ajouter des produits, '
            'formations ou présentations.',
        button: 'Créer un agent',
        action: _openAgentWizard,
      );
    }

    final agentId = _resourceAgentId;
    if (agentId == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _agentSelector(),
        const SizedBox(height: 10),
        StudioCatalogManager(
          key: ValueKey<String>('catalog-$agentId'),
          agentId: agentId,
          service: _service,
          smart: _smart,
          onChanged: () {
            _load(silent: true);
          },
        ),
      ],
    );
  }

  Widget _documentsPanel() {
    if (_agents.isEmpty) {
      return _emptyPanel(
        icon: Icons.description_outlined,
        title: 'Documents indisponibles',
        message: 'Créez un agent avant de charger ses documents.',
        button: 'Créer un agent',
        action: _openAgentWizard,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _agentSelector(),
        const SizedBox(height: 10),
        FilledButton.icon(
          onPressed: _uploadDocuments,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(49),
            backgroundColor: _primary,
          ),
          icon: const Icon(
            Icons.upload_file_rounded,
          ),
          label: const Text(
            'Ajouter PDF, DOCX, TXT ou MD',
          ),
        ),
        const SizedBox(height: 10),
        if (_documents.isEmpty)
          _emptyPanel(
            icon: Icons.description_outlined,
            title: 'Aucun document',
            message: 'Les documents seront analysés et utilisés '
                'par cet agent.',
            button: 'Ajouter un document',
            action: _uploadDocuments,
          )
        else
          for (final document in _documents) ...[
            _resourceCard(
              leading: Icons.description_outlined,
              active: document.status == 'ready',
              title: document.name,
              subtitle:
                  '${_formatBytes(document.sizeBytes)} · ${document.status}',
              status: 'Document',
              onTap: () {
                _showDocumentDetails(document);
              },
              menu: PopupMenuButton<String>(
                tooltip: 'Actions',
                onSelected: (value) {
                  if (value == 'rename') {
                    _renameDocument(document);
                  } else if (value == 'delete') {
                    _deleteDocument(document);
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem<String>(
                    value: 'rename',
                    child: Text('Renommer'),
                  ),
                  PopupMenuItem<String>(
                    value: 'delete',
                    child: Text('Supprimer'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 9),
          ],
      ],
    );
  }

  Widget _historyPanel() {
    if (_history.isEmpty) {
      return _emptyPanel(
        icon: Icons.history_rounded,
        title: 'Aucune activité',
        message: 'Les créations, modifications, connexions '
            'et suppressions apparaîtront ici.',
        button: 'Actualiser',
        action: () {
          _load();
        },
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: _clearHistory,
            icon: const Icon(Icons.delete_sweep_outlined),
            label: const Text('Effacer l’historique'),
          ),
        ),
        const SizedBox(height: 4),
        for (final item in _history) ...[
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _line),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _mint,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(
                    item.kind == 'session'
                        ? Icons.link_rounded
                        : Icons.history_rounded,
                    color: _primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.message,
                        style: const TextStyle(
                          color: _ink,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(item.createdAt),
                        style: const TextStyle(
                          color: _muted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _featureGrid() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 9) / 2;

        const features = <_FeatureData>[
          _FeatureData(
            Icons.qr_code_2_rounded,
            'Lignes privées',
          ),
          _FeatureData(
            Icons.smart_toy_outlined,
            'Agents personnalisés',
          ),
          _FeatureData(
            Icons.inventory_2_outlined,
            'Catalogues personnels',
          ),
          _FeatureData(
            Icons.folder_outlined,
            'Documents sécurisés',
          ),
        ];

        return Wrap(
          spacing: 9,
          runSpacing: 9,
          children: [
            for (final feature in features)
              SizedBox(
                width: width,
                child: Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(17),
                    border: Border.all(color: _line),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        feature.icon,
                        color: _primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          feature.label,
                          style: const TextStyle(
                            color: _ink,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _agentSelector() {
    return DropdownButtonFormField<String>(
      value: _resourceAgentId,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: 'Agent concerné',
        prefixIcon: const Icon(Icons.smart_toy_outlined),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _line),
        ),
      ),
      items: _agents
          .map(
            (agent) => DropdownMenuItem<String>(
              value: agent.id,
              child: Text(
                agent.name,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          )
          .toList(),
      onChanged: _changeResourceAgent,
    );
  }

  Widget _catalogCard(
    StudioCatalogItem item,
  ) {
    final price =
        item.priceFcfa == null ? 'Prix sur demande' : '${item.priceFcfa} FCFA';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () {
          _openProductEditor(item: item);
        },
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _line),
          ),
          child: Row(
            children: [
              Container(
                width: 58,
                height: 58,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: _mint,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: item.photoUrl?.isNotEmpty == true
                    ? Image.network(
                        item.photoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.inventory_2_outlined,
                          color: _primary,
                        ),
                      )
                    : const Icon(
                        Icons.inventory_2_outlined,
                        color: _primary,
                      ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '$price · Qté ${item.quantity}',
                      style: const TextStyle(
                        color: _muted,
                        fontSize: 11.5,
                      ),
                    ),
                    if (item.sku?.isNotEmpty == true)
                      Text(
                        'Réf. ${item.sku}',
                        style: const TextStyle(
                          color: _muted,
                          fontSize: 10.5,
                        ),
                      ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Modifier',
                onPressed: () {
                  _openProductEditor(item: item);
                },
                icon: const Icon(Icons.edit_outlined),
              ),
              IconButton(
                tooltip: 'Supprimer',
                onPressed: () {
                  _deleteCatalogItem(item);
                },
                icon: const Icon(
                  Icons.delete_outline_rounded,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resourceCard({
    required IconData leading,
    required bool active,
    required String title,
    required String subtitle,
    required String status,
    required VoidCallback onTap,
    required Widget menu,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(19),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(19),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(19),
            border: Border.all(color: _line),
          ),
          child: Row(
            children: [
              Container(
                width: 43,
                height: 43,
                decoration: BoxDecoration(
                  color: active ? _mint : const Color(0xFFF0F3F2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  leading,
                  color: active ? _primary : _muted,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _muted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: active ? _mint : const Color(0xFFF1F4F3),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: active ? _primaryDark : _muted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              menu,
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyPanel({
    required IconData icon,
    required String title,
    required String message,
    required String button,
    required VoidCallback action,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 23),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _line),
      ),
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              color: _mint,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 29,
              color: _primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _ink,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _muted,
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 15),
          FilledButton(
            onPressed: action,
            style: FilledButton.styleFrom(
              backgroundColor: _primary,
            ),
            child: Text(button),
          ),
        ],
      ),
    );
  }

  Widget _errorPanel() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F3),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: _danger,
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () {
              _load();
            },
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes o';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(0)} Ko';
    }

    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} Mo';
  }

  String _formatDate(DateTime value) {
    final local = value.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');

    return '$day/$month/${local.year} à $hour:$minute';
  }
}

class _FeatureData {
  const _FeatureData(this.icon, this.label);

  final IconData icon;
  final String label;
}

class _SessionManagerSheet extends StatefulWidget {
  const _SessionManagerSheet({
    required this.service,
    required this.session,
  });

  final WhatsAppIaStudioV20Service service;
  final StudioSession session;

  @override
  State<_SessionManagerSheet> createState() => _SessionManagerSheetState();
}

class _SessionManagerSheetState extends State<_SessionManagerSheet> {
  static const _primary = Color(0xFF0B7F72);
  static const _background = Color(0xFFF4FAF8);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);
  static const _danger = Color(0xFFB5473C);

  final _phone = TextEditingController();
  StudioCountryDialCode _country = StudioCountryCodes.benin;
  String? _qr;
  String? _code;
  String? _error;
  String _status = '';
  bool _busy = false;
  bool _transportReady = false;
  String _transportText = 'Transport non vérifié';

  @override
  void initState() {
    super.initState();
    _status = widget.session.status;
    final phone = StudioCountryCodes.split(
      widget.session.phoneNumber,
    );
    _country = phone.country;
    _phone.text = phone.nationalNumber;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _auditTransport(repair: false);
      }
    });
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _run(
    Future<void> Function() action,
  ) async {
    if (_busy) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await action();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = StudioErrorMapper.message(error);
      });
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _auditTransport({
    bool repair = false,
  }) async {
    await _run(() async {
      final audit = await widget.service.auditSession(
        widget.session.sessionName,
        repair: repair,
      );

      final connected = audit['connected'] == true;
      final webhook = audit['webhook_configured'] == true;
      final agent = audit['active_agent_configured'] == true;
      final status = '${audit['remote_status'] ?? _status}'.trim();

      _status = status.isEmpty ? _status : status;
      _transportReady = audit['transport_ready'] == true;

      if (_transportReady) {
        _transportText = 'Réception et réponses agent opérationnelles';
      } else if (!connected) {
        _transportText = 'Ligne non connectée à WhatsApp';
      } else if (!webhook) {
        _transportText = 'Webhook WAHA à synchroniser';
      } else if (!agent) {
        _transportText = 'Aucun agent actif sur cette ligne';
      } else {
        _transportText = 'Transport à vérifier';
      }

      if (mounted) {
        setState(() {});
      }
    });
  }

  Future<void> _startAndQr() async {
    await _run(() async {
      await widget.service.startSession(
        widget.session.sessionName,
      );
      await Future<void>.delayed(
        const Duration(milliseconds: 700),
      );
      _qr = await widget.service.getQrCode(
        widget.session.sessionName,
      );
      _code = null;
      _status = 'starting';
      if (mounted) setState(() {});
    });

    if (mounted) {
      await _auditTransport();
    }
  }

  Future<void> _pairCode() async {
    final validation = StudioCountryCodes.validate(
      _country,
      _phone.text,
    );
    if (validation != null) {
      setState(() => _error = validation);
      return;
    }

    final phoneNumber = StudioCountryCodes.e164(
      _country,
      _phone.text,
    );

    await _run(() async {
      _code = await widget.service.requestPairCode(
        sessionName: widget.session.sessionName,
        phoneNumber: phoneNumber,
      );
      _qr = null;
      if (mounted) setState(() {});
    });

    if (mounted) {
      await _auditTransport();
    }
  }

  Future<void> _refresh() async {
    await _auditTransport(repair: true);
  }

  Future<void> _rename() async {
    final controller = TextEditingController(
      text: widget.session.title,
    );

    final value = await showDialog<String>(
      context: context,
      useRootNavigator: true,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Renommer la ligne'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Nouveau nom',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop(
                controller.text.trim(),
              );
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );

    controller.dispose();

    if (value == null || value.trim().isEmpty) return;

    var succeeded = false;

    await _run(() async {
      await widget.service.renameSession(
        sessionName: widget.session.sessionName,
        displayName: value.trim(),
      );
      succeeded = true;
    });

    if (succeeded && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  Uint8List? _decodeQr() {
    final value = _qr;
    if (value == null || value.isEmpty) return null;

    try {
      final clean =
          value.contains(',') ? value.substring(value.indexOf(',') + 1) : value;
      return base64Decode(clean);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final qrBytes = _decodeQr();

    return FractionallySizedBox(
      heightFactor: 0.94,
      child: Material(
        color: _background,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _sheetHeader(
              title: 'Gérer la ligne',
              subtitle: widget.session.title,
              icon: Icons.qr_code_2_rounded,
              onClose: () {
                Navigator.pop(context, true);
              },
            ),
            if (_busy)
              const LinearProgressIndicator(
                minHeight: 3,
                color: _primary,
                backgroundColor: Color(0xFFDFF5F0),
              ),
            if (_error != null) _sheetError(_error!),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  16,
                  16,
                  16,
                  28,
                ),
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: _line),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.circle,
                          size: 13,
                          color: _primary,
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Statut : $_status',
                                style: const TextStyle(
                                  color: _ink,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                _transportText,
                                style: TextStyle(
                                  color: _transportReady ? _primary : _muted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: _busy ? null : _refresh,
                          icon: const Icon(
                            Icons.refresh_rounded,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () {
                            _auditTransport(repair: true);
                          },
                    icon: Icon(
                      _transportReady
                          ? Icons.verified_rounded
                          : Icons.sync_rounded,
                    ),
                    label: Text(
                      _transportReady
                          ? 'Transport vérifié'
                          : 'Vérifier et réparer',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _busy ? null : _startAndQr,
                          icon: const Icon(
                            Icons.qr_code_2_rounded,
                          ),
                          label: const Text('QR Code'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _busy ? null : _pairCode,
                          icon: const Icon(Icons.pin_outlined),
                          label: const Text('Code numéro'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 11),
                  StudioInternationalPhoneField(
                    country: _country,
                    controller: _phone,
                    onCountryChanged: (value) {
                      setState(() {
                        _country = value;
                        _error = null;
                      });
                    },
                    label: 'Numéro WhatsApp',
                    helperText:
                        'Choisissez le pays puis saisissez le numéro national. '
                        'Ce champ est utilisé uniquement pour le code numéro.',
                  ),
                  if (qrBytes != null) ...[
                    const SizedBox(height: 13),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: _line),
                      ),
                      child: Image.memory(
                        qrBytes,
                        height: 230,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ],
                  if (_code?.isNotEmpty == true) ...[
                    const SizedBox(height: 13),
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: _line),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Code de connexion',
                            style: TextStyle(
                              color: _muted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 7),
                          SelectableText(
                            _code!,
                            style: const TextStyle(
                              color: _ink,
                              fontSize: 27,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  const Text(
                    'Gestion',
                    style: TextStyle(
                      color: _ink,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _rename,
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Renommer'),
                  ),
                  const SizedBox(height: 7),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () {
                            _run(() async {
                              await widget.service.stopSession(
                                widget.session.sessionName,
                              );
                              _status = 'stopped';
                              _transportReady = false;
                              _transportText = 'Session arrêtée';
                              if (mounted) setState(() {});
                            });
                          },
                    icon: const Icon(
                      Icons.stop_circle_outlined,
                    ),
                    label: const Text('Arrêter la session'),
                  ),
                  const SizedBox(height: 7),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () {
                            _run(() async {
                              await widget.service.disconnectSession(
                                widget.session.sessionName,
                              );
                              _status = 'disconnected';
                              _transportReady = false;
                              _transportText = 'WhatsApp déconnecté';
                              if (mounted) setState(() {});
                            });
                          },
                    icon: const Icon(Icons.link_off_rounded),
                    label: const Text('Déconnecter WhatsApp'),
                  ),
                  const SizedBox(height: 7),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () async {
                            final confirmed = await showDialog<bool>(
                              context: context,
                              useRootNavigator: true,
                              builder: (dialogContext) => AlertDialog(
                                title: const Text(
                                  'Supprimer cette ligne ?',
                                ),
                                content: const Text(
                                  'La session WAHA, son lien avec '
                                  'l’agent et ses informations locales '
                                  'seront supprimés.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () {
                                      Navigator.of(dialogContext).pop(false);
                                    },
                                    child: const Text('Annuler'),
                                  ),
                                  FilledButton(
                                    onPressed: () {
                                      Navigator.of(dialogContext).pop(true);
                                    },
                                    style: FilledButton.styleFrom(
                                      backgroundColor: _danger,
                                    ),
                                    child: const Text('Supprimer'),
                                  ),
                                ],
                              ),
                            );

                            if (confirmed != true) return;

                            var succeeded = false;

                            await _run(() async {
                              await widget.service.deleteSession(
                                widget.session.sessionName,
                              );
                              succeeded = true;
                            });

                            if (succeeded && mounted) {
                              setState(() {
                                _status = 'deleted';
                                _error = null;
                              });

                              Navigator.of(context).pop(true);
                            }
                          },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _danger,
                    ),
                    icon: const Icon(
                      Icons.delete_outline_rounded,
                    ),
                    label: const Text('Supprimer la session'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed:
                        _busy ? null : () => Navigator.of(context).pop(true),
                    icon: const Icon(Icons.arrow_back_rounded),
                    label: const Text('Précédent'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AgentEditSheet extends StatefulWidget {
  const _AgentEditSheet({
    required this.agent,
  });

  final StudioAgent agent;

  @override
  State<_AgentEditSheet> createState() => _AgentEditSheetState();
}

class _AgentEditSheetState extends State<_AgentEditSheet> {
  late final TextEditingController _name =
      TextEditingController(text: widget.agent.name);
  late final TextEditingController _persona = TextEditingController(
    text: widget.agent.personaName,
  );
  late final TextEditingController _tone =
      TextEditingController(text: widget.agent.tone);

  @override
  void dispose() {
    _name.dispose();
    _persona.dispose();
    _tone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(
            16,
            16,
            16,
            28,
          ),
          children: [
            _sheetHeader(
              title: 'Modifier l’agent',
              subtitle: widget.agent.sector,
              icon: Icons.edit_outlined,
              onClose: () {
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 15),
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                labelText: 'Nom de l’agent',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _persona,
              decoration: const InputDecoration(
                labelText: 'Prénom de l’assistant',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _tone,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Ton et personnalité',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 15),
            FilledButton.icon(
              onPressed: () {
                final persona = Map<String, dynamic>.from(
                  widget.agent.persona,
                );
                persona['name'] = _persona.text.trim();
                persona['tone'] = _tone.text.trim();

                Navigator.pop(
                  context,
                  <String, dynamic>{
                    'name': _name.text.trim(),
                    'persona': persona,
                  },
                );
              },
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
    );
  }
}

class _AgentTestSheet extends StatefulWidget {
  const _AgentTestSheet({
    required this.service,
    required this.agent,
  });

  final WhatsAppIaStudioV20Service service;
  final StudioAgent agent;

  @override
  State<_AgentTestSheet> createState() => _AgentTestSheetState();
}

class _AgentTestSheetState extends State<_AgentTestSheet> {
  final _input = TextEditingController();
  final _messages = <StudioChatMessage>[];
  List<StudioCatalogMedia> _attachments = <StudioCatalogMedia>[];
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _pickAttachment() async {
    if (_busy || !StudioCatalogMediaPicker.available) return;
    final picked = await StudioCatalogMediaPicker.pickImportFile();
    if (picked == null || !mounted) return;
    final mime = picked.contentType;
    setState(() {
      _attachments = <StudioCatalogMedia>[
        StudioCatalogMedia(
          type: mime.startsWith('image/')
              ? 'image'
              : mime.startsWith('video/')
                  ? 'video'
                  : mime.startsWith('audio/')
                      ? 'audio'
                      : 'document',
          filename: picked.name,
          mimeType: mime,
          dataBase64: base64Encode(picked.bytes),
          caption: picked.name,
        ),
      ];
    });
  }

  Future<void> _send() async {
    final typed = _input.text.trim();
    final media = List<StudioCatalogMedia>.from(_attachments);
    final text = typed.isNotEmpty
        ? typed
        : media.isNotEmpty
            ? 'Analyse ce média et réponds de façon professionnelle.'
            : '';
    if (text.isEmpty || _busy) return;

    final history = List<StudioChatMessage>.from(_messages);

    setState(() {
      _messages.add(
        StudioChatMessage(
          role: 'user',
          content: typed.isEmpty ? 'Média joint' : typed,
          attachments: media,
        ),
      );
      _input.clear();
      _attachments = <StudioCatalogMedia>[];
      _busy = true;
      _error = null;
    });

    try {
      final reply = await widget.service.testAgentRich(
        agentId: widget.agent.id,
        message: text,
        history: history,
        attachments: media,
      );

      if (!mounted) return;

      setState(() {
        _messages.add(
          StudioChatMessage(
            role: 'assistant',
            content: reply.text,
            attachments: reply.attachments,
          ),
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.92,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _sheetHeader(
              title: 'Tester ${widget.agent.name}',
              subtitle: 'Conversation privée de test',
              icon: Icons.chat_bubble_outline_rounded,
              onClose: () {
                Navigator.pop(context);
              },
            ),
            if (_error != null) _sheetError(_error!),
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(14),
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(19),
                ),
                child: _messages.isEmpty
                    ? const Center(
                        child: Text(
                          'Posez une question comme un client.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFF667874),
                          ),
                        ),
                      )
                    : ListView.separated(
                        itemCount: _messages.length + (_busy ? 1 : 0),
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          if (index >= _messages.length) {
                            return const Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Le moteur IA analyse…',
                                style: TextStyle(
                                  color: Color(0xFF667874),
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            );
                          }

                          final message = _messages[index];

                          return StudioPremiumChatBubble(message: message);
                        },
                      ),
              ),
            ),
            if (_attachments.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 4),
                child: Row(
                  children: [
                    const Icon(Icons.attach_file_rounded, size: 18),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _attachments.first.filename,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      onPressed: _busy
                          ? null
                          : () => setState(
                              () => _attachments = <StudioCatalogMedia>[]),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Row(
                children: [
                  IconButton.outlined(
                    tooltip: 'Joindre une photo, vidéo, audio ou un PDF',
                    onPressed: _busy ? null : _pickAttachment,
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _input,
                      enabled: !_busy,
                      minLines: 1,
                      maxLines: 4,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Message ou média à analyser…',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 51,
                    height: 51,
                    child: FilledButton(
                      onPressed: _busy ? null : _send,
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.zero,
                        backgroundColor: const Color(0xFF0B7F72),
                      ),
                      child: const Icon(Icons.send_rounded),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AgentShareSheet extends StatefulWidget {
  const _AgentShareSheet({
    required this.service,
    required this.agent,
  });

  final WhatsAppIaStudioV20Service service;
  final StudioAgent agent;

  @override
  State<_AgentShareSheet> createState() => _AgentShareSheetState();
}

class _AgentShareSheetState extends State<_AgentShareSheet> {
  StudioAgentShare? _share;
  bool _loading = true;
  bool _busy = false;
  String? _error;

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
      final share = await widget.service.loadAgentShare(widget.agent.id);
      if (!mounted) return;
      setState(() => _share = share);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(bool enabled) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final share = await widget.service.setAgentShare(
        agentId: widget.agent.id,
        enabled: enabled,
      );
      if (!mounted) return;
      setState(() => _share = share);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            enabled ? 'Web Chat public activé.' : 'Web Chat public désactivé.',
          ),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _regenerate() async {
    if (_busy) return;
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Renouveler le lien ?'),
            content: const Text(
              'L’ancien lien et son QR code cesseront immédiatement de fonctionner.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Annuler'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Renouveler'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) return;

    setState(() => _busy = true);
    try {
      final share = await widget.service.regenerateAgentShare(widget.agent.id);
      if (!mounted) return;
      setState(() => _share = share);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nouveau lien public généré.')),
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copyLink() async {
    final url = _share?.publicUrl ?? '';
    if (url.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Lien du Web Chat copié.')),
    );
  }

  String _safeFileName(String value) {
    final normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    return normalized.isEmpty ? 'agent' : normalized;
  }

  Future<Uint8List> _downloadQrBytes() async {
    final qrUrl = _share?.qrUrl ?? '';
    if (qrUrl.isEmpty) {
      throw StateError('Le QR code n’est pas disponible.');
    }

    final client = HttpClient();
    try {
      final request = await client.getUrl(Uri.parse(qrUrl));
      request.headers.set(HttpHeaders.acceptHeader, 'image/png,image/*');
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          'Téléchargement du QR code impossible (${response.statusCode}).',
          uri: Uri.parse(qrUrl),
        );
      }

      final bytes = BytesBuilder(copy: false);
      await for (final chunk in response) {
        bytes.add(chunk);
      }
      final value = bytes.takeBytes();
      if (value.isEmpty) {
        throw StateError('Le fichier QR code reçu est vide.');
      }
      return value;
    } finally {
      client.close(force: true);
    }
  }

  Future<File> _temporaryQrFile() async {
    final bytes = await _downloadQrBytes();
    final directory = await getTemporaryDirectory();
    final file = File(
      '${directory.path}/qr-web-chat-${_safeFileName(widget.agent.name)}.png',
    );
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  Future<void> _saveQrCode() async {
    if (_busy || _share?.enabled != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final bytes = await _downloadQrBytes();
      final downloads = await getDownloadsDirectory();
      if (downloads == null) {
        throw StateError('Le dossier Téléchargements est indisponible.');
      }
      await downloads.create(recursive: true);

      final slug =
          _share?.slug ?? DateTime.now().millisecondsSinceEpoch.toString();
      final file = File(
        '${downloads.path}/QR-Web-Chat-${_safeFileName(widget.agent.name)}-$slug.png',
      );
      await file.writeAsBytes(bytes, flush: true);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text('QR code enregistré dans Téléchargements : ${file.path}'),
          duration: const Duration(seconds: 5),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _shareQrCode() async {
    if (_busy || _share?.enabled != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final share = _share!;
      final file = await _temporaryQrFile();
      await SharePlus.instance.share(
        ShareParams(
          title: 'Web Chat ${widget.agent.name}',
          subject: 'Accéder au Web Chat ${widget.agent.name}',
          text:
              'Scannez le QR code ou ouvrez ce lien pour discuter avec ${widget.agent.name} : ${share.publicUrl}',
          files: <XFile>[
            XFile(
              file.path,
              mimeType: 'image/png',
              name: 'QR-Web-Chat-${_safeFileName(widget.agent.name)}.png',
            ),
          ],
          fileNameOverrides: <String>[
            'QR-Web-Chat-${_safeFileName(widget.agent.name)}.png',
          ],
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.92,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _sheetHeader(
              title: 'Partager ${widget.agent.name}',
              subtitle: 'Web Chat sécurisé et QR code',
              icon: Icons.share_rounded,
              onClose: () => Navigator.pop(context),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? ListView(
                          padding: const EdgeInsets.all(20),
                          children: [
                            _sheetError(_error!),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: _load,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Réessayer'),
                            ),
                          ],
                        )
                      : _content(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _content() {
    final share = _share!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFDCEBE7)),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Accès public',
                      style:
                          TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Désactivez-le à tout moment sans supprimer l’agent.',
                      style: TextStyle(color: Color(0xFF667874)),
                    ),
                  ],
                ),
              ),
              Switch.adaptive(
                value: share.enabled,
                onChanged: _busy ? null : _toggle,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFDCEBE7)),
          ),
          child: Column(
            children: [
              Container(
                width: 250,
                height: 250,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x160B7F72),
                      blurRadius: 28,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: share.enabled
                    ? Image.network(
                        share.qrUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Icon(Icons.qr_code_2_rounded, size: 110),
                        ),
                      )
                    : const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.visibility_off_outlined, size: 64),
                            SizedBox(height: 8),
                            Text('Lien désactivé'),
                          ],
                        ),
                      ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Scannez pour ouvrir le Web Chat',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
              const SizedBox(height: 10),
              SelectableText(
                share.publicUrl,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF0B7F72),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: share.enabled ? _copyLink : null,
                  icon: const Icon(Icons.copy_rounded),
                  label: const Text('Copier le lien'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: share.enabled && !_busy ? _saveQrCode : null,
                  icon: const Icon(Icons.download_rounded),
                  label: const Text('Télécharger le QR code'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: share.enabled && !_busy ? _shareQrCode : null,
                  icon: const Icon(Icons.ios_share_rounded),
                  label: const Text('Partager le QR code'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _regenerate,
                  icon: const Icon(Icons.autorenew_rounded),
                  label: const Text('Renouveler le lien et le QR code'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
                child: _shareMetric(
                    'Visites', share.views, Icons.visibility_outlined)),
            const SizedBox(width: 8),
            Expanded(
                child: _shareMetric('Conversations', share.conversations,
                    Icons.forum_outlined)),
            const SizedBox(width: 8),
            Expanded(
                child: _shareMetric('Messages', share.messages,
                    Icons.chat_bubble_outline_rounded)),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5F1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.verified_user_outlined, color: Color(0xFF0B7F72)),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Le visiteur accède uniquement aux données publiées de cet agent. Les secrets d’intelligence artificielle, de messagerie et de base de données restent côté serveur.',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _shareMetric(String label, int value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCEBE7)),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF0B7F72), size: 20),
          const SizedBox(height: 5),
          Text('$value',
              style:
                  const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          Text(label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF667874))),
        ],
      ),
    );
  }
}

class _ProductInput {
  const _ProductInput({
    required this.name,
    required this.description,
    required this.priceFcfa,
    required this.quantity,
    required this.sku,
    required this.active,
    required this.existingPhotoUrl,
    required this.image,
  });

  final String name;
  final String description;
  final int? priceFcfa;
  final int quantity;
  final String sku;
  final bool active;
  final String? existingPhotoUrl;
  final StudioPickedImage? image;
}

class _ProductEditorSheet extends StatefulWidget {
  const _ProductEditorSheet({
    this.initial,
  });

  final StudioCatalogItem? initial;

  @override
  State<_ProductEditorSheet> createState() => _ProductEditorSheetState();
}

class _ProductEditorSheetState extends State<_ProductEditorSheet> {
  late final TextEditingController _name = TextEditingController(
    text: widget.initial?.name ?? '',
  );
  late final TextEditingController _description = TextEditingController(
    text: widget.initial?.description ?? '',
  );
  late final TextEditingController _price = TextEditingController(
    text: widget.initial?.priceFcfa?.toString() ?? '',
  );
  late final TextEditingController _quantity = TextEditingController(
    text: widget.initial?.quantity.toString() ?? '0',
  );
  late final TextEditingController _sku = TextEditingController(
    text: widget.initial?.sku ?? '',
  );

  late bool _active = widget.initial?.active ?? true;
  StudioPickedImage? _image;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _price.dispose();
    _quantity.dispose();
    _sku.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (!StudioProductImagePicker.available) {
      setState(() {
        _error = 'La sélection de photo n’est pas disponible.';
      });
      return;
    }

    final image = await StudioProductImagePicker.pick();

    if (image != null && mounted) {
      setState(() {
        _image = image;
        _error = null;
      });
    }
  }

  void _submit() {
    final name = _name.text.trim();

    if (name.isEmpty) {
      setState(() {
        _error = 'Donnez un nom au produit.';
      });
      return;
    }

    Navigator.pop(
      context,
      _ProductInput(
        name: name,
        description: _description.text.trim(),
        priceFcfa: int.tryParse(
          _price.text.replaceAll(
            RegExp(r'[^\d]'),
            '',
          ),
        ),
        quantity: int.tryParse(
              _quantity.text.replaceAll(
                RegExp(r'[^\d-]'),
                '',
              ),
            ) ??
            0,
        sku: _sku.text.trim(),
        active: _active,
        existingPhotoUrl: widget.initial?.photoUrl,
        image: _image,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return FractionallySizedBox(
      heightFactor: 0.94,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: EdgeInsets.only(bottom: bottom),
          child: Column(
            children: [
              _sheetHeader(
                title: widget.initial == null
                    ? 'Ajouter un produit'
                    : 'Modifier le produit',
                subtitle: 'Photo · quantité · prix · description',
                icon: Icons.inventory_2_outlined,
                onClose: () {
                  Navigator.pop(context);
                },
              ),
              if (_error != null) _sheetError(_error!),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    28,
                  ),
                  children: [
                    InkWell(
                      onTap: _pickImage,
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        height: 145,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: const Color(0xFFDCEBE7),
                          ),
                        ),
                        child: _image != null
                            ? Image.memory(
                                _image!.bytes,
                                fit: BoxFit.cover,
                              )
                            : widget.initial?.photoUrl?.isNotEmpty == true
                                ? Image.network(
                                    widget.initial!.photoUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        _imagePlaceholder(),
                                  )
                                : _imagePlaceholder(),
                      ),
                    ),
                    const SizedBox(height: 11),
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Nom',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _price,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Prix FCFA',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          child: TextField(
                            controller: _quantity,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Quantité',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _sku,
                      decoration: const InputDecoration(
                        labelText: 'Référence / SKU',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _description,
                      minLines: 3,
                      maxLines: 7,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Produit disponible',
                      ),
                      value: _active,
                      onChanged: (value) {
                        setState(() => _active = value);
                      },
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        backgroundColor: const Color(0xFF0B7F72),
                      ),
                      icon: const Icon(
                        Icons.save_outlined,
                      ),
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

  Widget _imagePlaceholder() {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.add_a_photo_outlined,
          size: 38,
          color: Color(0xFF0B7F72),
        ),
        SizedBox(height: 7),
        Text(
          'Ajouter ou remplacer la photo',
          style: TextStyle(
            color: Color(0xFF667874),
          ),
        ),
      ],
    );
  }
}

class _CatalogAnalyzerSheet extends StatefulWidget {
  const _CatalogAnalyzerSheet();

  @override
  State<_CatalogAnalyzerSheet> createState() => _CatalogAnalyzerSheetState();
}

class _CatalogAnalyzerSheetState extends State<_CatalogAnalyzerSheet> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(
            16,
            16,
            16,
            28,
          ),
          children: [
            _sheetHeader(
              title: 'Remplissage intelligent',
              subtitle: 'Collez une liste de produits ou services',
              icon: Icons.auto_fix_high_rounded,
              onClose: () {
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 15),
            TextField(
              controller: _text,
              autofocus: true,
              minLines: 7,
              maxLines: 14,
              decoration: const InputDecoration(
                hintText: 'Exemple : Bic bleu, 500 FCFA, stock 20…',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(
                  context,
                  _text.text.trim(),
                );
              },
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF0B7F72),
              ),
              icon: const Icon(
                Icons.auto_awesome_rounded,
              ),
              label: const Text('Analyser et ajouter'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PartnerProductPickerSheet extends StatefulWidget {
  const _PartnerProductPickerSheet({
    required this.products,
  });

  final List<StudioPartnerProduct> products;

  @override
  State<_PartnerProductPickerSheet> createState() =>
      _PartnerProductPickerSheetState();
}

class _PartnerProductPickerSheetState
    extends State<_PartnerProductPickerSheet> {
  final Set<String> _selected = <String>{};

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.9,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _sheetHeader(
              title: 'Mes produits Partenaire',
              subtitle: 'Seuls vos propres catalogues sont affichés',
              icon: Icons.storefront_outlined,
              onClose: () {
                Navigator.pop(context);
              },
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: widget.products.length,
                itemBuilder: (context, index) {
                  final product = widget.products[index];

                  return CheckboxListTile(
                    value: _selected.contains(product.id),
                    activeColor: const Color(0xFF0B7F72),
                    title: Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    subtitle: Text(
                      [
                        if (product.businessName?.isNotEmpty == true)
                          product.businessName!,
                        if (product.priceMin != null)
                          '${product.priceMin} FCFA',
                      ].join(' · '),
                    ),
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          _selected.add(product.id);
                        } else {
                          _selected.remove(product.id);
                        }
                      });
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                14,
                8,
                14,
                14,
              ),
              child: FilledButton.icon(
                onPressed: _selected.isEmpty
                    ? null
                    : () {
                        Navigator.pop(
                          context,
                          Set<String>.from(_selected),
                        );
                      },
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: const Color(0xFF0B7F72),
                ),
                icon: const Icon(Icons.link_rounded),
                label: Text(
                  'Lier ${_selected.length} produit(s)',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _sheetHeader({
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
          child: Icon(
            icon,
            color: const Color(0xFF0B7F72),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF17211F),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF667874),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: onClose,
          icon: const Icon(Icons.close_rounded),
        ),
      ],
    ),
  );
}

Widget _sheetError(String message) {
  return Container(
    width: double.infinity,
    margin: const EdgeInsets.fromLTRB(14, 10, 14, 0),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF1EF),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      message,
      style: const TextStyle(
        color: Color(0xFF9B3C34),
        fontSize: 12.5,
      ),
    ),
  );
}
