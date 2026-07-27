part of 'live_whatsapp_ia_agent_module.dart';

/// Guided, responsive creation flow for one WhatsApp IA agent.
/// Kept as a part of the existing IA module so no Chat, Bots, Diffusion,
/// Partner, Stock, BI, Presence or Radar code is touched.
class LiveWhatsAppIaSmartAgentWizard extends StatefulWidget {
  const LiveWhatsAppIaSmartAgentWizard({
    super.key,
    required this.repository,
    required this.sessions,
    this.initialSessionName,
  });

  final LiveWhatsAppAiAgentRepository repository;
  final List<LiveWhatsAppSession> sessions;
  final String? initialSessionName;

  @override
  State<LiveWhatsAppIaSmartAgentWizard> createState() =>
      _LiveWhatsAppIaSmartAgentWizardState();
}

class _LiveWhatsAppIaSmartAgentWizardState
    extends State<LiveWhatsAppIaSmartAgentWizard> {
  final _name = TextEditingController();
  final _persona = TextEditingController();
  final _tone = TextEditingController();
  final _knowledge = TextEditingController();
  final _knowledgeUrl = TextEditingController();
  final _websiteUrl = TextEditingController();
  final _preview = TextEditingController();
  final _picker = ImagePicker();
  final _recorder = AudioRecorder();

  int _page = 0;
  bool _busy = false;
  bool _recording = false;
  bool _tested = false;
  String? _selectedSession;
  LiveWhatsAppAiAgent? _created;
  List<LiveAgentProduct> _partnerProducts = const <LiveAgentProduct>[];
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];
  late LiveAgentDraft _draft;

  static const _sources = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'commerce',
      'icon': Icons.inventory_2_outlined,
      'label': 'Catalogue',
      'caption': 'Produits & prix',
    },
    <String, dynamic>{
      'id': 'docs',
      'icon': Icons.description_outlined,
      'label': 'Documents',
      'caption': 'PDF, Word, notes',
    },
    <String, dynamic>{
      'id': 'website',
      'icon': Icons.language_rounded,
      'label': 'Site web',
      'caption': 'Pages & services',
    },
  ];

  static const _sourceSectors = <String, List<String>>{
    'commerce': <String>[
      'commerce',
      'food',
      'beauty',
      'electronics',
      'auto',
      'services',
    ],
    'docs': <String>[
      'health',
      'education',
      'services',
      'administration',
      'other',
    ],
    'website': <String>[
      'services',
      'commerce',
      'hospitality',
      'realestate',
      'education',
      'other',
    ],
  };

  static const _sectorPresets = <String, _SmartAgentPreset>{
    'commerce': _SmartAgentPreset(
      id: 'commerce',
      icon: '🛍️',
      label: 'Boutique',
      assistant: 'Ami·e du magasin',
      tone: 'chaleureux, vendeur et rapide',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
    ),
    'food': _SmartAgentPreset(
      id: 'food',
      icon: '🛒',
      label: 'Alimentation',
      assistant: 'Assistant commande',
      tone: 'accueillant, clair et orienté commande',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
    ),
    'beauty': _SmartAgentPreset(
      id: 'beauty',
      icon: '✨',
      label: 'Mode & beauté',
      assistant: 'Conseiller beauté',
      tone: 'élégant, chaleureux et vendeur',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'electronics': _SmartAgentPreset(
      id: 'electronics',
      icon: '📱',
      label: 'Téléphonie',
      assistant: 'Conseiller digital',
      tone: 'précis, simple et professionnel',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
    ),
    'auto': _SmartAgentPreset(
      id: 'auto',
      icon: '🚗',
      label: 'Auto & pièces',
      assistant: 'Conseiller auto',
      tone: 'pratique, précis et réactif',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'health': _SmartAgentPreset(
      id: 'health',
      icon: '🩺',
      label: 'Santé & bien-être',
      assistant: 'Assistant santé',
      tone: 'rassurant, précis et professionnel',
      capabilities: <String, bool>{
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'education': _SmartAgentPreset(
      id: 'education',
      icon: '🎓',
      label: 'Éducation',
      assistant: 'Conseiller formation',
      tone: 'pédagogue, clair et encourageant',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'administration': _SmartAgentPreset(
      id: 'administration',
      icon: '🏛️',
      label: 'Administration',
      assistant: 'Assistant accueil',
      tone: 'clair, poli et structuré',
      capabilities: <String, bool>{
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': false,
        'handoff': true,
      },
    ),
    'hospitality': _SmartAgentPreset(
      id: 'hospitality',
      icon: '🏨',
      label: 'Hôtellerie',
      assistant: 'Assistant réservation',
      tone: 'accueillant, élégant et réactif',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'realestate': _SmartAgentPreset(
      id: 'realestate',
      icon: '🏠',
      label: 'Immobilier',
      assistant: 'Conseiller immobilier',
      tone: 'professionnel, fiable et attentif',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'services': _SmartAgentPreset(
      id: 'services',
      icon: '💼',
      label: 'Services',
      assistant: 'Assistant conseil',
      tone: 'professionnel, réactif et orienté solution',
      capabilities: <String, bool>{
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
    ),
    'other': _SmartAgentPreset(
      id: 'other',
      icon: '✨',
      label: 'Autre activité',
      assistant: 'Votre assistant',
      tone: 'chaleureux et professionnel',
      capabilities: <String, bool>{
        'qa': true,
        'sell': false,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
    ),
  };

  @override
  void initState() {
    super.initState();
    _draft = LiveAgentDraft(
      name: '',
      agentType: 'commerce',
      sector: 'commerce',
      personaName: '',
      tone: '',
    );
    final connected = _connectedSessions;
    _selectedSession = widget.initialSessionName?.trim().isNotEmpty == true
        ? widget.initialSessionName
        : connected.length == 1
            ? connected.single.name
            : null;
    _applySectorPreset('commerce', notify: false);
    _loadPartnerProducts();
  }

  @override
  void dispose() {
    _name.dispose();
    _persona.dispose();
    _tone.dispose();
    _knowledge.dispose();
    _knowledgeUrl.dispose();
    _websiteUrl.dispose();
    _preview.dispose();
    unawaited(_recorder.dispose());
    super.dispose();
  }

  List<LiveWhatsAppSession> get _connectedSessions =>
      widget.sessions.where((session) => session.isWorking).toList();

  List<_SmartAgentPreset> get _recommendedSectors =>
      (_sourceSectors[_draft.agentType] ?? const <String>['other'])
          .map((id) => _sectorPresets[id])
          .whereType<_SmartAgentPreset>()
          .toList();

  String get _stepHint => switch (_page) {
        0 => '3 choix simples',
        1 => 'Import intelligent',
        _ => 'Une ligne WhatsApp',
      };

  Future<void> _loadPartnerProducts() async {
    try {
      final products = await widget.repository.listPartnerProducts();
      if (mounted) setState(() => _partnerProducts = products);
    } catch (_) {
      // The smart wizard remains usable with photo, voice and quick entry.
    }
  }

  void _syncDraft() {
    _draft
      ..name = _name.text.trim()
      ..personaName = _persona.text.trim()
      ..tone = _tone.text.trim()
      ..knowledge = _knowledge.text.trim()
      ..knowledgeUrl = _knowledgeUrl.text.trim()
      ..websiteUrl = _websiteUrl.text.trim();
  }

  void _selectSource(String source) {
    final sectors = _sourceSectors[source] ?? const <String>['other'];
    final nextSector =
        sectors.contains(_draft.sector) ? _draft.sector : sectors.first;
    setState(() {
      _draft.agentType = source;
      _applySectorPreset(nextSector, notify: false);
    });
  }

  void _applySectorPreset(String sector, {bool notify = true}) {
    final preset = _sectorPresets[sector] ?? _sectorPresets['other']!;
    _draft
      ..sector = preset.id
      ..personaName = preset.assistant
      ..tone = preset.tone
      ..capabilities = Map<String, bool>.from(preset.capabilities);
    _persona.text = preset.assistant;
    _tone.text = preset.tone;
    if (notify && mounted) {
      setState(() {});
    }
  }

  bool get _identityReady =>
      _name.text.trim().isNotEmpty && _persona.text.trim().isNotEmpty;

  Future<void> _next() async {
    if (_page == 0) {
      _syncDraft();
      if (!_identityReady) {
        _notice('Saisissez le nom de votre activité.');
        return;
      }
      setState(() => _page = 1);
      return;
    }
    await _createForTest();
  }

  Future<void> _createForTest() async {
    _syncDraft();
    if (_draft.agentType == 'docs' && _draft.documents.isEmpty) {
      _notice('Ajoutez au moins un document ou choisissez une autre source.');
      return;
    }
    if (_draft.agentType == 'website' && _draft.websiteUrl.trim().isEmpty) {
      _notice('Ajoutez l’adresse de votre site web.');
      return;
    }

    setState(() => _busy = true);
    try {
      _created = await widget.repository.createTestingDraft(_draft);
      if (mounted) setState(() => _page = 2);
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDocuments() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf', 'docx', 'txt', 'md'],
      allowMultiple: true,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;

    setState(() => _busy = true);
    try {
      final documents = <LiveAgentDocument>[];
      for (final file in result.files) {
        final bytes = file.bytes ??
            (file.path == null ? null : await File(file.path!).readAsBytes());
        if (bytes == null || bytes.isEmpty) {
          throw const LiveWhatsAppIaException('Un document est inaccessible.');
        }
        documents.add(
          await widget.repository.uploadDocument(name: file.name, bytes: bytes),
        );
      }
      if (!mounted) return;
      setState(() => _draft.documents.addAll(documents));
      _notice('${documents.length} document(s) ajouté(s).', success: true);
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeDocument(int index) async {
    final document = _draft.documents[index];
    setState(() => _busy = true);
    try {
      await widget.repository.deleteDocument(document);
      if (mounted) setState(() => _draft.documents.removeAt(index));
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _parseImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _ImageSourceSheet(
        onCamera: () => Navigator.pop(context, ImageSource.camera),
        onGallery: () => Navigator.pop(context, ImageSource.gallery),
      ),
    );
    if (source == null) return;
    final image = await _picker.pickImage(source: source, imageQuality: 82);
    if (image == null) return;

    setState(() => _busy = true);
    try {
      final products = await widget.repository.parseProductImage(image);
      if (!mounted) return;
      setState(() => _mergeProducts(products));
      _notice(
        products.isEmpty
            ? 'Aucun article net n’a été détecté. Ajoutez-le en saisie rapide.'
            : '${products.length} article(s) détecté(s). Vérifiez puis continuez.',
        success: products.isNotEmpty,
      );
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleVoice() async {
    if (_recording) {
      await _stopVoice();
    } else {
      await _startVoice();
    }
  }

  Future<void> _startVoice() async {
    try {
      final granted = await _recorder.hasPermission();
      if (!granted) {
        throw const LiveWhatsAppIaException(
          'Autorisez le microphone pour dicter votre catalogue.',
        );
      }
      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/waouh-agent-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: path,
      );
      if (mounted) setState(() => _recording = true);
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    }
  }

  Future<void> _stopVoice() async {
    setState(() {
      _recording = false;
      _busy = true;
    });
    try {
      final path = await _recorder.stop();
      if (path == null) {
        throw const LiveWhatsAppIaException('La dictée est trop courte.');
      }
      final bytes = await File(path).readAsBytes();
      final products = await widget.repository.parseVoiceAudio(
        bytes: bytes,
        mimeType: 'audio/mp4',
      );
      if (!mounted) return;
      setState(() => _mergeProducts(products));
      _notice(
        products.isEmpty
            ? 'La dictée a été entendue, mais aucun article net n’a été détecté.'
            : '${products.length} article(s) détecté(s) depuis la dictée.',
        success: products.isNotEmpty,
      );
    } catch (error) {
      _notice(_edgeDiagnostic('$error'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _mergeProducts(List<LiveAgentProduct> values) {
    final known = _draft.manualProducts
        .map((item) => item.name.trim().toLowerCase())
        .where((item) => item.isNotEmpty)
        .toSet();
    for (final product in values) {
      final key = product.name.trim().toLowerCase();
      if (key.isNotEmpty && known.add(key)) {
        _draft.manualProducts.add(product);
      }
    }
  }

  Future<void> _editProduct({int? index}) async {
    final existing = index == null ? null : _draft.manualProducts[index];
    final name = TextEditingController(text: existing?.name ?? '');
    final price =
        TextEditingController(text: existing?.price?.toString() ?? '');
    final description =
        TextEditingController(text: existing?.description ?? '');

    final product = await showDialog<LiveAgentProduct>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(existing == null ? 'Saisie rapide' : 'Corriger l’article'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: name,
                textCapitalization: TextCapitalization.sentences,
                decoration:
                    const InputDecoration(labelText: 'Nom de l’article'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Prix FCFA (optionnel)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: description,
                minLines: 2,
                maxLines: 4,
                decoration:
                    const InputDecoration(labelText: 'Détail (optionnel)'),
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              final clean = name.text.trim();
              if (clean.isEmpty) return;
              Navigator.pop(
                context,
                LiveAgentProduct(
                  name: clean,
                  price: int.tryParse(
                      price.text.replaceAll(RegExp(r'[^0-9]'), '')),
                  description: description.text.trim().isEmpty
                      ? null
                      : description.text.trim(),
                ),
              );
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    name.dispose();
    price.dispose();
    description.dispose();
    if (product == null || !mounted) return;
    setState(() {
      if (index == null) {
        _draft.manualProducts.add(product);
      } else {
        _draft.manualProducts[index] = product;
      }
    });
  }

  Future<void> _choosePartnerProducts() async {
    if (_partnerProducts.isEmpty) {
      _notice('Votre catalogue partenaire ne contient pas encore de produit.');
      return;
    }
    final selected = Set<String>.from(_draft.selectedPartnerProductIds);
    final changed = await showModalBottomSheet<Set<String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
          child: StatefulBuilder(
            builder: (context, setModalState) => Column(
              children: <Widget>[
                const Row(
                  children: <Widget>[
                    Icon(Icons.inventory_2_outlined, color: _agentGreen),
                    SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        'Choisir dans mon catalogue',
                        style: TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 18),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    itemCount: _partnerProducts.length,
                    itemBuilder: (_, index) {
                      final product = _partnerProducts[index];
                      final id = product.id;
                      final enabled = id != null && selected.contains(id);
                      return CheckboxListTile(
                        value: enabled,
                        activeColor: _agentGreen,
                        title: Text(product.name,
                            style:
                                const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: Text(product.priceLabel),
                        onChanged: id == null
                            ? null
                            : (value) => setModalState(() {
                                  if (value == true) {
                                    selected.add(id);
                                  } else {
                                    selected.remove(id);
                                  }
                                }),
                      );
                    },
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, selected),
                    style: FilledButton.styleFrom(backgroundColor: _agentGreen),
                    child: Text('Utiliser ${selected.length} article(s)'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (changed != null && mounted) {
      setState(() {
        _draft.selectedPartnerProductIds
          ..clear()
          ..addAll(changed);
      });
    }
  }

  Future<void> _sendSandbox() async {
    final text = _preview.text.trim();
    final agent = _created;
    if (text.isEmpty || agent == null) return;
    setState(() {
      _messages.add(LiveAgentMessage(role: 'user', content: text));
      _preview.clear();
      _busy = true;
    });
    try {
      final reply = await widget.repository.sandbox(
        agent: agent,
        message: text,
        history: _messages,
      );
      if (mounted) {
        setState(() {
          _messages.add(LiveAgentMessage(role: 'assistant', content: reply));
          _tested = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _messages.add(
            LiveAgentMessage(
              role: 'assistant',
              content: '⚠️ ${_edgeDiagnostic('$error')}',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save(
      {required bool activate, bool replaceExisting = false}) async {
    final agent = _created;
    if (agent == null) return;
    if (activate && !_tested) {
      _notice('Envoyez un message de test avant d’activer votre agent.');
      return;
    }
    if (activate && _selectedSession == null) {
      _notice('Connectez ou choisissez une ligne WhatsApp.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.repository.deploy(
        agent: agent,
        sessionName: activate ? _selectedSession : null,
        replaceExisting: replaceExisting,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      final message = _edgeDiagnostic('$error');
      if (activate && message.contains('déjà utilisée')) {
        final replace = await _confirmReplace(message);
        if (replace == true && mounted) {
          await _save(activate: true, replaceExisting: true);
          return;
        }
      }
      _notice(message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<bool?> _confirmReplace(String message) => showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Remplacer l’agent actif ?'),
          content: Text('$message\n\nL’ancien agent sera mis en pause.'),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Remplacer'),
            ),
          ],
        ),
      );

  void _notice(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: success ? const Color(0xFF159B65) : _agentInk,
        content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          foregroundColor: _agentInk,
          elevation: 0,
          titleSpacing: 8,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Nouvel Agent IA · ${_page + 1}/3',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              Text(
                _stepHint,
                style: const TextStyle(
                    color: _agentMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700),
              ),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(12),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
              child: Row(
                children: List<Widget>.generate(
                  3,
                  (index) => Expanded(
                    child: Container(
                      height: 6,
                      margin: EdgeInsets.only(right: index == 2 ? 0 : 7),
                      decoration: BoxDecoration(
                        color: index <= _page
                            ? _agentBright
                            : const Color(0xFFE5ECE8),
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: <Widget>[
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                  child: switch (_page) {
                    0 => _identityPage(),
                    1 => _knowledgePage(),
                    _ => _activationPage(),
                  },
                ),
              ),
              _footer(),
            ],
          ),
        ),
      );

  Widget _identityPage() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _SmartPageHeader(
            title: 'Votre activité',
            subtitle:
                'Choisissez une source. Le profil se prépare automatiquement.',
          ),
          const SizedBox(height: 18),
          _smartField(
            controller: _name,
            label: 'Nom de l’activité',
            hint: 'Ex. Boutique Chic Cotonou',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 22),
          const Text(
            'Source de connaissance',
            style: TextStyle(
                color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = (constraints.maxWidth - 10) / 2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _sources.map((source) {
                  final selected = _draft.agentType == source['id'];
                  return SizedBox(
                    width: width,
                    child: _SmartSourceCard(
                      selected: selected,
                      icon: source['icon'] as IconData,
                      title: source['label'] as String,
                      caption: source['caption'] as String,
                      onTap: () => _selectSource(source['id'] as String),
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 22),
          const Text(
            'Secteur suggéré',
            style: TextStyle(
                color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            'Adapté automatiquement à votre source.',
            style: const TextStyle(color: _agentMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _recommendedSectors.map((preset) {
              final selected = _draft.sector == preset.id;
              return ChoiceChip(
                selected: selected,
                showCheckmark: false,
                selectedColor: const Color(0xFFE5F7ED),
                label: Text('${preset.icon} ${preset.label}'),
                labelStyle: TextStyle(
                  color: selected ? _agentGreen : _agentInk,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                ),
                side: BorderSide(
                  color: selected ? _agentBright : const Color(0xFFDDE7E2),
                  width: selected ? 1.5 : 1,
                ),
                onSelected: (_) => setState(
                    () => _applySectorPreset(preset.id, notify: false)),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          _SmartAutoProfileCard(
            assistant: _persona.text,
            tone: _tone.text,
            onCustomize: () => _openProfileEditor(),
          ),
        ],
      );

  Widget _knowledgePage() {
    final commerce = _draft.agentType == 'commerce';
    final docs = _draft.agentType == 'docs';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _SmartPageHeader(
          title: commerce
              ? 'Votre catalogue'
              : docs
                  ? 'Vos documents'
                  : 'Votre site web',
          subtitle: commerce
              ? 'Ajoutez une photo, une dictée ou votre catalogue existant.'
              : docs
                  ? 'Ajoutez vos documents ; l’agent apprend de leur contenu.'
                  : 'Ajoutez l’adresse du site que l’agent doit connaître.',
        ),
        const SizedBox(height: 18),
        if (commerce) ..._commerceKnowledge(),
        if (docs) ..._documentKnowledge(),
        if (_draft.agentType == 'website') ..._websiteKnowledge(),
        const SizedBox(height: 22),
        const Text(
          'Informations utiles',
          style: TextStyle(
              color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          'Horaires, livraison, paiement ou réponses fréquentes.',
          style: TextStyle(color: _agentMuted, fontSize: 12.5),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _knowledge,
          minLines: 3,
          maxLines: 6,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'Ex. Livraison Cotonou/Calavi. Mobile Money accepté.',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 10),
        _smartField(
          controller: _knowledgeUrl,
          label: 'Lien complémentaire',
          hint: 'Optionnel',
          keyboardType: TextInputType.url,
        ),
      ],
    );
  }

  List<Widget> _commerceKnowledge() => <Widget>[
        LayoutBuilder(
          builder: (context, constraints) {
            final width = (constraints.maxWidth - 10) / 2;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                SizedBox(
                  width: width,
                  child: _SmartActionTile(
                    icon: Icons.photo_camera_back_outlined,
                    label: 'Scanner une photo',
                    helper: 'Catalogue ou prix',
                    onTap: _busy ? null : _parseImage,
                  ),
                ),
                SizedBox(
                  width: width,
                  child: _SmartActionTile(
                    icon: _recording
                        ? Icons.stop_circle_outlined
                        : Icons.mic_none_rounded,
                    label: _recording
                        ? 'Arrêter la dictée'
                        : 'Dicter mon catalogue',
                    helper: _recording
                        ? 'Enregistrement en cours'
                        : 'Parlez naturellement',
                    highlighted: _recording,
                    onTap: _busy && !_recording ? null : _toggleVoice,
                  ),
                ),
                SizedBox(
                  width: width,
                  child: _SmartActionTile(
                    icon: Icons.inventory_2_outlined,
                    label: 'Mon catalogue',
                    helper: _partnerProducts.isEmpty
                        ? 'Aucun produit synchronisé'
                        : '${_partnerProducts.length} produit(s) disponible(s)',
                    onTap: _busy ? null : _choosePartnerProducts,
                  ),
                ),
                SizedBox(
                  width: width,
                  child: _SmartActionTile(
                    icon: Icons.add_circle_outline_rounded,
                    label: 'Saisie rapide',
                    helper: 'Un article à la fois',
                    onTap: _busy ? null : () => _editProduct(),
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 18),
        _SmartDetectedSummary(
          manualCount: _draft.manualProducts.length,
          partnerCount: _draft.selectedPartnerProductIds.length,
        ),
        if (_draft.manualProducts.isNotEmpty) ...<Widget>[
          const SizedBox(height: 10),
          ..._draft.manualProducts.asMap().entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _SmartProductTile(
                    product: entry.value,
                    onEdit: () => _editProduct(index: entry.key),
                    onDelete: () => setState(
                        () => _draft.manualProducts.removeAt(entry.key)),
                  ),
                ),
              ),
        ],
      ];

  List<Widget> _documentKnowledge() => <Widget>[
        _SmartPrimaryCard(
          icon: Icons.upload_file_rounded,
          title: 'Ajouter des documents',
          subtitle: _draft.documents.isEmpty
              ? 'PDF, Word, TXT ou MD'
              : '${_draft.documents.length} document(s) prêt(s)',
          button: 'Choisir les fichiers',
          onPressed: _busy ? null : _pickDocuments,
        ),
        if (_draft.documents.isNotEmpty) ...<Widget>[
          const SizedBox(height: 10),
          ..._draft.documents.asMap().entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _SmartDocumentTile(
                    document: entry.value,
                    onDelete: _busy ? null : () => _removeDocument(entry.key),
                  ),
                ),
              ),
        ],
      ];

  List<Widget> _websiteKnowledge() => <Widget>[
        _smartField(
          controller: _websiteUrl,
          label: 'Adresse du site',
          hint: 'https://votre-site.com',
          keyboardType: TextInputType.url,
        ),
        const SizedBox(height: 10),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          activeColor: _agentGreen,
          value: _draft.crawlSite,
          title: const Text('Analyser les pages importantes',
              style: TextStyle(fontWeight: FontWeight.w800)),
          subtitle: const Text('Catalogue, services et informations utiles.',
              style: TextStyle(fontSize: 12, color: _agentMuted)),
          onChanged: _busy
              ? null
              : (value) => setState(() => _draft.crawlSite = value),
        ),
      ];

  Widget _activationPage() {
    final connected = _connectedSessions;
    final linkedSession = _selectedSession == null
        ? null
        : _studioSessionLabel(widget.sessions, _selectedSession);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _SmartPageHeader(
          title: _tested ? 'Votre agent est prêt' : 'Testez votre agent',
          subtitle: _tested
              ? 'Une dernière action : activer une ligne WhatsApp.'
              : 'Écrivez comme un client. Aucun message WhatsApp ne part pendant ce test.',
        ),
        const SizedBox(height: 16),
        _SmartStatusRow(
          icon: _tested
              ? Icons.check_circle_rounded
              : Icons.chat_bubble_outline_rounded,
          title: _tested ? 'Test réalisé' : 'Test à faire',
          subtitle:
              _tested ? 'L’agent a répondu.' : 'Envoyez une question simple.',
          complete: _tested,
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFDDEBE4)),
          ),
          child: Column(
            children: <Widget>[
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children: <Widget>[
                  _SmartPrompt(
                      label: 'Que vendez-vous ?',
                      onTap: () =>
                          _preview.text = 'Bonjour, que vendez-vous ?'),
                  _SmartPrompt(
                      label: 'Quel est le prix ?',
                      onTap: () => _preview.text = 'Quel est le prix ?'),
                  _SmartPrompt(
                      label: 'Je veux un humain',
                      onTap: () =>
                          _preview.text = 'Je veux parler à une personne.'),
                ],
              ),
              const SizedBox(height: 12),
              _SmartChat(messages: _messages, busy: _busy),
              const SizedBox(height: 10),
              Row(
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _preview,
                      enabled: !_busy,
                      onSubmitted: (_) => _sendSandbox(),
                      decoration: const InputDecoration(
                          hintText: 'Écrivez comme un client…'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _busy ? null : _sendSandbox,
                    style: IconButton.styleFrom(backgroundColor: _agentGreen),
                    icon: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        const Text(
          'Ligne WhatsApp',
          style: TextStyle(
              color: _agentInk, fontSize: 17, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 7),
        if (connected.isEmpty)
          const _SmartEmptySessionCard()
        else ...<Widget>[
          DropdownButtonFormField<String>(
            value: _selectedSession,
            decoration:
                const InputDecoration(prefixIcon: Icon(Icons.forum_outlined)),
            hint: const Text('Choisir une ligne connectée'),
            items: connected
                .map(
                  (session) => DropdownMenuItem<String>(
                    value: session.name,
                    child: Text(
                        '${session.name}${session.phone == null ? '' : ' · ${session.displayPhone}'}'),
                  ),
                )
                .toList(),
            onChanged: _busy
                ? null
                : (value) => setState(() => _selectedSession = value),
          ),
          const SizedBox(height: 9),
          _SmartStatusRow(
            icon: Icons.link_rounded,
            title: linkedSession == null
                ? 'Choisissez une ligne'
                : 'Ligne prête : $linkedSession',
            subtitle: linkedSession == null
                ? 'Une seule IA active par ligne.'
                : 'Votre agent répondra sur cette ligne après activation.',
            complete: linkedSession != null,
          ),
        ],
      ],
    );
  }

  Widget _footer() => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE2EBE6))),
          ),
          child: Row(
            children: <Widget>[
              if (_page > 0)
                TextButton.icon(
                  onPressed: _busy ? null : () => setState(() => _page--),
                  icon: const Icon(Icons.chevron_left_rounded),
                  label: const Text('Précédent'),
                )
              else
                const SizedBox(width: 8),
              const Spacer(),
              if (_page < 2)
                FilledButton.icon(
                  onPressed: _busy ? null : _next,
                  style: FilledButton.styleFrom(
                    backgroundColor: _agentGreen,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(148, 50),
                  ),
                  icon: _busy
                      ? const _TinyLoader()
                      : const Icon(Icons.arrow_forward_rounded),
                  label: Text(_page == 0 ? 'Continuer' : 'Créer et tester'),
                )
              else ...<Widget>[
                OutlinedButton(
                  onPressed: _busy ? null : () => _save(activate: false),
                  child: const Text('Brouillon'),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _busy || !_tested || _selectedSession == null
                      ? null
                      : () => _save(activate: true),
                  style: FilledButton.styleFrom(
                    backgroundColor: _agentBright,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(0, 50),
                  ),
                  icon: _busy
                      ? const _TinyLoader()
                      : const Icon(Icons.rocket_launch_rounded, size: 18),
                  label: const Text('Activer'),
                ),
              ],
            ],
          ),
        ),
      );

  Widget _smartField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType? keyboardType,
    ValueChanged<String>? onChanged,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(label,
              style: const TextStyle(
                  color: _agentInk,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            onChanged: onChanged,
            decoration: InputDecoration(hintText: hint),
          ),
        ],
      );

  Future<void> _openProfileEditor() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (context) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
              18, 18, 18, 18 + MediaQuery.viewInsetsOf(context).bottom),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text('Personnaliser',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                _smartField(
                    controller: _persona,
                    label: 'Prénom de l’assistant',
                    hint: 'Ex. Aïcha'),
                const SizedBox(height: 12),
                _smartField(
                    controller: _tone,
                    label: 'Ton',
                    hint: 'Ex. chaleureux et professionnel'),
                const SizedBox(height: 8),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  activeColor: _agentGreen,
                  value: _draft.emojis,
                  title: const Text('Utiliser des emojis',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                  onChanged: (value) => setState(() => _draft.emojis = value),
                ),
                const Divider(),
                ...const <(String, String)>[
                  ('qa', 'Répondre aux questions'),
                  ('sell', 'Présenter et vendre'),
                  ('appointments', 'Prendre des rendez-vous'),
                  ('qualify', 'Qualifier les besoins'),
                  ('handoff', 'Passer la main à un humain'),
                ].map(
                  (item) => SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    activeColor: _agentGreen,
                    value: _draft.capabilities[item.$1] == true,
                    title: Text(item.$2,
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    onChanged: (value) =>
                        setState(() => _draft.capabilities[item.$1] = value),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      _syncDraft();
                      Navigator.pop(context);
                    },
                    style: FilledButton.styleFrom(backgroundColor: _agentGreen),
                    child: const Text('Enregistrer'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (mounted) setState(() {});
  }
}

class _SmartAgentPreset {
  const _SmartAgentPreset({
    required this.id,
    required this.icon,
    required this.label,
    required this.assistant,
    required this.tone,
    required this.capabilities,
  });

  final String id;
  final String icon;
  final String label;
  final String assistant;
  final String tone;
  final Map<String, bool> capabilities;
}

class _SmartPageHeader extends StatelessWidget {
  const _SmartPageHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(title,
              style: const TextStyle(
                  color: _agentInk, fontSize: 25, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(subtitle,
              style: const TextStyle(
                  color: _agentMuted, fontSize: 14, height: 1.3)),
        ],
      );
}

class _SmartSourceCard extends StatelessWidget {
  const _SmartSourceCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.caption,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final String caption;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          height: 116,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE9F9F1) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? _agentBright : const Color(0xFFDDE7E2),
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(icon, color: selected ? _agentGreen : _agentMuted),
                  const Spacer(),
                  if (selected)
                    const Icon(Icons.check_circle_rounded,
                        color: _agentGreen, size: 20),
                ],
              ),
              const Spacer(),
              Text(title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _agentInk,
                      fontSize: 16,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 2),
              Text(caption,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _agentMuted, fontSize: 12, height: 1.15)),
            ],
          ),
        ),
      );
}

class _SmartAutoProfileCard extends StatelessWidget {
  const _SmartAutoProfileCard({
    required this.assistant,
    required this.tone,
    required this.onCustomize,
  });

  final String assistant;
  final String tone;
  final VoidCallback onCustomize;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFFFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Icon(Icons.auto_awesome_rounded, color: _agentGreen),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text('Profil préparé',
                      style: TextStyle(
                          color: _agentInk, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 3),
                  Text('$assistant · $tone',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: _agentMuted, fontSize: 12.5, height: 1.25)),
                ],
              ),
            ),
            TextButton(onPressed: onCustomize, child: const Text('Modifier')),
          ],
        ),
      );
}

class _SmartActionTile extends StatelessWidget {
  const _SmartActionTile({
    required this.icon,
    required this.label,
    required this.helper,
    this.highlighted = false,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String helper;
  final bool highlighted;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Ink(
          height: 132,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: highlighted ? const Color(0xFFFFF4F4) : Colors.white,
            borderRadius: BorderRadius.circular(17),
            border: Border.all(
                color: highlighted
                    ? const Color(0xFFF2B8B8)
                    : const Color(0xFFCFE8DC)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(icon,
                  color: highlighted ? const Color(0xFFD94747) : _agentGreen),
              const Spacer(),
              Text(label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _agentInk,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(helper,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _agentMuted, fontSize: 11.5, height: 1.15)),
            ],
          ),
        ),
      );
}

class _SmartDetectedSummary extends StatelessWidget {
  const _SmartDetectedSummary(
      {required this.manualCount, required this.partnerCount});

  final int manualCount;
  final int partnerCount;

  @override
  Widget build(BuildContext context) {
    final total = manualCount + partnerCount;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF9F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFC5EBD9)),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.auto_awesome_rounded, color: _agentGreen),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              total == 0
                  ? 'Ajoutez une photo, une dictée ou un article.'
                  : '$total élément(s) prêt(s) pour votre agent.',
              style: const TextStyle(
                  color: _agentInk, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _SmartProductTile extends StatelessWidget {
  const _SmartProductTile(
      {required this.product, required this.onEdit, required this.onDelete});

  final LiveAgentProduct product;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFDDE7E2)),
        ),
        child: Row(
          children: <Widget>[
            const Icon(Icons.inventory_2_outlined, color: _agentGreen),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  Text(
                      '${product.priceLabel}${product.description?.isNotEmpty == true ? ' · ${product.description}' : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          const TextStyle(color: _agentMuted, fontSize: 11.5)),
                ],
              ),
            ),
            IconButton(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20)),
            IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline_rounded,
                    color: Color(0xFFD94747), size: 20)),
          ],
        ),
      );
}

class _SmartPrimaryCard extends StatelessWidget {
  const _SmartPrimaryCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.button,
    required this.onPressed,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String button;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFCFE8DC)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(icon, color: _agentGreen, size: 28),
            const SizedBox(height: 12),
            Text(title,
                style: const TextStyle(
                    color: _agentInk,
                    fontSize: 17,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 3),
            Text(subtitle,
                style: const TextStyle(color: _agentMuted, fontSize: 12.5)),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onPressed,
                icon: const Icon(Icons.add_rounded),
                label: Text(button),
              ),
            ),
          ],
        ),
      );
}

class _SmartDocumentTile extends StatelessWidget {
  const _SmartDocumentTile({required this.document, this.onDelete});

  final LiveAgentDocument document;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFDDE7E2)),
        ),
        child: Row(
          children: <Widget>[
            const Icon(Icons.description_outlined, color: _agentGreen),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(document.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  Text(document.sizeLabel,
                      style:
                          const TextStyle(color: _agentMuted, fontSize: 11.5)),
                ],
              ),
            ),
            IconButton(
                onPressed: onDelete, icon: const Icon(Icons.close_rounded)),
          ],
        ),
      );
}

