import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import 'live_whatsapp_ia_agent_models.dart';
import 'live_whatsapp_ia_agent_repository.dart';
import 'live_whatsapp_ia_models.dart';

const _wizardGreen = Color(0xFF08756A);
const _wizardBright = Color(0xFF25D366);
const _wizardInk = Color(0xFF16231F);
const _wizardMuted = Color(0xFF62756D);

class LiveWhatsAppIaAgentWizard extends StatefulWidget {
  const LiveWhatsAppIaAgentWizard({
    super.key,
    required this.repository,
    required this.sessions,
    this.initialSessionName,
  });

  final LiveWhatsAppAiAgentRepository repository;
  final List<LiveWhatsAppSession> sessions;
  final String? initialSessionName;

  @override
  State<LiveWhatsAppIaAgentWizard> createState() =>
      _LiveWhatsAppIaAgentWizardState();
}

class _LiveWhatsAppIaAgentWizardState
    extends State<LiveWhatsAppIaAgentWizard> {
  final _name = TextEditingController();
  final _assistant = TextEditingController(text: 'Ami·e du magasin');
  final _notes = TextEditingController();
  final _website = TextEditingController();
  final _sandbox = TextEditingController();
  final _imagePicker = ImagePicker();
  final stt.SpeechToText _speech = stt.SpeechToText();

  late LiveAgentDraft _draft;
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];
  List<LiveAgentProduct> _partnerProducts = const <LiveAgentProduct>[];
  LiveWhatsAppAiAgent? _created;
  int _page = 0;
  bool _busy = false;
  bool _listening = false;
  String _transcript = '';
  String? _selectedSession;

  static const List<Map<String, dynamic>> _types = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'commerce',
      'label': 'Commerce',
      'short': 'Catalogue',
      'icon': Icons.shopping_bag_outlined,
    },
    <String, dynamic>{
      'id': 'docs',
      'label': 'Documents',
      'short': 'PDF · Word',
      'icon': Icons.description_outlined,
    },
    <String, dynamic>{
      'id': 'website',
      'label': 'Site web',
      'short': 'Votre site',
      'icon': Icons.language_rounded,
    },
  ];

  static const List<Map<String, String>> _sectors = <Map<String, String>>[
    <String, String>{'id': 'commerce', 'emoji': '🛍️', 'label': 'Boutique'},
    <String, String>{'id': 'restaurant', 'emoji': '🍽️', 'label': 'Restaurant'},
    <String, String>{'id': 'health', 'emoji': '🩺', 'label': 'Santé'},
    <String, String>{'id': 'services', 'emoji': '💼', 'label': 'Services'},
    <String, String>{'id': 'education', 'emoji': '🎓', 'label': 'Formation'},
    <String, String>{'id': 'other', 'emoji': '✨', 'label': 'Autre'},
  ];

  @override
  void initState() {
    super.initState();
    _draft = LiveAgentDraft(
      name: '',
      agentType: 'commerce',
      sector: 'commerce',
      personaName: _assistant.text,
      tone: 'professionnel',
    );
    _selectedSession = widget.initialSessionName;
    _loadProducts();
  }

  @override
  void dispose() {
    _name.dispose();
    _assistant.dispose();
    _notes.dispose();
    _website.dispose();
    _sandbox.dispose();
    unawaited(_speech.cancel());
    super.dispose();
  }

  Future<void> _loadProducts() async {
    try {
      final products = await widget.repository.listPartnerProducts();
      if (mounted) setState(() => _partnerProducts = products);
    } catch (_) {
      // A manual catalogue remains available if the Partner module is empty.
    }
  }

  List<LiveWhatsAppSession> get _connected =>
      widget.sessions.where((item) => item.isWorking).toList();

  void _syncDraft() {
    _draft
      ..name = _name.text.trim()
      ..personaName = _assistant.text.trim()
      ..notes = _notes.text.trim()
      ..websiteUrl = _website.text.trim();
  }

  Future<void> _next() async {
    _syncDraft();
    if (_page == 0) {
      if (_draft.name.isEmpty || _draft.personaName.isEmpty) {
        _toast('Ajoutez le nom de l’activité et de votre assistant.');
        return;
      }
      setState(() => _page = 1);
      return;
    }
    if (_page == 1) {
      if (_draft.agentType == 'docs' && _draft.documents.isEmpty) {
        _toast('Ajoutez au moins un document.');
        return;
      }
      if (_draft.agentType == 'website' && _draft.websiteUrl.isEmpty) {
        _toast('Ajoutez l’adresse de votre site web.');
        return;
      }
      setState(() => _busy = true);
      try {
        _created = await widget.repository.createTestingDraft(_draft);
        if (mounted) setState(() => _page = 2);
      } catch (error) {
        _toast('$error');
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }
  }

  Future<void> _pickDocuments() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf', 'docx', 'txt', 'md'],
      allowMultiple: true,
      withData: true,
    );
    if (result == null) return;
    setState(() => _busy = true);
    try {
      final uploaded = <LiveAgentDocument>[];
      for (final file in result.files) {
        final Uint8List? bytes = file.bytes ??
            (file.path == null ? null : await File(file.path!).readAsBytes());
        if (bytes == null) {
          throw LiveWhatsAppIaException('Impossible de lire « ${file.name} ».');
        }
        uploaded.add(await widget.repository.uploadDocument(
          name: file.name,
          bytes: bytes,
        ));
      }
      if (!mounted) return;
      setState(() => _draft.documents.addAll(uploaded));
      _toast('${uploaded.length} document(s) ajoutés.', success: true);
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _ImageSourceSheet(
        onCamera: () => Navigator.pop(context, ImageSource.camera),
        onGallery: () => Navigator.pop(context, ImageSource.gallery),
      ),
    );
    if (source == null) return;
    final image = await _imagePicker.pickImage(source: source, imageQuality: 82);
    if (image == null) return;
    setState(() => _busy = true);
    try {
      final products = await widget.repository.parseProductImage(image);
      if (!mounted) return;
      setState(() => _draft.manualProducts.addAll(products));
      _toast(products.isEmpty ? 'Aucun article détecté.' : '${products.length} article(s) ajoutés.', success: products.isNotEmpty);
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleVoice() async {
    if (_listening) {
      await _finishVoice();
    } else {
      await _startVoice();
    }
  }

  Future<void> _startVoice() async {
    try {
      final available = await _speech.initialize(
        onStatus: (status) {
          if (!mounted) return;
          if ((status == 'done' || status == 'notListening') && _listening) {
            setState(() => _listening = false);
          }
        },
        onError: (error) {
          if (!mounted) return;
          setState(() => _listening = false);
          _toast('Dictée interrompue : ${error.errorMsg}');
        },
      );
      if (!available) {
        throw const LiveWhatsAppIaException('Autorisez le microphone puis réessayez.');
      }
      setState(() {
        _transcript = '';
        _listening = true;
      });
      await _speech.listen(
        localeId: 'fr_FR',
        listenFor: const Duration(seconds: 45),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        cancelOnError: true,
        onResult: (result) {
          if (mounted) setState(() => _transcript = result.recognizedWords);
        },
      );
    } catch (error) {
      _toast('$error');
    }
  }

  Future<void> _finishVoice() async {
    setState(() {
      _listening = false;
      _busy = true;
    });
    try {
      await _speech.stop();
      if (_transcript.trim().isEmpty) {
        throw const LiveWhatsAppIaException('Aucune parole reconnue. Réessayez en parlant distinctement.');
      }
      final products = await widget.repository.parseCatalogText(_transcript);
      if (!mounted) return;
      setState(() => _draft.manualProducts.addAll(products));
      _toast(products.isEmpty ? 'Aucun article clair détecté.' : '${products.length} article(s) ajoutés.', success: products.isNotEmpty);
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendSandbox() async {
    final value = _sandbox.text.trim();
    if (value.isEmpty || _created == null) return;
    setState(() {
      _messages.add(LiveAgentMessage(role: 'user', content: value));
      _sandbox.clear();
      _busy = true;
    });
    try {
      final reply = await widget.repository.sandbox(
        agent: _created!,
        message: value,
        history: _messages,
      );
      if (mounted) {
        setState(() => _messages.add(LiveAgentMessage(role: 'assistant', content: reply)));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _messages.add(LiveAgentMessage(
              role: 'assistant',
              content: '⚠️ ${error.toString().replaceFirst('LiveWhatsAppIaException: ', '')}',
            )));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save({required bool activate}) async {
    final agent = _created;
    if (agent == null) return;
    if (activate && _selectedSession == null) {
      _toast('Choisissez une ligne connectée.');
      return;
    }
    setState(() => _busy = true);
    try {
      if (activate) {
        await widget.repository.deploy(agent: agent, sessionName: _selectedSession!);
      } else {
        await widget.repository.setStatus(agent, 'draft');
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String text, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: success ? const Color(0xFF159B65) : _wizardInk,
      content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          foregroundColor: _wizardInk,
          titleSpacing: 6,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Nouvel Agent IA · ${_page + 1}/3', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              Text(_page == 0 ? 'Base' : _page == 1 ? 'Sources' : 'Test & liaison', style: const TextStyle(color: _wizardMuted, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(8),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 9),
              child: Row(
                children: List<Widget>.generate(3, (index) => Expanded(
                  child: Container(
                    margin: EdgeInsets.only(right: index == 2 ? 0 : 6),
                    height: 5,
                    decoration: BoxDecoration(
                      color: index <= _page ? _wizardBright : const Color(0xFFE2EBE6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                )),
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
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
                  child: _page == 0 ? _basePage() : _page == 1 ? _sourcesPage() : _testPage(),
                ),
              ),
              _footer(),
            ],
          ),
        ),
      );

  Widget _basePage() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const _Heading('Les bases', 'Nom, type et style de votre assistant.'),
          const SizedBox(height: 14),
          _field(_name, 'Nom de l’activité', 'Ex. Boutique Chic Cotonou'),
          const SizedBox(height: 18),
          const _Label('Type'),
          const SizedBox(height: 8),
          LayoutBuilder(builder: (context, constraints) {
            final half = (constraints.maxWidth - 8) / 2;
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _types.map((type) {
                final full = type['id'] == 'website';
                return SizedBox(
                  width: full ? constraints.maxWidth : half,
                  child: _TypeCard(
                    selected: _draft.agentType == type['id'],
                    icon: type['icon'] as IconData,
                    title: type['label'] as String,
                    subtitle: type['short'] as String,
                    onTap: () => setState(() => _draft.agentType = type['id'] as String),
                  ),
                );
              }).toList(),
            );
          }),
          const SizedBox(height: 18),
          const _Label('Secteur'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _sectors.map((sector) => ChoiceChip(
              avatar: Text(sector['emoji']!, style: const TextStyle(fontSize: 14)),
              label: Text(sector['label']!),
              selected: _draft.sector == sector['id'],
              selectedColor: const Color(0xFFEAF9F2),
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              side: BorderSide(color: _draft.sector == sector['id'] ? _wizardBright : const Color(0xFFDCE8E2)),
              onSelected: (_) => setState(() => _draft.sector = sector['id']!),
            )).toList(),
          ),
          const SizedBox(height: 22),
          const _Label('Assistant'),
          const SizedBox(height: 8),
          _field(_assistant, 'Prénom', 'Ex. Aïcha'),
          const SizedBox(height: 13),
          const _Label('Ton'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <String>['Chaleureux', 'Vendeur', 'Professionnel', 'Expert'].map((tone) => ChoiceChip(
              label: Text(tone),
              selected: _draft.tone.toLowerCase() == tone.toLowerCase(),
              selectedColor: const Color(0xFFEAF9F2),
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              onSelected: (_) => setState(() => _draft.tone = tone.toLowerCase()),
            )).toList(),
          ),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('Utiliser des emojis', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            value: _draft.emojis,
            activeTrackColor: _wizardBright,
            onChanged: (value) => setState(() => _draft.emojis = value),
          ),
          const Divider(height: 18),
          const _Label('Missions'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const <(String, String)>[
              ('qa', 'Répondre'),
              ('sell', 'Vendre'),
              ('qualify', 'Qualifier'),
              ('appointments', 'RDV'),
              ('handoff', 'Humain'),
            ].map((item) => FilterChip(
              label: Text(item.$2),
              selected: _draft.capabilities[item.$1] == true,
              selectedColor: const Color(0xFFEAF9F2),
              checkmarkColor: _wizardGreen,
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              onSelected: (value) => setState(() => _draft.capabilities[item.$1] = value),
            )).toList(),
          ),
        ],
      );

  Widget _sourcesPage() {
    final commerce = _draft.agentType == 'commerce';
    final docs = _draft.agentType == 'docs';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _Heading(
          commerce ? 'Vos produits' : docs ? 'Vos documents' : 'Votre site',
          commerce ? 'Produits, photo, dictée ou saisie.' : docs ? 'PDF, Word, TXT ou MD.' : 'L’adresse à analyser.',
        ),
        const SizedBox(height: 14),
        if (commerce) _commerceSources(),
        if (docs) _documentSources(),
        if (!commerce && !docs) ...<Widget>[
          _field(_website, 'URL du site', 'https://mon-site.com', keyboardType: TextInputType.url),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('Explorer plusieurs pages', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            value: _draft.crawlSite,
            activeTrackColor: _wizardBright,
            onChanged: (value) => setState(() => _draft.crawlSite = value),
          ),
        ],
        const SizedBox(height: 20),
        const _Label('Notes utiles'),
        const SizedBox(height: 8),
        TextField(
          controller: _notes,
          minLines: 3,
          maxLines: 5,
          decoration: _input('Horaires, livraison, paiement, FAQ…'),
        ),
      ],
    );
  }

  Widget _commerceSources() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (_partnerProducts.isNotEmpty)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text('Produits Partenaire', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
              subtitle: Text('${_draft.selectedPartnerProductIds.length} sélectionné(s)', style: const TextStyle(color: _wizardMuted, fontSize: 12)),
              children: _partnerProducts.map((product) => CheckboxListTile(
                dense: true,
                controlAffinity: ListTileControlAffinity.leading,
                value: _draft.selectedPartnerProductIds.contains(product.id),
                title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                subtitle: Text(product.priceLabel, style: const TextStyle(fontSize: 11, color: _wizardMuted)),
                onChanged: (value) => setState(() {
                  if (value == true && product.id != null) {
                    _draft.selectedPartnerProductIds.add(product.id!);
                  } else {
                    _draft.selectedPartnerProductIds.remove(product.id);
                  }
                }),
              )).toList(),
            ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: _busy ? null : _toggleVoice,
                icon: Icon(_listening ? Icons.stop_circle_outlined : Icons.mic_none_rounded),
                label: Text(_listening ? 'Terminer' : 'Dicter'),
              ),
              OutlinedButton.icon(
                onPressed: _busy ? null : _pickImage,
                icon: const Icon(Icons.photo_camera_back_outlined),
                label: const Text('Photo'),
              ),
              OutlinedButton.icon(
                onPressed: _busy ? null : () => setState(() => _draft.manualProducts.add(const LiveAgentProduct(name: ''))),
                icon: const Icon(Icons.add_rounded),
                label: const Text('Manuel'),
              ),
            ],
          ),
          if (_listening) ...<Widget>[
            const SizedBox(height: 10),
            _VoiceHint(transcript: _transcript),
          ],
          if (_draft.manualProducts.isNotEmpty) ...<Widget>[
            const SizedBox(height: 12),
            ..._draft.manualProducts.asMap().entries.map((entry) => _ManualProductRow(
              value: entry.value,
              onChanged: (value) => setState(() => _draft.manualProducts[entry.key] = value),
              onDelete: () => setState(() => _draft.manualProducts.removeAt(entry.key)),
            )),
          ],
        ],
      );

  Widget _documentSources() => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDDEBE4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Row(children: <Widget>[
              Icon(Icons.lock_outline_rounded, color: _wizardGreen),
              SizedBox(width: 8),
              Text('Documents privés', style: TextStyle(fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 6),
            const Text('20 Mo maximum par fichier.', style: TextStyle(color: _wizardMuted, fontSize: 12)),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : _pickDocuments,
              icon: const Icon(Icons.upload_file_rounded),
              label: const Text('Ajouter un document'),
            ),
            if (_draft.documents.isNotEmpty) ...<Widget>[
              const SizedBox(height: 10),
              ..._draft.documents.asMap().entries.map((entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                leading: const Icon(Icons.description_outlined, color: _wizardGreen),
                title: Text(entry.value.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                subtitle: Text(entry.value.sizeLabel, style: const TextStyle(fontSize: 11, color: _wizardMuted)),
                trailing: IconButton(
                  onPressed: _busy ? null : () async {
                    try {
                      await widget.repository.deleteDocument(entry.value);
                      if (mounted) setState(() => _draft.documents.removeAt(entry.key));
                    } catch (error) {
                      _toast('$error');
                    }
                  },
                  icon: const Icon(Icons.close_rounded),
                ),
              )),
            ],
          ],
        ),
      );

  Widget _testPage() {
    final connected = _connected;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const _Heading('Tester avant d’activer', 'Le test ne contacte aucun client WhatsApp.'),
        const SizedBox(height: 12),
        _ChatPreview(messages: _messages),
        const SizedBox(height: 10),
        TextField(
          controller: _sandbox,
          onSubmitted: (_) => _sendSandbox(),
          decoration: _input('Écrivez comme un client…').copyWith(
            suffixIcon: IconButton(
              onPressed: _busy ? null : _sendSandbox,
              icon: const Icon(Icons.send_rounded, color: _wizardGreen),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const _Label('Ligne WhatsApp'),
        const SizedBox(height: 8),
        if (connected.isEmpty)
          const _Notice('Aucune ligne connectée. Gardez l’agent en brouillon ou connectez une ligne depuis WhatsApp IA.')
        else
          DropdownButtonFormField<String>(
            initialValue: connected.any((item) => item.name == _selectedSession) ? _selectedSession : null,
            decoration: _input('Choisir une ligne'),
            items: connected.map((session) => DropdownMenuItem<String>(
              value: session.name,
              child: Text('${session.name} · ${session.displayPhone}', overflow: TextOverflow.ellipsis),
            )).toList(),
            onChanged: _busy ? null : (value) => setState(() => _selectedSession = value),
          ),
        const SizedBox(height: 16),
        _Summary(draft: _draft, session: _selectedSession),
      ],
    );
  }

  Widget _footer() => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFE2EBE6)))),
          child: Row(
            children: <Widget>[
              if (_page > 0)
                TextButton.icon(
                  onPressed: _busy ? null : () => setState(() => _page--),
                  icon: const Icon(Icons.chevron_left_rounded),
                  label: const Text('Retour'),
                )
              else
                const SizedBox(width: 6),
              const Spacer(),
              if (_page < 2)
                FilledButton.icon(
                  onPressed: _busy ? null : _next,
                  style: FilledButton.styleFrom(backgroundColor: _wizardGreen, minimumSize: const Size(112, 46)),
                  icon: _busy ? const _Loader() : const Icon(Icons.chevron_right_rounded),
                  label: Text(_page == 1 ? 'Créer' : 'Suivant'),
                )
              else ...<Widget>[
                OutlinedButton(
                  onPressed: _busy ? null : () => _save(activate: false),
                  child: const Text('Brouillon'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _busy || _selectedSession == null ? null : () => _save(activate: true),
                  style: FilledButton.styleFrom(backgroundColor: _wizardBright, minimumSize: const Size(0, 46)),
                  child: _busy ? const _Loader() : const Text('Activer'),
                ),
              ],
            ],
          ),
        ),
      );

  Widget _field(TextEditingController controller, String label, String hint, {TextInputType? keyboardType}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(label, style: const TextStyle(color: _wizardInk, fontSize: 13.5, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          TextField(controller: controller, keyboardType: keyboardType, decoration: _input(hint)),
        ],
      );
}

