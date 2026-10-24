import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'live_nexus_service.dart';
import 'live_theme.dart';
import 'live_essential_offers.dart' show essentialPlum, essentialJade, essentialLine;

/// « Et maintenant ? » : après les résultats, une action fait passer Bot du
/// repérage au contact puis à la négociation. Rien ne part sans confirmation,
/// dans les limites choisies (nombre de contacts, WhatsApp, autonomie).
class LiveBotNextStep extends StatefulWidget {
  const LiveBotNextStep({
    super.key,
    required this.service,
    required this.mode,
    required this.goal,
    required this.city,
    required this.budget,
    required this.items,
    this.articleId,
    this.priceFloor,
    this.expanded = false,
  });

  final LiveNexusService service;
  final String mode; // buy | sell | ask
  final String goal;
  final String city;
  final double? budget;
  final List<NexusDiscoveryItem> items;
  final String? articleId;
  final double? priceFloor;
  final bool expanded;

  @override
  State<LiveBotNextStep> createState() => _LiveBotNextStepState();
}

class _LiveBotNextStepState extends State<LiveBotNextStep> {
  String _autonomy = 'semi_autonomous';
  int _count = 3;
  bool _whatsapp = false;
  bool _confirm = false;
  bool _busy = false;
  int? _linked;
  String _error = '';
  List<Map<String, dynamic>>? _articles;
  String _articleSel = '';

  bool get _needsArticle =>
      widget.mode == 'sell' && (widget.articleId ?? '').trim().isEmpty;
  String get _article =>
      (widget.articleId ?? '').trim().isNotEmpty ? widget.articleId!.trim() : _articleSel;

  @override
  void initState() {
    super.initState();
    if (_needsArticle) _loadArticles();
  }

  String _articleTitle(Map<String, dynamic> a) {
    final t = (a['title'] ?? '').toString().trim();
    return t.isEmpty ? 'Article' : t;
  }

