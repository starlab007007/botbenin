import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_models.dart';

class LiveHeader extends StatelessWidget implements PreferredSizeWidget {
  const LiveHeader(
      {super.key,
      required this.title,
      this.subtitle,
      this.actions = const [],
      this.back = false,
      this.leading});
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
                        : context.go('/app/chat'))
                : null),
        title: Row(children: [
          const BrandMark(size: 34),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w900)),
                if (subtitle != null)
                  Text(subtitle!,
                      style: const TextStyle(
                          color: Color(0xFFC9F6E3),
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
              ])),
        ]),
        actions: actions,
        flexibleSpace: const DecoratedBox(
          decoration: BoxDecoration(
              gradient: LinearGradient(colors: [
            legacy.WaouhColors.deep,
            legacy.WaouhColors.green,
            Color(0xFF031F1A)
          ], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        ),
      );
}

class LiveMessageBubble extends StatelessWidget {
  const LiveMessageBubble({super.key, required this.message, this.onPayload});
  final LiveMessage message;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) {
    // Keep the message stream renderable for every backend payload.  The
    // experimental product parser used to run for every message and could
    // make the complete timeline fail when a payload contained an unexpected
    // value.  Rich text and attachments remain available; structured cards
    // are enabled only after a non-empty, validated product list is produced.
    final displayText = liveVisibleText(message.text);
    final products = _safePremiumProducts(message);
    final actions = _smartMessageActions(message, products);
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
                  color: Colors.black.withValues(alpha: 0.045),
                  blurRadius: 8,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 9, 10, 7),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _senderHeader(outgoing),
              const SizedBox(height: 6),
              if (message.attachments.isNotEmpty && products.isEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: message.attachments.length == 1
                      ? SizedBox(
                          height: 190,
                          width: double.infinity,
                          child: _media(
                            message.attachments.first,
                            height: 190,
                            width: double.infinity,
                          ),
                        )
                      : SizedBox(
                          height: 110,
                          child: Wrap(
                            spacing: 5,
                            runSpacing: 5,
                            children: message.attachments
                                .map((item) => ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child:
                                        _media(item, height: 110, width: 110)))
                                .toList(),
                          ),
                        ),
                ),
                if (message.text.isNotEmpty) const SizedBox(height: 9),
              ],
              if (displayText.isNotEmpty && products.isEmpty)
                SelectionArea(
                  child: _LivePremiumMessageContent(text: displayText),
                ),
              if (products.isNotEmpty) ...[
                if (_premiumIntro(displayText).isNotEmpty) ...[
                  SelectionArea(
                      child: _LivePremiumMessageContent(
                          text: _premiumIntro(displayText))),
                  const SizedBox(height: 9),
                ],
                _PremiumResultsGrid(products: products, onPayload: onPayload),
              ],
              if (products.isEmpty &&
                  actions.isNotEmpty &&
                  onPayload != null) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: actions.map((action) {
                    final tone = _smartActionTone(action.payload);
                    return FilledButton.tonal(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 38),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        side: BorderSide(color: tone.withValues(alpha: .45)),
                        foregroundColor: tone,
                        backgroundColor: tone.withValues(alpha: .10),
                      ),
                      onPressed: () => onPayload!(action.payload),
                      child: Text(action.label,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 13)),
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.bottomRight,
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (outgoing && pending)
                    Text(delivery == 'queued' ? 'En attente' : 'Envoi',
                        style: const TextStyle(
                            fontSize: 10.5, color: legacy.WaouhColors.muted)),
                  if (outgoing && failed)
                    const Text('Echec',
                        style: TextStyle(
                            fontSize: 10.5, color: legacy.WaouhColors.red)),
                  if (outgoing && (pending || failed)) const SizedBox(width: 4),
                  Text(_stamp(message.createdAt),
                      style: const TextStyle(
                          fontSize: 10.5, color: legacy.WaouhColors.muted)),
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
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _senderHeader(bool outgoing) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        if (outgoing)
          const CircleAvatar(
              radius: 10,
              backgroundColor: Color(0xFF075E54),
              child: Icon(Icons.person_rounded, size: 13, color: Colors.white))
        else
          const BrandMark(size: 20, semanticLabel: 'WAOUH assistant'),
        const SizedBox(width: 6),
        Text(outgoing ? 'Vous' : 'WAOUH',
            style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w900,
                color: outgoing
                    ? const Color(0xFF075E54)
                    : legacy.WaouhColors.deep)),
        if (!outgoing) ...[
          const SizedBox(width: 4),
          const Text('Assistant',
              style: TextStyle(fontSize: 11, color: legacy.WaouhColors.muted)),
        ],
      ]);

  Widget _media(LiveAttachment attachment,
      {required double height, required double width}) {
    final fallback = Container(
        height: height,
        width: width,
        color: legacy.WaouhColors.pearl,
        child: const Icon(Icons.broken_image_outlined,
            color: legacy.WaouhColors.muted));
    return _resolvedChatImage(
      attachment,
      height: height,
      width: width,
      fit: BoxFit.cover,
      fallback: fallback,
    );
  }
}

class _SmartMessageAction {
  const _SmartMessageAction({required this.payload, required this.label});
  final String payload;
  final String label;
}

Map<String, dynamic> liveCommercePayloadMeta(String payload) {
  final value = payload.trim();
  final queryAt = value.indexOf('?');
  final command = queryAt < 0 ? value : value.substring(0, queryAt);
  final query = queryAt < 0 ? const <String, String>{} :
      Uri.splitQueryString(value.substring(queryAt + 1));
  final separator = command.indexOf(':');
  final action = (separator < 0 ? command : command.substring(0, separator))
      .trim()
      .toLowerCase();
  final reference =
      separator < 0 ? '' : command.substring(separator + 1).trim();
  const workflowActions = {
    'accepter',
    'accept',
    'contre-proposition',
    'counter',
    'refuser',
    'refuse',
    'payer-mobile',
    'paiement-effectue',
    'paiement-livraison',
    'confirmer-disponibilite',
    'preparer',
    'suivre-livraison',
    'confirmer-reception',
    'signaler-probleme',
    'annuler',
    'mtn',
    'moov',
    'sbin',
  };
  return <String, dynamic>{
    'button_payload': command,
    if (action.startsWith('interess') || action.startsWith('intéress'))
      'action': 'interested',
    if (workflowActions.contains(action)) 'commerce_action': action,
    if (reference.isNotEmpty) 'commerce_reference': reference,
    for (final key in const <String>[
      'thread_id',
      'article_id',
      'buyer_user_id',
      'seller_user_id',
      'search_request_id',
      'search_thread_id',
      'source',
      'role',
      'status_id',
      'status_type',
      'radar_item_id',
      'radar_signal_id',
      'radar_source',
      'radar_intent',
      'counterpart_user_id',
      'negotiation_id',
      'deal_id',
      'transaction_id',
    ])
      if ((query[key] ?? '').trim().isNotEmpty) key: query[key]!.trim(),
  };
}