class _SmartStatusRow extends StatelessWidget {
  const _SmartStatusRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.complete,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool complete;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: complete ? const Color(0xFFEAF9F2) : Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
              color:
                  complete ? const Color(0xFFC5EBD9) : const Color(0xFFDDE7E2)),
        ),
        child: Row(
          children: <Widget>[
            Icon(complete ? Icons.check_circle_rounded : icon,
                color: complete ? _agentGreen : _agentMuted),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title,
                      style: const TextStyle(
                          color: _agentInk, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: const TextStyle(color: _agentMuted, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _SmartPrompt extends StatelessWidget {
  const _SmartPrompt({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ActionChip(
        onPressed: onTap,
        backgroundColor: const Color(0xFFF5FBF7),
        side: const BorderSide(color: Color(0xFFCDE8DA)),
        label: Text(label,
            style:
                const TextStyle(color: _agentInk, fontWeight: FontWeight.w800)),
      );
}

class _SmartChat extends StatelessWidget {
  const _SmartChat({required this.messages, required this.busy});

  final List<LiveAgentMessage> messages;
  final bool busy;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minHeight: 170, maxHeight: 285),
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FCFA),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFE0ECE5)),
        ),
        child: messages.isEmpty && !busy
            ? const Center(
                child: Text('Votre test apparaîtra ici.',
                    style: TextStyle(color: _agentMuted)),
              )
            : ListView.separated(
                shrinkWrap: true,
                itemCount: messages.length + (busy ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 7),
                itemBuilder: (_, index) {
                  if (index >= messages.length) {
                    return const Align(
                      alignment: Alignment.centerLeft,
                      child: _TinyLoader(),
                    );
                  }
                  final item = messages[index];
                  final user = item.role == 'user';
                  return Align(
                    alignment:
                        user ? Alignment.centerRight : Alignment.centerLeft,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 290),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: user ? _agentGreen : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: user
                              ? null
                              : Border.all(color: const Color(0xFFDDE7E2)),
                        ),
                        child: Text(
                          item.content,
                          style: TextStyle(
                              color: user ? Colors.white : _agentInk,
                              height: 1.25),
                        ),
                      ),
                    ),
                  );
                },
              ),
      );
}

class _SmartEmptySessionCard extends StatelessWidget {
  const _SmartEmptySessionCard();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEE),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1DE9C)),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(Icons.info_outline_rounded, color: Color(0xFF8B6B16)),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Aucune ligne connectée. Enregistrez le brouillon, puis connectez une ligne depuis WhatsApp IA.',
                style: TextStyle(color: Color(0xFF6F581C), height: 1.3),
              ),
            ),
          ],
        ),
      );
}
