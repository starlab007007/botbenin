import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'studio_compat_service.dart';
import 'smart_agent_catalog.dart';
import 'smart_document_picker.dart';
import 'smart_studio_service.dart';

enum _StudioMode {
  line,
  agent,
}

enum _LineConnectionMethod {
  qr,
  code,
}

class SmartStudioWizardSheet extends StatefulWidget {
  const SmartStudioWizardSheet({
    super.key,
    this.agentOnly = false,
  });

  final bool agentOnly;

  @override
  State<SmartStudioWizardSheet> createState() => _SmartStudioWizardSheetState();
}

class _SmartStudioWizardSheetState extends State<SmartStudioWizardSheet> {
  static const _primary = Color(0xFF0B7F72);
  static const _primaryDark = Color(0xFF075F57);
  static const _mint = Color(0xFFDFF5F0);
  static const _background = Color(0xFFF4FAF8);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);

  final WhatsAppIaStudioV20Service _base = WhatsAppIaStudioV20Service();

  late final SmartStudioService _smart =
      SmartStudioService(client: _base.client);

  late _StudioMode _mode =
      widget.agentOnly ? _StudioMode.agent : _StudioMode.line;

  bool _busy = false;
  String? _error;

  // Nouvelle ligne.
  final _lineName = TextEditingController();
  final _linePhone = TextEditingController(text: '229');
  List<StudioSession> _sessions = <StudioSession>[];
  StudioSession? _lineSession;
  _LineConnectionMethod _connectionMethod = _LineConnectionMethod.qr;
  int _lineStep = 0;
  String? _qrCode;
  String? _pairCode;
  bool _lineConnected = false;
  Timer? _statusTimer;

  // Nouvel agent.
  final _activityName = TextEditingController();
  final _activityDescription = TextEditingController();
  final _personaName = TextEditingController();
  final _tone = TextEditingController();
  final _knowledge = TextEditingController();
  final _knowledgeUrl = TextEditingController();
  final _websiteUrl = TextEditingController();
  final _catalogText = TextEditingController();
  final _testInput = TextEditingController();

  SmartAgentSourceKind _sourceKind = SmartAgentSourceKind.smart;
  SmartSectorTemplate _template = SmartAgentCatalog.sectors.first;
  SmartTemplateRecommendation? _recommendation;
  Map<String, bool> _capabilities = Map<String, bool>.from(
    SmartAgentCatalog.sectors.first.capabilities,
  );
  bool _emojis = true;
  bool _crawlWebsite = true;
  int _agentStep = 0;
  Timer? _recommendTimer;

  List<SmartPartnerProduct> _partnerProducts = <SmartPartnerProduct>[];
  Set<String> _selectedPartnerIds = <String>{};
  List<SmartStudioProduct> _manualProducts = <SmartStudioProduct>[];
  List<SmartPickedDocument> _pickedDocuments = <SmartPickedDocument>[];
  List<SmartUploadedDocument> _uploadedDocuments = <SmartUploadedDocument>[];

  StudioAgent? _agent;
  StudioSession? _selectedSession;
  final List<StudioChatMessage> _messages = <StudioChatMessage>[];

  List<StudioSession> get _connectedSessions {
    return _sessions.where((item) => item.isConnected).toList();
  }

  @override
  void initState() {
    super.initState();

    _applyTemplate(_template, notify: false);
    _activityName.addListener(_scheduleRecommendation);
    _activityDescription.addListener(_scheduleRecommendation);

    unawaited(_loadInitialSessions());

    if (_mode == _StudioMode.agent) {
      unawaited(_loadPartnerProducts());
    }
  }

  Future<void> _loadInitialSessions() async {
    try {
      final sessions = await _base.loadSessions();
      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _selectedSession = _firstOrNull(_connectedSessions);
      });
    } catch (_) {
      // Le wizard reste utilisable; la liste sera rafraîchie plus tard.
    }
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _recommendTimer?.cancel();
    _lineName.dispose();
    _linePhone.dispose();
    _activityName.dispose();
    _activityDescription.dispose();
    _personaName.dispose();
    _tone.dispose();
    _knowledge.dispose();
    _knowledgeUrl.dispose();
    _websiteUrl.dispose();
    _catalogText.dispose();
    _testInput.dispose();
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
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  String _friendlyError(Object error) {
    final value = '$error'
        .replaceFirst('Bad state: ', '')
        .replaceFirst('StateError: ', '')
        .replaceFirst('Exception: ', '');
    return value;
  }

  void _scheduleRecommendation() {
    if (_mode != _StudioMode.agent || _agentStep > 1) return;
    _recommendTimer?.cancel();
    _recommendTimer = Timer(
      const Duration(milliseconds: 420),
      _recommendSector,
    );
  }

  void _recommendSector() {
    final recommendation = SmartAgentCatalog.recommend(
      activity: _activityName.text,
      description: _activityDescription.text,
      sourceKind: _sourceKind,
    );

    if (!mounted) return;
    setState(() {
      _recommendation = recommendation;
      if (recommendation.confidence >= 0.55) {
        _applyTemplate(
          recommendation.template,
          notify: false,
        );
      }
    });
  }

  void _applyTemplate(
    SmartSectorTemplate template, {
    bool notify = true,
  }) {
    _template = template;
    _personaName.text = template.personaName;
    _tone.text = template.tone;
    _capabilities = Map<String, bool>.from(template.capabilities);

    if (notify && mounted) {
      setState(() {});
    }
  }

  Future<void> _loadPartnerProducts() async {
    final products = await _smart.loadPartnerProducts();
    if (!mounted) return;
    setState(() => _partnerProducts = products);
  }

  Future<void> _createLine() async {
    final rawName = _lineName.text.trim();
    if (rawName.isEmpty) {
      setState(() {
        _error = 'Donnez un nom à la ligne WhatsApp.';
      });
      return;
    }

    final sessionName =
        WhatsAppIaStudioV20Service.normalizeSessionName(rawName);

    await _run(() async {
      await _base.createSession(
        sessionName: sessionName,
        phoneNumber: _linePhone.text,
      );

      final sessions = await _base.loadSessions();
      _sessions = sessions;
      _lineSession = _firstWhereOrNull(
            sessions,
            (item) => item.sessionName == sessionName,
          ) ??
          StudioSession(
            id: '',
            sessionName: sessionName,
            status: 'disconnected',
            phoneNumber: _linePhone.text,
          );

      setState(() => _lineStep = 1);
    });
  }

  Future<void> _generateLineConnection() async {
    final session = _lineSession;
    if (session == null) return;

    await _run(() async {
      if (_connectionMethod == _LineConnectionMethod.qr) {
        await _base.startSession(session.sessionName);
        await Future<void>.delayed(
          const Duration(milliseconds: 900),
        );
        _qrCode = await _base.getQrCode(
          session.sessionName,
        );
        _pairCode = null;
      } else {
        _pairCode = await _smart.requestPairCode(
          sessionName: session.sessionName,
          phoneNumber: _linePhone.text,
        );
        _qrCode = null;
      }

      _startStatusPolling();
      if (mounted) setState(() {});
    });
  }

  void _startStatusPolling() {
    _statusTimer?.cancel();
    _statusTimer = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _refreshLineStatus(),
    );
  }

  Future<void> _refreshLineStatus() async {
    final session = _lineSession;
    if (session == null) return;

    try {
      final remote = await _smart.checkSessionStatus(
        session.sessionName,
      );

      var connected = remote.connected;
      if (!connected) {
        final sessions = await _base.loadSessions();
        _sessions = sessions;
        final refreshed = _firstWhereOrNull(
          sessions,
          (item) => item.sessionName == session.sessionName,
        );
        connected = refreshed?.isConnected ?? false;
        if (refreshed != null) {
          _lineSession = refreshed;
        }
      }

      if (!mounted) return;
      setState(() => _lineConnected = connected);

      if (connected) {
        _statusTimer?.cancel();
        setState(() => _lineStep = 2);
      }
    } catch (_) {
      // Le contrôle manuel reste disponible.
    }
  }

  void _finishLine() {
    Navigator.of(context).pop(true);
  }

  Future<void> _pickDocuments() async {
    if (!SmartDocumentPicker.available) {
      setState(() {
        _error = 'Le sélecteur de fichiers n’est pas installé dans ce projet. '
            'Utilisez le lien du document ou collez son contenu.';
      });
      return;
    }

    final documents = await SmartDocumentPicker.pickDocuments();
    if (documents.isEmpty || !mounted) return;

    setState(() {
      _pickedDocuments = <SmartPickedDocument>[
        ..._pickedDocuments,
        ...documents,
      ];
    });
  }

  Future<void> _parseCatalog() async {
    await _run(() async {
      final products = await _smart.parseCatalogText(
        _catalogText.text,
      );

      if (!mounted) return;
      setState(() {
        _manualProducts = <SmartStudioProduct>[
          ..._manualProducts,
          ...products,
        ];
      });
    });
  }

  Future<void> _addManualProduct() async {
    final name = TextEditingController();
    final price = TextEditingController();
    final description = TextEditingController();

    final product = await showDialog<SmartStudioProduct>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Ajouter un produit ou service'),
          content: SingleChildScrollView(
            child: Column(
              children: [
                TextField(
                  controller: name,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Nom',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Prix en FCFA',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: description,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () {
                final value = name.text.trim();
                if (value.isEmpty) return;
                Navigator.pop(
                  context,
                  SmartStudioProduct(
                    name: value,
                    priceFcfa: int.tryParse(
                      price.text.replaceAll(
                        RegExp(r'[^\d]'),
                        '',
                      ),
                    ),
                    description: description.text.trim(),
                  ),
                );
              },
              child: const Text('Ajouter'),
            ),
          ],
        );
      },
    );

    name.dispose();
    price.dispose();
    description.dispose();

    if (product != null && mounted) {
      setState(() => _manualProducts.add(product));
    }
  }

  bool _needsWebsite() {
    return _sourceKind == SmartAgentSourceKind.website ||
        _sourceKind == SmartAgentSourceKind.smart;
  }

  bool _needsCatalog() {
    return _sourceKind == SmartAgentSourceKind.catalog ||
        _sourceKind == SmartAgentSourceKind.smart;
  }

  bool _needsDocuments() {
    return _sourceKind == SmartAgentSourceKind.documents ||
        _sourceKind == SmartAgentSourceKind.smart;
  }

  Future<void> _createAgentDraft() async {
    if (_activityName.text.trim().isEmpty) {
      setState(() {
        _error = 'Donnez un nom à l’activité ou à l’agent.';
      });
      return;
    }

    if (_sourceKind == SmartAgentSourceKind.website &&
        _websiteUrl.text.trim().isEmpty) {
      setState(() {
        _error = 'Saisissez l’adresse du site à analyser.';
      });
      return;
    }

    if (_sourceKind == SmartAgentSourceKind.documents &&
        _pickedDocuments.isEmpty &&
        _knowledgeUrl.text.trim().isEmpty &&
        _knowledge.text.trim().isEmpty) {
      setState(() {
        _error = 'Ajoutez au moins un document, un lien ou du contenu.';
      });
      return;
    }

    await _run(() async {
      _uploadedDocuments = <SmartUploadedDocument>[];
      for (final document in _pickedDocuments) {
        final uploaded = await _smart.uploadDocument(document);
        _uploadedDocuments.add(uploaded);
      }

      _agent = await _smart.createSmartAgent(
        SmartAgentCreationInput(
          name: _activityName.text,
          personaName: _personaName.text,
          tone: _tone.text,
          sourceKind: _sourceKind,
          template: _template,
          capabilities: _capabilities,
          emojis: _emojis,
          manualProducts: _manualProducts,
          partnerProductIds: _selectedPartnerIds,
          documents: _uploadedDocuments,
          knowledge: _knowledge.text,
          knowledgeUrl: _knowledgeUrl.text,
          websiteUrl: _websiteUrl.text,
          crawlWebsite: _crawlWebsite,
          activityDescription: _activityDescription.text,
        ),
      );

      if (!mounted) return;
      setState(() => _agentStep = 4);
    });
  }

  Future<void> _sendTest() async {
    final agent = _agent;
    final message = _testInput.text.trim();

    if (agent == null || message.isEmpty || _busy) return;

    final history = List<StudioChatMessage>.from(_messages);

    setState(() {
      _messages.add(
        StudioChatMessage(
          role: 'user',
          content: message,
        ),
      );
      _testInput.clear();
    });

    await _run(() async {
      final reply = await _base.testAgent(
        agentId: agent.id,
        message: message,
        history: history,
      );

      if (!mounted) return;
      setState(() {
        _messages.add(
          StudioChatMessage(
            role: 'assistant',
            content: reply,
          ),
        );
      });
    });
  }

  Future<void> _finishAgent({
    required bool activate,
  }) async {
    final agent = _agent;
    if (agent == null) return;

    await _run(() async {
      if (activate) {
        final session = _selectedSession;
        if (session == null || !session.isConnected) {
          throw StateError(
            'Sélectionnez une ligne WhatsApp connectée.',
          );
        }

        await _base.deployAgent(
          agentId: agent.id,
          sessionName: session.sessionName,
        );
      } else {
        await _base.saveAsDraft(agent.id);
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    });
  }

  void _nextAgentStep() {
    setState(() {
      _error = null;
      _agentStep = (_agentStep + 1).clamp(0, 5).toInt();
    });
  }

  void _previousAgentStep() {
    setState(() {
      _error = null;
      _agentStep = (_agentStep - 1).clamp(0, 5).toInt();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.97,
      child: Material(
        color: _background,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _SmartHeader(
              title: _mode == _StudioMode.line
                  ? 'Nouvelle ligne WhatsApp'
                  : 'Nouvel agent intelligent',
              subtitle: _mode == _StudioMode.line
                  ? 'WAHA · QR ou code de connexion'
                  : 'No-code · Templates dynamiques · Gemini Flash',
              currentStep: _mode == _StudioMode.line ? _lineStep : _agentStep,
              totalSteps: _mode == _StudioMode.line ? 3 : 6,
              onClose: () => Navigator.pop(context),
            ),
            if (_error != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(14, 10, 14, 0),
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1EF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: Color(0xFF9B3C34),
                    fontSize: 12.5,
                  ),
                ),
              ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _mode == _StudioMode.line
                    ? _buildLineFlow()
                    : _buildAgentFlow(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLineFlow() {
    switch (_lineStep) {
      case 0:
        return _buildLineIdentity();
      case 1:
        return _buildLineConnection();
      default:
        return _buildLineSuccess();
    }
  }

  Widget _buildLineIdentity() {
    return ListView(
      key: const ValueKey('line-identity'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        const _StepIntro(
          icon: Icons.add_link_rounded,
          title: 'Créer la ligne',
          message:
              'Donnez un nom simple. La session sera créée dans WAHA et synchronisée avec Supabase.',
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _lineName,
          autofocus: true,
          decoration: _decoration(
            label: 'Nom de la ligne',
            hint: 'Ex. boutique-cotonou',
            icon: Icons.edit_outlined,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _linePhone,
          keyboardType: TextInputType.phone,
          decoration: _decoration(
            label: 'Numéro WhatsApp international',
            hint: '22997000000',
            icon: Icons.phone_outlined,
          ),
        ),
        const SizedBox(height: 12),
        const _SmartInfo(
          icon: Icons.security_rounded,
          title: 'Connexion sécurisée',
          text:
              'Le numéro sert uniquement à demander un code lorsque cette méthode est choisie.',
        ),
        const SizedBox(height: 18),
        _MainButton(
          label: 'Créer et connecter',
          icon: Icons.arrow_forward_rounded,
          busy: _busy,
          onPressed: _createLine,
        ),
      ],
    );
  }

  Widget _buildLineConnection() {
    final session = _lineSession;

    return ListView(
      key: const ValueKey('line-connection'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        _StepIntro(
          icon: Icons.link_rounded,
          title: 'Connecter ${session?.sessionName ?? 'la ligne'}',
          message: 'Choisissez la méthode la plus simple pour ce téléphone.',
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _MethodCard(
                icon: Icons.qr_code_2_rounded,
                title: 'QR Code',
                subtitle: 'Scanner avec WhatsApp',
                selected: _connectionMethod == _LineConnectionMethod.qr,
                onTap: () {
                  setState(() {
                    _connectionMethod = _LineConnectionMethod.qr;
                    _pairCode = null;
                  });
                },
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _MethodCard(
                icon: Icons.pin_outlined,
                title: 'Code',
                subtitle: 'Saisir 8 caractères',
                selected: _connectionMethod == _LineConnectionMethod.code,
                onTap: () {
                  setState(() {
                    _connectionMethod = _LineConnectionMethod.code;
                    _qrCode = null;
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_connectionMethod == _LineConnectionMethod.qr)
          _QrOrPlaceholder(value: _qrCode)
        else
          _PairCodePanel(
            code: _pairCode,
            phone: _linePhone.text,
          ),
        const SizedBox(height: 14),
        _MainButton(
          label: _connectionMethod == _LineConnectionMethod.qr
              ? (_qrCode == null ? 'Générer le QR' : 'Régénérer le QR')
              : (_pairCode == null ? 'Générer le code' : 'Régénérer le code'),
          icon: _connectionMethod == _LineConnectionMethod.qr
              ? Icons.qr_code_2_rounded
              : Icons.pin_outlined,
          busy: _busy,
          onPressed: _generateLineConnection,
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _busy ? null : _refreshLineStatus,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Vérifier la connexion'),
        ),
        const SizedBox(height: 10),
        const _SmartInfo(
          icon: Icons.info_outline_rounded,
          title: 'Sur le téléphone',
          text: 'WhatsApp > Appareils connectés > Connecter un appareil. '
              'Pour le code : choisissez « Lier avec un numéro de téléphone ».',
        ),
      ],
    );
  }

  Widget _buildLineSuccess() {
    return ListView(
      key: const ValueKey('line-success'),
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 28),
      children: [
        const _SuccessHero(
          icon: Icons.check_circle_rounded,
          title: 'Ligne connectée',
          message:
              'WAHA est prêt. Vous pouvez maintenant créer ou connecter un agent IA.',
        ),
        const SizedBox(height: 18),
        _MainButton(
          label: 'Terminer',
          icon: Icons.done_rounded,
          busy: false,
          onPressed: _finishLine,
        ),
      ],
    );
  }

  Widget _buildAgentFlow() {
    switch (_agentStep) {
      case 0:
        return _buildSourceStep();
      case 1:
        return _buildSectorStep();
      case 2:
        return _buildIdentityStep();
      case 3:
        return _buildDataStep();
      case 4:
        return _buildTestStep();
      default:
        return _buildDeployStep();
    }
  }

  Widget _buildSourceStep() {
    return ListView(
      key: const ValueKey('agent-source'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        const _StepIntro(
          icon: Icons.auto_awesome_rounded,
          title: 'Quel agent souhaitez-vous créer ?',
          message:
              'Choisissez la source principale. Le studio adapte automatiquement le template et les champs.',
        ),
        const SizedBox(height: 14),
        for (final source in SmartAgentCatalog.sources) ...[
          _SourceCard(
            definition: source,
            selected: _sourceKind == source.kind,
            onTap: () {
              setState(() {
                _sourceKind = source.kind;
                _recommendSector();
              });
            },
          ),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 8),
        _MainButton(
          label: 'Continuer',
          icon: Icons.arrow_forward_rounded,
          busy: false,
          onPressed: _nextAgentStep,
        ),
      ],
    );
  }

  Widget _buildSectorStep() {
    return ListView(
      key: const ValueKey('agent-sector'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        const _StepIntro(
          icon: Icons.hub_outlined,
          title: 'Activité et secteur',
          message:
              'Décrivez l’activité : le studio classe le secteur et applique un template intelligent.',
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _activityName,
          decoration: _decoration(
            label: 'Nom de l’activité ou de l’agent',
            hint: 'Ex. Clinique La Lumière',
            icon: Icons.business_outlined,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _activityDescription,
          minLines: 3,
          maxLines: 6,
          decoration: _decoration(
            label: 'Que fait cette activité ?',
            hint: 'Services, clients, localisation et objectif de l’agent…',
            icon: Icons.notes_rounded,
          ),
        ),
        const SizedBox(height: 12),
        _RecommendationCard(
          recommendation: _recommendation,
          selected: _template,
          onAnalyze: _recommendSector,
        ),
        const SizedBox(height: 12),
        const _FieldTitle('Secteur choisi'),
        const SizedBox(height: 7),
        InkWell(
          onTap: _openSectorPicker,
          borderRadius: BorderRadius.circular(17),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: _line),
            ),
            child: Row(
              children: [
                Text(
                  _template.emoji,
                  style: const TextStyle(fontSize: 27),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _template.label,
                        style: const TextStyle(
                          color: _ink,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _template.description,
                        style: const TextStyle(
                          color: _muted,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.expand_more_rounded),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        _NavigationButtons(
          onBack: _previousAgentStep,
          onNext: () {
            if (_activityName.text.trim().isEmpty) {
              setState(() {
                _error = 'Saisissez le nom de l’activité ou de l’agent.';
              });
              return;
            }
            _nextAgentStep();
          },
        ),
      ],
    );
  }

  Future<void> _openSectorPicker() async {
    final selected = await showModalBottomSheet<SmartSectorTemplate>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: 0.82,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 28),
            children: [
              const Text(
                'Choisir le secteur',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              for (final sector in SmartAgentCatalog.sectors)
                ListTile(
                  leading: Text(
                    sector.emoji,
                    style: const TextStyle(fontSize: 24),
                  ),
                  title: Text(
                    sector.label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  subtitle: Text(sector.description),
                  trailing: sector.id == _template.id
                      ? const Icon(
                          Icons.check_circle_rounded,
                          color: _primary,
                        )
                      : null,
                  onTap: () => Navigator.pop(context, sector),
                ),
            ],
          ),
        );
      },
    );

    if (selected != null) {
      _applyTemplate(selected);
    }
  }

  Widget _buildIdentityStep() {
    return ListView(
      key: const ValueKey('agent-identity'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        _StepIntro(
          icon: Icons.face_retouching_natural_outlined,
          title: '${_template.emoji} Identité automatique',
          message:
              'Le template ${_template.label} a préconfiguré la personnalité et les capacités.',
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _personaName,
          decoration: _decoration(
            label: 'Prénom de l’assistant',
            hint: 'Ex. Aïcha',
            icon: Icons.badge_outlined,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _tone,
          minLines: 2,
          maxLines: 4,
          decoration: _decoration(
            label: 'Ton et personnalité',
            hint: 'Chaleureux, rapide et professionnel',
            icon: Icons.record_voice_over_outlined,
          ),
        ),
        const SizedBox(height: 8),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: const Text(
            'Utiliser des emojis avec modération',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          value: _emojis,
          activeColor: _primary,
          onChanged: (value) {
            setState(() => _emojis = value);
          },
        ),
        const Divider(height: 20),
        const _FieldTitle('Capacités intelligentes'),
        for (final entry in <String, String>{
          'qa': 'Répondre aux questions',
          'sell': 'Présenter et vendre',
          'appointments': 'Prendre des rendez-vous',
          'qualify': 'Qualifier les demandes',
          'handoff': 'Transférer à un humain',
        }.entries)
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text(
              entry.value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            value: _capabilities[entry.key] ?? false,
            activeColor: _primary,
            onChanged: (value) {
              setState(() {
                _capabilities[entry.key] = value;
              });
            },
          ),
        const SizedBox(height: 12),
        _NavigationButtons(
          onBack: _previousAgentStep,
          onNext: () {
            if (_personaName.text.trim().isEmpty) {
              setState(() {
                _error = 'Donnez un prénom à l’assistant.';
              });
              return;
            }
            _nextAgentStep();
          },
        ),
      ],
    );
  }

  Widget _buildDataStep() {
    return ListView(
      key: const ValueKey('agent-data'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        _StepIntro(
          icon: Icons.storage_outlined,
          title: 'Charger les données',
          message:
              'Le formulaire s’adapte au type ${SmartAgentCatalog.source(_sourceKind).label}.',
        ),
        const SizedBox(height: 12),
        _TemplatePrompts(template: _template),
        if (_needsWebsite()) ...[
          const SizedBox(height: 14),
          const _SectionTitle(
            icon: Icons.language_rounded,
            title: 'Site web',
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _websiteUrl,
            keyboardType: TextInputType.url,
            decoration: _decoration(
              label: 'Adresse du site',
              hint: 'https://...',
              icon: Icons.link_rounded,
            ),
          ),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text(
              'Analyser plusieurs pages du site',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: const Text(
              'Le backend extrait automatiquement le contenu utile.',
            ),
            value: _crawlWebsite,
            activeColor: _primary,
            onChanged: (value) {
              setState(() => _crawlWebsite = value);
            },
          ),
        ],
        if (_needsDocuments()) ...[
          const SizedBox(height: 12),
          const _SectionTitle(
            icon: Icons.description_outlined,
            title: 'Documents',
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy ? null : _pickDocuments,
            icon: const Icon(Icons.upload_file_rounded),
            label: Text(
              SmartDocumentPicker.available
                  ? 'Choisir PDF, DOCX, TXT ou MD'
                  : 'Sélecteur local non installé',
            ),
          ),
          if (!SmartDocumentPicker.available)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'Utilisez le lien ou le contenu texte ci-dessous. '
                'Aucune dépendance du projet n’est modifiée.',
                style: TextStyle(
                  color: _muted,
                  fontSize: 11.5,
                ),
              ),
            ),
          if (_pickedDocuments.isNotEmpty) ...[
            const SizedBox(height: 7),
            for (var index = 0; index < _pickedDocuments.length; index++)
              _DocumentRow(
                document: _pickedDocuments[index],
                onDelete: () {
                  setState(() {
                    _pickedDocuments.removeAt(index);
                  });
                },
              ),
          ],
        ],
        if (_needsCatalog()) ...[
          const SizedBox(height: 14),
          const _SectionTitle(
            icon: Icons.inventory_2_outlined,
            title: 'Catalogue intelligent',
          ),
          if (_partnerProducts.isNotEmpty) ...[
            const SizedBox(height: 7),
            Text(
              '${_partnerProducts.length} produit(s) détecté(s) dans Partenaire',
              style: const TextStyle(
                color: _muted,
                fontSize: 11.5,
              ),
            ),
            const SizedBox(height: 7),
            Container(
              constraints: const BoxConstraints(maxHeight: 210),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _line),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _partnerProducts.length,
                itemBuilder: (context, index) {
                  final product = _partnerProducts[index];
                  final selected = _selectedPartnerIds.contains(product.id);
                  return CheckboxListTile(
                    dense: true,
                    value: selected,
                    activeColor: _primary,
                    title: Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    subtitle: Text(
                      [
                        if (product.businessName?.isNotEmpty == true)
                          product.businessName!,
                        if (product.priceMin != null)
                          '${product.priceMin} FCFA',
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          _selectedPartnerIds.add(product.id);
                        } else {
                          _selectedPartnerIds.remove(product.id);
                        }
                      });
                    },
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 10),
          TextField(
            controller: _catalogText,
            minLines: 3,
            maxLines: 7,
            decoration: _decoration(
              label: 'Catalogue brut à analyser',
              hint: 'Collez une liste : nom, prix, description, disponibilité…',
              icon: Icons.auto_fix_high_rounded,
            ),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _parseCatalog,
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: const Text('Analyser automatiquement'),
                ),
              ),
              const SizedBox(width: 7),
              IconButton.outlined(
                tooltip: 'Ajouter manuellement',
                onPressed: _busy ? null : _addManualProduct,
                icon: const Icon(Icons.add_rounded),
              ),
            ],
          ),
          if (_manualProducts.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (var index = 0; index < _manualProducts.length; index++)
              _ProductRow(
                product: _manualProducts[index],
                onDelete: () {
                  setState(() {
                    _manualProducts.removeAt(index);
                  });
                },
              ),
          ],
        ],
        const SizedBox(height: 14),
        const _SectionTitle(
          icon: Icons.menu_book_outlined,
          title: 'Connaissances complémentaires',
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _knowledge,
          minLines: 4,
          maxLines: 10,
          decoration: _decoration(
            label: 'Informations utiles',
            hint:
                'Horaires, adresse, tarifs, règles, services, questions fréquentes…',
            icon: Icons.notes_rounded,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _knowledgeUrl,
          keyboardType: TextInputType.url,
          decoration: _decoration(
            label: 'Lien public complémentaire',
            hint: 'https://...',
            icon: Icons.link_rounded,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy ? null : _previousAgentStep,
                child: const Text('Retour'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: _MainButton(
                label: 'Créer et tester',
                icon: Icons.auto_awesome_rounded,
                busy: _busy,
                onPressed: _createAgentDraft,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTestStep() {
    final agent = _agent;

    return Column(
      key: const ValueKey('agent-test'),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 15, 16, 9),
          child: _StepIntro(
            icon: Icons.science_outlined,
            title: 'Tester ${agent?.personaName ?? 'l’agent'}',
            message:
                'Posez des questions réelles. Gemini Flash utilise les données chargées.',
          ),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 14),
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(19),
              border: Border.all(color: _line),
            ),
            child: _messages.isEmpty
                ? const _TestEmptyState()
                : ListView.separated(
                    itemCount: _messages.length + (_busy ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      if (index >= _messages.length) {
                        return const _TypingMessage();
                      }
                      return _ChatBubble(
                        message: _messages[index],
                      );
                    },
                  ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _testInput,
                  enabled: !_busy,
                  onSubmitted: (_) => _sendTest(),
                  decoration: _decoration(
                    label: 'Message de test',
                    hint: 'Ex. Quels services proposez-vous ?',
                    icon: Icons.chat_bubble_outline_rounded,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox.square(
                dimension: 52,
                child: IconButton.filled(
                  onPressed: _busy ? null : _sendTest,
                  style: IconButton.styleFrom(
                    backgroundColor: _primary,
                  ),
                  icon: const Icon(Icons.send_rounded),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : () => _finishAgent(activate: false),
                  child: const Text('Brouillon'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: _busy
                      ? null
                      : () {
                          setState(() => _agentStep = 5);
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: _primary,
                  ),
                  child: const Text('Connecter'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDeployStep() {
    return ListView(
      key: const ValueKey('agent-deploy'),
      padding: const EdgeInsets.fromLTRB(16, 17, 16, 28),
      children: [
        const _StepIntro(
          icon: Icons.rocket_launch_outlined,
          title: 'Activer sur WhatsApp',
          message:
              'Sélectionnez une ligne connectée. L’agent pourra ensuite répondre aux clients.',
        ),
        const SizedBox(height: 14),
        if (_connectedSessions.isEmpty)
          const _SmartInfo(
            icon: Icons.link_off_rounded,
            title: 'Aucune ligne connectée',
            text:
                'Enregistrez l’agent en brouillon, puis créez ou connectez une ligne WhatsApp.',
          )
        else
          for (final session in _connectedSessions) ...[
            _SessionChoice(
              session: session,
              selected: _selectedSession?.sessionName == session.sessionName,
              onTap: () {
                setState(() => _selectedSession = session);
              },
            ),
            const SizedBox(height: 8),
          ],
        const SizedBox(height: 14),
        OutlinedButton(
          onPressed: _busy ? null : () => _finishAgent(activate: false),
          child: const Text('Enregistrer en brouillon'),
        ),
        const SizedBox(height: 8),
        _MainButton(
          label: 'Activer l’agent',
          icon: Icons.rocket_launch_rounded,
          busy: _busy,
          onPressed: _connectedSessions.isEmpty
              ? null
              : () => _finishAgent(activate: true),
        ),
      ],
    );
  }

  InputDecoration _decoration({
    required String label,
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon, size: 20),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 13,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(
          color: _primary,
          width: 1.5,
        ),
      ),
    );
  }

  static T? _firstOrNull<T>(Iterable<T> values) {
    final iterator = values.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }

  static T? _firstWhereOrNull<T>(
    Iterable<T> values,
    bool Function(T item) test,
  ) {
    for (final item in values) {
      if (test(item)) return item;
    }
    return null;
  }

  static Map<String, bool> _boolMap(
    Map<String, dynamic> values, {
    required Map<String, bool> fallback,
  }) {
    final output = Map<String, bool>.from(fallback);
    for (final entry in values.entries) {
      if (entry.value is bool) {
        output[entry.key] = entry.value as bool;
      }
    }
    return output;
  }

  static SmartAgentSourceKind _sourceFromAgentType(
    String value,
  ) {
    switch (value) {
      case 'website':
        return SmartAgentSourceKind.website;
      case 'docs':
        return SmartAgentSourceKind.documents;
      default:
        return SmartAgentSourceKind.catalog;
    }
  }
}

class _SmartHeader extends StatelessWidget {
  const _SmartHeader({
    required this.title,
    required this.subtitle,
    required this.currentStep,
    required this.totalSteps,
    required this.onClose,
  });

  final String title;
  final String subtitle;
  final int currentStep;
  final int totalSteps;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(15, 10, 8, 12),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFDFF5F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF0B7F72),
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
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF667874),
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
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
          const SizedBox(height: 9),
          Row(
            children: List.generate(totalSteps, (index) {
              final active = index <= currentStep;
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(
                    right: index == totalSteps - 1 ? 0 : 5,
                  ),
                  decoration: BoxDecoration(
                    color: active
                        ? const Color(0xFF0B7F72)
                        : const Color(0xFFE0EBE8),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _StepIntro extends StatelessWidget {
  const _StepIntro({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
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
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF17211F),
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                message,
                style: const TextStyle(
                  color: Color(0xFF667874),
                  fontSize: 12.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MainButton extends StatelessWidget {
  const _MainButton({
    required this.label,
    required this.icon,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: busy ? null : onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(53),
        backgroundColor: const Color(0xFF0B7F72),
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(17),
        ),
      ),
      icon: busy
          ? const SizedBox.square(
              dimension: 19,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Icon(icon),
      label: Text(
        label,
        style: const TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _NavigationButtons extends StatelessWidget {
  const _NavigationButtons({
    required this.onBack,
    required this.onNext,
  });

  final VoidCallback onBack;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: onBack,
            child: const Text('Retour'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 2,
          child: FilledButton.icon(
            onPressed: onNext,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF0B7F72),
            ),
            icon: const Icon(Icons.arrow_forward_rounded),
            label: const Text('Continuer'),
          ),
        ),
      ],
    );
  }
}

class _SourceCard extends StatelessWidget {
  const _SourceCard({
    required this.definition,
    required this.selected,
    required this.onTap,
  });

  final SmartAgentSourceDefinition definition;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFDFF5F0) : Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color:
                  selected ? const Color(0xFF0B7F72) : const Color(0xFFDCEBE7),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 43,
                height: 43,
                decoration: BoxDecoration(
                  color: selected ? Colors.white : const Color(0xFFF0F5F3),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  definition.icon,
                  color: const Color(0xFF0B7F72),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      definition.label,
                      style: const TextStyle(
                        color: Color(0xFF17211F),
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      definition.description,
                      style: const TextStyle(
                        color: Color(0xFF667874),
                        fontSize: 11.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                selected
                    ? Icons.check_circle_rounded
                    : Icons.chevron_right_rounded,
                color: selected
                    ? const Color(0xFF0B7F72)
                    : const Color(0xFF8A9A96),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFDFF5F0) : Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 108,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color:
                  selected ? const Color(0xFF0B7F72) : const Color(0xFFDCEBE7),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: const Color(0xFF0B7F72),
                size: 27,
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF667874),
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QrOrPlaceholder extends StatelessWidget {
  const _QrOrPlaceholder({required this.value});

  final String? value;

  Uint8List? _decode() {
    final input = value;
    if (input == null || input.isEmpty) return null;
    try {
      final clean =
          input.contains(',') ? input.substring(input.indexOf(',') + 1) : input;
      final bytes = base64Decode(clean.trim());
      return bytes.length > 100 ? bytes : null;
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bytes = _decode();
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: const Color(0xFFDCEBE7)),
      ),
      child: Column(
        children: [
          if (bytes != null)
            Image.memory(
              bytes,
              width: 225,
              height: 225,
              fit: BoxFit.contain,
              gaplessPlayback: true,
            )
          else
            const SizedBox(
              height: 180,
              child: Center(
                child: Icon(
                  Icons.qr_code_2_rounded,
                  size: 82,
                  color: Color(0xFF9CB0AB),
                ),
              ),
            ),
          const SizedBox(height: 6),
          Text(
            bytes == null
                ? 'Générez le QR pour commencer.'
                : 'Scannez ce QR depuis WhatsApp.',
            style: const TextStyle(
              color: Color(0xFF667874),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _PairCodePanel extends StatelessWidget {
  const _PairCodePanel({
    required this.code,
    required this.phone,
  });

  final String? code;
  final String phone;

  @override
  Widget build(BuildContext context) {
    final value = code?.trim();
    return Container(
      padding: const EdgeInsets.all(19),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: const Color(0xFFDCEBE7)),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.pin_outlined,
            size: 40,
            color: Color(0xFF0B7F72),
          ),
          const SizedBox(height: 8),
          Text(
            value?.isNotEmpty == true ? value! : '---- ----',
            style: const TextStyle(
              color: Color(0xFF17211F),
              fontSize: 30,
              fontWeight: FontWeight.w900,
              letterSpacing: 4,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Numéro : $phone',
            style: const TextStyle(
              color: Color(0xFF667874),
              fontSize: 12,
            ),
          ),
          if (value?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value!));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Code copié'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              icon: const Icon(Icons.copy_rounded),
              label: const Text('Copier le code'),
            ),
          ],
        ],
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.recommendation,
    required this.selected,
    required this.onAnalyze,
  });

  final SmartTemplateRecommendation? recommendation;
  final SmartSectorTemplate selected;
  final VoidCallback onAnalyze;

  @override
  Widget build(BuildContext context) {
    final item = recommendation;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFDFF5F0),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.auto_awesome_rounded,
            color: Color(0xFF0B7F72),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: item == null
                ? const Text(
                    'Décrivez l’activité pour recevoir une recommandation automatique.',
                    style: TextStyle(
                      color: Color(0xFF47635D),
                      fontSize: 11.5,
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${item.template.emoji} ${item.template.label} · ${(item.confidence * 100).round()} %',
                        style: const TextStyle(
                          color: Color(0xFF075F57),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        item.reason,
                        style: const TextStyle(
                          color: Color(0xFF47635D),
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
          ),
          IconButton(
            tooltip: 'Analyser',
            onPressed: onAnalyze,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }
}

class _TemplatePrompts extends StatelessWidget {
  const _TemplatePrompts({required this.template});

  final SmartSectorTemplate template;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFDFF5F0),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${template.emoji} Données recommandées pour ${template.label}',
            style: const TextStyle(
              color: Color(0xFF075F57),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: template.dataPrompts
                .map(
                  (item) => Chip(
                    visualDensity: VisualDensity.compact,
                    side: BorderSide.none,
                    backgroundColor: Colors.white,
                    label: Text(
                      item,
                      style: const TextStyle(fontSize: 10.5),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.document,
    required this.onDelete,
  });

  final SmartPickedDocument document;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 5),
      leading: const Icon(
        Icons.description_outlined,
        color: Color(0xFF0B7F72),
      ),
      title: Text(
        document.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${(document.size / 1024).ceil()} Ko',
      ),
      trailing: IconButton(
        onPressed: onDelete,
        icon: const Icon(Icons.close_rounded),
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({
    required this.product,
    required this.onDelete,
  });

  final SmartStudioProduct product;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 5),
      leading: const Icon(
        Icons.inventory_2_outlined,
        color: Color(0xFF0B7F72),
      ),
      title: Text(
        product.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        product.priceFcfa == null
            ? (product.description ?? 'Prix sur demande')
            : '${product.priceFcfa} FCFA',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: IconButton(
        onPressed: onDelete,
        icon: const Icon(Icons.close_rounded),
      ),
    );
  }
}

class _SessionChoice extends StatelessWidget {
  const _SessionChoice({
    required this.session,
    required this.selected,
    required this.onTap,
  });

  final StudioSession session;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFDFF5F0) : Colors.white,
      borderRadius: BorderRadius.circular(17),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(17),
            border: Border.all(
              color:
                  selected ? const Color(0xFF0B7F72) : const Color(0xFFDCEBE7),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF0B7F72),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  session.sessionName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              if (selected)
                const Icon(
                  Icons.radio_button_checked_rounded,
                  color: Color(0xFF0B7F72),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 19,
          color: const Color(0xFF0B7F72),
        ),
        const SizedBox(width: 7),
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF17211F),
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _FieldTitle extends StatelessWidget {
  const _FieldTitle(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: Color(0xFF42534F),
        fontSize: 12.5,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _SmartInfo extends StatelessWidget {
  const _SmartInfo({
    required this.icon,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFDCEBE7)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: const Color(0xFF0B7F72),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  text,
                  style: const TextStyle(
                    color: Color(0xFF667874),
                    fontSize: 11.5,
                    height: 1.35,
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

class _SuccessHero extends StatelessWidget {
  const _SuccessHero({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 86,
          height: 86,
          decoration: const BoxDecoration(
            color: Color(0xFFDFF5F0),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: 49,
            color: const Color(0xFF0B7F72),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFF17211F),
            fontSize: 23,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFF667874),
            height: 1.4,
          ),
        ),
      ],
    );
  }
}

class _TestEmptyState extends StatelessWidget {
  const _TestEmptyState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.chat_bubble_outline_rounded,
              size: 44,
              color: Color(0xFF91A49F),
            ),
            SizedBox(height: 9),
            Text(
              'Testez une question réelle : prix, disponibilité, procédure, rendez-vous ou service.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF667874),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final StudioChatMessage message;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.77,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: 13,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: message.isUser
              ? const Color(0xFF0B7F72)
              : const Color(0xFFF0F5F3),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(17),
            topRight: const Radius.circular(17),
            bottomLeft: Radius.circular(message.isUser ? 17 : 5),
            bottomRight: Radius.circular(message.isUser ? 5 : 17),
          ),
        ),
        child: Text(
          message.content,
          style: TextStyle(
            color: message.isUser ? Colors.white : const Color(0xFF17211F),
            fontSize: 13.5,
            height: 1.35,
          ),
        ),
      ),
    );
  }
}

class _TypingMessage extends StatelessWidget {
  const _TypingMessage();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: Text(
        'Gemini Flash analyse les données…',
        style: TextStyle(
          color: Color(0xFF667874),
          fontSize: 12,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }
}