String liveCommercePayloadText(String payload) {
  final value = payload.trim();
  final queryAt = value.indexOf('?');
  return queryAt < 0 ? value : value.substring(0, queryAt).trim();
}

/// Rendu Smart UI commun aux résultats Radar, aux entêtes de match et aux
/// messages. Le produit conserve exactement le même contrat visuel et les
/// mêmes payloads lorsqu'il change d'étape dans le parcours commercial.
class LiveSmartProductPreview extends StatelessWidget {
  const LiveSmartProductPreview({
    super.key,
    required this.product,
    this.onPayload,
    this.showResultCount = false,
  });

  final Map<String, dynamic> product;
  final ValueChanged<String>? onPayload;
  final bool showResultCount;

  @override
  Widget build(BuildContext context) {
    final message = LiveMessage.fromJson(<String, dynamic>{
      'id': 'smart-preview-${product['id'] ?? product['article_id'] ?? ''}',
      'text': product['description'] ?? '',
      'direction': 'out',
      'created_at': DateTime.now().toIso8601String(),
      'products': <Map<String, dynamic>>[product],
      'attachments': product['photos'] ?? product['images'] ?? const [],
      'actions': product['actions'] ?? const [],
      'workflow_state': product['workflow_state'],
      'role': product['role'],
      'article_id': product['article_id'] ?? product['id'],
    });
    final products = _safePremiumProducts(message);
    if (products.isEmpty) {
      return Text(
        liveVisibleText(product['title'] ?? product['name'] ?? 'Article WAOUH'),
        style: const TextStyle(fontWeight: FontWeight.w900),
      );
    }
    if (showResultCount) {
      return _PremiumResultsGrid(products: products, onPayload: onPayload);
    }
    return _PremiumProductCard(
      product: products.first,
      index: 0,
      onPayload: onPayload,
    );
  }
}

Color _smartActionTone(String payload) {
  final value = payload.toLowerCase();
  if (value.startsWith('oui') ||
      value.startsWith('accept') ||
      value.startsWith('conclu') ||
      value.startsWith('payer') ||
      value.startsWith('paiement') ||
      value.startsWith('confirmer') ||
      value.startsWith('preparer')) {
    return const Color(0xFF08745D);
  }
  if (value.startsWith('non') ||
      value.startsWith('refus') ||
      value.startsWith('annul') ||
      value.startsWith('signaler')) {
    return const Color(0xFFB43B45);
  }
  return const Color(0xFF765A00);
}