  Future<void> _loadArticles() async {
    try {
      final data = await widget.service.ownedArticles();
      final raw = data['articles'];
      final list = raw is List
          ? raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        _articles = list;
        if (list.length == 1) _articleSel = list.first['id'].toString();
      });
    } catch (_) {
      if (mounted) setState(() => _articles = <Map<String, dynamic>>[]);
    }
  }

  String get _title => switch (widget.mode) {
        'sell' => 'Bot contacte les acheteurs',
        'ask' => 'Bot contacte les bons profils',
        _ => 'Bot négocie avec les vendeurs',
      };
  String get _who => switch (widget.mode) {
        'sell' => 'acheteur',
        'ask' => 'profil',
        _ => 'vendeur',
      };

  int get _maxPick => widget.items.isEmpty ? 1 : widget.items.length.clamp(1, 10);
  int get _picked => _count.clamp(1, _maxPick);

  Future<void> _launch() async {
    if (_busy) return;
    if (widget.mode == 'sell' && _article.isEmpty) {
      setState(() => _error = 'Choisissez l’article à vendre.');
      return;
    }
    if (!_confirm) {
      setState(() => _confirm = true);
      return;
    }
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final data = await widget.service.createMandate(
        mode: widget.mode,
        goal: widget.goal,
        articleId: widget.mode == 'sell' && _article.isNotEmpty ? _article : null,
        priceFloor: widget.mode == 'sell' ? widget.priceFloor : null,
        autonomyMode: _autonomy,
        city: widget.city.trim().isEmpty ? null : widget.city.trim(),
        budgetMax: widget.mode == 'buy' ? widget.budget : null,
        maxContacts: _picked,
        maxFollowups: _autonomy == 'assisted' ? 0 : 1,
        allowWhatsapp: _whatsapp,
        allowPublicBusiness: true,
        allowBlindMessage: true,
        durationHours: 72,
        completionGoal: 'agreement',
      );
      final mandate = data['mandate'];
      final mandateId = mandate is Map ? '${mandate['id'] ?? ''}' : '';
      var linked = 0;
      for (final item in widget.items.take(_picked)) {
        try {
          await widget.service.startOpportunity(
            fabricId: item.fabricId,
            mode: widget.mode,
            mandateId: mandateId,
          );
          linked++;
        } catch (_) {}
      }
      if (mounted) setState(() => _linked = linked);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Impossible de lancer Bot pour le moment. Réessayez.';
          _confirm = false;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return const SizedBox.shrink();
    if (!widget.expanded) return OutlinedButton.icon(
      onPressed:()=>showModalBottomSheet<void>(context:context,isScrollControlled:true,useSafeArea:true,showDragHandle:true,backgroundColor:const Color(0xFFFCFBF9),constraints:const BoxConstraints(maxWidth:560),builder:(sheet)=>ConstrainedBox(constraints:BoxConstraints(maxHeight:MediaQuery.sizeOf(sheet).height*.9),child:SingleChildScrollView(padding:EdgeInsets.only(bottom:MediaQuery.viewInsetsOf(sheet).bottom),child:LiveBotNextStep(service:widget.service,mode:widget.mode,goal:widget.goal,city:widget.city,budget:widget.budget,items:widget.items,articleId:widget.articleId,priceFloor:widget.priceFloor,expanded:true)))),
      icon:const Icon(Icons.smart_toy_outlined,size:18),label:const Text('Confier à Bot'),style:OutlinedButton.styleFrom(foregroundColor:essentialPlum,backgroundColor:const Color(0xFFF4EFF7),minimumSize:const Size.fromHeight(48),side:const BorderSide(color:essentialLine),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14))),
    );
    final decoration=BoxDecoration(color:const Color(0xFFFCFBF9),borderRadius:BorderRadius.circular(22));

    if (_linked != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: decoration,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.check_circle_rounded, color: Color(0xFF059669)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Bot s’en occupe',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
              ),
            ]),
            const SizedBox(height: 6),
            Text(
              '$_linked offre${_linked! > 1 ? 's' : ''} prise${_linked! > 1 ? 's' : ''} en charge. ${_autonomy == 'assisted' ? 'Vous validez chaque message.' : 'Je vous préviens à chaque réponse.'}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: WaouhPalette.muted),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => context.go('/app/missions'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              child: const Text('Suivre mes contacts'),
            ),
          ],
        ),
      );
    }

    Widget autonomyChip(String id, String label, String hint) {
      final selected = _autonomy == id;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() {
            _autonomy = id;
            _confirm = false;
          }),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.all(8),
            constraints: const BoxConstraints(minHeight: 44),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFF2ECF8) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: selected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900)),

              ],
            ),
          ),
        ),
      );
    }

    final counts = <int>{1, 3, 5, 10, _maxPick}.where((n) => n <= _maxPick).toList()
      ..sort();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: decoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children:[const Expanded(child:Text('Bot s’en occupe',style:TextStyle(fontSize:22,fontWeight:FontWeight.w800,color:essentialPlum))),IconButton(tooltip:'Fermer',onPressed:_busy?null:()=>Navigator.pop(context),icon:const Icon(Icons.close))]),
          Text(_autonomy == 'assisted' ? 'Vous validez chaque message.' : _autonomy == 'autonomous' ? 'Bot négocie dans vos limites. Vous validez l’accord.' : 'Vous validez l’accord final.',style:const TextStyle(fontSize:12,color:WaouhPalette.muted)),
          const SizedBox(height:14),
          if (_needsArticle && _articles != null) ...[
            const Text('Article à vendre',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            if (_articles!.isEmpty)
              OutlinedButton(
                onPressed: () => context.go('/app/avatar/vendre'),
                child: const Text('Publier mon article d’abord'),
              )
            else
              Wrap(spacing: 6, runSpacing: 6, children: [
                for (final a in _articles!.take(12))
                  ChoiceChip(
                    label: Text(_articleTitle(a),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    selected: _articleSel == a['id'].toString(),
                    onSelected: (_) => setState(() {
                      _articleSel = a['id'].toString();
                      _confirm = false;
                      _error = '';
                    }),
                  ),
              ]),
            const SizedBox(height: 10),
          ],
          Row(children: [
            autonomyChip('assisted', 'Assisté', 'Je valide chaque message'),
            autonomyChip('semi_autonomous', 'Semi-auto', 'Bot contacte, je valide l’accord'),
            autonomyChip('autonomous', 'Autonome', 'Bot négocie dans mes limites'),
          ]),
          const SizedBox(height: 10),
          const Text('Offres à contacter',style:TextStyle(fontSize:12,fontWeight:FontWeight.w700)),
          const SizedBox(height:6),
          Wrap(spacing:6,children:[for(final n in counts)ChoiceChip(label:Text('$n'),selected:_picked==n,onSelected:(_)=>setState((){_count=n;_confirm=false;}))]),
          ExpansionTile(tilePadding:EdgeInsets.zero,title:const Text('Réglages avancés',style:TextStyle(fontSize:13)),children:[SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('WhatsApp vérifié',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            value: _whatsapp,
            onChanged: (value) => setState(() {
              _whatsapp = value;
              _confirm = false;
            }),
          ),
          ]),
          if (_error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(_error,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE11D48))),
            ),
          FilledButton.icon(
            onPressed: _busy ? null : _launch,
            icon: _busy
                ? const SizedBox.square(
                    dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(_confirm ? Icons.verified_user_rounded : Icons.handshake_rounded),
            label: Text(_confirm
                ? 'Confirmer : $_picked contact${_picked > 1 ? 's' : ''} max'
                : 'Lancer la démarche'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: essentialJade,
            ),
          ),
          const SizedBox(height: 6),
          const Center(
            child: Text('Aucun paiement à cette étape.',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: WaouhPalette.muted)),
          ),
        ],
      ),
    );
  }
}
