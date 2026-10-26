import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'live_nexus_service.dart';
import 'live_essential_offer_data.dart';

const essentialPlum = Color(0xFF43204D),
    essentialJade = Color(0xFF197562),
    essentialLine = Color(0xFFEAE5EB),
    essentialMuted = Color(0xFF796E7D);

class LiveEssentialPhoto extends StatelessWidget {
  const LiveEssentialPhoto({
    super.key,
    required this.item,
    this.width = 84,
    this.height = 106,
    this.large = false,
  });
  final NexusDiscoveryItem item;
  final double width, height;
  final bool large;
  @override
  Widget build(BuildContext context) {
    final placeholder = ColoredBox(
      color: const Color(0xFFF3EFED),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              essentialKind(item) == 'service'
                  ? Icons.work_outline
                  : Icons.shopping_bag_outlined,
              color: essentialMuted,
              size: large ? 40 : 25,
            ),
            if (width > 60)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Sans photo',
                  style: TextStyle(fontSize: 10, color: essentialMuted),
                ),
              ),
          ],
        ),
      ),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: width,
        height: height,
        child: item.photoUrls.isEmpty
            ? placeholder
            : Image.network(
                item.photoUrls.first,
                fit: large ? BoxFit.contain : BoxFit.cover,
                errorBuilder: (_, __, ___) => placeholder,
              ),
      ),
    );
  }
}

class LiveEssentialOffers extends StatefulWidget {
  const LiveEssentialOffers({
    super.key,
    required this.items,
    required this.selected,
    required this.onToggle,
    required this.onContinue,
    required this.onDelegate,
    required this.onFollow,
    this.city = '',
    this.mode = 'buy',
    this.onPropose,
    this.premium = false,
  });
  final List<NexusDiscoveryItem> items;
  final Set<String> selected;
  final ValueChanged<String> onToggle;
  final ValueChanged<NexusDiscoveryItem> onContinue, onDelegate, onFollow;
  final String city, mode;
  final bool premium;
  final ValueChanged<NexusDiscoveryItem>? onPropose;
  @override
  State<LiveEssentialOffers> createState() => _LiveEssentialOffersState();
}

class _LiveEssentialOffersState extends State<LiveEssentialOffers> {
  bool _filters = false;
  String _filter = 'all';
  @override
  void didUpdateWidget(covariant LiveEssentialOffers oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.items, widget.items)) _filter = 'all';
  }

  @override
  Widget build(BuildContext context) {
    final rows = essentialUnique(widget.items)
        .where(
          (r) => _filter == 'near'
              ? widget.city.trim().isNotEmpty &&
                    essentialNormalize(r.city) ==
                        essentialNormalize(widget.city)
              : _filter == 'contact'
              ? essentialContactPossible(r)
              : true,
        )
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '${rows.length} offre${rows.length > 1 ? 's' : ''}',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: essentialPlum,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => setState(() => _filters = !_filters),
              icon: const Icon(Icons.tune_rounded, size: 17),
              label: const Text('Filtres'),
            ),
          ],
        ),
        if (_filters)
          Wrap(
            spacing: 6,
            children: [
              for (final entry in {
                'all': 'Toutes',
                'near': 'Proches',
                'contact': 'Avec contact',
              }.entries)
                ChoiceChip(
                  label: Text(entry.value),
                  selected: _filter == entry.key,
                  onSelected: entry.key == 'near' && widget.city.trim().isEmpty
                      ? null
                      : (_) => setState(() => _filter = entry.key),
                ),
            ],
          ),
        const _EssentialInsight(
          text: 'Prix, unité et disponibilité à confirmer.',
        ),
        if (rows.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Aucune offre pour ce filtre.',
              style: TextStyle(color: essentialMuted),
            ),
          ),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 700 ? 2 : 1;
            final width = (constraints.maxWidth - (columns - 1) * 10) / columns;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final item in rows)
                  SizedBox(
                    width: width,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: essentialLine),
                      ),
                      child: Stack(
                        children: [
                          InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => _open(item),
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(
                                10,
                                10,
                                38,
                                10,
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  LiveEssentialPhoto(
                                    item: item,
                                    width: widget.premium
                                        ? 57
                                        : constraints.maxWidth < 340
                                        ? 72
                                        : 84,
                                    height: widget.premium ? 77 : 106,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: widget.premium ? 13 : 14,
                                            fontWeight: FontWeight.w700,
                                            color: widget.premium
                                                ? const Color(0xFF17233B)
                                                : essentialPlum,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          essentialPrice(item),
                                          style: const TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w800,
                                            color: essentialJade,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          essentialHint(item),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: essentialMuted,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          item.city ?? 'Zone à confirmer',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: essentialMuted,
                                          ),
                                        ),
                                        if (!widget.premium)
                                          const SizedBox(height: 6),
                                        if (!widget.premium)
                                          const Text(
                                            'Voir l’offre →',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: essentialPlum,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            top: 0,
                            right: 0,
                            child: Semantics(
                              label: 'Comparer : ${item.title}',
                              checked: widget.selected.contains(item.fabricId),
                              child: IconButton(
                                tooltip: 'Comparer : ${item.title}',
                                onPressed:
                                    widget.selected.length >= 5 &&
                                        !widget.selected.contains(item.fabricId)
                                    ? null
                                    : () => widget.onToggle(item.fabricId),
                                icon: Icon(
                                  widget.selected.contains(item.fabricId)
                                      ? Icons.check_circle_rounded
                                      : Icons.radio_button_unchecked_rounded,
                                  size: 22,
                                  color: widget.selected.contains(item.fabricId)
                                      ? essentialJade
                                      : essentialMuted,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  void _open(NexusDiscoveryItem item) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: const Color(0xFFFCFBF9),
    constraints: const BoxConstraints(maxWidth: 560),
    builder: (sheet) => _EssentialDetail(
      item: item,
      mode: widget.mode,
      onPropose: () {
        Navigator.pop(sheet);
        (widget.onPropose ?? widget.onContinue)(item);
      },
      onContinue: () {
        Navigator.pop(sheet);
        widget.onContinue(item);
      },
      onDelegate: () {
        Navigator.pop(sheet);
        widget.onDelegate(item);
      },
      onFollow: () {
        Navigator.pop(sheet);
        widget.onFollow(item);
      },
    ),
  );
}

class _EssentialInsight extends StatelessWidget {
  const _EssentialInsight({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10, top: 6),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: const Color(0xFFF2ECF8),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        const Icon(Icons.auto_awesome_rounded, size: 16, color: essentialPlum),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, color: essentialPlum),
          ),
        ),
      ],
    ),
  );
}

