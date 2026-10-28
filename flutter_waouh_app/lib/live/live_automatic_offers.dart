import 'live_product_presentation.dart';
import 'dart:async';
import 'live_mission_domain.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'avatar/bot_character.dart';
import 'live_avatar_autonomy.dart';
import 'live_nexus_service.dart';
import 'live_essential_offer_data.dart';
import 'live_essential_offers.dart';
import 'live_offer_choice.dart';

class LiveAutomaticOffers extends StatefulWidget {
  const LiveAutomaticOffers({
    super.key,
    required this.items,
    required this.query,
    required this.actionLabel,
    required this.onAction,
    required this.onContact,
    required this.onDelegate,
    required this.onFollow,
    this.city = '',
    this.budget,
    this.mode = 'buy',
    this.tracking,
    this.actionBusy = false,
    this.onPriorityChanged,
    this.manualChoice = false,
    this.missionKind = 'purchase',
    this.missionContext,
    this.ownArticle,
  });
  final ValueChanged<String>? onPriorityChanged;
  final List<NexusDiscoveryItem> items;
  final String query, city, mode, actionLabel;
  final double? budget;
  final String missionKind;
  final Map<String, dynamic>? missionContext, ownArticle;
  final String? tracking;
  final bool actionBusy, manualChoice;
  final VoidCallback onAction;
  final ValueChanged<NexusDiscoveryItem> onContact, onDelegate, onFollow;
  @override
  State<LiveAutomaticOffers> createState() => _LiveAutomaticOffersState();
}

