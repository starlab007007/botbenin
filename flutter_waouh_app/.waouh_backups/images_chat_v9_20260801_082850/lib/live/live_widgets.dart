import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_models.dart';

class LiveHeader extends StatelessWidget implements PreferredSizeWidget {
  const LiveHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.back = false,
    this.leading,
  });
  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool back;
  final Widget? leading;

  @override
  Size get preferredSize => const Size.fromHeight(92);

  @override
  Widget build(BuildContext context) => AppBar(
        toolbarHeight: 92,
        automaticallyImplyLeading: false,
        leading: leading ??
            (back
                ? IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => context.canPop()
                        ? context.pop()
                        : context.go('/app/chat'),
                  )
                : null),
        title: Row(
          children: [
            const BrandMark(size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        color: Color(0xFFC9F6E3),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: actions,
        flexibleSpace: const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                legacy.WaouhColors.deep,
                legacy.WaouhColors.green,
                Color(0xFF031F1A),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      );
}

class LiveMessageBubble extends StatelessWidget {
  const LiveMessageBubble({super.key, required this.message, this.onPayload});
  final LiveMessage message;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) {
    final actions = message.meta['actions'];
    // Keep the message stream renderable for every backend payload.  The
    // experimental product parser used to run for every message and could
    // make the complete timeline fail when a payload contained an unexpected
    // value.  Rich text and attachments remain available; structured cards
    // are enabled only after a non-empty, validated product list is produced.
    final products = _safePremiumProducts(message);
    final outgoing = message.outgoing;
    final delivery = message.meta['delivery_state']?.toString() ?? 'delivered';
    final pending = delivery == 'sending' || delivery == 'queued';
    final failed = delivery == 'failed';
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(19),
      topRight: const Radius.circular(19),
      bottomLeft: Radius.circular(outgoing ? 19 : 5),
      bottomRight: Radius.circular(outgoing ? 5 : 19),
    );
    final bubbleColor =
        outgoing ? const Color(0xFFDCF8C6) : const Color(0xFFF8FFFB);

    final screenWidth = MediaQuery.sizeOf(context).width;
    final bubbleWidth =
        outgoing ? 340.0 : (screenWidth - 24).clamp(300.0, 760.0).toDouble();
    return Align(
      alignment: outgoing ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: bubbleWidth),
        child: Container(
          margin: const EdgeInsets.only(bottom: 11),
          decoration: BoxDecoration(
            color: bubbleColor,
            borderRadius: radius,
            border:
                outgoing ? null : Border.all(color: const Color(0xFFD5EEE3)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.045),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 9, 10, 7),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _senderHeader(outgoing),
                const SizedBox(height: 6),
                if (message.attachments.isNotEmpty && products.isEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: message.attachments.length == 1
                        ? _media(
                            message.attachments.first,
                            height: 190,
                            width: double.infinity,
                          )
                        : SizedBox(
                            height: 110,
                            child: Wrap(
                              spacing: 5,
                              runSpacing: 5,
                              children: message.attachments
                                  .map(
                                    (item) => ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: _media(
                                        item,
                                        height: 110,
                                        width: 110,
                                      ),
                                    ),
                                  )
                                  .toList(),
                            ),
                          ),
                  ),
                  if (message.text.isNotEmpty) const SizedBox(height: 9),
                ],
                if (message.text.isNotEmpty && products.isEmpty)
                  SelectionArea(
                    child: _LivePremiumMessageContent(text: message.text),
                  ),
                if (products.isNotEmpty) ...[
                  if (_premiumIntro(message.text).isNotEmpty) ...[
                    SelectionArea(
                      child: _LivePremiumMessageContent(
                        text: _premiumIntro(message.text),
                      ),
                    ),
                    const SizedBox(height: 9),
                  ],
                  _PremiumResultsGrid(products: products, onPayload: onPayload),
                ],
                if (actions is List && onPayload != null) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: actions.whereType<Map>().map((raw) {
                      final label = (raw['label'] ??
                              raw['title'] ??
                              raw['id'] ??
                              'Choisir')
                          .toString();
                      final payload =
                          (raw['id'] ?? raw['payload'] ?? label).toString();
                      return OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 38),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          side: const BorderSide(
                            color: legacy.WaouhColors.green,
                          ),
                          foregroundColor: legacy.WaouhColors.green,
                        ),
                        onPressed: () => onPayload!(payload),
                        child: Text(
                          label,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.bottomRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (outgoing && pending)
                        Text(
                          delivery == 'queued' ? 'En attente' : 'Envoi',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: legacy.WaouhColors.muted,
                          ),
                        ),
                      if (outgoing && failed)
                        const Text(
                          'Echec',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: legacy.WaouhColors.red,
                          ),
                        ),
                      if (outgoing && (pending || failed))
                        const SizedBox(width: 4),
                      Text(
                        _stamp(message.createdAt),
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: legacy.WaouhColors.muted,
                        ),
                      ),
                      if (outgoing) ...[
                        const SizedBox(width: 3),
                        Icon(
                          failed
                              ? Icons.error_outline_rounded
                              : pending
                                  ? Icons.schedule_rounded
                                  : Icons.done_all_rounded,
                          size: 14,
                          color: failed
                              ? legacy.WaouhColors.red
                              : pending
                                  ? legacy.WaouhColors.muted
                                  : const Color(0xFF53BDEB),
                        ),
                      ],
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

  Widget _senderHeader(bool outgoing) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (outgoing)
            const CircleAvatar(
              radius: 10,
              backgroundColor: Color(0xFF075E54),
              child: Icon(Icons.person_rounded, size: 13, color: Colors.white),
            )
          else
            const BrandMark(size: 20, semanticLabel: 'WAOUH assistant'),
          const SizedBox(width: 6),
          Text(
            outgoing ? 'Vous' : 'WAOUH',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w900,
              color:
                  outgoing ? const Color(0xFF075E54) : legacy.WaouhColors.deep,
            ),
          ),
          if (!outgoing) ...[
            const SizedBox(width: 4),
            const Text(
              'Assistant',
              style: TextStyle(fontSize: 11, color: legacy.WaouhColors.muted),
            ),
          ],
        ],
      );

  Widget _media(
    LiveAttachment attachment, {
    required double height,
    required double width,
  }) {
    final fallback = Container(
      height: height,
      width: width,
      color: legacy.WaouhColors.pearl,
      child: const Icon(
        Icons.broken_image_outlined,
        color: legacy.WaouhColors.muted,
      ),
    );
    if (attachment.url.startsWith('file:')) {
      return Image.file(
        File(Uri.parse(attachment.url).toFilePath()),
        height: height,
        width: width,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      attachment.url,
      height: height,
      width: width,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}

List<_PremiumProduct> _safePremiumProducts(LiveMessage message) {
  try {
    return _premiumProducts(message)
        .where((product) => product.title.trim().isNotEmpty)
        .toList(growable: false);
  } catch (_) {
    // A malformed optional UI payload must never hide the conversation.
    return const <_PremiumProduct>[];
  }
}

String? _premiumString(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty || text == 'null' ? null : text;
}

String? _premiumImageUrl(dynamic value) {
  if (value is Map) {
    return _premiumString(
      value['url'] ?? value['public_url'] ?? value['image_url'] ?? value['src'],
    );
  }
  return _premiumString(value);
}

class _PremiumProduct {
  const _PremiumProduct({
    required this.title,
    this.subtitle,
    this.image,
    this.price,
    this.city,
    this.category,
    this.availability,
    this.details,
    this.badges = const [],
  });
  final String title;
  final String? subtitle;
  final LiveAttachment? image;
  final String? price;
  final String? city;
  final String? category;
  final String? availability;
  final String? details;
  final List<String> badges;
}

List<_PremiumProduct> _premiumProducts(LiveMessage message) {
  const keys = [
    'products',
    'articles',
    'items',
    'results',
    'matches',
    'offers',
  ];
  List<dynamic> rows = const [];
  final containers = <Map>[
    message.meta,
    for (final key in ['data', 'payload', 'content'])
      if (message.meta[key] is Map) message.meta[key] as Map,
  ];
  for (final container in containers) {
    for (final key in keys) {
      final value = container[key];
      if (value is List && value.isNotEmpty) {
        rows = value;
        break;
      }
    }
    if (rows.isNotEmpty) break;
  }
  if (rows.isNotEmpty) {
    final structured =
        rows.asMap().entries.where((entry) => entry.value is Map).map((entry) {
      final source = entry.value as Map;
      final row = <String, dynamic>{
        for (final item in source.entries) item.key.toString(): item.value,
      };
      final photos = row['photos'] is List ? row['photos'] as List : const [];
      final imageUrl = _premiumImageUrl(
        row['photo'] ??
            row['image'] ??
            row['image_url'] ??
            row['photo_url'] ??
            row['thumbnail'] ??
            (photos.isEmpty ? null : photos.first),
      );
      final attachment = imageUrl != null && imageUrl.isNotEmpty
          ? LiveAttachment(url: imageUrl, type: 'image/jpeg')
          : entry.key < message.attachments.length
              ? message.attachments[entry.key]
              : null;
      final price =
          row['price'] ?? row['prix'] ?? row['prix_min'] ?? row['amount'];
      final badges = <String>[
        if (row['verified'] == true ||
            row['is_verified'] == true ||
            row['partner_verified'] == true ||
            row['verified_at'] != null)
          'Partenaire vérifié',
        for (final key in [
          'duration',
          'duree',
          'format',
          'level',
          'niveau',
          'date',
          'audience',
          'public',
          'location',
          'lieu',
        ])
          if (row[key] != null && row[key].toString().trim().isNotEmpty)
            row[key].toString().trim(),
      ];
      return _PremiumProduct(
        title: _premiumString(
              row['title'] ?? row['name'] ?? row['nom'] ?? row['label'],
            ) ??
            'Article ${entry.key + 1}',
        subtitle: _premiumString(
          row['subtitle'] ?? row['description_short'] ?? row['summary'],
        ),
        image: attachment,
        price: price == null
            ? null
            : '$price${price.toString().toUpperCase().contains('FCFA') ? '' : ' FCFA'}',
        city: _premiumString(
          row['city'] ?? row['ville'] ?? row['location'],
        ),
        category: _premiumString(
          row['category'] ?? row['categorie'] ?? row['type'],
        ),
        availability: _premiumString(
          row['availability'] ?? row['disponibilite'] ?? row['status'],
        ),
        details: _premiumString(
          row['details'] ??
              row['description'] ??
              row['recommendation'] ??
              row['recommandation'],
        ),
        badges: badges,
      );
    }).toList();
    if (structured.isNotEmpty) return structured;
  }
  final matches = RegExp(
    r'(?mi)^\s*(?:\*{0,2})?(?:article\s*)?(\d+)\s*(?:[.)]|[-–—:])\s+(.+?)(?:\*{0,2})?\s*$',
  ).allMatches(message.text).toList();
  final products = <_PremiumProduct>[];
  var attachmentCursor = 0;
  for (var index = 0; index < matches.length; index += 1) {
    final match = matches[index];
    final start = match.end;
    final end = index + 1 < matches.length
        ? matches[index + 1].start
        : message.text.length;
    final block = message.text.substring(start, end).replaceAll('*', '');
    String? capture(String pattern) => RegExp(
          pattern,
          caseSensitive: false,
          multiLine: true,
        ).firstMatch(block)?.group(1)?.trim();
    final price = capture(r'^(?:💰|💵|💲|💸|💰|🪙|\$)\s*([^\n]+)');
    final city = capture(r'^(?:🏙️|📍|🏢)\s*([^\n]+)');
    final category = capture(r'^(?:🏷️|📦)\s*([^\n]+)');
    final availability = capture(
      r'^(?:🟢|🔴|🟡|✅)\s*(Disponible|Réservé|Reserve|Vendu|En stock|Indisponible)',
    );
    final recommendation = capture(r'^(?:💡|🧠)\s*([^\n]+)');
    final verified = block.toLowerCase().contains('partenaire vérifié') ||
        block.toLowerCase().contains('partenaire verifie');
    final details = _premiumBlockDetails(block, recommendation: recommendation);
    final normalizedBlock = block.toLowerCase();
    final explicitlyWithoutPhoto = normalizedBlock.contains('0 photo') ||
        normalizedBlock.contains('sans photo') ||
        normalizedBlock.contains('aucune photo');
    final image =
        !explicitlyWithoutPhoto && attachmentCursor < message.attachments.length
            ? message.attachments[attachmentCursor++]
            : null;
    products.add(
      _PremiumProduct(
        title: match.group(2)!.replaceAll('*', '').trim(),
        image: image,
        price: price,
        city: city,
        category: category,
        availability: availability,
        details: details,
        badges: verified ? const ['Partenaire vérifié'] : const [],
      ),
    );
  }
  return products;
}

String? _premiumBlockDetails(String block, {String? recommendation}) {
  final values = <String>[];
  if (recommendation != null && recommendation.trim().isNotEmpty) {
    values.add(recommendation.trim());
  }
  for (final raw in block.replaceAll('\r\n', '\n').split('\n')) {
    final line = raw.trim();
    if (line.isEmpty || RegExp(r'^[─—–_=-]{4,}$').hasMatch(line)) continue;
    final normalized = line.toLowerCase();
    if (RegExp(
      r'^(💰|💵|💲|💸|🪙|\$|🏙️?|📍|🏢|🏷️?|📦|📸|📷|🟢|🔴|🟡|✅)',
    ).hasMatch(line)) {
      continue;
    }
    if (normalized.contains('partenaire vérifié') ||
        normalized.contains('partenaire verifie') ||
        normalized.contains('photo transmise') ||
        normalized.contains(' photos') ||
        normalized.contains(' photo')) {
      continue;
    }
    final clean = line.replaceFirst(RegExp(r'^(?:[-•]\s*)'), '').trim();
    if (clean.isNotEmpty && !values.contains(clean)) values.add(clean);
  }
  return values.isEmpty ? null : values.join('\n');
}

String _premiumIntro(String text) {
  final firstArticle = RegExp(
    r'(?mi)^\s*(?:\*{0,2})?(?:article\s*)?\d+\s*(?:[.)]|[-–—:])\s+',
  ).firstMatch(text);
  if (firstArticle == null) return '';
  return text.substring(0, firstArticle.start).trim();
}

class _PremiumResultsGrid extends StatelessWidget {
  const _PremiumResultsGrid({required this.products, this.onPayload});
  final List<_PremiumProduct> products;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final columns = constraints.maxWidth >= 560 ? 2 : 1;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0xFF062E27),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF8B7A25)),
                ),
                child: Text(
                  '${products.length} résultat${products.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                    color: Color(0xFFF2D36B),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 11,
                runSpacing: 11,
                children: List.generate(products.length, (index) {
                  final width = columns == 2
                      ? (constraints.maxWidth - 11) / 2
                      : constraints.maxWidth;
                  return SizedBox(
                    width: width,
                    child: _PremiumProductCard(
                      product: products[index],
                      index: index,
                      onPayload: onPayload,
                    ),
                  );
                }),
              ),
              const Padding(
                padding: EdgeInsets.only(top: 9, left: 3),
                child: Text(
                  '🔒 Résultats issus des données retournées par WAOUH — mise à jour en temps réel.',
                  style: TextStyle(fontSize: 10.5, color: Color(0xFF78988A)),
                ),
              ),
            ],
          );
        },
      );
}

