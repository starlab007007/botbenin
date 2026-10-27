import 'package:flutter/material.dart';
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
  });
  final ValueChanged<String>? onPriorityChanged;
  final List<NexusDiscoveryItem> items;
  final String query, city, mode, actionLabel;
  final double? budget;
  final String? tracking;
  final bool actionBusy;
  final bool manualChoice;
  final VoidCallback onAction;
  final ValueChanged<NexusDiscoveryItem> onContact, onDelegate, onFollow;
  @override
  State<LiveAutomaticOffers> createState() => _LiveAutomaticOffersState();
}

class _LiveAutomaticOffersState extends State<LiveAutomaticOffers> {
  String _priority = 'price';
  bool _alternatives = false;
  List<NexusDiscoveryItem> get ranked => rankLiveOfferChoices(
    essentialUnique(widget.items),
    query: widget.query,
    city: widget.city,
    budget: widget.budget,
    mode: widget.mode,
    priority: _priority,
  );
  @override
  void didUpdateWidget(covariant LiveAutomaticOffers oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query ||
        oldWidget.city != widget.city ||
        oldWidget.budget != widget.budget ||
        oldWidget.mode != widget.mode)
      _alternatives = false;
  }

  Future<void> _compare() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) {
          final rows = ranked.take(3).toList();
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 0, 22, 25),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Pourquoi ce choix ?',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -.5,
                  ),
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  initialValue: _priority,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Ma priorité'),
                  items: const [
                    DropdownMenuItem(
                      value: 'price',
                      child: Text('Le meilleur prix'),
                    ),
                    DropdownMenuItem(
                      value: 'availability',
                      child: Text('La disponibilité'),
                    ),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _priority = v);
                    widget.onPriorityChanged?.call(v);
                    update(() {});
                  },
                ),
                const SizedBox(height: 20),
                const Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Text(
                        'Offre',
                        style: TextStyle(
                          fontSize: 11,
                          color: avatarPremiumMuted,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Prix',
                        style: TextStyle(
                          fontSize: 11,
                          color: avatarPremiumMuted,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Disponible',
                        style: TextStyle(
                          fontSize: 11,
                          color: avatarPremiumMuted,
                        ),
                      ),
                    ),
                  ],
                ),
                for (var i = 0; i < rows.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 15,
                      horizontal: 5,
                    ),
                    decoration: BoxDecoration(
                      color: i == 0 ? const Color(0xFFEDF1FF) : Colors.white,
                      border: const Border(
                        bottom: BorderSide(color: avatarPremiumLine),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 3,
                          child: Text(
                            rows[i].title,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          flex: 2,
                          child: Text(
                            essentialPrice(rows[i]),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          flex: 2,
                          child: Text(
                            choiceAvailable(rows[i])
                                ? 'Selon l’offre'
                                : 'À vérifier',
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                const Padding(
                  padding: EdgeInsets.only(top: 17),
                  child: Text(
                    'Les prix inconnus, unités et disponibilités manquantes restent à vérifier avant tout accord.',
                    style: TextStyle(
                      fontSize: 12,
                      color: avatarPremiumMuted,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _detail(NexusDiscoveryItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (ctx) => ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(ctx).height * .82,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 25),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                essentialPrice(item),
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                item.city ?? 'Zone à confirmer',
                style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
              ),
              const SizedBox(height: 20),
              Text(
                choiceAvailable(item)
                    ? 'Disponible selon l’offre. Prix et conditions à confirmer.'
                    : 'Disponibilité, prix et conditions à confirmer.',
                style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
              ),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: const Text(
                  'Conditions de l’offre',
                  style: TextStyle(fontSize: 12),
                ),
                children: [
                  Text(
                    item.detailsSummary,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  widget.onDelegate(item);
                },
                child: const Text('Choisir cette piste'),
              ),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  widget.onContact(item);
                },
                child: const Text('Contacter'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  widget.onFollow(item);
                },
                child: const Text('Suivre cette offre'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _alternative(NexusDiscoveryItem item) => Material(
    type: MaterialType.transparency,
    child: ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(
        Icons.shopping_bag_outlined,
        size: 24,
        color: avatarPremiumMuted,
      ),
      title: Text(
        item.title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      ),
      subtitle: Text(
        item.city ?? 'Zone à confirmer',
        style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
      ),
      trailing: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 112),
        child: Text(
          essentialPrice(item),
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
      onTap: () => _detail(item),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final rows = ranked;
    if (rows.isEmpty)
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            const BotCharacter(size: 48, animated: false),
            const SizedBox(height: 18),
            const Text(
              'Aucune offre compatible',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Text(
              widget.tracking ?? 'Ajustez vos critères ou poursuivez avec Bot.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: widget.actionBusy ? null : widget.onAction,
                child: Text(widget.actionLabel),
              ),
            ),
          ],
        ),
      );
    final item = rows.first,
        confirmed =
            choicePriceConfirmed(item) && choiceAvailabilityConfirmed(item),
        others = rows.skip(1).take(2).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 15),
          child: Text(
            '${widget.items.length} offre${widget.items.length > 1 ? 's' : ''} reçue${widget.items.length > 1 ? 's' : ''} · ${rows.take(3).length} retenue${rows.length > 1 ? 's' : ''}',
            style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: avatarPremiumLine),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Material(
                color: const Color(0xFFF0F3FA),
                child: InkWell(
                  onTap: () => _detail(item),
                  child: LayoutBuilder(
                    builder: (ctx, constraints) => Stack(
                      children: [
                        if (item.photoUrls.isNotEmpty)
                          LiveEssentialPhoto(
                            item: item,
                            width: constraints.maxWidth,
                            height: 205,
                            large: true,
                          )
                        else
                          Container(
                            height: 125,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFFE9EAF8), Color(0xFFF0F3FA)],
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Icon(
                              essentialKind(item) == 'service'
                                  ? Icons.work_outline
                                  : Icons.shopping_bag_outlined,
                              size: 50,
                              color: const Color(0xFF8F9BB6),
                            ),
                          ),
                        Positioned(
                          top: 15,
                          left: 15,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.auto_awesome_outlined,
                                  size: 13,
                                  color: avatarPremiumBlue,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  confirmed
                                      ? 'Le choix de Bot'
                                      : 'Piste retenue par Bot',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: avatarPremiumBlue,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -.5,
                      ),
                    ),
                    const SizedBox(height: 11),
                    Text(
                      essentialPrice(item),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.city ?? 'Zone à confirmer',
                      style: const TextStyle(
                        fontSize: 11,
                        color: avatarPremiumMuted,
                      ),
                    ),
                    const SizedBox(height: 15),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.verified_outlined,
                          size: 14,
                          color: confirmed
                              ? const Color(0xFF087C68)
                              : avatarPremiumMuted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            confirmed
                                ? 'Prix et disponibilité confirmés'
                                : choiceAvailable(item)
                                ? 'Disponible selon l’offre · prix à confirmer'
                                : 'Prix observé · disponibilité à vérifier',
                            style: TextStyle(
                              fontSize: 11,
                              color: confirmed
                                  ? const Color(0xFF087C68)
                                  : avatarPremiumMuted,
                            ),
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
        Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: _compare,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 15),
              child: Row(
                children: [
                  const BotCharacter(size: 30, animated: false),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          confirmed
                              ? (_priority == 'price'
                                    ? 'Le meilleur prix confirmé.'
                                    : 'Une offre disponible.')
                              : 'La piste à vérifier en priorité.',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Pourquoi ce choix ?',
                          style: TextStyle(
                            fontSize: 11,
                            color: avatarPremiumMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: avatarPremiumMuted,
                  ),
                ],
              ),
            ),
          ),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: avatarPremiumBlue,
            minimumSize: const Size.fromHeight(49),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(15),
            ),
          ),
          onPressed: widget.actionBusy
              ? null
              : widget.manualChoice
              ? () => _detail(item)
              : widget.onAction,
          child: Text(
            widget.actionLabel,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
        if (widget.tracking != null)
          Padding(
            padding: const EdgeInsets.only(top: 9),
            child: Text(
              widget.tracking!,
              style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
          ),
        if (others.isNotEmpty) ...[
          TextButton(
            onPressed: () => setState(() => _alternatives = !_alternatives),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _alternatives
                      ? 'Masquer les alternatives'
                      : 'Voir ${others.length} alternative${others.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: avatarPremiumMuted,
                  ),
                ),
                const SizedBox(width: 7),
                Icon(
                  _alternatives ? Icons.expand_less : Icons.expand_more,
                  size: 15,
                  color: avatarPremiumMuted,
                ),
              ],
            ),
          ),
          if (_alternatives)
            for (final o in others) _alternative(o),
        ],
        if (rows.length > 3)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(
              '${rows.length - 3} autres pistes',
              style: const TextStyle(fontSize: 12, color: avatarPremiumMuted),
            ),
            children: rows.skip(3).map(_alternative).toList(),
          ),
      ],
    );
  }
}
