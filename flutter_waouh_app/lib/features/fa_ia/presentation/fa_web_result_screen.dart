import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/fa_web_catalog.dart';
import '../data/fa_web_corpus_repository.dart';
import '../data/fa_web_local_store.dart';
import '../domain/fa_web_models.dart';
import '../services/fa_web_supabase_service.dart';
import 'fa_web_consultation_screen.dart';
import 'fa_web_theme.dart';
import 'fa_web_widgets.dart';

class FaWebResultScreen extends StatefulWidget {
  const FaWebResultScreen({
    super.key,
    required this.entry,
  });

  final FaWebJournalEntry entry;

  @override
  State<FaWebResultScreen> createState() => _FaWebResultScreenState();
}

class _FaWebResultScreenState extends State<FaWebResultScreen> {
  final _composer = TextEditingController();
  final _scrollController = ScrollController();
  final _store = FaWebLocalStore();
  final _corpus = FaWebCorpusRepository();

  late FaWebJournalEntry _entry = widget.entry;
  late final FaWebSupabaseService _service = FaWebSupabaseService(
    corpus: _corpus,
  );
  var _typing = false;

  @override
  void dispose() {
    _composer.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send([String? quick]) async {
    final message = (quick ?? _composer.text).trim();
    if (message.isEmpty || _typing) return;

    final history = List<FaWebChatMessage>.from(_entry.messages);
    final updated = <FaWebChatMessage>[
      ...history,
      FaWebChatMessage(role: 'user', text: message),
    ];
    _composer.clear();
    setState(() {
      _entry = _entry.copyWith(messages: updated);
      _typing = true;
    });
    _scrollToBottom();

    try {
      final answer = await _askWithQuota(message, history);
      if (!mounted) return;
      final messages = <FaWebChatMessage>[
        ..._entry.messages,
        FaWebChatMessage(role: 'assistant', text: answer),
      ];
      setState(() {
        _entry = _entry.copyWith(messages: messages);
        _typing = false;
      });
      await _store.saveEntry(_entry);
      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;
      final focus = FaWebCatalog.focusFor(message);
      final fallback = history.isEmpty && focus.key == 'comprehensive'
          ? 'L’interprétation intégrale n’a pas pu être chargée. La lecture est suspendue afin d’éviter toute interprétation non vérifiée. Veuillez réessayer dans quelques instants.'
          : 'L’analyse contextuelle « ${focus.label} » est momentanément indisponible. Votre interprétation intégrale reste conservée. Veuillez relancer cette demande dans quelques instants.';
      final messages = <FaWebChatMessage>[
        ..._entry.messages,
        FaWebChatMessage(
          role: 'assistant',
          text: fallback,
          error: true,
        ),
      ];
      setState(() {
        _entry = _entry.copyWith(messages: messages);
        _typing = false;
      });
      await _store.saveEntry(_entry);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
      _scrollToBottom();
    }
  }

  Future<String> _askWithQuota(
    String message,
    List<FaWebChatMessage> history,
  ) async {
    final deviceId = await _store.deviceId();
    var accessCode = await _store.accessCode();
    final focus = FaWebCatalog.focusFor(message);

    Future<String> invoke() => _service.ask(
          sign: _entry.sign,
          category: _entry.category,
          intention: _entry.intention,
          question: message,
          focus: focus,
          history: history,
          deviceId: deviceId,
          accessCode: accessCode,
        );

    try {
      return await invoke();
    } on FaWebQuotaException catch (error) {
      if (<String>{
        'code_exhausted',
        'code_invalid',
        'code_expired',
        'code_inactive',
      }.contains(error.reason)) {
        await _store.setAccessCode(null);
        accessCode = null;
      }

      if (!mounted) rethrow;
      final entered = await _requestAccessCode(error.message);
      if (entered == null) rethrow;
      await _store.setAccessCode(entered);
      accessCode = entered;
      return invoke();
    }
  }

  Future<String?> _requestAccessCode(String message) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Code d’accès FA IA'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                autofocus: true,
                keyboardType: TextInputType.number,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Code à 6 chiffres',
                  counterText: '',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () {
                final value = controller.text.replaceAll(RegExp(r'\D'), '');
                if (value.length == 6) Navigator.pop(dialogContext, value);
              },
              child: const Text('Continuer'),
            ),
          ],
        );
      },
    );
    controller.dispose();
    return result;
  }

  Future<void> _toggleFavorite() async {
    setState(() => _entry = _entry.copyWith(favorite: !_entry.favorite));
    await _store.saveEntry(_entry);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _entry.favorite ? 'Ajouté aux favoris.' : 'Retiré des favoris.',
        ),
      ),
    );
  }

  Future<void> _copy() async {
    final text = StringBuffer('FA IA — ${_entry.sign.name}\n');
    for (var index = 0; index < 4; index++) {
      text.writeln(
        '${_entry.sign.columnA[index]}     ${_entry.sign.columnB[index]}',
      );
    }
    await Clipboard.setData(ClipboardData(text: text.toString().trim()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Signe copié.')),
    );
  }

  Future<void> _save() async {
    await _store.saveEntry(_entry);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Consultation enregistrée.')),
    );
  }

  void _restart() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => const FaWebConsultationScreen(),
      ),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FaWebColors.background,
      appBar: faWebAppBar(
        title: _entry.sign.name,
        subtitle: 'Interprétation en conversation',
        onBack: () => Navigator.of(context).pop(),
        actions: [
          IconButton(
            onPressed: _copy,
            icon: const Icon(Icons.copy_all_outlined),
            tooltip: 'Copier',
          ),
          IconButton(
            onPressed: _toggleFavorite,
            icon: Icon(
              _entry.favorite ? Icons.star_rounded : Icons.star_border_rounded,
            ),
            tooltip: 'Favori',
          ),
          IconButton(
            onPressed: _save,
            icon: const Icon(Icons.bookmark_add_outlined),
            tooltip: 'Enregistrer',
          ),
        ],
      ),
      body: ListView(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(13, 15, 13, 130),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Column(
              children: [
                FaWebChainCard(
                  faces: _entry.faces,
                  phase: _entry.sign.name,
                  showTraits: true,
                  showHeader: true,
                  height: (MediaQuery.sizeOf(context).height * 0.44)
                      .clamp(380.0, 460.0)
                      .toDouble(),
                ),
                Container(
                  width: double.infinity,
                  color: const Color(0xFF392619),
                  padding: const EdgeInsets.fromLTRB(25, 23, 25, 27),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SIGNE RÉVÉLÉ',
                        style: TextStyle(
                          color: Color(0xFFDBA74C),
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3,
                        ),
                      ),
                      const SizedBox(height: 11),
                      Text(
                        _entry.sign.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 29,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _entry.category,
                        style: const TextStyle(
                          color: Color(0xFFD8CCC3),
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          for (final message in _entry.messages) ...[
            FaWebBubble(message: message),
            const SizedBox(height: 12),
          ],
          if (_typing) ...[
            const FaWebTypingBubble(),
            const SizedBox(height: 12),
          ],
          if (!_typing)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final focus in FaWebCatalog.focuses)
                  OutlinedButton(
                    onPressed: () => _send(focus.label),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF3E2B20),
                      side: const BorderSide(color: Color(0xFFD9CCBD)),
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 13,
                        vertical: 10,
                      ),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    child: Text(focus.label),
                  ),
              ],
            ),
          const SizedBox(height: 14),
          const Text(
            'Lecture FA IA V5.2. Une pratique traditionnelle réservée doit être validée par un Bokonon qualifié.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: FaWebColors.muted,
              fontSize: 12,
              height: 1.35,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 14, 11),
          decoration: const BoxDecoration(
            color: Color(0xFCFFFFFF),
            border: Border(top: BorderSide(color: FaWebColors.line)),
          ),
          child: Row(
            children: [
              IconButton(
                onPressed: _typing ? null : _restart,
                icon: const Icon(Icons.refresh_rounded, size: 28),
                color: FaWebColors.brown,
                tooltip: 'Recommencer',
              ),
              Expanded(
                child: TextField(
                  controller: _composer,
                  enabled: !_typing,
                  maxLength: 1800,
                  onSubmitted: (_) => _send(),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: 'Question sur le signe...',
                    filled: true,
                    fillColor: const Color(0xFFF5F2ED),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(28),
                      borderSide: const BorderSide(color: Color(0xFFD7DEDB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(28),
                      borderSide: const BorderSide(color: Color(0xFFD7DEDB)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 9),
              SizedBox.square(
                dimension: 54,
                child: IconButton.filled(
                  onPressed: _typing ? null : () => _send(),
                  style: IconButton.styleFrom(
                    backgroundColor: FaWebColors.brown,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.arrow_upward_rounded),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