class _PremiumProductCard extends StatelessWidget {
  const _PremiumProductCard({
    required this.product,
    required this.index,
    this.onPayload,
  });
  final _PremiumProduct product;
  final int index;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: const Color(0xFF0B3B32),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF6F682D)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 14,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 11, 12, 8),
              child: Row(
                children: [
                  _PremiumBadge(
                    product.badges.any(
                      (value) => value.toLowerCase().contains('vérifi'),
                    )
                        ? '✅ Vérifié'
                        : '✨ Résultat WAOUH',
                    const Color(0xFF123F24),
                    const Color(0xFFE3F06B),
                  ),
                  const Spacer(),
                  if (product.price != null) ...[
                    const SizedBox(width: 8),
                    Flexible(
                      child: _PremiumBadge(
                        product.price!,
                        const Color(0xFFF0D06A),
                        const Color(0xFF241E08),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (product.image != null)
              GestureDetector(
                onTap: () => showDialog<void>(
                  context: context,
                  barrierColor: Colors.black87,
                  builder: (_) => Dialog.fullscreen(
                    backgroundColor: Colors.black,
                    child: Stack(
                      children: [
                        Center(
                          child: InteractiveViewer(
                            minScale: .8,
                            maxScale: 5,
                            child: _premiumImage(
                              product.image!,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                        Positioned(
                          top: 18,
                          right: 12,
                          child: SafeArea(
                            child: IconButton(
                              onPressed: () => Navigator.pop(context),
                              icon: const Icon(
                                Icons.close_rounded,
                                color: Colors.white,
                                size: 30,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    SizedBox(
                      height: 154,
                      width: double.infinity,
                      child: _premiumImage(product.image!, fit: BoxFit.cover),
                    ),
                    Container(
                      margin: const EdgeInsets.all(8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xCC061D19),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF54766A)),
                      ),
                      child: const Text(
                        '🔍 Toucher pour agrandir',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                height: 112,
                width: double.infinity,
                color: const Color(0xFF0A332C),
                alignment: Alignment.center,
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.image_not_supported_outlined,
                      color: Color(0xFF8DB0A1),
                      size: 28,
                    ),
                    SizedBox(height: 7),
                    Text(
                      'Aucune photo fournie',
                      style: TextStyle(
                        color: Color(0xFF8DB0A1),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${index + 1}  ARTICLE ${index + 1}${product.image == null ? ' · SANS PHOTO BACKEND' : ' · ASSOCIÉ À PHOTO ${index + 1}'}',
                    style: const TextStyle(
                      fontSize: 9.5,
                      letterSpacing: .5,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFF0C84E),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    product.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 18,
                      height: 1.15,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                  if (product.subtitle != null)
                    Text(
                      product.subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFA8C4B8),
                      ),
                    ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 5,
                    runSpacing: 5,
                    children: [
                      if (product.city != null)
                        _PremiumBadge(
                          '📍 ${product.city!}',
                          const Color(0xFF124F46),
                          const Color(0xFF70E6CA),
                        ),
                      if (product.category != null)
                        _PremiumBadge(
                          '🏷️ ${product.category!}',
                          const Color(0xFF2F3E5B),
                          const Color(0xFFCDB7FF),
                        ),
                      if (product.availability != null)
                        _PremiumBadge(
                          product.availability!.toLowerCase().contains('réserv')
                              ? '🔴 ${product.availability!}'
                              : '🟢 ${product.availability!}',
                          const Color(0xFF17483D),
                          const Color(0xFF8BF0C3),
                        ),
                    ],
                  ),
                  const SizedBox(height: 9),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: const Color(0xFF082D27),
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(color: const Color(0xFF786D2C)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.image == null
                              ? '📸 0 photo transmise par le vendeur'
                              : '📸 1 photo transmise par le vendeur',
                          style: const TextStyle(
                            color: Color(0xFFDDEAE5),
                            fontSize: 11.5,
                          ),
                        ),
                        if (product.badges.any(
                          (value) => value.toLowerCase().contains('vérifié'),
                        ))
                          const Padding(
                            padding: EdgeInsets.only(top: 6),
                            child: Text(
                              '🛡️ Partenaire vérifié par WAOUH IA',
                              style: TextStyle(
                                color: Color(0xFFDDEAE5),
                                fontSize: 11.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (product.details != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: const Color(0xFF244D40),
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(color: const Color(0xFF817537)),
                      ),
                      child: Text(
                        '💡 Détails et recommandation\n${product.details!}',
                        style: const TextStyle(
                          fontSize: 11.2,
                          height: 1.3,
                          color: Color(0xFFFFE69A),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (_, constraints) {
                      final buttonWidth = constraints.maxWidth < 270
                          ? constraints.maxWidth
                          : (constraints.maxWidth - 8) / 2;
                      final reserved = product.availability
                              ?.toLowerCase()
                              .contains('réserv') ==
                          true;
                      return Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          SizedBox(
                            width: buttonWidth,
                            child: OutlinedButton.icon(
                              onPressed: onPayload == null
                                  ? null
                                  : () => onPayload!(
                                        'Je souhaite négocier ${product.title}',
                                      ),
                              icon: const Icon(Icons.forum_outlined, size: 17),
                              label: const Text('Négocier'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side:
                                    const BorderSide(color: Color(0xFF527668)),
                                minimumSize: const Size(0, 43),
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 11.5,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                            ),
                          ),
                          SizedBox(
                            width: buttonWidth,
                            child: FilledButton.icon(
                              onPressed: onPayload == null
                                  ? null
                                  : () => onPayload!(
                                        reserved
                                            ? 'Alertez-moi quand ${product.title} sera disponible'
                                            : 'Je suis intéressé par ${product.title}${product.price == null ? '' : ' à ${product.price}'}',
                                      ),
                              icon: Icon(
                                reserved
                                    ? Icons.notifications_active_outlined
                                    : Icons.shopping_cart_checkout_rounded,
                                size: 17,
                              ),
                              label: Text(reserved ? 'M’alerter' : 'Acheter'),
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFFE9C759),
                                foregroundColor: const Color(0xFF1E1A09),
                                minimumSize: const Size(0, 43),
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 11.5,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _PremiumBadge extends StatelessWidget {
  const _PremiumBadge(this.text, this.background, this.foreground);
  final String text;
  final Color background;
  final Color foreground;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
            color: foreground,
          ),
        ),
      );
}

Widget _premiumImage(LiveAttachment attachment, {required BoxFit fit}) {
  final fallback = Container(
    color: const Color(0xFFEAF7F1),
    alignment: Alignment.center,
    child: const Icon(Icons.broken_image_outlined, color: Color(0xFF6B8B7D)),
  );
  if (attachment.url.startsWith('file:'))
    return Image.file(
      File(Uri.parse(attachment.url).toFilePath()),
      fit: fit,
      errorBuilder: (_, __, ___) => fallback,
    );
  return Image.network(
    attachment.url,
    fit: fit,
    errorBuilder: (_, __, ___) => fallback,
  );
}

class _LivePremiumMessageContent extends StatelessWidget {
  const _LivePremiumMessageContent({required this.text});

  final String text;

  static final RegExp _separator = RegExp(r'^[\s─—–_=-]{5,}$');
  static final RegExp _productTitle = RegExp(r'^\*{0,2}\s*\d+[.)]\s+');
  static final RegExp _emphasis = RegExp(r'^\*+(.+?)\*+$');
  static final RegExp _info = RegExp(
    r'^(📍|🏙️|🏢|💰|💵|🏷️|📦|📊|📸|📷|🧠|✅|🎯|🛒|📞|👤|📇|📏|🔔|✨|🤝|⚠️|❌)',
  );

  @override
  Widget build(BuildContext context) {
    final lines = text.replaceAll('\r\n', '\n').split('\n');
    final children = <Widget>[];
    for (final raw in lines) {
      final line = raw.trimRight();
      if (line.trim().isEmpty) {
        children.add(const SizedBox(height: 7));
        continue;
      }
      final value = line.trim();
      if (_separator.hasMatch(value)) {
        children.add(
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 5),
            child: Divider(height: 1, thickness: 1, color: Color(0xFFB7D8CA)),
          ),
        );
        continue;
      }
      final emphasized = _emphasis.firstMatch(value);
      final clean = (emphasized?.group(1)?.trim() ?? value).replaceFirst(
        RegExp(r'^#{1,3}\s+'),
        '',
      );
      final isHeading = RegExp(r'^#{1,3}\s+').hasMatch(value);
      final isList = RegExp(r'^[-•]\s+').hasMatch(clean);
      final isHeadline = clean.contains('annonce trouvée') ||
          clean.contains('annonces trouvées') ||
          clean.startsWith('🎯');
      final isProduct = _productTitle.hasMatch(value);
      final isInfo = _info.hasMatch(clean);

      if (isHeadline || isHeading) {
        children.add(
          Container(
            width: double.infinity,
            margin: const EdgeInsets.symmetric(vertical: 2),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F8F0),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFC4E8D8)),
            ),
            child: _rich(
              clean,
              const TextStyle(
                fontSize: 15.5,
                height: 1.3,
                fontWeight: FontWeight.w900,
                color: legacy.WaouhColors.deep,
              ),
            ),
          ),
        );
      } else if (isProduct) {
        children.add(
          _PremiumTextSection(
            icon: Icons.inventory_2_outlined,
            accent: const Color(0xFFE9C759),
            background: const Color(0xFFFFFBED),
            child: _rich(
              clean,
              const TextStyle(
                fontSize: 15.5,
                height: 1.34,
                fontWeight: FontWeight.w900,
                color: legacy.WaouhColors.ink,
              ),
            ),
          ),
        );
      } else if (isInfo) {
        children.add(
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(top: 3),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.72),
              borderRadius: BorderRadius.circular(8),
            ),
            child: _rich(
              clean,
              const TextStyle(
                fontSize: 14.5,
                height: 1.3,
                color: legacy.WaouhColors.ink,
              ),
            ),
          ),
        );
      } else if (isList) {
        children.add(
          _PremiumTextSection(
            icon: Icons.check_circle_outline_rounded,
            accent: const Color(0xFF22A878),
            background: const Color(0xFFF7FCFA),
            child: _rich(
              clean.replaceFirst(RegExp(r'^[-•]\s+'), ''),
              const TextStyle(
                fontSize: 15,
                height: 1.36,
                color: legacy.WaouhColors.ink,
              ),
            ),
          ),
        );
      } else {
        children.add(
          _PremiumTextSection(
            icon: emphasized == null
                ? Icons.notes_rounded
                : Icons.auto_awesome_rounded,
            accent: emphasized == null
                ? const Color(0xFF9CB9AD)
                : const Color(0xFFE9C759),
            background: Colors.white,
            child: _rich(
              clean,
              TextStyle(
                fontSize: 15.5,
                height: 1.36,
                fontWeight:
                    emphasized == null ? FontWeight.w400 : FontWeight.w800,
                color: legacy.WaouhColors.ink,
              ),
            ),
          ),
        );
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }

  Widget _rich(String value, TextStyle style) {
    final spans = <TextSpan>[];
    final token = RegExp(
      r'(\*\*.+?\*\*|\*[^*]+\*|__.+?__|_[^_]+_|\[[^\]]+\]\([^)]+\))',
    );
    var cursor = 0;
    for (final match in token.allMatches(value)) {
      if (match.start > cursor)
        spans.add(
          TextSpan(text: value.substring(cursor, match.start), style: style),
        );
      final raw = match.group(0)!;
      if (raw.startsWith('**')) {
        spans.add(
          TextSpan(
            text: raw.substring(2, raw.length - 2),
            style: style.copyWith(fontWeight: FontWeight.w900),
          ),
        );
      } else if (raw.startsWith('*')) {
        spans.add(
          TextSpan(
            text: raw.substring(1, raw.length - 1),
            style: style.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      } else if (raw.startsWith('__')) {
        spans.add(
          TextSpan(
            text: raw.substring(2, raw.length - 2),
            style: style.copyWith(decoration: TextDecoration.underline),
          ),
        );
      } else if (raw.startsWith('_')) {
        spans.add(
          TextSpan(
            text: raw.substring(1, raw.length - 1),
            style: style.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      } else {
        final label = raw.substring(1, raw.indexOf(']('));
        spans.add(
          TextSpan(
            text: label,
            style: style.copyWith(
              color: const Color(0xFF08756A),
              fontWeight: FontWeight.w800,
              decoration: TextDecoration.underline,
            ),
          ),
        );
      }
      cursor = match.end;
    }
    if (cursor < value.length)
      spans.add(TextSpan(text: value.substring(cursor), style: style));
    return Text.rich(
      TextSpan(
        children: spans.isEmpty ? [TextSpan(text: value, style: style)] : spans,
      ),
    );
  }
}

class _PremiumTextSection extends StatelessWidget {
  const _PremiumTextSection({
    required this.icon,
    required this.accent,
    required this.background,
    required this.child,
  });

  final IconData icon;
  final Color accent;
  final Color background;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 4),
        padding: const EdgeInsets.fromLTRB(10, 9, 10, 9),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: accent.withOpacity(.42)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D001A13),
              blurRadius: 7,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: accent.withOpacity(.14),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(icon, size: 16, color: accent),
            ),
            const SizedBox(width: 9),
            Expanded(child: child),
          ],
        ),
      );
}

String _stamp(DateTime value) {
  final local = value.toLocal();
  return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

class LiveAttachmentStrip extends StatelessWidget {
  const LiveAttachmentStrip({
    super.key,
    required this.items,
    required this.onRemove,
  });
  final List<LiveAttachment> items;
  final ValueChanged<LiveAttachment> onRemove;

  @override
  Widget build(BuildContext context) => items.isEmpty
      ? const SizedBox.shrink()
      : Container(
          height: 76,
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: items
                .map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: _preview(item),
                        ),
                        Positioned(
                          top: -4,
                          right: -4,
                          child: GestureDetector(
                            onTap: () => onRemove(item),
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: const BoxDecoration(
                                color: legacy.WaouhColors.red,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close_rounded,
                                size: 13,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        );

  Widget _preview(LiveAttachment attachment) {
    final fallback = Container(
      width: 60,
      height: 60,
      color: legacy.WaouhColors.pearl,
      child: const Icon(Icons.image_outlined, color: legacy.WaouhColors.muted),
    );
    if (attachment.url.startsWith('file:')) {
      return Image.file(
        File(Uri.parse(attachment.url).toFilePath()),
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      attachment.url,
      width: 60,
      height: 60,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}