List<_SmartMessageAction> _smartMessageActions(
  LiveMessage message,
  List<_PremiumProduct> products,
) {
  if (message.outgoing || products.isNotEmpty) {
    return const <_SmartMessageAction>[];
  }
  final text = message.text.toLowerCase();
  final intent = '${message.meta['intent'] ?? ''}'.toLowerCase();
  if (text.contains('accord conclu') ||
      text.contains('accord enregistré') ||
      text.contains('achat confirmé') ||
      text.contains('vente conclue') ||
      text.contains('négociation terminée') ||
      text.contains('négociation fermée') ||
      intent.contains('deal_created') ||
      intent.contains('deal_accepted') ||
      intent.contains('negotiation_closed')) {
    return const <_SmartMessageAction>[];
  }
  final rawActions = message.meta['actions'];
  if (rawActions is List) {
    final explicit = rawActions
        .whereType<Map>()
        .map((raw) {
          final label = (raw['label'] ?? raw['title'] ?? raw['id'] ?? 'Choisir')
              .toString()
              .trim();
          final payload =
              (raw['id'] ?? raw['payload'] ?? label).toString().trim();
          return _SmartMessageAction(payload: payload, label: label);
        })
        .where((action) => action.payload.isNotEmpty && action.label.isNotEmpty)
        .toList(growable: false);
    if (explicit.isNotEmpty) return explicit;
  }

  if (text.contains('demande envoyée au vendeur') ||
      text.contains('que souhaitez-vous faire') ||
      intent.contains('awaiting_buyer_decision')) {
    final suggested = RegExp(
      r'je propose\s+([\d\s.,]+)',
      caseSensitive: false,
    ).firstMatch(message.text)?.group(1)?.replaceAll(RegExp(r'\D'), '');
    return <_SmartMessageAction>[
      const _SmartMessageAction(payload: 'oui', label: '✅ Accepter ce prix'),
      _SmartMessageAction(
        payload: suggested == null || suggested.isEmpty
            ? 'proposer'
            : 'proposer:$suggested',
        label: '💬 Proposer un prix',
      ),
      const _SmartMessageAction(payload: 'non', label: '❌ Refuser'),
    ];
  }

  if (text.contains('nouvelle offre') ||
      text.contains('contre-offre') ||
      text.contains('contre proposition') ||
      intent.contains('negotiation_open') ||
      intent.contains('negotiation_decision')) {
    return const <_SmartMessageAction>[
      _SmartMessageAction(payload: 'accepter', label: '✅ Accepter'),
      _SmartMessageAction(
        payload: 'contre-proposition',
        label: '💬 Contre-proposer',
      ),
      _SmartMessageAction(payload: 'refuser', label: '❌ Refuser'),
    ];
  }

  if (RegExp(r'r[ée]pondez\s+.*oui.*non', caseSensitive: false)
      .hasMatch(message.text)) {
    return const <_SmartMessageAction>[
      _SmartMessageAction(payload: 'oui', label: '✅ Oui'),
      _SmartMessageAction(payload: 'non', label: '❌ Non'),
    ];
  }
  return const <_SmartMessageAction>[];
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

double? _premiumAmount(dynamic value) {
  final text = _premiumString(value);
  if (text == null) return null;
  final normalizedText = text.replaceAll('\u00a0', ' ');
  final match = RegExp(r'\d[\d\s.,]*').firstMatch(normalizedText);
  if (match == null) return null;
  var normalized = match.group(0)!.replaceAll(RegExp(r'\s'), '');
  if (normalized.contains(',') && !normalized.contains('.')) {
    normalized = normalized.replaceAll(',', '.');
  } else {
    normalized = normalized.replaceAll(',', '');
  }
  return double.tryParse(normalized);
}

double? _premiumMarketMedian(String? marketComparison) {
  if (marketComparison == null) return null;
  final normalizedMarket = marketComparison.replaceAll('\u00a0', ' ');
  final median = RegExp(
    r'm[ée]diane\s*[:=]?\s*(\d[\d\s.,]*)',
    caseSensitive: false,
  ).firstMatch(normalizedMarket);
  if (median != null) return _premiumAmount(median.group(1));
  final amounts = RegExp(r'\d[\d\s.,]*')
      .allMatches(normalizedMarket)
      .map((match) => _premiumAmount(match.group(0)))
      .whereType<double>()
      .where((amount) => amount >= 100)
      .toList();
  if (amounts.length >= 2) return (amounts[0] + amounts[1]) / 2;
  return amounts.isEmpty ? null : amounts.first;
}

String? _premiumAutomaticComparison(String? price, String? marketComparison) {
  final articlePrice = _premiumAmount(price);
  final median = _premiumMarketMedian(marketComparison);
  if (articlePrice == null || median == null || median <= 0) return null;
  final difference = ((articlePrice - median) / median * 100).round();
  if (difference <= -15) {
    return 'Excellent prix : ${difference.abs()} % sous la médiane du marché.';
  }
  if (difference < 0) {
    return 'Prix compétitif : ${difference.abs()} % sous la médiane du marché.';
  }
  if (difference <= 8) {
    return 'Prix aligné sur le marché : $difference % au-dessus de la médiane.';
  }
  return 'Prix élevé : $difference % au-dessus de la médiane du marché.';
}

String? _premiumAutomaticRecommendation(
  String? price,
  String? marketComparison,
  String? availability,
) {
  final articlePrice = _premiumAmount(price);
  final median = _premiumMarketMedian(marketComparison);
  final normalizedAvailability = availability?.toLowerCase() ?? '';
  if (normalizedAvailability.contains('réserv') ||
      normalizedAvailability.contains('reserv') ||
      normalizedAvailability.contains('vendu')) {
    return 'Article actuellement indisponible. Demandez à être alerté si une offre similaire apparaît.';
  }
  if (articlePrice == null || median == null || median <= 0) return null;
  final ratio = articlePrice / median;
  if (ratio <= .85) {
    return 'Offre attractive. Vérifiez l’état réel, les accessoires et la preuve d’achat avant de confirmer.';
  }
  if (ratio <= 1.08) {
    return 'Prix cohérent. Comparez l’état, la garantie et les accessoires avant de décider.';
  }
  return 'Négociez ou comparez avec des articles similaires avant de confirmer votre intérêt.';
}

String _productSearchKey(String value) {
  final output = StringBuffer();
  var previousWasSpace = true;
  for (final rune in value.toLowerCase().runes) {
    final isNumber = rune >= 0x30 && rune <= 0x39;
    final isAsciiLetter = rune >= 0x61 && rune <= 0x7a;
    final isLatinLetter = rune >= 0x00c0 && rune <= 0x024f;
    if (isNumber || isAsciiLetter || isLatinLetter) {
      output.writeCharCode(rune);
      previousWasSpace = false;
    } else if (!previousWasSpace) {
      output.write(' ');
      previousWasSpace = true;
    }
  }
  return output.toString().trim();
}

List<LiveAttachment> _attachmentsForProduct(
  List<LiveAttachment> attachments,
  String title,
  int fallbackIndex,
  Set<String> usedUrls, {
  int fallbackCount = 1,
}) {
  final normalizedTitle = _productSearchKey(title);
  final matched = <LiveAttachment>[];
  if (normalizedTitle.isNotEmpty) {
    for (final attachment in attachments) {
      if (usedUrls.contains(attachment.url)) continue;
      final caption = _productSearchKey(attachment.caption ?? '');
      if (caption.isNotEmpty &&
          (caption.contains(normalizedTitle) ||
              normalizedTitle.contains(caption))) {
        usedUrls.add(attachment.url);
        matched.add(attachment);
      }
    }
  }
  if (matched.isNotEmpty) return matched;
  final count = fallbackCount < 1 ? 1 : fallbackCount;
  for (var index = fallbackIndex;
      index < attachments.length && matched.length < count;
      index += 1) {
    final attachment = attachments[index];
    if (usedUrls.add(attachment.url)) matched.add(attachment);
  }
  if (matched.isEmpty) {
    for (final attachment in attachments) {
      if (usedUrls.add(attachment.url)) {
        matched.add(attachment);
        break;
      }
    }
  }
  return matched;
}

class _PremiumProduct {
  const _PremiumProduct({
    this.id,
    required this.title,
    this.subtitle,
    this.images = const [],
    this.price,
    this.city,
    this.category,
    this.condition,
    this.availability,
    this.distance,
    this.marketComparison,
    this.comparativeAnalysis,
    this.details,
    this.recommendation,
    this.rating,
    this.sellerLabel,
    this.source,
    this.badges = const [],
    this.actions = const [],
    this.workflowState,
    this.role,
  });
  final String? id;
  final String title;
  final String? subtitle;
  final List<LiveAttachment> images;
  final String? price;
  final String? city;
  final String? category;
  final String? condition;
  final String? availability;
  final String? distance;
  final String? marketComparison;
  final String? comparativeAnalysis;
  final String? details;
  final String? recommendation;
  final String? rating;
  final String? sellerLabel;
  final String? source;
  final List<String> badges;
  final List<_SmartMessageAction> actions;
  final String? workflowState;
  final String? role;

  String get displayDetails {
    if (details != null) return details!;
    final known = <String>[
      if (subtitle != null) subtitle!,
      if (condition != null) 'État : $condition',
      if (category != null) 'Catégorie : $category',
      if (availability != null) 'Disponibilité : $availability',
    ];
    return known.isEmpty
        ? 'Aucun détail supplémentaire fourni par cette annonce.'
        : known.join(' · ');
  }

  String get displayMarketComparison =>
      marketComparison ??
      'Prix de produits similaires non communiqué par le service de recherche.';

  String get displayComparativeAnalysis =>
      comparativeAnalysis ??
      'Données de marché insuffisantes pour comparer objectivement ce prix.';

  String get displayRecommendation =>
      recommendation ??
      'Vérifiez l’état, les accessoires, la disponibilité et le vendeur avant de confirmer.';
}

List<_SmartMessageAction> _premiumExplicitActions(dynamic value) {
  if (value is! List) return const <_SmartMessageAction>[];
  return value
      .whereType<Map>()
      .map((raw) {
        final payload = (raw['id'] ?? raw['payload'] ?? '').toString().trim();
        final label = (raw['label'] ?? raw['title'] ?? payload).toString().trim();
        return _SmartMessageAction(payload: payload, label: label);
      })
      .where((action) => action.payload.isNotEmpty && action.label.isNotEmpty)
      .toList(growable: false);
}

_SmartMessageAction _premiumScopedAction({
  required _SmartMessageAction action,
  required Map<String, dynamic> row,
  required LiveMessage message,
}) {
  final command = liveCommercePayloadText(action.payload).toLowerCase();
  if (!command.startsWith('interesse') &&
      !command.startsWith('intéressé') &&
      !command.startsWith('interested')) {
    return action;
  }
  final params = <String, String>{};
  for (final key in const <String>[
    'thread_id',
    'article_id',
    'buyer_user_id',
    'seller_user_id',
    'search_request_id',
    'search_thread_id',
    'source',
    'role',
    'status_id',
    'status_type',
    'radar_item_id',
    'radar_signal_id',
    'radar_source',
    'radar_intent',
    'counterpart_user_id',
    'negotiation_id',
    'deal_id',
    'transaction_id',
  ]) {
    final value = _premiumString(row[key] ?? message.meta[key]);
    if (value != null) params[key] = value;
  }
  if (params['article_id'] == null) {
    final source = (_premiumString(row['source']) ?? '').toLowerCase();
    final articleId = source.contains('radar') ? null : _premiumString(row['id']);
    if (articleId != null) params['article_id'] = articleId;
  }
  if (params.isEmpty) return action;
  final base = liveCommercePayloadText(action.payload);
  return _SmartMessageAction(
    payload: '$base?${Uri(queryParameters: params).query}',
    label: action.label,
  );
}

List<_SmartMessageAction> _premiumWorkflowActions({
  required Map<String, dynamic> row,
  required LiveMessage message,
  required int index,
  required int productCount,
}) {
  final explicit = _premiumExplicitActions(row['actions']);
  if (explicit.isNotEmpty) {
    return explicit
        .map((action) => _premiumScopedAction(
              action: action,
              row: row,
              message: message,
            ))
        .toList(growable: false);
  }
  if (productCount == 1) {
    final messageActions = _premiumExplicitActions(message.meta['actions']);
    if (messageActions.isNotEmpty) {
      return messageActions
          .map((action) => _premiumScopedAction(
                action: action,
                row: row,
                message: message,
              ))
          .toList(growable: false);
    }
  }
  final workflow = _premiumString(
        row['workflow_state'] ??
            row['stage'] ??
            message.meta['workflow_state'] ??
            message.meta['intent'],
      )
          ?.toLowerCase() ??
      '';
  final role = _premiumString(row['role'] ?? message.meta['role'])
          ?.toLowerCase() ??
      '';
  final negotiationId = _premiumString(
    row['negotiation_id'] ?? message.meta['negotiation_id'],
  );
  final dealId = _premiumString(row['deal_id'] ?? message.meta['deal_id']);
  final transactionId = _premiumString(
    row['transaction_id'] ?? message.meta['transaction_id'],
  );
  final token = dealId ?? transactionId ?? negotiationId ?? '';
  String payload(String action) => token.isEmpty ? action : '$action:$token';

  if (workflow.contains('summary_only')) {
    return const <_SmartMessageAction>[];
  }
  if (workflow.contains('completed') ||
      workflow.contains('closed') ||
      workflow.contains('refused') ||
      workflow.contains('cancelled')) {
    return const <_SmartMessageAction>[];
  }
  if (workflow.contains('delivered')) {
    return <_SmartMessageAction>[
      _SmartMessageAction(
          payload: payload('confirmer-reception'),
          label: '✅ Confirmer la réception'),
      _SmartMessageAction(
          payload: payload('signaler-probleme'),
          label: '⚠️ Signaler un problème'),
    ];
  }
  if (workflow.contains('ready_for_pickup') ||
      workflow.contains('picked_up') ||
      workflow.contains('paid') ||
      workflow.contains('cod_confirmed')) {
    if (role == 'seller') {
      return <_SmartMessageAction>[
        _SmartMessageAction(
            payload: payload('preparer'), label: '📦 Article prêt'),
        _SmartMessageAction(
            payload: payload('annuler'), label: '❌ Annuler'),
      ];
    }
    return <_SmartMessageAction>[
      _SmartMessageAction(
          payload: payload('suivre-livraison'), label: '🛵 Suivre'),
    ];
  }
  if (workflow.contains('payment') ||
      workflow.contains('deal_created') ||
      workflow.contains('deal_accepted') ||
      workflow.contains('awaiting_payment')) {
    if (role == 'seller') {
      return <_SmartMessageAction>[
        _SmartMessageAction(
            payload: payload('confirmer-disponibilite'),
            label: '✅ Article disponible'),
        _SmartMessageAction(
            payload: payload('annuler'), label: '❌ Indisponible'),
      ];
    }
    return <_SmartMessageAction>[
      _SmartMessageAction(
          payload: payload('payer-mobile'), label: '💳 Mobile Money'),
      _SmartMessageAction(
          payload: payload('paiement-livraison'),
          label: '💵 À la livraison'),
      _SmartMessageAction(
          payload: payload('annuler'), label: '❌ Annuler'),
    ];
  }
  if (workflow.contains('negotiation') ||
      workflow.contains('counter') ||
      workflow.contains('proposed')) {
    return <_SmartMessageAction>[
      _SmartMessageAction(payload: payload('accepter'), label: '✅ Accepter'),
      _SmartMessageAction(
          payload: payload('contre-proposition'),
          label: '💬 Contre-proposer'),
      _SmartMessageAction(payload: payload('refuser'), label: '❌ Refuser'),
    ];
  }
  return <_SmartMessageAction>[
    _premiumScopedAction(
      action: _SmartMessageAction(
        payload: 'intéressé ${index + 1}',
        label: 'Je suis intéressé',
      ),
      row: row,
      message: message,
    ),
  ];
}

List<_PremiumProduct> _premiumProducts(LiveMessage message) {
  const keys = [
    'products',
    'articles',
    'items',
    'results',
    'matches',
    'offers'
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
    final usedAttachmentUrls = <String>{};
    var structuredFallbackIndex = 0;
    final structured =
        rows.asMap().entries.where((entry) => entry.value is Map).map((entry) {
      final source = entry.value as Map;
      final row = <String, dynamic>{
        for (final item in source.entries) item.key.toString(): item.value
      };
      final title = liveVisibleText(_premiumString(
            row['title'] ?? row['name'] ?? row['nom'] ?? row['label'],
          ) ??
          'Article ${entry.key + 1}');
      final embeddedImages = liveAttachments([
        row['photo'],
        row['image'],
        row['image_url'],
        row['photo_url'],
        row['cover_photo'],
        row['thumbnail'],
        row['thumbnail_url'],
        row['photos'],
        row['images'],
        row['media'],
      ]);
      List<LiveAttachment> images;
      if (embeddedImages.isNotEmpty) {
        images = embeddedImages;
        usedAttachmentUrls.addAll(images.map((item) => item.url));
      } else {
        final declaredPhotoCount = int.tryParse(
              '${row['photo_count'] ?? row['photos_count'] ?? row['nombre_photos'] ?? 1}',
            ) ??
            1;
        images = _attachmentsForProduct(
          message.attachments,
          title,
          structuredFallbackIndex,
          usedAttachmentUrls,
          fallbackCount: declaredPhotoCount,
        );
        while (structuredFallbackIndex < message.attachments.length &&
            usedAttachmentUrls.contains(
              message.attachments[structuredFallbackIndex].url,
            )) {
          structuredFallbackIndex += 1;
        }
      }
      final price =
          row['price'] ?? row['prix'] ?? row['prix_min'] ?? row['amount'];
      final marketMin = row['market_price_min'] ?? row['prix_marche_min'];
      final marketMax = row['market_price_max'] ?? row['prix_marche_max'];
      final marketMedian = row['market_price_median'] ?? row['median_price'];
      final directMarket = _premiumString(
        row['market_comparison'] ?? row['market'] ?? row['marche_reel'],
      );
      final marketComparison = directMarket ??
          (marketMin == null && marketMax == null && marketMedian == null
              ? null
              : [
                  if (marketMin != null && marketMax != null)
                    '$marketMin – $marketMax FCFA',
                  if (marketMedian != null) 'médiane $marketMedian FCFA',
                ].join(' · '));
      final priceText = price == null
          ? null
          : '$price${price.toString().toUpperCase().contains('FCFA') ? '' : ' FCFA'}';
      final automaticComparison = _premiumAutomaticComparison(
        priceText,
        marketComparison,
      );
      final availability = _premiumString(
        row['availability'] ?? row['disponibilite'] ?? row['status'],
      );
      final rawDistance = row['distance_km'] ?? row['distance'];
      final distance = rawDistance == null
          ? null
          : '${rawDistance.toString()}${rawDistance.toString().toLowerCase().contains('km') ? '' : ' km'}';
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
          'lieu'
        ])
          if (row[key] != null && row[key].toString().trim().isNotEmpty)
            row[key].toString().trim(),
      ];
      return _PremiumProduct(
        id: _premiumString(
          row['id'] ?? row['article_id'] ?? row['radar_item_id'],
        ),
        title: title,
        subtitle: _premiumString(
          row['subtitle'] ?? row['description_short'] ?? row['summary'],
        ),
        images: images,
        price: priceText,
        city: _premiumString(row['city'] ?? row['ville'] ?? row['location']),
        category: _premiumString(
          row['category'] ?? row['categorie'] ?? row['type'],
        ),
        condition: _premiumString(row['condition'] ?? row['etat']),
        availability: availability,
        distance: distance,
        marketComparison: marketComparison,
        comparativeAnalysis: _premiumString(
              row['comparative_analysis'] ??
                  row['market_analysis'] ??
                  row['deal_label'] ??
                  row['analyse_comparative'],
            ) ??
            automaticComparison,
        details: _premiumString(
          row['details'] ?? row['description'],
        ),
        recommendation: _premiumString(
              row['recommendation'] ??
                  row['recommandation'] ??
                  row['ai_note'] ??
                  row['advice'] ??
                  row['conseil'],
            ) ??
            _premiumAutomaticRecommendation(
                priceText, marketComparison, availability),
        rating: _premiumString(row['rating'] ?? row['note'] ?? row['score']),
        sellerLabel: _premiumString(
          row['seller_label'] ??
              row['partner_name'] ??
              row['vendeur'] ??
              row['seller_name'],
        ),
        source: _premiumString(
          row['source_label'] ?? row['source'] ?? row['origin'],
        ),
        badges: badges,
        actions: _premiumWorkflowActions(
          row: row,
          message: message,
          index: entry.key,
          productCount: rows.length,
        ),
        workflowState: _premiumString(
          row['workflow_state'] ?? row['stage'] ?? message.meta['intent'],
        ),
        role: _premiumString(row['role'] ?? message.meta['role']),
      );
    }).toList();
    if (structured.isNotEmpty) {
      return structured.take(10).toList(growable: false);
    }
  }
  final matches = RegExp(
    r'^\s*(?:\*{0,2})?(?:article\s*)?(\d+)\s*(?:[.)]|[-–—:])\s+(.+?)(?:\*{0,2})?\s*$',
    caseSensitive: false,
    multiLine: true,
  ).allMatches(message.text).take(10).toList(growable: false);
  final products = <_PremiumProduct>[];
  final usedAttachmentUrls = <String>{};
  var fallbackAttachmentIndex = 0;
  for (var index = 0; index < matches.length; index += 1) {
    final match = matches[index];
    final start = match.end;
    final end = index + 1 < matches.length
        ? matches[index + 1].start
        : message.text.length;
    final block = message.text.substring(start, end).replaceAll('*', '');
    String? capture(String pattern) =>
        RegExp(pattern, caseSensitive: false, multiLine: true)
            .firstMatch(block)
            ?.group(1)
            ?.trim();
    final price = capture(r'^(?:💰|💵|💲|💸|💰|🪙|\$)\s*([^\n]+)');
    final rawLocation = capture(r'^(?:🏙️|📍|🏢)\s*([^\n]+)');
    final locationParts = rawLocation
        ?.split('·')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    const conditionWords = {
      'neuf',
      'neuve',
      'occasion',
      'good',
      'bon état',
      'bon etat',
      'comme neuf',
      'reconditionné',
      'reconditionne',
      'excellent',
    };
    final lastLocationPart = locationParts == null || locationParts.isEmpty
        ? null
        : locationParts.last.toLowerCase();
    final hasCondition = locationParts != null &&
        locationParts.length > 1 &&
        conditionWords.contains(lastLocationPart);
    final city = locationParts == null || locationParts.isEmpty
        ? rawLocation
        : hasCondition
            ? locationParts.sublist(0, locationParts.length - 1).join(' · ')
            : locationParts.join(' · ');
    final condition = hasCondition ? locationParts.last : null;
    final category = capture(r'^(?:🏷️|📦)\s*([^\n]+)');
    final availability = capture(
        r'^(?:🟢|🔴|🟡|✅)\s*(Disponible|Réservé|Reserve|Vendu|En stock|Indisponible)');
    final distance = capture(r'^📏\s*([^\n]+)');
    final marketComparison = capture(r'^📊\s*([^\n]+)');
    final explicitComparativeAnalysis = capture(r'^(?:⚖️|📈)\s*([^\n]+)');
    final explicitRecommendation = capture(r'^(?:💡|🧠)\s*([^\n]+)');
    final details = capture(r'^(?:📝|ℹ️)\s*([^\n]+)');
    final source = capture(r'^📡\s*(?:Source\s*:\s*)?([^\n]+)');
    final rating = capture(r'^(?:⭐|🌟)\s*([^\n]+)');
    final photoCount = int.tryParse(capture(r'^📸\s*(\d+)') ?? '') ?? 1;
    final verified = block.toLowerCase().contains('partenaire vérifié') ||
        block.toLowerCase().contains('partenaire verifie');
    final normalizedBlock = block.toLowerCase();
    final withoutPhoto = normalizedBlock.contains('0 photo') ||
        normalizedBlock.contains('sans photo') ||
        normalizedBlock.contains('aucune photo');
    final title = liveVisibleText(match.group(2)!.replaceAll('*', '').trim());
    final comparativeAnalysis = explicitComparativeAnalysis ??
        _premiumAutomaticComparison(price, marketComparison);
    final recommendation = explicitRecommendation ??
        _premiumAutomaticRecommendation(price, marketComparison, availability);
    final images = withoutPhoto
        ? const <LiveAttachment>[]
        : _attachmentsForProduct(
            message.attachments,
            title,
            fallbackAttachmentIndex,
            usedAttachmentUrls,
            fallbackCount: photoCount,
          );
    while (fallbackAttachmentIndex < message.attachments.length &&
        usedAttachmentUrls
            .contains(message.attachments[fallbackAttachmentIndex].url)) {
      fallbackAttachmentIndex += 1;
    }
    products.add(_PremiumProduct(
      title: title,
      images: images,
      price: price,
      city: city,
      category: category,
      condition: condition,
      availability: availability,
      distance: distance,
      marketComparison: marketComparison,
      comparativeAnalysis: comparativeAnalysis,
      details: details,
      recommendation: recommendation,
      rating: rating,
      sellerLabel: verified ? 'Vendeur fiable' : null,
      source: source,
      badges: verified ? const ['Partenaire vérifié'] : const [],
      actions: _premiumWorkflowActions(
        row: const <String, dynamic>{},
        message: message,
        index: index,
        productCount: matches.length,
      ),
      workflowState: _premiumString(
        message.meta['workflow_state'] ?? message.meta['intent'],
      ),
      role: _premiumString(message.meta['role']),
    ));
  }
  return products;
}