InputDecoration _input(String hint) => InputDecoration(
      hintText: hint,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFD6E5DE))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFD6E5DE))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: _wizardBright, width: 1.8)),
    );

class _Heading extends StatelessWidget {
  const _Heading(this.title, this.subtitle);
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
    Text(title, style: const TextStyle(color: _wizardInk, fontSize: 21, fontWeight: FontWeight.w900)),
    const SizedBox(height: 3),
    Text(subtitle, style: const TextStyle(color: _wizardMuted, fontSize: 12.5, height: 1.25)),
  ]);
}

class _Label extends StatelessWidget {
  const _Label(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Text(value, style: const TextStyle(color: _wizardInk, fontSize: 15, fontWeight: FontWeight.w900));
}

class _TypeCard extends StatelessWidget {
  const _TypeCard({required this.selected, required this.icon, required this.title, required this.subtitle, required this.onTap});
  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFEAF9F2) : Colors.white,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: selected ? _wizardBright : const Color(0xFFDCE8E2), width: selected ? 1.8 : 1)),
        child: Row(children: <Widget>[
          Icon(icon, color: selected ? _wizardGreen : _wizardMuted, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _wizardInk, fontSize: 13, fontWeight: FontWeight.w900)),
            Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _wizardMuted, fontSize: 11)),
          ])),
          if (selected) const Icon(Icons.check_circle_rounded, color: _wizardGreen, size: 17),
        ]),
      ),
    ),
  );
}