class _LiveAutomaticOffersState extends State<LiveAutomaticOffers> {
  String _priority = 'price';
  Timer? _clockTimer;
  DateTime _clock = DateTime.now();
  Map<String, dynamic> get contextRules => normalizeMissionContext(
    widget.missionContext,
    widget.missionKind,
    query: widget.query,
  );
  double? contextNumber(String key) => (contextRules[key] as num?)?.toDouble();
  @override
  void initState() {
    super.initState();
    _clockTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted && widget.missionKind == 'opportunity')
        setState(() => _clock = DateTime.now());
    });
  }

  @override
  void didUpdateWidget(covariant LiveAutomaticOffers oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.missionKind != widget.missionKind) _clock = DateTime.now();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  List<NexusDiscoveryItem> get ranked => rankLiveOfferChoices(
    widget.items,
    query: widget.query,
    city: widget.city,
    budget: widget.budget,
    mode: widget.mode,
    priority: _priority,
    missionKind: widget.missionKind,
    maxDays: contextNumber('max_days'),
    requiredPages: contextNumber('required_pages'),
    quantity: contextNumber('quantity'),
    unit: '${contextRules['unit'] ?? ''}',
    priceFloor: contextNumber('price_floor'),
    now: _clock,
  );
  String money(double n) =>
      '${n.round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ')} F CFA';
  String text(NexusDiscoveryItem o, String key) =>
      o.evidence[key] is String ? (o.evidence[key] as String).trim() : '';
  String totalLine(NexusDiscoveryItem o) {
    if (widget.missionKind != 'purchase')
      return missionOfferView(o, widget.missionKind)['line']!;
    if (widget.mode == 'sell') return 'Budget annoncé · quantité à préciser';
    final c = choiceCost(o);
    return c.total != null
        ? '${money(c.total!)} livré estimés'
        : essentialKind(o) == 'service'
        ? 'Périmètre et frais à préciser'
        : 'Frais et prix final à préciser';
  }

  String tag(NexusDiscoveryItem o) => widget.missionKind != 'purchase'
      ? missionOfferView(o, widget.missionKind)['tag']!
      : widget.mode == 'sell'
      ? 'Demande à qualifier'
      : choicePriceConfirmed(o) && choiceAvailabilityConfirmed(o)
      ? 'Prix et disponibilité confirmés'
      : choiceCost(o).total != null
      ? 'Coût livré renseigné'
      : choicePrice(o) != null
      ? 'Prix annoncé · conditions à vérifier'
      : 'Conditions à préciser';
  Widget guide(String line, {double size = 44}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      BotCharacter(size: size, animated: false),
      const SizedBox(width: 11),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Votre avatar · IA',
              style: TextStyle(
                fontSize: 12,
                color: avatarPremiumBlue,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 5),
            Text(line, style: const TextStyle(fontSize: 14, height: 1.45)),
          ],
        ),
      ),
    ],
  );
  Widget primary({VoidCallback? onTap}) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: avatarPremiumBlue,
        minimumSize: const Size.fromHeight(49),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
      onPressed: widget.actionBusy ? null : onTap ?? widget.onAction,
      child: Text(
        widget.actionLabel,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
    ),
  );
  Future<void> _compare() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Mon comparatif automatique',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 14),
              for (final o in ranked.take(4))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (widget.missionKind == 'purchase' ||
                          o.photoUrls.isNotEmpty)
                        LiveProductPresentation(
                          value: {
                            'id': o.fabricId,
                            'title': o.title,
                            'evidence': o.evidence,
                            'price_min': o.priceMin,
                            'price_max': o.priceMax,
                            'currency': o.currency,
                            'city': o.city,
                          },
                          label: 'Produit comparé',
                        ),
                      Text(
                        o.title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: o.fabricId == ranked.first.fabricId
                              ? avatarPremiumBlue
                              : avatarPremiumInk,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${missionOfferView(o, widget.missionKind)['value']} · ${o.city ?? 'Zone à confirmer'}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        totalLine(o),
                        style: const TextStyle(
                          fontSize: 12,
                          color: avatarPremiumMuted,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        widget.missionKind == 'purchase'
                            ? '${choicePriceConfirmed(o) ? 'Prix confirmé' : 'Prix annoncé'} · ${choiceAvailabilityConfirmed(o) ? 'Disponibilité confirmée' : 'Stock à confirmer'}'
                            : missionOfferView(o, widget.missionKind)['meta']!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: avatarPremiumMuted,
                        ),
                      ),
                      const Divider(color: avatarPremiumLine),
                    ],
                  ),
                ),
              const Text(
                'Le classement utilise les informations reçues. Un prix, une unité ou des frais manquants restent à confirmer.',
                style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
              ),
              if (widget.missionKind == 'purchase')
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: const Text(
                    'Adapter ma priorité',
                    style: TextStyle(fontSize: 13),
                  ),
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: _priority,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Ma priorité',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'price',
                          child: Text('Le coût et les conditions'),
                        ),
                        DropdownMenuItem(
                          value: 'availability',
                          child: Text('La disponibilité'),
                        ),
                      ],
                      onChanged: widget.actionBusy
                          ? null
                          : (v) {
                              if (v == null || !mounted) return;
                              setState(() => _priority = v);
                              widget.onPriorityChanged?.call(v);
                              update(() {});
                            },
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _detail(NexusDiscoveryItem o) async {
    final rows = ranked,
        first = rows.isNotEmpty && rows.first.fabricId == o.fabricId,
        cost = choiceCost(o),
        kind = essentialKind(o);
    final known = choicePriceConfirmed(o) && choiceAvailabilityConfirmed(o);
    var verdict = first
        ? 'Mon premier choix, sous réserve de vérification.'
        : 'Une alternative à examiner.';
    var reason = kind == 'service'
        ? 'Je rapproche cette piste de votre besoin. Le périmètre et le créneau restent à confirmer.'
        : kind == 'announcement'
        ? 'Je rapproche cette opportunité de votre besoin. Les conditions et la validité restent à confirmer.'
        : 'Cette piste correspond aux critères renseignés. Je vérifie les conditions avant tout accord.';
    if (known) {
      verdict = first
          ? 'Mon premier choix parmi les offres comparées.'
          : 'Une alternative aux informations confirmées.';
      reason =
          'Le prix et la disponibilité sont confirmés dans les informations reçues. Les autres conditions restent à vérifier.';
    } else if (cost.total != null && widget.mode != 'sell') {
      reason =
          'Le coût livré est renseigné. Je vérifie le stock, l’état réel et les conditions annoncées.';
    }
    if (!first && rows.isNotEmpty) {
      final base = choiceCost(rows.first);
      if (base.total != null &&
          cost.total != null &&
          cost.total! > base.total!) {
        reason =
            'Le coût livré annoncé est supérieur de ${money(cost.total! - base.total!)} à mon premier choix. Je vérifie ce qui peut justifier cet écart.';
      } else if (base.price != null &&
          cost.price != null &&
          cost.price! < base.price! &&
          cost.delivery == null) {
        reason =
            'Le prix affiché est inférieur à mon premier choix, mais les frais manquants empêchent de conclure sur le coût final.';
      }
    }
    if (widget.mode == 'sell') {
      verdict = first
          ? 'Une demande à qualifier en priorité.'
          : 'Une autre demande à qualifier.';
      reason =
          'Cette demande se rapproche de votre article. Le budget annoncé ne constitue pas encore une offre ferme.';
    }
    var advantages = <String>[
      if (widget.city.isNotEmpty && o.city != null)
        'Localisation annoncée : ${o.city}.',
      if (cost.total != null &&
          widget.budget != null &&
          cost.total! <= widget.budget!)
        '${money(widget.budget! - cost.total!)} sous votre plafond, selon les montants annoncés.',
      if (text(o, 'warranty').isNotEmpty)
        'Garantie annoncée : ${text(o, 'warranty')}.',
    ];
    var pending = widget.mode == 'sell'
        ? <String>[
            'Quantité, budget et modalités à confirmer.',
            'Intérêt pour votre article à vérifier avant tout accord.',
          ]
        : <String>[
            if (!choiceAvailabilityConfirmed(o))
              choiceAvailable(o)
                  ? 'Disponibilité annoncée, à confirmer.'
                  : 'Disponibilité à confirmer.',
            if (!choicePriceConfirmed(o)) 'Prix final et unité à confirmer.',
            kind == 'service'
                ? 'Périmètre, créneau et conditions à préciser.'
                : kind == 'announcement'
                ? 'Validité et conditions de participation à vérifier.'
                : 'État réel et garantie écrite à vérifier.',
          ];
    if (widget.missionKind != 'purchase') {
      final d = domainOfferDecision(
        o,
        rows,
        widget.missionKind,
        priceFloor: contextNumber('price_floor'),
      );
      verdict = d.verdict;
      reason = d.reason;
      advantages = d.advantages;
      pending = d.pending;
    }
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: avatarPremiumBg,
      showDragHandle: true,
      builder: (ctx) => FractionallySizedBox(
        heightFactor: .92,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(18, 0, 42, 15),
                child: Text(
                  'Mon analyse de cette offre',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600),
                ),
              ),
              LayoutBuilder(
                builder: (ctx, c) => _media(o, c.maxWidth, 300, detail: true),
              ),
              Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      o.title,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      missionOfferView(o, widget.missionKind)['meta']!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    LiveProductFacts(
                      product: LiveProductData({
                        'title': o.title,
                        'evidence': o.evidence,
                        'city': o.city,
                      }),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      missionOfferView(o, widget.missionKind)['value']!,
                      style: const TextStyle(
                        fontSize: 31,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      totalLine(o),
                      style: const TextStyle(
                        fontSize: 13,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 18),
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(17),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          guide(verdict, size: 40),
                          const SizedBox(height: 12),
                          Text(
                            reason,
                            style: const TextStyle(fontSize: 13, height: 1.5),
                          ),
                          const SizedBox(height: 5),
                          for (final line in advantages) _fact(line, false),
                          for (final line in pending) _fact(line, true),
                        ],
                      ),
                    ),
                    const Text(
                      'Le suivi de mon avatar',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      widget.tracking ??
                          '${missionCopy[widget.missionKind]!['next']}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'Votre accord reste nécessaire pour tout engagement.',
                      style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                    ),
                    const SizedBox(height: 15),
                    if (!widget.manualChoice ||
                        widget.missionKind == 'opportunity')
                      primary(onTap: () => Navigator.pop(ctx, 'follow')),
                    ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      title: const Text(
                        'Annonce et éléments utilisés',
                        style: TextStyle(fontSize: 13),
                      ),
                      children: [
                        if (o.detailsSummary.isNotEmpty)
                          Text(
                            o.detailsSummary,
                            style: const TextStyle(
                              fontSize: 12,
                              color: avatarPremiumMuted,
                            ),
                          ),
                        Text(
                          essentialUnit(o).isEmpty
                              ? 'Unité à confirmer.'
                              : 'Unité annoncée : ${essentialUnit(o)}.',
                          style: const TextStyle(
                            fontSize: 12,
                            color: avatarPremiumMuted,
                          ),
                        ),
                        if (o.sourceUrl != null &&
                            [
                              'http',
                              'https',
                            ].contains(Uri.tryParse(o.sourceUrl!)?.scheme))
                          TextButton.icon(
                            onPressed: () => launchUrl(
                              Uri.parse(o.sourceUrl!),
                              mode: LaunchMode.externalApplication,
                            ),
                            icon: const Icon(Icons.open_in_new, size: 14),
                            label: const Text('Voir l’annonce d’origine'),
                          ),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: () => Navigator.pop(ctx, 'compare'),
                      icon: const Icon(Icons.view_column_outlined, size: 15),
                      label: const Text(
                        'Voir le comparatif des offres',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                    if (widget.missionKind != 'opportunity')
                      ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        initiallyExpanded: widget.manualChoice,
                        title: const Text(
                          'Agir sur cette piste',
                          style: TextStyle(fontSize: 13),
                        ),
                        children: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, 'delegate'),
                            child: const Text(
                              'Confier cette piste à mon avatar',
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, 'contact'),
                            child: const Text('Préparer un contact'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, 'watch'),
                            child: const Text('Surveiller cette piste'),
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
    if (!mounted) return;
    if (action == 'compare') await _compare();
    if (action == 'follow') widget.onAction();
    if (action == 'delegate') widget.onDelegate(o);
    if (action == 'contact') widget.onContact(o);
    if (action == 'watch') widget.onFollow(o);
  }

  Widget _fact(String line, bool pending) => Padding(
    padding: const EdgeInsets.only(top: 9),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          pending ? Icons.shield_outlined : Icons.check,
          size: 15,
          color: pending ? const Color(0xFF9A6419) : const Color(0xFF117B68),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            line,
            style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
          ),
        ),
      ],
    ),
  );
  Widget _media(
    NexusDiscoveryItem o,
    double width,
    double height, {
    bool detail = false,
  }) {
    if (widget.missionKind == 'purchase' ||
        (o.photoUrls.isNotEmpty && widget.missionKind != 'sale'))
      return LiveEssentialPhoto(
        item: o,
        width: width,
        height: height,
        large: true,
        detail: detail,
      );
    final view = missionOfferView(o, widget.missionKind),
        icon = widget.missionKind == 'opportunity'
            ? Icons.folder_open_outlined
            : widget.missionKind == 'service'
            ? Icons.build_outlined
            : widget.missionKind == 'project'
            ? Icons.web_outlined
            : Icons.person_search_outlined;
    return Container(
      width: width,
      height: detail ? 235 : height,
      padding: EdgeInsets.all(detail ? 24 : 13),
      color: const Color(0xFFEDF1FF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            view['coverType']!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
          ),
          const SizedBox(height: 15),
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, size: 23, color: avatarPremiumBlue),
          ),
          const SizedBox(height: 15),
          Text(
            view['cover']!,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: detail ? 27 : 17,
              fontWeight: FontWeight.w500,
              letterSpacing: -.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(NexusDiscoveryItem o, bool first, bool tall) => Material(
    color: Colors.white,
    borderRadius: BorderRadius.circular(17),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => _detail(o),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LayoutBuilder(
            builder: (ctx, c) => Stack(
              children: [
                _media(o, c.maxWidth, tall ? 205 : 180),
                if (first)
                  Positioned(
                    top: 10,
                    left: 8,
                    right: 8,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 5,
                          horizontal: 7,
                        ),
                        decoration: BoxDecoration(
                          color: avatarPremiumBlue,
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: const Text(
                          '✦ Choix de mon avatar',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(11, 11, 11, 13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  o.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  o.city ?? 'Zone à confirmer',
                  style: const TextStyle(
                    fontSize: 11,
                    color: avatarPremiumMuted,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  (missionOfferView(
                    o,
                    widget.missionKind,
                  )['value']!).replaceAll('F CFA', 'F'),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -.7,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  totalLine(o),
                  style: const TextStyle(
                    fontSize: 11,
                    color: avatarPremiumMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  tag(o),
                  style: const TextStyle(
                    fontSize: 11,
                    color: avatarPremiumBlue,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final rows = ranked,
        eligible = essentialUnique(widget.items)
            .where(
              (o) => choiceMatches(
                o,
                query: widget.query,
                city: widget.city,
                budget: widget.budget,
                mode: widget.mode,
                missionKind: widget.missionKind,
                maxDays: contextNumber('max_days'),
                requiredPages: contextNumber('required_pages'),
                quantity: contextNumber('quantity'),
                unit: '${contextRules['unit'] ?? ''}',
                priceFloor: contextNumber('price_floor'),
                now: _clock,
              ),
            )
            .toList(),
        review =
            (widget.mode == 'sell' || widget.missionKind != 'purchase'
                    ? <NexusDiscoveryItem>[]
                    : eligible)
                .where((o) => choicePriceNeedsReview(o, eligible))
                .toList(),
        shown = rows.take(4).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        guide(
          rows.isNotEmpty
              ? '${missionCopy[widget.missionKind]!['summary']}'.replaceAll(
                  '{count}',
                  '${shown.length}',
                )
              : review.isNotEmpty
              ? 'Les prix de ces pistes demandent une clarification. Je les garde à part.'
              : 'Aucune piste ne répond aux critères renseignés pour le moment.',
        ),
        const SizedBox(height: 20),
        if (widget.missionKind == 'sale' && widget.ownArticle != null)
          LiveProductPresentation(
            value: widget.ownArticle,
            label: 'Mon article à vendre',
          ),
        if (rows.isNotEmpty) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${missionCopy[widget.missionKind]!['heading']}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '${rows.length} pistes retenues sur ${essentialUnique(widget.items).length} reçues · classement provisoire',
                      style: const TextStyle(
                        fontSize: 11,
                        color: avatarPremiumMuted,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: _compare,
                child: const Text(
                  'Mon comparatif',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (shown.length == 1)
            _tile(shown.first, true, true)
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    children: [
                      for (var i = 0; i < shown.length; i += 2)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _tile(shown[i], i == 0, false),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 17),
                    child: Column(
                      children: [
                        for (var i = 1; i < shown.length; i += 2)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _tile(shown[i], false, true),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          if (rows.length > 4)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: Text(
                '${rows.length - 4} autres pistes compatibles',
                style: const TextStyle(fontSize: 13),
              ),
              children: [
                for (final o in rows.skip(4))
                  ListTile(
                    title: Text(o.title, style: const TextStyle(fontSize: 13)),
                    subtitle: Text(essentialPrice(o)),
                    onTap: () => _detail(o),
                  ),
              ],
            ),
        ] else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              review.isEmpty ? 'Aucune offre compatible' : 'Prix à clarifier',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
          ),
        if (review.isNotEmpty)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(
              '${review.length} prix à clarifier',
              style: const TextStyle(fontSize: 13),
            ),
            children: [
              for (final o in review)
                ListTile(
                  title: Text(
                    '${o.title} · ${essentialPrice(o)}',
                    style: const TextStyle(fontSize: 13),
                  ),
                  subtitle: const Text(
                    'Un écart important demande une précision. Cette piste reste hors du classement jusqu’à clarification.',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
            ],
          ),
        const SizedBox(height: 16),
        primary(
          onTap: widget.manualChoice && rows.isNotEmpty
              ? () => _detail(rows.first)
              : widget.onAction,
        ),
        if (widget.tracking != null)
          Padding(
            padding: const EdgeInsets.only(top: 9),
            child: Text(
              widget.tracking!,
              style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
          ),
      ],
    );
  }
}