String _premiumIntro(String text) {
  final firstArticle = RegExp(
    r'^\s*(?:\*{0,2})?(?:article\s*)?\d+\s*(?:[.)]|[-–—:])\s+',
    caseSensitive: false,
    multiLine: true,
  ).firstMatch(text);
  if (firstArticle == null) return '';
  return text.substring(0, firstArticle.start).trim();
}

class _PremiumResultsGrid extends StatelessWidget {
  const _PremiumResultsGrid({required this.products, this.onPayload});
  final List<_PremiumProduct> products;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (_, constraints) {
        final columns = constraints.maxWidth >= 560 ? 2 : 1;
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
                color: const Color(0xFF062E27),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF8B7A25))),
            child: Text(
                '${products.length} résultat${products.length > 1 ? 's' : ''}',
                style: const TextStyle(
                    color: Color(0xFFF2D36B),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900)),
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
                      onPayload: onPayload));
            }),
          ),
          const Padding(
              padding: EdgeInsets.only(top: 9, left: 3),
              child: Text(
                  '🔒 Résultats issus des données retournées par WAOUH — mise à jour en temps réel.',
                  style: TextStyle(fontSize: 10.5, color: Color(0xFF78988A)))),
        ]);
      });
}

class _PremiumProductCard extends StatelessWidget {
  const _PremiumProductCard(
      {required this.product, required this.index, this.onPayload});
  final _PremiumProduct product;
  final int index;
  final ValueChanged<String>? onPayload;

  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFCDE5DB)),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x1A063F33),
                  blurRadius: 16,
                  offset: Offset(0, 6))
            ]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (product.images.isNotEmpty)
            _PremiumProductGallery(
                images: product.images, articleNumber: index + 1)
          else
            Container(
              height: 150,
              width: double.infinity,
              color: const Color(0xFFF1F6F4),
              alignment: Alignment.center,
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.image_not_supported_outlined,
                      color: Color(0xFF78958A), size: 28),
                  SizedBox(height: 7),
                  Text('Aucune photo fournie',
                      style: TextStyle(
                          color: Color(0xFF78958A),
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.shopping_bag_outlined,
                      size: 20, color: Color(0xFF2368FF)),
                ),
                const SizedBox(width: 7),
                Expanded(
                    child: Text(product.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 19,
                            height: 1.15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF15372F)))),
              ]),
              if (product.subtitle != null)
                Text(product.subtitle!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF667A73))),
              if (product.price != null) ...[
                const SizedBox(height: 8),
                Text(product.price!,
                    style: const TextStyle(
                        fontSize: 23,
                        height: 1.1,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF07996D))),
              ],
              const SizedBox(height: 9),
              Wrap(spacing: 5, runSpacing: 5, children: [
                if (product.badges.any((badge) =>
                    badge.toLowerCase().contains('vérifi') ||
                    badge.toLowerCase().contains('verifi')))
                  _PremiumBadge('✅ Vérifié', const Color(0xFFFFF4C5),
                      const Color(0xFF6C5700)),
                if (product.city != null)
                  _PremiumBadge('📍 ${product.city!}', const Color(0xFFE9F7F1),
                      const Color(0xFF08745D)),
                if (product.condition != null)
                  _PremiumBadge(product.condition!, const Color(0xFFF1F4F8),
                      const Color(0xFF5E6F8A)),
                if (product.category != null)
                  _PremiumBadge('🏷️ ${product.category!}',
                      const Color(0xFFEEF3FA), const Color(0xFF42658B)),
                if (product.source != null)
                  _PremiumBadge('🛒 ${product.source!}',
                      const Color(0xFFF1F4F8), const Color(0xFF5E6F8A)),
                _PremiumBadge(
                    '📏 ${product.distance ?? 'Distance non communiquée'}',
                    const Color(0xFFFFF4D9),
                    const Color(0xFF8B6500)),
                if (product.availability != null)
                  _PremiumBadge(
                      product.availability!.toLowerCase().contains('réserv')
                          ? '🔴 ${product.availability!}'
                          : '🟢 ${product.availability!}',
                      const Color(0xFFF0F7F3),
                      const Color(0xFF2B6654)),
              ]),
              if (product.rating != null || product.sellerLabel != null) ...[
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.star_rounded,
                      size: 17, color: Color(0xFFF5B82E)),
                  const SizedBox(width: 4),
                  Expanded(
                      child: Text(
                          [
                            if (product.rating != null) product.rating!,
                            if (product.sellerLabel != null)
                              product.sellerLabel!
                          ].join(' · '),
                          style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF52675F)))),
                ]),
              ],
              const SizedBox(height: 9),
              _PremiumInformationPanel(
                  icon: Icons.description_outlined,
                  title: 'Détails',
                  text: product.displayDetails),
              const SizedBox(height: 9),
              _PremiumInformationPanel(
                  icon: Icons.bar_chart_rounded,
                  title: 'Marché réel',
                  text: product.displayMarketComparison,
                  accent: const Color(0xFF08745D),
                  background: const Color(0xFFEAF8F2)),
              const SizedBox(height: 8),
              _PremiumInformationPanel(
                  icon: Icons.compare_arrows_rounded,
                  title: 'Analyse comparative',
                  text: product.displayComparativeAnalysis,
                  accent: const Color(0xFF42658B),
                  background: const Color(0xFFF1F5FB)),
              const SizedBox(height: 8),
              _PremiumInformationPanel(
                  icon: Icons.lightbulb_outline_rounded,
                  title: 'Recommandation WAOUH',
                  text: product.displayRecommendation,
                  accent: const Color(0xFF8B6500),
                  background: const Color(0xFFFFF8E6)),
              const SizedBox(height: 9),
              Row(children: [
                Icon(
                    product.images.isEmpty
                        ? Icons.image_not_supported_outlined
                        : Icons.photo_library_outlined,
                    size: 17,
                    color: const Color(0xFF5D746B)),
                const SizedBox(width: 6),
                Expanded(
                    child: Text(
                        product.images.isEmpty
                            ? 'Aucune photo fournie'
                            : '${product.images.length} photo${product.images.length > 1 ? 's' : ''} · balayez pour toutes les voir',
                        style: const TextStyle(
                            color: Color(0xFF52675F),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700))),
              ]),
              const SizedBox(height: 12),
              if (product.actions.isNotEmpty)
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: product.actions.asMap().entries.map((entry) {
                    final action = entry.value;
                    final primary = entry.key == 0;
                    final tone = _smartActionTone(action.payload);
                    return SizedBox(
                      width: product.actions.length == 1
                          ? double.infinity
                          : null,
                      child: primary
                          ? FilledButton(
                              onPressed: onPayload == null
                                  ? null
                                  : () => onPayload!(action.payload),
                              style: FilledButton.styleFrom(
                                backgroundColor: tone,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(0, 46),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                              child: Text(action.label,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900)),
                            )
                          : OutlinedButton(
                              onPressed: onPayload == null
                                  ? null
                                  : () => onPayload!(action.payload),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: tone,
                                side: BorderSide(
                                    color: tone.withValues(alpha: .5)),
                                minimumSize: const Size(0, 46),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                              child: Text(action.label,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900)),
                            ),
                    );
                  }).toList(),
                ),
            ]),
          ),
        ]),
      );
}