class _Notice extends StatelessWidget {
  const _Notice(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: const Color(0xFFFFF8E7), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF0D69A))),
    child: Text(text, style: const TextStyle(color: Color(0xFF705E35), fontSize: 12, height: 1.3)),
  );
}

class _VoiceHint extends StatelessWidget {
  const _VoiceHint({required this.transcript});
  final String transcript;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(color: const Color(0xFFEAF9F2), borderRadius: BorderRadius.circular(14)),
    child: Row(children: <Widget>[
      const Icon(Icons.graphic_eq_rounded, color: _wizardGreen),
      const SizedBox(width: 8),
      Expanded(child: Text(transcript.isEmpty ? 'Parlez : article, prix, détails.' : transcript, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF355148), fontSize: 12, fontWeight: FontWeight.w700))),
    ]),
  );
}

class _ManualProductRow extends StatefulWidget {
  const _ManualProductRow({required this.value, required this.onChanged, required this.onDelete});
  final LiveAgentProduct value;
  final ValueChanged<LiveAgentProduct> onChanged;
  final VoidCallback onDelete;
  @override
  State<_ManualProductRow> createState() => _ManualProductRowState();
}

class _ManualProductRowState extends State<_ManualProductRow> {
  late final TextEditingController _name = TextEditingController(text: widget.value.name);
  late final TextEditingController _price = TextEditingController(text: widget.value.price?.toString() ?? '');
  late final TextEditingController _description = TextEditingController(text: widget.value.description ?? '');
  @override
  void dispose() { _name.dispose(); _price.dispose(); _description.dispose(); super.dispose(); }
  void _emit() => widget.onChanged(widget.value.copyWith(name: _name.text, price: int.tryParse(_price.text.replaceAll(RegExp(r'[^0-9]'), '')), description: _description.text));
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFDDEBE4))),
    child: Column(children: <Widget>[
      Row(children: <Widget>[
        const Icon(Icons.inventory_2_outlined, color: _wizardGreen, size: 18),
        const SizedBox(width: 7),
        const Expanded(child: Text('Article manuel', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900))),
        IconButton(onPressed: widget.onDelete, icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFD94747))),
      ]),
      TextField(controller: _name, onChanged: (_) => _emit(), decoration: _input('Nom de l’article')),
      const SizedBox(height: 7),
      Row(children: <Widget>[
        SizedBox(width: 112, child: TextField(controller: _price, keyboardType: TextInputType.number, onChanged: (_) => _emit(), decoration: _input('Prix FCFA'))),
        const SizedBox(width: 7),
        Expanded(child: TextField(controller: _description, onChanged: (_) => _emit(), decoration: _input('Détail'))),
      ]),
    ]),
  );
}

