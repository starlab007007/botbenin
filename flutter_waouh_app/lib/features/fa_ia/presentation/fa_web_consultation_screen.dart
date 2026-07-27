import 'dart:math';

import 'package:flutter/material.dart';

import '../data/fa_web_catalog.dart';
import '../data/fa_web_corpus_repository.dart';
import '../data/fa_web_local_store.dart';
import '../domain/fa_web_models.dart';
import 'fa_web_result_screen.dart';
import 'fa_web_theme.dart';
import 'fa_web_widgets.dart';

class FaWebConsultationScreen extends StatefulWidget {
  const FaWebConsultationScreen({super.key});

  @override
  State<FaWebConsultationScreen> createState() =>
      _FaWebConsultationScreenState();
}

class _FaWebConsultationScreenState extends State<FaWebConsultationScreen> {
  final _intentController = TextEditingController();
  final _scrollController = ScrollController();
  final _store = FaWebLocalStore();
  final _corpus = FaWebCorpusRepository();
  final _random = Random.secure();

  var _step = 0;
  var _category = '';
  var _rawIntention = '';
  var _intention = '';
  var _phase = 'Le silence s’installe';
  var _throwing = false;
  var _faces = List<FaWebFace>.filled(8, FaWebFace.open);
  var _messages = <FaWebChatMessage>[
    const FaWebChatMessage(
      role: 'assistant',
      text: 'Que souhaitez-vous éclairer ?',
    ),
  ];

  @override
  void dispose() {
    _intentController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _selectCategory(String category) {
    setState(() {
      _category = category;
      _step = 1;
      _messages = <FaWebChatMessage>[
        ..._messages,
        FaWebChatMessage(role: 'user', text: category),
        const FaWebChatMessage(
          role: 'assistant',
          text: 'Gardez votre souhait en vous, ou écrivez une phrase.',
        ),
      ];
    });
    _scrollToBottom();
  }

  void _submitIntention({required bool silent}) {
    final raw = silent ? '' : _intentController.text.trim();
    setState(() {
      _rawIntention = raw;
      _intention = raw.isEmpty
          ? 'Quelles forces, difficultés et conditions dois-je considérer '
              'dans le domaine « $_category » ?'
          : raw;
      _step = 2;
      _messages = <FaWebChatMessage>[
        ..._messages,
        FaWebChatMessage(
          role: 'user',
          text: raw.isEmpty ? 'Je garde mon intention en silence.' : raw,
        ),
        FaWebChatMessage(
          role: 'assistant',
          text: raw.isEmpty
              ? 'Très bien. Respirez, puis lancez la chaîne.'
              : 'Intention comprise. Respirez, puis lancez la chaîne.',
        ),
      ];
    });
    _scrollToBottom();
  }

  Future<void> _throwFa() async {
    if (_throwing) return;

    final finalFaces = List<FaWebFace>.generate(
      8,
      (_) => _random.nextBool() ? FaWebFace.open : FaWebFace.closed,
    );
    final durationMs = 6500 + _random.nextInt(3001);
    final phases = <(String, double)>[
      ('La chaîne s’éveille', 0.08),
      ('Les huit cauris se mêlent', 0.23),
      ('Le mouvement s’intensifie', 0.43),
      ('Les faces restent cachées', 0.66),
      ('La chaîne se stabilise', 0.84),
      ('Le signe se révèle', 0.94),
    ];

    setState(() {
      _faces = finalFaces;
      _throwing = true;
      _phase = 'Le silence s’installe';
    });

    final started = DateTime.now();
    for (final phase in phases) {
      final target = Duration(milliseconds: (durationMs * phase.$2).round());
      final elapsed = DateTime.now().difference(started);
      if (target > elapsed) await Future<void>.delayed(target - elapsed);
      if (!mounted || !_throwing) return;
      setState(() => _phase = phase.$1);
    }

    final elapsed = DateTime.now().difference(started);
    final total = Duration(milliseconds: durationMs);
    if (total > elapsed) await Future<void>.delayed(total - elapsed);
    if (!mounted) return;

    final sign = FaWebCatalog.resolve(finalFaces);
    setState(() {
      _throwing = false;
      _phase = sign.name;
    });

    await Future<void>.delayed(const Duration(milliseconds: 720));
    if (!mounted) return;

    try {
      final exactReading = await _corpus.exactReading(sign);
      final entry = FaWebJournalEntry(
        id: _newId(),
        date: DateTime.now(),
        category: _category,
        rawIntention: _rawIntention,
        intention: _intention,
        faces: finalFaces,
        sign: sign,
        messages: <FaWebChatMessage>[
          FaWebChatMessage(
            role: 'assistant',
            text:
                'Les huit faces ont formé ${sign.name}. Posez-moi vos questions sur ce signe.',
          ),
          FaWebChatMessage(
            role: 'assistant',
            text: exactReading,
            corpus: true,
          ),
        ],
      );
      await _store.saveEntry(entry);
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => FaWebResultScreen(entry: entry),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Impossible de charger le corpus FA : $error')),
      );
    }
  }

