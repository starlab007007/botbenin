import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/fa_document_corpus_repository.dart';
import '../data/fa_ia_journal_repository.dart';
import '../domain/fa_document_models.dart';
import '../domain/fa_ia_engine.dart';
import '../domain/fa_ia_models.dart';
import '../services/fa_document_chat_service.dart';
import 'fa_ia_chain.dart';
import 'fa_ia_consultation_screen.dart';
import 'fa_ia_theme.dart';

class FaIaResultScreen extends StatefulWidget {
  const FaIaResultScreen({
    super.key,
    required this.engine,
    required this.category,
    required this.intention,
    required this.faces,
    required this.sign,
    required this.reading,
    this.persist = false,
    this.consultationId,
    this.createdAt,
    this.initialConversation = const <Map<String, String>>[],
  });

  final FaIaEngine engine;
  final String category;
  final String intention;
  final List<FaFaceState> faces;
  final FaCombinedSign sign;
  final FaReading reading;
  final bool persist;
  final String? consultationId;
  final DateTime? createdAt;
  final List<Map<String, String>> initialConversation;

  @override
  State<FaIaResultScreen> createState() => _FaIaResultScreenState();
}

class _FaIaResultScreenState extends State<FaIaResultScreen> {
  static const _journal = FaIaJournalRepository();
  static const _corpus = FaDocumentCorpusRepository();

  final TextEditingController _composer = TextEditingController();
  final ScrollController _scroll = ScrollController();

  final List<FaChatMessage> _messages = <FaChatMessage>[];
  List<String> _quickReplies = FaDocumentChatService.initialQuickReplies;
  FaDocumentChatService? _chat;
  bool _loading = true;
  bool _typing = false;
  bool _saved = false;
  bool _saving = false;
  late final String _consultationId;
  late final DateTime _createdAt;

  @override
  void initState() {
    super.initState();
    _consultationId =
        widget.consultationId ?? 'fa-${DateTime.now().microsecondsSinceEpoch}';
    _createdAt = widget.createdAt ?? DateTime.now();
    _messages.addAll(
      widget.initialConversation.map(FaChatMessage.fromJournalJson),
    );
    _initialize();
  }

  @override
  void dispose() {
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      final entry = await _corpus.findByReference(widget.sign.reference);
      if (!mounted) return;

      final resolved =
          entry ??
          FaDocumentEntry(
            available: false,
            reference: widget.sign.reference,
            canonicalName: widget.sign.canonicalName,
            x: widget.sign.x.canonicalName,
            y: widget.sign.y.canonicalName,
            sourceFile: '256 signe de fa(1).pdf',
            sourceText: '',
            documentTitle: '',
            missingReason:
                'Cette combinaison ne dispose pas encore d’une '
                'interprétation suffisamment complète.',
          );
      final service = FaDocumentChatService(
        sign: widget.sign,
        entry: resolved,
        category: widget.category,
        intention: widget.intention,
      );

      setState(() {
        _chat = service;
      });

      if (_messages.isEmpty) {
        _messages.add(
          FaChatMessage(
            role: FaChatRole.assistant,
            text:
                'Les huit faces ont formé ${widget.sign.canonicalName}. '
                'Posez-moi vos questions sur ce signe.',
          ),
        );
        final opening = await service.opening();
        if (!mounted) return;
        _messages.add(
          FaChatMessage(role: FaChatRole.assistant, text: opening.answer),
        );
        _quickReplies = opening.quickReplies;
      }

      if (!mounted) return;
      setState(() => _loading = false);
      if (widget.persist) await _save();
      _scrollToEnd();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _messages.add(
          FaChatMessage(
            role: FaChatRole.assistant,
            text:
                'Le signe est identifié, mais son interprétation n’a pas pu '
                'être chargée. Réessayez dans quelques instants.',
            isError: true,
          ),
        );
      });
    }
  }

  FaConsultation get _consultation => FaConsultation(
    id: _consultationId,
    createdAt: _createdAt,
    category: widget.category,
    intention: widget.intention,
    faces: widget.faces,
    signReference: widget.sign.reference,
    signName: widget.sign.canonicalName,
    reading: widget.reading,
    conversation: _messages
        .map((message) => message.toJournalJson())
        .toList(growable: false),
  );

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await _journal.save(_consultation);
      if (mounted) setState(() => _saved = true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _send([String? quickText]) async {
    final text = (quickText ?? _composer.text).trim();
    if (text.isEmpty || _typing || _chat == null) return;
    FocusScope.of(context).unfocus();

    setState(() {
      _messages.add(FaChatMessage(role: FaChatRole.user, text: text));
      _composer.clear();
      _typing = true;
      _quickReplies = const <String>[];
    });
    _scrollToEnd();

    try {
      final reply = await _chat!.answer(
        userMessage: text,
        history: List<FaChatMessage>.unmodifiable(_messages),
      );
      if (!mounted) return;
      setState(() {
        _messages.add(
          FaChatMessage(role: FaChatRole.assistant, text: reply.answer),
        );
        _quickReplies = reply.quickReplies;
        _typing = false;
      });
      await _save();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _typing = false;
        _messages.add(
          const FaChatMessage(
            role: FaChatRole.assistant,
            text:
                'Je n’ai pas pu traiter cette question. Réessayez avec une '
                'formulation plus courte.',
            isError: true,
          ),
        );
        _quickReplies = FaDocumentChatService.initialQuickReplies;
      });
    }
    _scrollToEnd();
  }

  Future<void> _copySign() async {
    await Clipboard.setData(
      ClipboardData(
        text:
            'FA IA — ${widget.sign.canonicalName}\n\n'
            '${FaIaEngine.matrixText(widget.sign)}',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Signe copié.')));
  }

  void _restart() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => FaIaConsultationScreen(engine: widget.engine),
      ),
    );
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F0EA),
      appBar: AppBar(
        backgroundColor: FaIaColors.deepBrown,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 4,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              widget.sign.canonicalName,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            Text(
              'Interprétation en conversation',
              style: const TextStyle(fontSize: 10.5, color: Color(0xFFDCCDBD)),
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Copier le signe',
            onPressed: _copySign,
            icon: const Icon(Icons.copy_rounded),
          ),
          IconButton(
            tooltip: _saved ? 'Enregistré' : 'Enregistrer',
            onPressed: _saving ? null : _save,
            icon: Icon(
              _saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            Expanded(
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(12, 14, 12, 18),
                children: <Widget>[
                  _SignRevealCard(
                    sign: widget.sign,
                    faces: widget.faces,
                    category: widget.category,
                  ),
                  const SizedBox(height: 14),
                  if (_loading) const _TypingBubble(label: 'Lecture du signe…'),
                  for (final message in _messages)
                    _ResultChatBubble(message: message),
                  if (_typing)
                    const _TypingBubble(
                      label: 'FA IA approfondit l’interprétation…',
                    ),
                  if (_quickReplies.isNotEmpty && !_typing)
                    _QuickReplies(values: _quickReplies, onSelected: _send),
                ],
              ),
            ),
            _Composer(
              controller: _composer,
              enabled: !_typing && _chat != null,
              onSend: () => _send(),
              onRestart: _restart,
            ),
          ],
        ),
      ),
    );
  }
}