class _PremiumInformationPanel extends StatelessWidget {
  const _PremiumInformationPanel(
      {required this.icon,
      required this.title,
      required this.text,
      this.accent = const Color(0xFF52675F),
      this.background = const Color(0xFFF6FAF8)});
  final IconData icon;
  final String title;
  final String text;
  final Color accent;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: accent.withValues(alpha: .22))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 19, color: accent),
          const SizedBox(width: 8),
          Expanded(
              child: Text.rich(
                  TextSpan(children: [
                    TextSpan(
                        text: '$title : ',
                        style: TextStyle(
                            fontWeight: FontWeight.w900, color: accent)),
                    TextSpan(
                        text: text,
                        style: const TextStyle(color: Color(0xFF52675F)))
                  ]),
                  style: const TextStyle(fontSize: 12.5, height: 1.35))),
        ]),
      );
}

class _PremiumProductGallery extends StatefulWidget {
  const _PremiumProductGallery(
      {required this.images, required this.articleNumber});
  final List<LiveAttachment> images;
  final int articleNumber;

  @override
  State<_PremiumProductGallery> createState() => _PremiumProductGalleryState();
}

class _PremiumProductGalleryState extends State<_PremiumProductGallery> {
  late final PageController _controller;
  int _current = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _open() => showDialog<void>(
        context: context,
        barrierColor: Colors.black,
        builder: (_) => _PremiumFullscreenGallery(
            images: widget.images, initialIndex: _current),
      );

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 230,
        child: Stack(children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.images.length,
            onPageChanged: (value) => setState(() => _current = value),
            itemBuilder: (_, imageIndex) => GestureDetector(
              onTap: _open,
              child: SizedBox.expand(
                  child: _premiumImage(widget.images[imageIndex],
                      fit: BoxFit.cover)),
            ),
          ),
          Positioned(
              top: 11,
              left: 11,
              child: _PremiumBadge(
                  '#${widget.articleNumber}',
                  Colors.white.withValues(alpha: .92),
                  const Color(0xFF162A24))),
          Positioned(
              top: 8,
              right: 8,
              child: Material(
                  color: Colors.white.withValues(alpha: .92),
                  shape: const CircleBorder(),
                  child: IconButton(
                      tooltip: 'Agrandir les photos',
                      onPressed: _open,
                      icon: const Icon(Icons.open_in_full_rounded, size: 19)))),
          if (widget.images.length > 1)
            Positioned(
                bottom: 10,
                right: 10,
                child: _PremiumBadge('${_current + 1}/${widget.images.length}',
                    const Color(0xCC061D19), Colors.white)),
          if (widget.images.length > 1)
            Positioned(
              bottom: 13,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  widget.images.length,
                  (dot) => AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    width: dot == _current ? 16 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: dot == _current ? Colors.white : Colors.white54,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      );
}