class _EssentialDetail extends StatelessWidget {
  const _EssentialDetail({
    required this.item,
    required this.mode,
    required this.onContinue,
    required this.onDelegate,
    required this.onFollow,
    required this.onPropose,
  });
  final NexusDiscoveryItem item;
  final String mode;
  final VoidCallback onContinue, onDelegate, onFollow, onPropose;
  @override
  Widget build(BuildContext context) {
    final refs = essentialReferences(item), median = essentialMedian(item);
    final kind = essentialKind(item);
    final primary = mode == 'sell'
        ? 'Proposer mon offre'
        : kind == 'announcement'
        ? 'Répondre à l’annonce'
        : kind == 'service'
        ? 'Demander cette prestation'
        : 'Je le veux';
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .88,
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          18,
          0,
          18,
          20 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'L’offre en bref',
                    style: TextStyle(color: essentialMuted, fontSize: 12),
                  ),
                ),
                IconButton(
                  tooltip: 'Fermer',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            GestureDetector(
              onTap: item.photoUrls.isEmpty
                  ? null
                  : () => showDialog<void>(
                      context: context,
                      builder: (dialog) => Dialog(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Align(
                              alignment: Alignment.centerRight,
                              child: IconButton(
                                tooltip: 'Fermer les photos',
                                onPressed: () => Navigator.pop(dialog),
                                icon: const Icon(Icons.close),
                              ),
                            ),
                            SizedBox(
                              height: MediaQuery.sizeOf(dialog).height * .6,
                              child: PageView(
                                children: [
                                  for (final url in item.photoUrls)
                                    InteractiveViewer(
                                      child: Image.network(
                                        url,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) =>
                                            const Center(
                                              child: Icon(
                                                Icons.broken_image_outlined,
                                              ),
                                            ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                '${item.photoUrls.length} photo(s) · faites défiler',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              child: LiveEssentialPhoto(
                item: item,
                width: double.infinity,
                height: 180,
                large: true,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              item.title,
              style: const TextStyle(
                fontSize: 23,
                fontWeight: FontWeight.w800,
                color: essentialPlum,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              essentialPrice(item),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: essentialJade,
              ),
            ),
            Text(
              '${essentialHint(item)} · ${item.city ?? 'Zone à confirmer'}',
              style: const TextStyle(fontSize: 12, color: essentialMuted),
            ),
            _EssentialInsight(text: essentialAdvice(item)),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text(
                'Marché',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                essentialMarketLabel(item),
                style: const TextStyle(fontSize: 11, color: essentialMuted),
              ),
              children: [
                if (median != null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Médiane des références : ${median.round()} ${item.currency == 'XOF' ? 'F CFA' : item.currency}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Prix observés ; unité, modèle et conditions doivent correspondre.',
                    style: TextStyle(fontSize: 12, color: essentialMuted),
                  ),
                ),
                for (final ref in refs)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      '${ref['seller']}',
                      style: const TextStyle(fontSize: 13),
                    ),
                    subtitle: Text(
                      '${ref['amount']} ${ref['currency'] == 'XOF' ? 'F CFA' : ref['currency']} · ${ref['observed_at'] == null ? 'Date non précisée' : ref['observed_at'].toString().split('T').first} · ${ref['comparable'] == true ? 'Comparable' : 'Équivalence à confirmer'}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    onTap: () async {
                      final uri = Uri.tryParse('${ref['url']}');
                      if (uri != null)
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                    },
                  ),
              ],
            ),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text(
                'Pourquoi ce choix ?',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      item.scores.reasons
                              .where(
                                (x) => !RegExp(
                                  r'ENRICH|NEXUS|C[0-5]|score|\d+%',
                                  caseSensitive: false,
                                ).hasMatch(x),
                              )
                              .take(3)
                              .join(' · ')
                              .isEmpty
                          ? 'Offre issue de votre recherche. Conditions à vérifier.'
                          : item.scores.reasons
                                .where(
                                  (x) => !RegExp(
                                    r'ENRICH|NEXUS|C[0-5]|score|\d+%',
                                    caseSensitive: false,
                                  ).hasMatch(x),
                                )
                                .take(3)
                                .join(' · '),
                      style: const TextStyle(
                        fontSize: 12,
                        color: essentialMuted,
                      ),
                    ),
                  ),
                ),
                if (essentialText(item.evidence['description']).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      essentialText(item.evidence['description']),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                const Padding(
                  padding: EdgeInsets.only(bottom: 10),
                  child: Text(
                    'Vos coordonnées restent protégées.',
                    style: TextStyle(fontSize: 11, color: essentialMuted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: onContinue,
              style: FilledButton.styleFrom(
                backgroundColor: essentialJade,
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(primary),
            ),
            if (kind != 'announcement')
              TextButton(
                onPressed: onPropose,
                child: const Text('Proposer un prix'),
              ),
            ExpansionTile(
              title: const Text(
                'Autres actions',
                style: TextStyle(fontSize: 13),
              ),
              children: [
                ListTile(
                  leading: const Icon(Icons.smart_toy_outlined),
                  title: const Text('Confier à Bot'),
                  onTap: onDelegate,
                ),
                ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: const Text('Suivre prix / disponibilité'),
                  onTap: onFollow,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class LiveEssentialCompareTray extends StatelessWidget {
  const LiveEssentialCompareTray({
    super.key,
    required this.items,
    required this.onClear,
  });
  final List<NexusDiscoveryItem> items;
  final VoidCallback onClear;
  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xFFFAF9F7),
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: essentialLine),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) => Row(
          children: [
            for (final item in items.take(constraints.maxWidth < 340 ? 1 : 2))
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: LiveEssentialPhoto(item: item, width: 30, height: 36),
              ),
            const SizedBox(width: 4),
            Text('${items.length} / 5', style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton(
                onPressed: items.length < 2
                    ? null
                    : () => showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        useSafeArea: true,
                        showDragHandle: true,
                        constraints: const BoxConstraints(maxWidth: 1000),
                        builder: (sheet) =>
                            LiveEssentialComparison(items: items),
                      ),
                style: FilledButton.styleFrom(
                  backgroundColor: essentialJade,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  minimumSize: const Size(0, 44),
                ),
                child: const Text('Comparer', style: TextStyle(fontSize: 12)),
              ),
            ),
            IconButton(
              tooltip: 'Vider la sélection',
              constraints: const BoxConstraints(minWidth: 40, minHeight: 44),
              padding: EdgeInsets.zero,
              onPressed: onClear,
              icon: const Icon(Icons.close_rounded, size: 18),
            ),
          ],
        ),
      ),
    ),
  );
}

class LiveEssentialComparison extends StatelessWidget {
  const LiveEssentialComparison({super.key, required this.items});
  final List<NexusDiscoveryItem> items;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: MediaQuery.sizeOf(context).height * .72,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Comparer · ${items.length} offres',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Fermer',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 18),
          child: Text(
            'Prix observés. Comparez les mêmes unités et conditions.',
            style: TextStyle(fontSize: 12, color: essentialMuted),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return SizedBox(
                width: 205,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      LiveEssentialPhoto(item: item, width: 205, height: 130),
                      const SizedBox(height: 12),
                      Text(
                        item.title,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        essentialPrice(item),
                        style: const TextStyle(
                          color: essentialJade,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(essentialHint(item)),
                      const SizedBox(height: 8),
                      Text(item.city ?? 'Zone à confirmer'),
                      const SizedBox(height: 12),
                      Text(
                        essentialAdvice(item),
                        style: const TextStyle(fontSize: 12),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Marché : ${essentialMarketLabel(item)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: essentialMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    ),
  );
}