class _ChatPreview extends StatelessWidget {
  const _ChatPreview({required this.messages});
  final List<LiveAgentMessage> messages;
  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minHeight: 105),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFDDEBE4))),
    child: messages.isEmpty
      ? const Center(child: Text('Essayez : « Quel est le prix ? »', style: TextStyle(color: _wizardMuted, fontSize: 12)))
      : Column(children: messages.map((message) => Align(
        alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.only(bottom: 7),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(color: message.isUser ? const Color(0xFFE2F7EB) : const Color(0xFFF2F5F3), borderRadius: BorderRadius.circular(12)),
          child: Text(message.content, style: const TextStyle(fontSize: 12, height: 1.25)),
        ),
      )).toList()),
  );
}

class _Summary extends StatelessWidget {
  const _Summary({required this.draft, required this.session});
  final LiveAgentDraft draft;
  final String? session;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: const Color(0xFFF3F8F5), borderRadius: BorderRadius.circular(15)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      const Text('Récapitulatif', style: TextStyle(fontWeight: FontWeight.w900)),
      const SizedBox(height: 6),
      Text('${draft.agentType == 'docs' ? 'Documents' : draft.agentType == 'website' ? 'Site web' : 'Commerce'} · ${draft.personaName}', style: const TextStyle(color: _wizardMuted, fontSize: 12)),
      Text(session == null ? 'Brouillon · non lié' : 'Ligne : $session', style: const TextStyle(color: _wizardMuted, fontSize: 12)),
    ]),
  );
}

class _ImageSourceSheet extends StatelessWidget {
  const _ImageSourceSheet({required this.onCamera, required this.onGallery});
  final VoidCallback onCamera;
  final VoidCallback onGallery;
  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[
        ListTile(leading: const Icon(Icons.camera_alt_outlined), title: const Text('Prendre une photo'), onTap: onCamera),
        ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choisir une image'), onTap: onGallery),
      ]),
    ),
  );
}

class _Loader extends StatelessWidget {
  const _Loader();
  @override
  Widget build(BuildContext context) => const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white));
}