class _PremiumFullscreenGallery extends StatefulWidget {
  const _PremiumFullscreenGallery(
      {required this.images, required this.initialIndex});
  final List<LiveAttachment> images;
  final int initialIndex;

  @override
  State<_PremiumFullscreenGallery> createState() =>
      _PremiumFullscreenGalleryState();
}

class _PremiumFullscreenGalleryState extends State<_PremiumFullscreenGallery> {
  late final PageController _controller;
  late int _current;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _controller = PageController(initialPage: _current);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.images.length,
            onPageChanged: (value) => setState(() => _current = value),
            itemBuilder: (_, index) => Center(
                child: InteractiveViewer(
                    minScale: .8,
                    maxScale: 5,
                    child: _premiumImage(widget.images[index],
                        fit: BoxFit.contain))),
          ),
          Positioned(
              top: 16,
              left: 16,
              child: SafeArea(
                  child: _PremiumBadge(
                      '${_current + 1}/${widget.images.length}',
                      const Color(0xAA061D19),
                      Colors.white))),
          Positioned(
              top: 10,
              right: 10,
              child: SafeArea(
                  child: IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded,
                          color: Colors.white, size: 30)))),
        ]),
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
          color: background, borderRadius: BorderRadius.circular(20)),
      child: Text(text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
              fontSize: 10.5, fontWeight: FontWeight.w800, color: foreground)));
}