  String _newId() {
    return 'fa-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}-'
        '${_random.nextInt(1 << 30).toRadixString(36)}';
  }

  void _restart() {
    setState(() {
      _step = 0;
      _category = '';
      _rawIntention = '';
      _intention = '';
      _phase = 'Le silence s’installe';
      _throwing = false;
      _faces = List<FaWebFace>.filled(8, FaWebFace.open);
      _messages = <FaWebChatMessage>[
        const FaWebChatMessage(
          role: 'assistant',
          text: 'Que souhaitez-vous éclairer ?',
        ),
      ];
      _intentController.clear();
    });
  }

  void _back() {
    if (_throwing) return;
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _step--);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_throwing && _step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        backgroundColor: FaWebColors.background,
        appBar: faWebAppBar(
          title: 'FA IA',
          subtitle: 'Consultation assistée',
          onBack: _back,
          actions: [
            IconButton(
              onPressed: _throwing ? null : _restart,
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Recommencer',
            ),
          ],
        ),
        body: ListView(
          controller: _scrollController,
          padding: EdgeInsets.fromLTRB(
            13,
            18,
            13,
            _step == 1 ? 145 : 30,
          ),
          children: [
            for (final message in _messages) ...[
              FaWebBubble(message: message),
              const SizedBox(height: 13),
            ],
            if (_step == 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(26, 4, 0, 95),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 9,
                  runSpacing: 13,
                  children: [
                    for (final category in FaWebCatalog.categories)
                      OutlinedButton.icon(
                        onPressed: () => _selectCategory(category),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF17120F),
                          side: const BorderSide(color: Color(0xFFDDD2C5)),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 13,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          textStyle: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        icon: const Icon(
                          Icons.auto_awesome_rounded,
                          color: FaWebColors.green,
                          size: 17,
                        ),
                        label: Text(category),
                      ),
                  ],
                ),
              ),
            if (_step == 2) ...[
              const SizedBox(height: 2),
              FaWebChainCard(
                faces: _faces,
                phase: _phase,
                throwing: _throwing,
                height: 560,
              ),
              const SizedBox(height: 18),
              FaWebPrimaryButton(
                label: _throwing ? 'Le Fâ se révèle…' : 'Lancer le Fâ',
                onPressed: _throwFa,
                dark: true,
                busy: _throwing,
              ),
              TextButton.icon(
                onPressed: _throwing ? null : () => setState(() => _step = 1),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Changer mon intention'),
                style: TextButton.styleFrom(
                  foregroundColor: FaWebColors.green,
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ],
        ),
        bottomNavigationBar: _step == 1
            ? SafeArea(
                top: false,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFCFFFFFF),
                    border: Border(
                      top: BorderSide(color: FaWebColors.line),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _intentController,
                              maxLength: 280,
                              minLines: 1,
                              maxLines: 4,
                              decoration: InputDecoration(
                                counterText: '',
                                hintText: 'Écrivez votre situation...',
                                filled: true,
                                fillColor: const Color(0xFFF5F2ED),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 18,
                                  vertical: 15,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(28),
                                  borderSide: const BorderSide(
                                    color: Color(0xFFD7DEDB),
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(28),
                                  borderSide: const BorderSide(
                                    color: Color(0xFFD7DEDB),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox.square(
                            dimension: 56,
                            child: IconButton.filled(
                              onPressed: () => _submitIntention(silent: false),
                              style: IconButton.styleFrom(
                                backgroundColor: FaWebColors.brown,
                                foregroundColor: Colors.white,
                              ),
                              icon: const Icon(Icons.arrow_upward_rounded),
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: () => _submitIntention(silent: true),
                        icon: const Icon(Icons.visibility_off_outlined),
                        label: const Text('Garder mon intention en silence'),
                        style: TextButton.styleFrom(
                          foregroundColor: FaWebColors.green,
                          textStyle: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            : null,
      ),
    );
  }
}