class _SignRevealCard extends StatelessWidget {
  const _SignRevealCard({
    required this.sign,
    required this.faces,
    required this.category,
  });

  final FaCombinedSign sign;
  final List<FaFaceState> faces;
  final String category;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: FaIaColors.deepBrown,
        borderRadius: BorderRadius.circular(24),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: FaIaColors.deepBrown.withOpacity(0.18),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: <Widget>[
          SizedBox(
            height: 260,
            child: FaIaChainView(
              faces: faces,
              height: 260,
              animation: 1,
              showTraits: true,
              showSideLabels: false,
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.07),
              border: Border(
                top: BorderSide(color: Colors.white.withOpacity(0.10)),
              ),
            ),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        'SIGNE RÉVÉLÉ',
                        style: TextStyle(
                          color: FaIaColors.gold,
                          fontSize: 10,
                          letterSpacing: 1.3,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        sign.canonicalName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        category,
                        style: const TextStyle(
                          color: Color(0xFFDCCDBD),
                          fontSize: 12,
                        ),
                      ),
                    ],
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

class _ResultChatBubble extends StatelessWidget {
  const _ResultChatBubble({required this.message});

  final FaChatMessage message;

  @override
  Widget build(BuildContext context) {
    final user = message.fromUser;
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.86,
        ),
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.fromLTRB(14, 11, 14, 10),
        decoration: BoxDecoration(
          color: user
              ? FaIaColors.deepBrown
              : message.isError
              ? const Color(0xFFFFECE8)
              : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(user ? 18 : 5),
            bottomRight: Radius.circular(user ? 5 : 18),
          ),
          border: user ? null : Border.all(color: FaIaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              message.text,
              style: TextStyle(
                color: user ? Colors.white : FaIaColors.ink,
                fontSize: 14,
                height: 1.45,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickReplies extends StatelessWidget {
  const _QuickReplies({required this.values, required this.onSelected});

  final List<String> values;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, top: 3, bottom: 8),
      child: Wrap(
        spacing: 7,
        runSpacing: 7,
        children: values
            .map(
              (value) => ActionChip(
                label: Text(value),
                avatar: const Icon(Icons.auto_awesome_rounded, size: 15),
                backgroundColor: const Color(0xFFFFFBF4),
                side: const BorderSide(color: FaIaColors.line),
                labelStyle: const TextStyle(
                  color: FaIaColors.ink,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
                onPressed: () => onSelected(value),
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: FaIaColors.line),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const SizedBox(
              width: 15,
              height: 15,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: FaIaColors.copper,
              ),
            ),
            const SizedBox(width: 9),
            Text(label, style: FaIaText.muted),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.enabled,
    required this.onSend,
    required this.onRestart,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        10,
        9,
        10,
        9 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: FaIaColors.line.withOpacity(0.9)),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: <Widget>[
          IconButton(
            tooltip: 'Nouvelle consultation',
            onPressed: enabled ? onRestart : null,
            icon: const Icon(Icons.refresh_rounded),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              enabled: enabled,
              minLines: 1,
              maxLines: 4,
              maxLength: 500,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                counterText: '',
                hintText: 'Question sur le signe…',
                filled: true,
                fillColor: const Color(0xFFF5F2ED),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 7),
          IconButton.filled(
            onPressed: enabled ? onSend : null,
            style: IconButton.styleFrom(
              backgroundColor: FaIaColors.deepBrown,
              foregroundColor: Colors.white,
              minimumSize: const Size(49, 49),
            ),
            icon: const Icon(Icons.arrow_upward_rounded),
          ),
        ],
      ),
    );
  }
}