Widget _premiumImage(LiveAttachment attachment, {required BoxFit fit}) {
  final fallback = Container(
      color: const Color(0xFFEAF7F1),
      alignment: Alignment.center,
      child: const Icon(Icons.broken_image_outlined, color: Color(0xFF6B8B7D)));
  return _resolvedChatImage(attachment, fit: fit, fallback: fallback);
}

Widget _resolvedChatImage(
  LiveAttachment attachment, {
  double? height,
  double? width,
  required BoxFit fit,
  required Widget fallback,
}) {
  final url = liveImageUrl(attachment.url);
  if (url.isEmpty || url.startsWith('blob:')) return fallback;
  if (url.startsWith('data:image/')) {
    try {
      final comma = url.indexOf(',');
      if (comma < 0) return fallback;
      final metadata = url.substring(0, comma);
      final payload = url.substring(comma + 1);
      final bytes = metadata.contains(';base64')
          ? base64Decode(payload)
          : Uint8List.fromList(utf8.encode(Uri.decodeComponent(payload)));
      return Image.memory(
        bytes,
        height: height,
        width: width,
        fit: fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => fallback,
      );
    } catch (_) {
      return fallback;
    }
  }
  if (url.startsWith('file:') || url.startsWith('/')) {
    try {
      final path = url.startsWith('file:') ? Uri.parse(url).toFilePath() : url;
      return Image.file(
        File(path),
        height: height,
        width: width,
        fit: fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => fallback,
      );
    } catch (_) {
      return fallback;
    }
  }
  final uri = Uri.tryParse(url);
  if (uri == null || !(uri.scheme == 'https' || uri.scheme == 'http')) {
    return fallback;
  }
  return Image.network(
    uri.toString(),
    headers: const {
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 '
          '(KHTML, like Gecko) Chrome/124 Mobile Safari/537.36',
    },
    height: height,
    width: width,
    fit: fit,
    gaplessPlayback: true,
    filterQuality: FilterQuality.medium,
    loadingBuilder: (context, child, progress) {
      if (progress == null) return child;
      return SizedBox(
        height: height,
        width: width,
        child: ColoredBox(
          color: const Color(0xFFEAF7F1),
          child: Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                value: progress.expectedTotalBytes == null
                    ? null
                    : progress.cumulativeBytesLoaded /
                        progress.expectedTotalBytes!,
              ),
            ),
          ),
        ),
      );
    },
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
        children.add(const Padding(
          padding: EdgeInsets.symmetric(vertical: 5),
          child: Divider(height: 1, thickness: 1, color: Color(0xFFB7D8CA)),
        ));
        continue;
      }
      final emphasized = _emphasis.firstMatch(value);
      final clean = (emphasized?.group(1)?.trim() ?? value)
          .replaceFirst(RegExp(r'^#{1,3}\s+'), '');
      final isHeading = RegExp(r'^#{1,3}\s+').hasMatch(value);
      final isList = RegExp(r'^[-•]\s+').hasMatch(clean);
      final isHeadline = clean.contains('annonce trouvée') ||
          clean.contains('annonces trouvées') ||
          clean.startsWith('🎯');
      final isProduct = _productTitle.hasMatch(value);
      final isInfo = _info.hasMatch(clean);

      if (isHeadline || isHeading) {
        children.add(Container(
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
              )),
        ));
      } else if (isProduct) {
        children.add(Padding(
          padding: const EdgeInsets.only(top: 5, bottom: 2),
          child: _rich(
              clean,
              const TextStyle(
                fontSize: 15.5,
                height: 1.34,
                fontWeight: FontWeight.w900,
                color: legacy.WaouhColors.ink,
              )),
        ));
      } else if (isInfo) {
        children.add(Container(
          width: double.infinity,
          margin: const EdgeInsets.only(top: 3),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(8),
          ),
          child: _rich(
              clean,
              const TextStyle(
                fontSize: 14.5,
                height: 1.3,
                color: legacy.WaouhColors.ink,
              )),
        ));
      } else if (isList) {
        children.add(Padding(
          padding: const EdgeInsets.only(top: 2, left: 3),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Icon(Icons.circle, size: 6, color: Color(0xFF22A878))),
            const SizedBox(width: 7),
            Expanded(
                child: _rich(
                    clean.replaceFirst(RegExp(r'^[-•]\s+'), ''),
                    const TextStyle(
                        fontSize: 15,
                        height: 1.36,
                        color: legacy.WaouhColors.ink))),
          ]),
        ));
      } else {
        children.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 1),
          child: _rich(
              clean,
              TextStyle(
                fontSize: 15.5,
                height: 1.36,
                fontWeight:
                    emphasized == null ? FontWeight.w400 : FontWeight.w800,
                color: legacy.WaouhColors.ink,
              )),
        ));
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
    final token =
        RegExp(r'(\*\*.+?\*\*|\*[^*]+\*|__.+?__|_[^_]+_|\[[^\]]+\]\([^)]+\))');
    var cursor = 0;
    for (final match in token.allMatches(value)) {
      if (match.start > cursor) {
        spans.add(
            TextSpan(text: value.substring(cursor, match.start), style: style));
      }
      final raw = match.group(0)!;
      if (raw.startsWith('**')) {
        spans.add(TextSpan(
            text: raw.substring(2, raw.length - 2),
            style: style.copyWith(fontWeight: FontWeight.w900)));
      } else if (raw.startsWith('*')) {
        spans.add(TextSpan(
            text: raw.substring(1, raw.length - 1),
            style: style.copyWith(fontStyle: FontStyle.italic)));
      } else if (raw.startsWith('__')) {
        spans.add(TextSpan(
            text: raw.substring(2, raw.length - 2),
            style: style.copyWith(decoration: TextDecoration.underline)));
      } else if (raw.startsWith('_')) {
        spans.add(TextSpan(
            text: raw.substring(1, raw.length - 1),
            style: style.copyWith(fontStyle: FontStyle.italic)));
      } else {
        final label = raw.substring(1, raw.indexOf(']('));
        spans.add(TextSpan(
            text: label,
            style: style.copyWith(
                color: const Color(0xFF08756A),
                fontWeight: FontWeight.w800,
                decoration: TextDecoration.underline)));
      }
      cursor = match.end;
    }
    if (cursor < value.length) {
      spans.add(TextSpan(text: value.substring(cursor), style: style));
    }
    return Text.rich(TextSpan(
        children:
            spans.isEmpty ? [TextSpan(text: value, style: style)] : spans));
  }
}

String _stamp(DateTime value) {
  final local = value.toLocal();
  return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

class LiveAttachmentStrip extends StatelessWidget {
  const LiveAttachmentStrip(
      {super.key, required this.items, required this.onRemove});
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
                  .map((item) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Stack(children: [
                          ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: _preview(item)),
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
                                      shape: BoxShape.circle),
                                  child: const Icon(Icons.close_rounded,
                                      size: 13, color: Colors.white)),
                            ),
                          ),
                        ]),
                      ))
                  .toList()),
        );

  Widget _preview(LiveAttachment attachment) {
    final fallback = Container(
        width: 60,
        height: 60,
        color: legacy.WaouhColors.pearl,
        child:
            const Icon(Icons.image_outlined, color: legacy.WaouhColors.muted));
    return _resolvedChatImage(
      attachment,
      width: 60,
      height: 60,
      fit: BoxFit.cover,
      fallback: fallback,
    );
  }
}
