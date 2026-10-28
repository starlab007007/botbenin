import 'package:flutter/material.dart';
import 'live_product_data.dart';
export 'live_product_data.dart';

class LiveProductGallery extends StatefulWidget {
  const LiveProductGallery({
    super.key,
    required this.photos,
    required this.title,
    this.height = 240,
    this.width,
    this.detail = false,
  });
  final List<String> photos;
  final String title;
  final double height;
  final double? width;
  final bool detail;
  @override
  State<LiveProductGallery> createState() => _LiveProductGalleryState();
}

class _LiveProductGalleryState extends State<LiveProductGallery> {
  final _pages = PageController();
  int index = 0;
  List<String> get photos => liveProductPhotos({'photos': widget.photos});
  @override
  void didUpdateWidget(covariant LiveProductGallery oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.title != widget.title ||
        oldWidget.photos.join('|') != widget.photos.join('|')) {
      index = 0;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _pages.hasClients) _pages.jumpToPage(0);
      });
    }
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  Widget fallback({bool unavailable = false}) => ColoredBox(
    color: const Color(0xFFF1F3F8),
    child: LayoutBuilder(
      builder: (context, constraints) => Center(
        child: constraints.maxWidth < 80 || constraints.maxHeight < 80
            ? const Icon(
                Icons.image_outlined,
                size: 18,
                color: Color(0xFF939DB1),
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.image_outlined,
                    size: 28,
                    color: Color(0xFF939DB1),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    unavailable ? 'Photo indisponible' : 'Photo non fournie',
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF8B96AB),
                    ),
                  ),
                ],
              ),
      ),
    ),
  );
  Widget image(String url, {BoxFit fit = BoxFit.contain}) => Image.network(
    url,
    fit: fit,
    errorBuilder: (_, __, ___) => fit == BoxFit.cover
        ? const ColoredBox(
            color: Color(0xFFF1F3F8),
            child: Center(
              child: Icon(
                Icons.image_outlined,
                size: 18,
                color: Color(0xFF939DB1),
              ),
            ),
          )
        : fallback(unavailable: true),
    loadingBuilder: (context, child, progress) => progress == null
        ? child
        : const Center(
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 1.5),
            ),
          ),
  );
  void _zoom() {
    final urls = photos;
    if (urls.isEmpty) return;
    var selected = index;
    final zoomPages = PageController(initialPage: index);
    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) => Dialog.fullscreen(
          backgroundColor: const Color(0xFF10141E),
          child: SafeArea(
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Fermer les photos',
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close, color: Colors.white),
                    ),
                    Expanded(
                      child: Text(
                        widget.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        '${selected + 1} / ${urls.length}',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ),
                  ],
                ),
                Expanded(
                  child: PageView.builder(
                    controller: zoomPages,
                    itemCount: urls.length,
                    onPageChanged: (i) => update(() => selected = i),
                    itemBuilder: (_, i) => InteractiveViewer(
                      minScale: 1,
                      maxScale: 4,
                      child: image(urls[i]),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    'Faites glisser · pincez pour agrandir',
                    style: TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).whenComplete(zoomPages.dispose);
  }

  @override
  Widget build(BuildContext context) {
    final urls = photos;
    return SizedBox(
      width: widget.width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(widget.detail ? 20 : 13),
            child: SizedBox(
              height: widget.height,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  const ColoredBox(color: Color(0xFFF2F4F9)),
                  if (urls.isEmpty)
                    fallback()
                  else
                    PageView.builder(
                      controller: _pages,
                      itemCount: urls.length,
                      onPageChanged: (i) => setState(() => index = i),
                      itemBuilder: (_, i) => GestureDetector(
                        onTap: widget.detail ? _zoom : null,
                        child: Padding(
                          padding: const EdgeInsets.all(9),
                          child: image(urls[i]),
                        ),
                      ),
                    ),
                  if (urls.isNotEmpty)
                    Positioned(
                      right: 9,
                      bottom: 9,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .94),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          child: Text(
                            '${index + 1} / ${urls.length}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF34415A),
                            ),
                          ),
                        ),
                      ),
                    ),
                  if (widget.detail && urls.isNotEmpty)
                    Positioned(
                      right: 6,
                      top: 6,
                      child: IconButton(
                        tooltip: 'Agrandir les photos',
                        onPressed: _zoom,
                        icon: const Icon(
                          Icons.open_in_full,
                          size: 17,
                          color: Color(0xFF526582),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (widget.detail && urls.length > 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Photo précédente',
                    visualDensity: VisualDensity.compact,
                    onPressed: () => _pages.animateToPage(
                      (index - 1 + urls.length) % urls.length,
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOut,
                    ),
                    icon: const Icon(Icons.chevron_left),
                  ),
                  for (var i = 0; i < urls.length; i++)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Semantics(
                          label: 'Afficher la photo ${i + 1}',
                          selected: i == index,
                          button: true,
                          child: InkWell(
                            onTap: () => _pages.animateToPage(
                              i,
                              duration: const Duration(milliseconds: 220),
                              curve: Curves.easeOut,
                            ),
                            child: Container(
                              height: 44,
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F6FB),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: i == index
                                      ? const Color(0xFF4865D9)
                                      : const Color(0xFFE5E9F1),
                                  width: i == index ? 2 : 1,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(7),
                                child: image(urls[i], fit: BoxFit.cover),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  IconButton(
                    tooltip: 'Photo suivante',
                    visualDensity: VisualDensity.compact,
                    onPressed: () => _pages.animateToPage(
                      (index + 1) % urls.length,
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOut,
                    ),
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class LiveProductFacts extends StatelessWidget {
  const LiveProductFacts({
    super.key,
    required this.product,
    this.expanded = false,
  });
  final LiveProductData product;
  final bool expanded;
  @override
  Widget build(BuildContext context) =>
      product.description.isEmpty && product.attributes.isEmpty
      ? const SizedBox.shrink()
      : ExpansionTile(
          tilePadding: EdgeInsets.zero,
          initiallyExpanded: expanded,
          title: const Text(
            'Détails du produit',
            style: TextStyle(fontSize: 12, color: Color(0xFF62718B)),
          ),
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (product.description.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text(
                      product.description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6C7890),
                        height: 1.6,
                      ),
                    ),
                  ),
                if (product.attributes.isNotEmpty)
                  Wrap(
                    spacing: 18,
                    runSpacing: 16,
                    children: [
                      for (final a in product.attributes.entries.take(8))
                        SizedBox(
                          width: (MediaQuery.sizeOf(context).width - 84) / 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                a.key,
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFF8B96AA),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                a.value,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF34415B),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                const Padding(
                  padding: EdgeInsets.only(top: 18),
                  child: Text(
                    'Prix et conditions annoncés, à confirmer avant accord.',
                    style: TextStyle(
                      fontSize: 10,
                      color: Color(0xFF8A95A9),
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
}

Future<void> showLiveProductDetails(BuildContext context, dynamic value) {
  final p = LiveProductData(value);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    builder: (ctx) => ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(ctx).height * .9,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LiveProductGallery(
              photos: p.photos,
              title: p.title,
              detail: true,
              height: 280,
            ),
            const SizedBox(height: 14),
            Text(
              p.title,
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w600,
                letterSpacing: -.5,
              ),
            ),
            const SizedBox(height: 9),
            Text(
              p.price,
              style: const TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.w600,
                color: Color(0xFF20345B),
                letterSpacing: -.6,
              ),
            ),
            if (p.city.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 7),
                child: Text(
                  p.city,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF8590A5),
                  ),
                ),
              ),
            LiveProductFacts(product: p, expanded: true),
          ],
        ),
      ),
    ),
  );
}

class LiveProductPresentation extends StatelessWidget {
  const LiveProductPresentation({
    super.key,
    required this.value,
    this.label = 'Produit suivi',
  });
  final dynamic value;
  final String label;
  @override
  Widget build(BuildContext context) {
    final p = LiveProductData(value);
    if (p.title.isEmpty) return const SizedBox.shrink();
    void open() => showLiveProductDetails(context, value);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFE7EBF3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: open,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                LiveProductGallery(
                  photos: p.photos,
                  title: p.title,
                  width: 86,
                  height: 112,
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 9,
                          letterSpacing: .5,
                          color: Color(0xFF8B96AA),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        p.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF23314C),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        p.price,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF344A87),
                        ),
                      ),
                      if (p.city.isNotEmpty)
                        Text(
                          p.city,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF8A94A7),
                          ),
                        ),
                      const SizedBox(height: 7),
                      const Row(
                        children: [
                          Flexible(
                            child: Text(
                              'Voir le produit',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF4965D8),
                              ),
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            size: 14,
                            color: Color(0xFF4965D8),
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
      ),
    );
  }
}
