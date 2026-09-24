import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../data/fa_ia_catalog.dart';
import '../domain/fa_ia_engine.dart';
import '../domain/fa_ia_models.dart';
import 'fa_ia_chain.dart';
import 'fa_ia_result_screen.dart';
import 'fa_ia_theme.dart';

class FaIaConsultationScreen extends StatefulWidget {
  const FaIaConsultationScreen({super.key, required this.engine});

  final FaIaEngine engine;

  @override
  State<FaIaConsultationScreen> createState() => _FaIaConsultationScreenState();
}

class _FaIaConsultationScreenState extends State<FaIaConsultationScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _message = TextEditingController();
  final ScrollController _scroll = ScrollController();
  late final AnimationController _animation;
  final math.Random _random = math.Random.secure();
  int _motionSeed = 7416;

  String? _category;
  String _intention = '';
  String _phase = 'Le silence s’installe';
  int _step = 0;
  bool _throwing = false;
  bool _revealed = false;
  List<FaFaceState> _faces = List<FaFaceState>.filled(
    8,
    FaFaceState.open,
    growable: false,
  );
  final List<_ChatLine> _lines = <_ChatLine>[
    const _ChatLine.assistant('Que souhaitez-vous éclairer ?'),
  ];

  @override
  void initState() {
    super.initState();
    _animation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 7600),
      value: 1,
    );
  }

  @override
  void dispose() {
    _message.dispose();
    _scroll.dispose();
    _animation.dispose();
    super.dispose();
  }

  String get _effectiveIntention => FaIaCatalog.clarifyQuestion(
    category: _category ?? FaIaCatalog.categories.first,
    raw: _intention,
  );

  void _selectCategory(String category) {
    if (_throwing) return;
    setState(() {
      _category = category;
      _step = 1;
      _lines
        ..add(_ChatLine.user(category))
        ..add(
          const _ChatLine.assistant(
            'Gardez votre souhait en vous, ou écrivez une phrase.',
          ),
        );
    });
    _scrollToEnd();
  }

  void _submitIntention({bool silent = false}) {
    if (_category == null || _throwing) return;
    FocusScope.of(context).unfocus();
    final raw = silent ? '' : _message.text.trim();
    setState(() {
      _intention = raw;
      _step = 2;
      _lines.add(
        _ChatLine.user(
          raw.isEmpty ? 'Je garde mon intention en silence.' : raw,
        ),
      );
      _lines.add(
        _ChatLine.assistant(
          raw.isEmpty
              ? 'Très bien. Respirez, puis lancez la chaîne.'
              : 'Intention comprise. Respirez, puis lancez la chaîne.',
        ),
      );
      _message.clear();
    });
    _scrollToEnd();
  }

  void _restart() {
    if (_throwing) return;
    setState(() {
      _category = null;
      _intention = '';
      _step = 0;
      _faces = List<FaFaceState>.filled(8, FaFaceState.open, growable: false);
      _phase = 'Le silence s’installe';
      _revealed = false;
      _lines
        ..clear()
        ..add(const _ChatLine.assistant('Que souhaitez-vous éclairer ?'));
    });
    _animation.value = 1;
  }

  Future<void> _throw() async {
    if (_throwing || _category == null) return;

    final faces = widget.engine.throwChain();
    final duration = Duration(milliseconds: 6500 + _random.nextInt(3001));
    final motionSeed = _random.nextInt(0x3fffffff);

    setState(() {
      _faces = faces;
      _motionSeed = motionSeed;
      _throwing = true;
      _revealed = false;
      _phase = 'Le silence s’installe';
    });

    _animation
      ..duration = duration
      ..value = 0;
    final animationFuture = _animation.forward();

    final phases = <(String, double)>[
      ('La chaîne s’éveille', 0.08),
      ('Les cauris se mêlent', 0.23),
      ('Le mouvement s’intensifie', 0.43),
      ('Les faces restent cachées', 0.66),
      ('La chaîne se stabilise', 0.84),
      ('Le signe se révèle', 0.94),
    ];

    var previousRatio = 0.0;
    for (final phase in phases) {
      final delay = Duration(
        milliseconds: (duration.inMilliseconds * (phase.$2 - previousRatio))
            .round(),
      );
      await Future<void>.delayed(delay);
      previousRatio = phase.$2;
      if (!mounted) return;
      setState(() => _phase = phase.$1);
    }

    await animationFuture;
    if (!mounted) return;

    final sign = widget.engine.resolveFaces(faces);
    final reading = widget.engine.buildReading(
      sign: sign,
      category: _category!,
      intention: _effectiveIntention,
    );

    setState(() {
      _throwing = false;
      _revealed = true;
      _phase = sign.canonicalName;
    });

    await Future<void>.delayed(const Duration(milliseconds: 720));
    if (!mounted) return;

    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => FaIaResultScreen(
          engine: widget.engine,
          category: _category!,
          intention: _effectiveIntention,
          faces: faces,
          sign: sign,
          reading: reading,
          persist: true,
        ),
      ),
    );
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
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
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('FA IA', style: TextStyle(fontWeight: FontWeight.w900)),
            Text(
              'Consultation assistée',
              style: TextStyle(fontSize: 11, color: Color(0xFFDCCDBD)),
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Recommencer',
            onPressed: _throwing ? null : _restart,
            icon: const Icon(Icons.refresh_rounded),
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
                padding: const EdgeInsets.fromLTRB(14, 16, 14, 18),
                children: <Widget>[
                  for (final line in _lines) _ChatBubble(line: line),
                  if (_step == 0) _categoryPicker(),
                  if (_step == 2) _chainStage(),
                ],
              ),
            ),
            if (_step == 1) _composer(),
          ],
        ),
      ),
    );
  }

  Widget _categoryPicker() {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 8, left: 42),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: FaIaCatalog.categories
            .map(
              (category) => ActionChip(
                label: Text(category),
                avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
                backgroundColor: Colors.white,
                side: const BorderSide(color: FaIaColors.line),
                labelStyle: const TextStyle(
                  color: FaIaColors.ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
                onPressed: () => _selectCategory(category),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _composer() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        10 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: FaIaColors.line.withOpacity(0.9)),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: _message,
                  minLines: 1,
                  maxLines: 3,
                  maxLength: 280,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: 'Écrivez votre situation…',
                    filled: true,
                    fillColor: const Color(0xFFF5F2ED),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 13,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onSubmitted: (_) => _submitIntention(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _submitIntention,
                style: IconButton.styleFrom(
                  backgroundColor: FaIaColors.deepBrown,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(50, 50),
                ),
                icon: const Icon(Icons.arrow_upward_rounded),
              ),
            ],
          ),
          TextButton.icon(
            onPressed: () => _submitIntention(silent: true),
            icon: const Icon(Icons.visibility_off_outlined, size: 17),
            label: const Text('Garder mon intention en silence'),
          ),
        ],
      ),
    );
  }

  Widget _chainStage() {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Column(
        children: <Widget>[
          AnimatedBuilder(
            animation: _animation,
            builder: (_, __) => Stack(
              alignment: Alignment.topCenter,
              children: <Widget>[
                FaIaChainView(
                  faces: _faces,
                  animation: _throwing ? _animation.value : 1,
                  showTraits: _throwing || _revealed,
                  height: 445,
                  motionSeed: _motionSeed,
                  concealFinalFaces: _throwing,
                  revealAt: 0.90,
                ),
                Positioned(
                  top: 48,
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: Container(
                      key: ValueKey<String>(_phase),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.35),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: FaIaColors.gold.withOpacity(0.35),
                        ),
                      ),
                      child: Text(
                        _phase,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            style: faPrimaryButtonStyle(),
            onPressed: _throwing ? null : _throw,
            icon: _throwing
                ? const SizedBox(
                    width: 19,
                    height: 19,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.blur_circular_rounded),
            label: Text(_throwing ? 'Le Fâ se révèle…' : 'Lancer le Fâ'),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _throwing ? null : _restart,
            icon: const Icon(Icons.edit_outlined, size: 17),
            label: const Text('Changer mon intention'),
          ),
          const SizedBox(height: 4),
          const Text(
            'Simulation symbolique numérique',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: FaIaColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatLine {
  const _ChatLine._(this.text, this.fromUser);
  const _ChatLine.assistant(String text) : this._(text, false);
  const _ChatLine.user(String text) : this._(text, true);

  final String text;
  final bool fromUser;
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.line});

  final _ChatLine line;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: line.fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.80,
        ),
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: line.fromUser ? FaIaColors.deepBrown : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(line.fromUser ? 20 : 5),
            bottomRight: Radius.circular(line.fromUser ? 5 : 20),
          ),
          border: line.fromUser
              ? null
              : Border.all(color: FaIaColors.line.withOpacity(0.9)),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (!line.fromUser) ...<Widget>[
              const Icon(
                Icons.auto_awesome_rounded,
                size: 16,
                color: FaIaColors.copper,
              ),
              const SizedBox(width: 7),
            ],
            Flexible(
              child: Text(
                line.text,
                style: TextStyle(
                  color: line.fromUser ? Colors.white : FaIaColors.ink,
                  fontSize: 14,
                  height: 1.35,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
