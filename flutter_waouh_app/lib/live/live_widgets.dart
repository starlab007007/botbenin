import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_models.dart';
import 'live_theme.dart';
import 'live_nexus_service.dart';
import 'live_commerce_workflow.dart';
import 'live_commerce_agent_ui.dart';
import 'live_thread_flow.dart';

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
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) => AppBar(
        toolbarHeight: 64,
        automaticallyImplyLeading: false,
        backgroundColor: Colors.transparent,
        foregroundColor: WaouhPalette.ink,
        surfaceTintColor: Colors.transparent,
        leadingWidth: back || leading != null ? 52 : 12,
        leading: leading ??
            (back
                ? Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: IconButton.filledTonal(
                      tooltip: 'Retour',
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFF0F5FD),
                        foregroundColor: WaouhPalette.ink,
                        minimumSize: const Size(38, 38),
                        maximumSize: const Size(38, 38),
                      ),
                      icon: const Icon(Icons.arrow_back_rounded, size: 20),
                      onPressed: () => context.canPop()
                          ? context.pop()
                          : context.go('/app/chat'),
                    ),
                  )
                : null),
        titleSpacing: back || leading != null ? 8 : 4,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: WaouhGradients.airHero,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDDE8F8)),
                boxShadow: WaouhShadows.card,
              ),
              child: const BrandMark(size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.25,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 1),
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -.05,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          ...actions.map(
            (action) => Padding(
              padding: const EdgeInsets.only(right: 2),
              child: IconTheme(
                data: const IconThemeData(
                  color: WaouhPalette.ink,
                  size: 21,
                ),
                child: action,
              ),
            ),
          ),
          const SizedBox(width: 6),
        ],
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFEFFFF),
                Color(0xFFF8FBFF),
                Color(0xFFF9F7FF),
              ],
            ),
            border: const Border(
              bottom: BorderSide(color: Color(0xFFE8EEF8)),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF5374A7).withValues(alpha: .055),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
        ),
      );
}

class LiveMessageBubble extends StatelessWidget {
  const LiveMessageBubble({
    super.key,
    required this.message,
    this.onPayload,
    this.actionsEnabled = true,
  });
  final LiveMessage message;
  final ValueChanged<String>? onPayload;
  final bool actionsEnabled;

  @override
  Widget build(BuildContext context) {
    // Keep the message stream renderable for every backend payload.  The
    // experimental product parser used to run for every message and could
    // make the complete timeline fail when a payload contained an unexpected
    // value.  Rich text and attachments remain available; structured cards
    // are enabled only after a non-empty, validated product list is produced.
    final displayText = liveVisibleText(message.text);
    final products = _safePremiumProducts(message);
    final actions = actionsEnabled
        ? _smartMessageActions(message, products)
        : const <_SmartMessageAction>[];
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
        outgoing ? const Color(0xFFEAF2FF) : const Color(0xFFFFFFFF);

    final screenWidth = MediaQuery.sizeOf(context).width;
    final bubbleWidth =
        outgoing ? 340.0 : (screenWidth - 24).clamp(300.0, 760.0).toDouble();
    return Align(
      alignment: outgoing ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: bubbleWidth),
        child: Container(
          margin: const EdgeInsets.only(bottom: 9),
          decoration: BoxDecoration(
            color: bubbleColor,
            borderRadius: radius,
            border: Border.all(
              color: outgoing
                  ? const Color(0xFFD4E2FF)
                  : const Color(0xFFE4EBF5),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF4F6F9D).withValues(alpha: .065),
                blurRadius: 18,
                offset: const Offset(0, 7),
                spreadRadius: -7,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 11, 8),
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
                _PremiumResultsGrid(
                  products: products,
                  onPayload: onPayload,
                  actionsEnabled: actionsEnabled,
                ),
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
  final command = liveCommerceRawCommand(payload);
  final query = liveCommerceQuery(payload);
  final kind = liveCommerceActionKind(payload);
  final result = <String, dynamic>{
    'button_payload': command,
    'commerce_contract': 'waouh_action_v2',
    ...query,
  };
  final legacyReference = liveCommerceLegacyReference(payload);
  if (legacyReference != null) {
    result['commerce_reference'] = legacyReference;
    if (kind == LiveCommerceActionKind.counter &&
        RegExp(r'^\d+$').hasMatch(legacyReference)) {
      result.putIfAbsent('suggested_price', () => legacyReference);
    } else if (<LiveCommerceActionKind>{
      LiveCommerceActionKind.paymentMobile,
      LiveCommerceActionKind.paymentDelivery,
      LiveCommerceActionKind.sellerConfirm,
      LiveCommerceActionKind.confirmPaymentCash,
      LiveCommerceActionKind.confirmPaymentMobile,
      LiveCommerceActionKind.cancelDeal,
    }.contains(kind)) {
      result.putIfAbsent('deal_id', () => legacyReference);
    } else {
      result.putIfAbsent('negotiation_id', () => legacyReference);
    }
  }
  switch (kind) {
    case LiveCommerceActionKind.interest:
      result['action'] = 'interested';
      result['intent'] = 'interested';
      result['commerce_action'] = 'interest';
      break;
    case LiveCommerceActionKind.accept:
      result['action'] = 'accept';
      result['intent'] = 'negotiation_accept';
      result['commerce_action'] = 'accept_offer';
      break;
    case LiveCommerceActionKind.counter:
      result['action'] = 'counter';
      result['intent'] = 'negotiation_counter';
      result['commerce_action'] = 'counter_offer';
      break;
    case LiveCommerceActionKind.reject:
      result['action'] = 'reject';
      result['intent'] = 'negotiation_reject';
      result['commerce_action'] = 'reject_offer';
      break;
    case LiveCommerceActionKind.paymentMobile:
      result['action'] = 'payment_preference';
      result['intent'] = 'payment_preference';
      result['commerce_action'] = 'payment_preference_mobile';
      result['payment_method'] = 'mobile_money';
      break;
    case LiveCommerceActionKind.paymentDelivery:
      result['action'] = 'payment_preference';
      result['intent'] = 'payment_preference';
      result['commerce_action'] = 'payment_preference_cod';
      result['payment_method'] = 'cash';
      break;
    case LiveCommerceActionKind.sellerConfirm:
      result['action'] = 'seller_confirm';
      result['intent'] = 'seller_availability_confirm';
      result['commerce_action'] = 'seller_confirm_available';
      break;
    case LiveCommerceActionKind.confirmPaymentCash:
      result['action'] = 'confirm_payment';
      result['intent'] = 'payment_confirmation';
      result['commerce_action'] = 'confirm_payment_cash';
      result['payment_method'] = 'cash';
      break;
    case LiveCommerceActionKind.confirmPaymentMobile:
      result['action'] = 'confirm_payment';
      result['intent'] = 'payment_confirmation';
      result['commerce_action'] = 'confirm_payment_mobile';
      result['payment_method'] = 'mobile_money';
      break;
    case LiveCommerceActionKind.cancelDeal:
      result['action'] = 'cancel_deal';
      result['intent'] = 'deal_cancel';
      result['commerce_action'] = 'cancel_deal';
      break;
    case LiveCommerceActionKind.unknown:
      break;
  }
  return result;
}

String liveCommercePayloadText(String payload) =>
    liveCommerceOutboundText(payload);

/// Rend tout bouton « Intéressé » auto-descriptif. Même lorsqu'une ancienne
/// carte ne fournit ni article_id ni vendeur, le payload conserve désormais
/// action/intent. L'idempotency_key ajoutée au moment de l'envoi suffit alors
/// à créer une identité provisoire déterministe et à ouvrir la page sans réseau.
String liveCanonicalInterestedButtonPayload(
  String payload, {
  Map<String, String> context = const <String, String>{},
}) {
  final value = payload.trim();
  final command = liveCommercePayloadText(value);
  if (!liveIsInterestedMeta(
    <String, dynamic>{'button_payload': command},
    text: command,
  )) {
    return payload;
  }

  final merged = <String, String>{};
  final queryAt = value.indexOf('?');
  if (queryAt >= 0) {
    try {
      merged.addAll(Uri.splitQueryString(value.substring(queryAt + 1)));
    } catch (_) {
      // Un ancien payload mal formé ne doit pas empêcher le clic.
    }
  }
  merged.addAll(context);
  merged['action'] = 'interested';
  merged['intent'] = 'interested';
  merged.putIfAbsent('origin_surface', () => 'flutter_product_card');
  return '$command?${Uri(queryParameters: merged).query}';
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

_SmartMessageAction _scopeMessageAction(
  _SmartMessageAction action,
  LiveMessage message,
) {
  final kind = liveCommerceActionKind(action.payload);
  if (kind != LiveCommerceActionKind.accept &&
      kind != LiveCommerceActionKind.counter &&
      kind != LiveCommerceActionKind.reject &&
      kind != LiveCommerceActionKind.paymentMobile &&
      kind != LiveCommerceActionKind.paymentDelivery &&
      kind != LiveCommerceActionKind.sellerConfirm &&
      kind != LiveCommerceActionKind.confirmPaymentCash &&
      kind != LiveCommerceActionKind.confirmPaymentMobile &&
      kind != LiveCommerceActionKind.cancelDeal) {
    return action;
  }
  final context = <String, String>{...liveCommerceScopeFromMessage(message)};
  final legacyReference = liveCommerceLegacyReference(action.payload);
  if (legacyReference != null) {
    if (kind == LiveCommerceActionKind.counter &&
        RegExp(r'^\d+$').hasMatch(legacyReference)) {
      context.putIfAbsent('suggested_price', () => legacyReference);
    } else if (<LiveCommerceActionKind>{
      LiveCommerceActionKind.paymentMobile,
      LiveCommerceActionKind.paymentDelivery,
      LiveCommerceActionKind.sellerConfirm,
      LiveCommerceActionKind.confirmPaymentCash,
      LiveCommerceActionKind.confirmPaymentMobile,
      LiveCommerceActionKind.cancelDeal,
    }.contains(kind)) {
      context.putIfAbsent('deal_id', () => legacyReference);
    } else {
      context.putIfAbsent('negotiation_id', () => legacyReference);
    }
  }
  return _SmartMessageAction(
    payload: liveCanonicalWorkflowPayload(kind, context: context),
    label: action.label,
  );
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
  if (text.contains('achat confirmé') ||
      text.contains('vente conclue') ||
      text.contains('négociation terminée') ||
      text.contains('négociation fermée') ||
      text.contains('livraison terminée') ||
      intent.contains('negotiation_closed') ||
      intent.contains('delivery_completed') ||
      intent.contains('sale_completed') ||
      intent.contains('transaction_completed')) {
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
    if (explicit.isNotEmpty) {
      return explicit
          .map((action) => _scopeMessageAction(action, message))
          .toList(growable: false);
    }
  }

  // Un accord peut ouvrir immédiatement l'étape paiement, disponibilité ou
  // livraison. Sans actions autoritaires du backend, Flutter n'en invente pas.
  if (text.contains('accord conclu') ||
      text.contains('accord enregistré') ||
      intent.contains('deal_created') ||
      intent.contains('deal_accepted') ||
      intent.contains('deal_already_accepted')) {
    return const <_SmartMessageAction>[];
  }

  if (text.contains('demande envoyée au vendeur') ||
      text.contains('que souhaitez-vous faire') ||
      intent.contains('awaiting_buyer_decision')) {
    final suggested = RegExp(
      r'je propose\s+([\d\s.,]+)',
      caseSensitive: false,
    ).firstMatch(message.text)?.group(1)?.replaceAll(RegExp(r'\D'), '');
    return <_SmartMessageAction>[
      _SmartMessageAction(
          payload: liveCanonicalWorkflowPayload(
            LiveCommerceActionKind.accept,
            context: liveCommerceScopeFromMessage(message),
          ),
          label: '✅ Accepter ce prix'),
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.counter,
          context: <String, String>{
            ...liveCommerceScopeFromMessage(message),
            if (suggested != null && suggested.isNotEmpty)
              'suggested_price': suggested,
          },
        ),
        label: '💬 Proposer un prix',
      ),
      _SmartMessageAction(
          payload: liveCanonicalWorkflowPayload(
            LiveCommerceActionKind.reject,
            context: liveCommerceScopeFromMessage(message),
          ),
          label: '❌ Refuser'),
    ];
  }

  if (text.contains('nouvelle offre') ||
      text.contains('contre-offre') ||
      text.contains('contre proposition') ||
      intent.contains('negotiation_open') ||
      intent.contains('negotiation_decision')) {
    return <_SmartMessageAction>[
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.accept,
          context: liveCommerceScopeFromMessage(message),
        ),
        label: '✅ Accepter',
      ),
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.counter,
          context: liveCommerceScopeFromMessage(message),
        ),
        label: '💬 Contre-proposer',
      ),
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.reject,
          context: liveCommerceScopeFromMessage(message),
        ),
        label: '❌ Refuser',
      ),
    ];
  }

  if (RegExp(r'r[ée]pondez\s+.*oui.*non', caseSensitive: false)
      .hasMatch(message.text)) {
    return <_SmartMessageAction>[
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.accept,
          context: liveCommerceScopeFromMessage(message),
        ),
        label: '✅ Oui',
      ),
      _SmartMessageAction(
        payload: liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.reject,
          context: liveCommerceScopeFromMessage(message),
        ),
        label: '❌ Non',
      ),
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

/// Les actions d'intérêt des résultats de recherche restent utilisables même
/// lorsqu'aucune négociation n'est encore ouverte. Elles ne doivent pas être
/// soumises au verrou « une seule étape de négociation active ».
///
/// Les actions de paiement, de contre-offre ou de livraison ne passent jamais
/// par cette exception : elles restent pilotées par la dernière étape métier.
bool liveMessageHasStandaloneProductInterestActions(LiveMessage message) {
  return _safePremiumProducts(message).any(
    (product) => product.actions.any(
      (action) =>
          liveCommerceActionKind(action.payload) ==
          LiveCommerceActionKind.interest,
    ),
  );
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


double? _premiumScore(dynamic value) {
  if (value == null) return null;
  final parsed = value is num ? value.toDouble() : double.tryParse('$value');
  if (parsed == null || !parsed.isFinite) return null;
  return parsed.clamp(0, 100).toDouble();
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
    this.fabricId,
    this.score,
    this.trustScore,
    this.priceScore,
    this.contactability,
    this.intent,
    this.actorType,
    this.reasons = const [],
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
  final String? fabricId;
  final double? score;
  final double? trustScore;
  final double? priceScore;
  final String? contactability;
  final String? intent;
  final String? actorType;
  final List<String> reasons;
  final List<String> badges;

  bool get isBuyerOpportunity {
    final i = (intent ?? '').toUpperCase();
    final actor = (actorType ?? '').toLowerCase();
    return i == 'BUY' || i == 'RFQ' || actor == 'buyer';
  }
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

  String get displayMarketComparison {
    if (marketComparison?.trim().isNotEmpty == true) return marketComparison!;
    final facts = <String>[
      if (priceScore != null) 'score prix ${priceScore!.round()}%',
      if (score != null) 'match global ${score!.round()}%',
      if (source?.trim().isNotEmpty == true) 'source $source',
    ];
    return facts.isEmpty
        ? 'NEXUS n’a pas encore un échantillon prix suffisant pour cette offre.'
        : 'Lecture NEXUS · ${facts.join(' · ')}';
  }

  String get displayComparativeAnalysis {
    if (comparativeAnalysis?.trim().isNotEmpty == true) {
      return comparativeAnalysis!;
    }
    final facts = <String>[
      if (score != null) 'pertinence ${score!.round()}%',
      if (trustScore != null) 'confiance ${trustScore!.round()}%',
      if (priceScore != null) 'prix ${priceScore!.round()}%',
      if (contactability?.trim().isNotEmpty == true)
        'contact $contactability',
    ];
    if (facts.isEmpty) {
      return 'Signal encore insuffisant pour classer cette opportunité.';
    }
    return 'Signal Fabric · ${facts.join(' · ')}';
  }

  String get displayRecommendation {
    if (recommendation?.trim().isNotEmpty == true) return recommendation!;
    if (reasons.isNotEmpty) return reasons.join(' · ');
    final facts = <String>[
      if (trustScore != null && trustScore! >= 70) 'Confiance élevée',
      if (priceScore != null && priceScore! >= 70) 'Prix compétitif',
      if (contactability == 'C2' ||
          contactability == 'C3' ||
          contactability == 'C4')
        'Contact médié possible',
    ];
    return facts.isEmpty
        ? 'L’Avatar recommande de vérifier disponibilité, état et conditions avant l’accord.'
        : facts.join(' · ');
  }
}

List<_SmartMessageAction> _premiumExplicitActions(dynamic value) {
  if (value is! List) return const <_SmartMessageAction>[];
  return value
      .whereType<Map>()
      .map((raw) {
        final payload = (raw['id'] ?? raw['payload'] ?? '').toString().trim();
        final label =
            (raw['label'] ?? raw['title'] ?? payload).toString().trim();
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
  final params = <String, String>{...liveCommerceQuery(action.payload)};
  final legacyReference = liveCommerceLegacyReference(action.payload);
  if (legacyReference != null) {
    final legacyKind = liveCommerceActionKind(action.payload);
    if (legacyKind == LiveCommerceActionKind.counter &&
        RegExp(r'^\d+$').hasMatch(legacyReference)) {
      params.putIfAbsent('suggested_price', () => legacyReference);
    } else if (<LiveCommerceActionKind>{
      LiveCommerceActionKind.paymentMobile,
      LiveCommerceActionKind.paymentDelivery,
      LiveCommerceActionKind.sellerConfirm,
      LiveCommerceActionKind.confirmPaymentCash,
      LiveCommerceActionKind.confirmPaymentMobile,
      LiveCommerceActionKind.cancelDeal,
    }.contains(legacyKind)) {
      params.putIfAbsent('deal_id', () => legacyReference);
    } else {
      params.putIfAbsent('negotiation_id', () => legacyReference);
    }
  }
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
  if (params['seller_user_id'] == null) {
    final sellerUserId = _premiumString(
      row['owner_user_id'] ??
          row['author_user_id'] ??
          row['user_id'] ??
          message.meta['owner_user_id'] ??
          message.meta['author_user_id'] ??
          message.meta['user_id'],
    );
    if (sellerUserId != null) {
      params['seller_user_id'] = sellerUserId;
      params.putIfAbsent('counterpart_user_id', () => sellerUserId);
    }
  }
  if (params['article_id'] == null) {
    final source = (_premiumString(row['source']) ?? '').toLowerCase();
    final articleId =
        source.contains('radar') ? null : _premiumString(row['id']);
    if (articleId != null) params['article_id'] = articleId;
  }

  void visibleParam(String key, dynamic value) {
    final normalized = _premiumString(value);
    if (normalized != null && normalized.isNotEmpty) params[key] = normalized;
  }

  visibleParam(
    'title',
    row['title'] ?? row['name'] ?? row['nom'] ?? message.meta['title'],
  );
  visibleParam(
    'product_title',
    row['product_title'] ?? row['title'] ?? message.meta['product_title'],
  );
  if (row['price'] != null) visibleParam('price', row['price']);
  visibleParam('city', row['city'] ?? row['ville'] ?? message.meta['city']);
  visibleParam(
    'seller_name',
    row['seller_name'] ??
        row['business_name'] ??
        row['counterpart_name'] ??
        message.meta['seller_name'],
  );
  visibleParam('category', row['category'] ?? message.meta['category']);
  visibleParam('condition', row['condition'] ?? row['state']);
  visibleParam('availability', row['availability'] ?? row['status']);
  visibleParam('distance', row['distance'] ?? message.meta['distance']);

  final scopedPhotos = liveAttachments(
    row['photos'] ??
        row['images'] ??
        row['attachments'] ??
        row['image_url'] ??
        message.meta['photos'] ??
        message.attachments.map((item) => item.toJson()).toList(),
  );
  if (scopedPhotos.isNotEmpty) params['image_url'] = scopedPhotos.first.url;

  final kind = liveCommerceActionKind(action.payload);
  if (kind == LiveCommerceActionKind.interest) {
    return _SmartMessageAction(
      payload: liveCanonicalInterestedButtonPayload(
        action.payload,
        context: params,
      ),
      label: action.label,
    );
  }
  if (kind == LiveCommerceActionKind.accept ||
      kind == LiveCommerceActionKind.counter ||
      kind == LiveCommerceActionKind.reject ||
      kind == LiveCommerceActionKind.paymentMobile ||
      kind == LiveCommerceActionKind.paymentDelivery ||
      kind == LiveCommerceActionKind.sellerConfirm ||
      kind == LiveCommerceActionKind.confirmPaymentCash ||
      kind == LiveCommerceActionKind.confirmPaymentMobile ||
      kind == LiveCommerceActionKind.cancelDeal) {
    return _SmartMessageAction(
      payload: liveCanonicalWorkflowPayload(kind, context: params),
      label: action.label,
    );
  }
  return action;
}

List<_SmartMessageAction> _premiumWorkflowActions({
  required Map<String, dynamic> row,
  required LiveMessage message,
  required int index,
  required int productCount,
}) {
  final workflow = _premiumString(
        row['workflow_state'] ??
            row['stage'] ??
            message.meta['workflow_state'] ??
            message.meta['intent'],
      )?.toLowerCase() ??
      '';

  // Les états réellement terminaux et l'attente de la contrepartie sont
  // autoritaires. Un accord n'est pas terminal lorsqu'il fournit les actions
  // de paiement, de disponibilité ou de livraison de l'étape suivante.
  if (workflow.contains('summary_only') ||
      workflow.contains('awaiting_counterparty') ||
      workflow.contains('completed') ||
      workflow.contains('delivered') ||
      workflow.contains('closed') ||
      workflow.contains('refused') ||
      workflow.contains('cancelled')) {
    return const <_SmartMessageAction>[];
  }

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

  // Une carte NEXUS ajoutée uniquement par le Signal Fabric peut déclarer
  // action:null. Elle n'existe pas dans last_matches et ne doit donc jamais
  // inventer un ancien "intéressé N". Le Contact Layer gère son parcours.
  if (row.containsKey('action') && row['action'] == null) {
    return const <_SmartMessageAction>[];
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

  // Après accord, seules les actions explicites du backend sont valides.
  if (workflow.contains('deal_created') ||
      workflow.contains('deal_accepted') ||
      workflow.contains('already_accepted')) {
    return const <_SmartMessageAction>[];
  }

  if (workflow.contains('buyer_interest') ||
      workflow.contains('new_buyer') ||
      workflow.contains('negotiation') ||
      workflow.contains('counter') ||
      workflow.contains('proposed') ||
      workflow.contains('awaiting_buyer_decision') ||
      workflow.contains('awaiting_seller_decision')) {
    return <_SmartMessageAction>[
      _premiumScopedAction(
        action: const _SmartMessageAction(
          payload: 'waouh:accept',
          label: '✅ Accepter le prix',
        ),
        row: row,
        message: message,
      ),
      _premiumScopedAction(
        action: const _SmartMessageAction(
          payload: 'waouh:counter',
          label: '💬 Faire une contre-offre',
        ),
        row: row,
        message: message,
      ),
      _premiumScopedAction(
        action: const _SmartMessageAction(
          payload: 'waouh:reject',
          label: '❌ Refuser',
        ),
        row: row,
        message: message,
      ),
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
      final evidenceMap = row['evidence'] is Map
          ? <String, dynamic>{
              for (final entry in (row['evidence'] as Map).entries)
                entry.key.toString(): entry.value,
            }
          : const <String, dynamic>{};
      final directMarket = _premiumString(
        row['market_comparison'] ??
            row['market'] ??
            row['marche_reel'] ??
            row['market_line'] ??
            evidenceMap['market_line'],
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
      final scoreMap = row['scores'] is Map
          ? <String, dynamic>{
              for (final entry in (row['scores'] as Map).entries)
                entry.key.toString(): entry.value,
            }
          : const <String, dynamic>{};
      final rawReasons = row['reasons'] ?? scoreMap['reasons'];
      final reasons = rawReasons is List
          ? rawReasons
              .where((item) => item is String && item.trim().isNotEmpty)
              .map((item) => item.toString().trim())
              .take(3)
              .toList(growable: false)
          : const <String>[];
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
          row['details'] ??
              row['description'] ??
              row['raw_text'] ??
              evidenceMap['description'] ??
              evidenceMap['raw_text'],
        ),
        recommendation: _premiumString(
              row['recommendation'] ??
                  row['recommandation'] ??
                  row['ai_note'] ??
                  row['advice'] ??
                  row['conseil'],
            ) ??
            (reasons.isNotEmpty
                ? reasons.join(' · ')
                : _premiumAutomaticRecommendation(
                    priceText, marketComparison, availability)),
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
        fabricId: _premiumString(row['fabric_id'] ?? row['fabricId']),
        score: _premiumScore(
          row['total_score'] ?? scoreMap['total_score'] ?? row['match_score'] ?? row['score'],
        ),
        trustScore: _premiumScore(
          row['trust_score'] ?? scoreMap['trust_score'],
        ),
        priceScore: _premiumScore(
          row['price_score'] ?? scoreMap['price_score'],
        ),
        contactability: _premiumString(
          row['contactability_level'] ??
              row['contactability'] ??
              evidenceMap['contactability_level'],
        ),
        intent: _premiumString(
          row['intent'] ?? row['signal_intent'] ?? evidenceMap['intent'],
        ),
        actorType: _premiumString(
          row['actor_type'] ?? row['actor_role'] ?? evidenceMap['actor_type'],
        ),
        reasons: reasons,
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

class _PremiumResultsGrid extends StatefulWidget {
  const _PremiumResultsGrid({
    required this.products,
    this.onPayload,
    this.actionsEnabled = true,
  });
  final List<_PremiumProduct> products;
  final ValueChanged<String>? onPayload;
  final bool actionsEnabled;

  @override
  State<_PremiumResultsGrid> createState() => _PremiumResultsGridState();
}

class _PremiumResultsGridState extends State<_PremiumResultsGrid> {
  final ScrollController _controller = ScrollController();
  int _current = 0;
  double _itemExtent = 320;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _move(int delta) {
    if (!_controller.hasClients) return;
    final next = (_current + delta).clamp(0, widget.products.length - 1);
    _controller.animateTo(
      next * _itemExtent,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
    setState(() => _current = next);
  }

  bool _observe(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.horizontal) return false;
    final next = (notification.metrics.pixels / _itemExtent)
        .round()
        .clamp(0, widget.products.length - 1);
    if (next != _current) setState(() => _current = next);
    return false;
  }

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (_, constraints) {
        var topPickIndex = 0;
        double? bestScore;
        for (var i = 0; i < widget.products.length; i += 1) {
          final score = widget.products[i].score;
          if (score != null && (bestScore == null || score > bestScore)) {
            bestScore = score;
            topPickIndex = i;
          }
        }
        final itemWidth = widget.products.length == 1
            ? constraints.maxWidth
            : constraints.maxWidth >= 720
                ? 420.0
                : (constraints.maxWidth - 22).clamp(272.0, 420.0).toDouble();
        _itemExtent = itemWidth + 11;
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                    color: const Color(0xFF062E27),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF8B7A25))),
                child: Text(
                    '${widget.products.length} résultat${widget.products.length > 1 ? 's' : ''}',
                    style: const TextStyle(
                        color: Color(0xFFF2D36B),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w900)),
              ),
              if (widget.products.length > 1) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Article ${_current + 1} sur ${widget.products.length}',
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      color: Color(0xFF52675F),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Article précédent',
                  onPressed: _current > 0 ? () => _move(-1) : null,
                  icon: const Icon(Icons.chevron_left_rounded),
                ),
                IconButton(
                  tooltip: 'Article suivant',
                  onPressed: _current < widget.products.length - 1
                      ? () => _move(1)
                      : null,
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            container: true,
            label:
                'Carrousel de ${widget.products.length} articles, article ${_current + 1} affiché',
            child: NotificationListener<ScrollNotification>(
              onNotification: _observe,
              child: Scrollbar(
                controller: _controller,
                thumbVisibility: widget.products.length > 1,
                child: SingleChildScrollView(
                  controller: _controller,
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: List.generate(widget.products.length, (index) {
                      return Padding(
                        padding: EdgeInsets.only(
                          right: index == widget.products.length - 1 ? 0 : 11,
                        ),
                        child: SizedBox(
                          width: itemWidth,
                          child: Semantics(
                            label:
                                'Article ${index + 1} sur ${widget.products.length}: ${widget.products[index].title}',
                            child: _PremiumProductCard(
                              product: widget.products[index],
                              index: index,
                              onPayload: widget.onPayload,
                              actionsEnabled: widget.actionsEnabled,
                              topPick: index == topPickIndex,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),
            ),
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
  const _PremiumProductCard({
    required this.product,
    required this.index,
    this.onPayload,
    this.actionsEnabled = true,
    this.topPick = false,
  });
  final _PremiumProduct product;
  final int index;
  final ValueChanged<String>? onPayload;
  final bool actionsEnabled;
  final bool topPick;

  @override
  Widget build(BuildContext context) {
    final hasIntegratedInterest = product.actions.any(
      (action) =>
          liveCommerceActionKind(action.payload) ==
          LiveCommerceActionKind.interest,
    );
    return Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: topPick ? const Color(0xFF67C9A9) : const Color(0xFFCDE5DB),
              width: topPick ? 1.4 : 1,
            ),
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
              Wrap(
                spacing: 5,
                runSpacing: 5,
                children: [
                  if (topPick)
                    const _PremiumBadge(
                      '✨ Top Pick WAOUH',
                      Color(0xFFE8F8F1),
                      Color(0xFF08745D),
                    ),
                  if (product.isBuyerOpportunity)
                    const _PremiumBadge(
                      '👥 Opportunité acheteur',
                      Color(0xFFEAF3FF),
                      Color(0xFF2368FF),
                    ),
                  if (product.score != null)
                    _PremiumBadge(
                      'Match ${product.score!.round()}%',
                      const Color(0xFFE8F8F1),
                      const Color(0xFF08745D),
                    ),
                  if (product.trustScore != null)
                    _PremiumBadge(
                      'Confiance ${product.trustScore!.round()}%',
                      const Color(0xFFEAF3FF),
                      const Color(0xFF2368FF),
                    ),
                  if (product.contactability != null)
                    LiveContactabilityBadge(level: product.contactability),
                ],
              ),
              const SizedBox(height: 8),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(
                    product.isBuyerOpportunity
                        ? Icons.groups_2_outlined
                        : Icons.shopping_bag_outlined,
                    size: 20,
                    color: product.isBuyerOpportunity
                        ? const Color(0xFF087A9B)
                        : const Color(0xFF2368FF),
                  ),
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
                  title: product.reasons.isNotEmpty
                      ? 'Pourquoi WAOUH le recommande'
                      : 'Recommandation WAOUH',
                  text: product.reasons.isNotEmpty
                      ? product.reasons.join(' · ')
                      : product.displayRecommendation,
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
              if (actionsEnabled && product.actions.isNotEmpty)
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: product.actions.asMap().entries.map((entry) {
                    final action = entry.value;
                    final primary = entry.key == 0;
                    final tone = _smartActionTone(action.payload);
                    return SizedBox(
                      width:
                          product.actions.length == 1 ? double.infinity : null,
                      child: primary
                          ? FilledButton(
                              onPressed: onPayload == null
                                  ? null
                                  : () {
                                      if (liveCommerceActionKind(action.payload) ==
                                          LiveCommerceActionKind.interest) {
                                        _showGuidedInterestSheet(
                                          context,
                                          product,
                                          action.payload,
                                          onPayload!,
                                        );
                                      } else {
                                        onPayload!(action.payload);
                                      }
                                    },
                              style: FilledButton.styleFrom(
                                backgroundColor: tone,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(0, 46),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(11),
                                ),
                              ),
                              child: Text(
                                liveCommerceActionKind(action.payload) ==
                                        LiveCommerceActionKind.interest
                                    ? product.isBuyerOpportunity
                                        ? 'Proposer mon offre'
                                        : 'Je suis intéressé · proposer un prix'
                                    : action.label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900),
                              ),
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
              if (product.fabricId != null && !hasIntegratedInterest) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _showPremiumNexusContactSheet(
                      context,
                      product,
                    ),
                    icon: const Icon(Icons.shield_outlined),
                    label: Text(
                      product.contactability == 'C5'
                          ? 'Négocier dans WAOUH'
                          : product.contactability == 'C4'
                              ? 'Suivre le contact'
                              : product.contactability == 'C3' ||
                                      product.contactability == 'C2'
                                  ? 'Contacter avec WAOUH'
                                  : product.contactability == 'C1'
                                      ? 'Vérifier le contact'
                                      : 'Trouver un moyen de contacter',
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF08745D),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 46),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(11),
                      ),
                    ),
                  ),
                ),
              ],
              if (actionsEnabled && onPayload != null) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showWatchSetup(context, product),
                    icon: const Icon(Icons.notifications_active_outlined),
                    label: const Text('Suivre prix / stock'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF08745D),
                      side: const BorderSide(color: Color(0xFF8ECDB9)),
                      minimumSize: const Size(0, 44),
                    ),
                  ),
                ),
              ],
            ]),
          ),
        ]),
      );
  }
}



Future<void> _showGuidedInterestSheet(
  BuildContext context,
  _PremiumProduct product,
  String payload,
  ValueChanged<String> onPayload,
) async {
  final rawPrice = (product.price ?? '').replaceAll(RegExp(r'[^0-9]'), '');
  final base = double.tryParse(rawPrice);
  final custom = TextEditingController(
    text: base == null || base <= 0 ? '' : base.round().toString(),
  );
  double? selected = base;
  final result = await showModalBottomSheet<double>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
    ),
    builder: (sheetContext) => StatefulBuilder(
      builder: (sheetContext, setSheetState) {
        final suggestions = <double>[
          if (base != null && base > 0) base,
          if (base != null && base > 0) (base * .95).roundToDouble(),
          if (base != null && base > 0) (base * .90).roundToDouble(),
        ].toSet().toList();
        return Padding(
          padding: EdgeInsets.fromLTRB(
            18, 16, 18, 20 + MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Votre Avatar ouvre la négociation',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(
                  'Choisissez votre première offre pour « ' + product.title +
                      ' ». WAOUH la transmet au vendeur puis vous guide : réponse → contre-offre → accord → livraison → paiement.',
                  style: const TextStyle(
                    color: Color(0xFF60746E), fontSize: 12, height: 1.4,
                  ),
                ),
                if (base != null && base > 0) ...[
                  const SizedBox(height: 14),
                  Text('Prix affiché : ' + base.round().toString() + ' FCFA',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: suggestions.map((amount) {
                      final active = selected?.round() == amount.round();
                      return ChoiceChip(
                        selected: active,
                        label: Text(amount.round().toString() + ' FCFA'),
                        onSelected: (_) {
                          setSheetState(() {
                            selected = amount;
                            custom.text = amount.round().toString();
                          });
                        },
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: custom,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Votre proposition (FCFA)',
                    prefixIcon: Icon(Icons.payments_outlined),
                    helperText: 'Vous pourrez contre-proposer ensuite dans le Deal Room.',
                  ),
                  onChanged: (value) => selected =
                      double.tryParse(value.replaceAll(RegExp(r'[^0-9]'), '')),
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () {
                    final amount = double.tryParse(
                      custom.text.replaceAll(RegExp(r'[^0-9]'), ''),
                    );
                    if (amount == null || amount <= 0) return;
                    Navigator.of(sheetContext).pop(amount);
                  },
                  icon: const Icon(Icons.handshake_outlined),
                  label: const Text('Envoyer mon offre et ouvrir le Deal Room'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Votre Avatar reste actif jusqu’à la conclusion de l’accord.',
                  style: TextStyle(
                    color: Color(0xFF08745D),
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
  custom.dispose();
  if (result == null || result <= 0) return;
  final query = <String, String>{
    ...liveCommerceQuery(payload),
    'initial_offer_amount': result.round().toString(),
    'offer_price': result.round().toString(),
    'origin_surface': 'flutter_guided_interest',
  };
  final command = liveCommerceRawCommand(payload);
  final scoped = command + '?' + Uri(queryParameters: query).query;
  onPayload(scoped);
}

Future<void> _showWatchSetup(
  BuildContext context,
  _PremiumProduct product,
) async {
  final rawPrice = (product.price ?? '').replaceAll(RegExp(r'[^0-9]'), '');
  final base = double.tryParse(rawPrice);
  final target = TextEditingController(
    text: base == null || base <= 0 ? '' : (base * .9).round().toString(),
  );
  final confirmed = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) => Padding(
      padding: EdgeInsets.fromLTRB(
        18, 16, 18, 18 + MediaQuery.viewInsetsOf(sheetContext).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Suivre prix et disponibilité',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(product.title, style: const TextStyle(color: Color(0xFF60746E))),
          const SizedBox(height: 12),
          TextField(
            controller: target,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Prix cible (optionnel)',
              suffixText: 'FCFA',
              helperText: 'Laissez vide pour surveiller uniquement les changements.',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => Navigator.of(sheetContext).pop(true),
            icon: const Icon(Icons.notifications_active_outlined),
            label: const Text('Activer le suivi'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ],
      ),
    ),
  );
  if (confirmed != true) {
    target.dispose();
    return;
  }
  final amount = double.tryParse(target.text.replaceAll(RegExp(r'[^0-9]'), ''));
  target.dispose();
  try {
    final service = LiveNexusService(legacy.supabase);
    await service.createWatch(
      query: product.title,
      articleId: product.id,
      sourceUrl: null,
      targetAmount: amount,
    );
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          amount == null
              ? 'Suivi activé. Votre Avatar surveille le prix et la disponibilité.'
              : 'Suivi activé. Votre Avatar vous prévient au prix cible ou en cas de changement.',
        ),
      ),
    );
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Impossible d’activer le suivi : $e')),
    );
  }
}

Future<void> _showPremiumNexusContactSheet(
  BuildContext context,
  _PremiumProduct product,
) async {
  if (product.fabricId == null) return;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _PremiumNexusContactSheet(product: product),
  );
}

class _PremiumNexusContactSheet extends StatefulWidget {
  const _PremiumNexusContactSheet({required this.product});
  final _PremiumProduct product;

  @override
  State<_PremiumNexusContactSheet> createState() =>
      _PremiumNexusContactSheetState();
}

class _PremiumNexusContactSheetState
    extends State<_PremiumNexusContactSheet> {
  late final LiveNexusService service = LiveNexusService(legacy.supabase);
  final message = TextEditingController();
  NexusPreparedContact? prepared;
  NexusOpportunityJourney? journey;
  Object? error;
  bool busy = true;
  bool sending = false;
  bool enriching = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  String get _mode {
    final intent = (widget.product.intent ?? '').toUpperCase();
    return intent == 'BUY' ? 'sell' : 'buy';
  }

  Future<void> _load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      var currentJourney = await service.startOpportunity(
        fabricId: widget.product.fabricId!,
        mode: _mode,
      );
      var value = await service.prepareContact(widget.product.fabricId!);

      if (value.policy.level == 'C0' || value.policy.level == 'C1') {
        currentJourney = await service.enrichOpportunity(
          fabricId: widget.product.fabricId!,
          mode: _mode,
        );
        value = await service.prepareContact(widget.product.fabricId!);
      }

      if (!mounted) return;
      setState(() {
        journey = currentJourney;
        prepared = value;
        busy = false;
        error = null;
        message.text =
            'Bonjour, mon Avatar WAOUH vous contacte au sujet de « ' +
                widget.product.title +
                ' ». Est-ce toujours disponible ? Si oui, je souhaite poursuivre la discussion dans WAOUH.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        busy = false;
        error = e;
      });
    }
  }

  Future<void> _enrich() async {
    if (enriching) return;
    setState(() {
      enriching = true;
      error = null;
    });
    try {
      final updated = await service.enrichOpportunity(
        fabricId: widget.product.fabricId!,
        mode: _mode,
      );
      final contact = await service.prepareContact(widget.product.fabricId!);
      if (!mounted) return;
      setState(() {
        journey = updated;
        prepared = contact;
      });
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => enriching = false);
    }
  }

  Future<void> _refreshJourney() async {
    final current = journey;
    if (current == null) return;
    try {
      final updated = await service.opportunityStatus(journeyId: current.id);
      if (!mounted) return;
      setState(() => journey = updated);
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  Future<void> _send() async {
    final contact = prepared;
    final text = message.text.trim();
    if (contact == null || text.isEmpty || sending) return;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      final result = await service.sendContact(
        fabricId: contact.fabricId,
        message: text,
      );
      NexusOpportunityJourney? updated;
      final rawJourney = result['journey'];
      if (rawJourney is Map) {
        updated = NexusOpportunityJourney.fromJson(
          Map<String, dynamic>.from(rawJourney),
        );
      } else if (journey != null) {
        updated = await service.opportunityStatus(journeyId: journey!.id);
      }
      if (!mounted) return;
      setState(() {
        if (updated != null) journey = updated;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Votre Avatar a pris le relais. WAOUH suit la réponse et vous guidera à la prochaine étape.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e);
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  Widget _progress() {
    final current = journey;
    final level = current?.contactability ??
        prepared?.policy.level ??
        widget.product.contactability ??
        'C0';
    final progress = (current?.progress ?? 10).clamp(0, 100);
    final stages = const [
      ['Trouvé', 10],
      ['Vérifié', 25],
      ['Contact', 40],
      ['Réponse', 55],
      ['Négociation', 70],
      ['Accord', 80],
      ['Exécution', 90],
      ['Terminé', 100],
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F8FF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE7F8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  current?.lastMessage ??
                      'Votre Avatar prend en charge cette opportunité.',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF19304F),
                  ),
                ),
              ),
              Text(
                progress.toString() + '%',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF2368FF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress / 100,
            minHeight: 7,
            borderRadius: BorderRadius.circular(99),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: stages.map((stage) {
              final reached = progress >= (stage[1] as int);
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: reached
                      ? const Color(0xFFE4F7EF)
                      : const Color(0xFFF1F3F6),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  stage[0] as String,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: reached
                        ? const Color(0xFF08745D)
                        : const Color(0xFF7B8797),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              LiveContactabilityBadge(level: level, showCode: true),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  current?.nextAction ??
                      'Avatar analyse automatiquement la prochaine action.',
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: Color(0xFF60746E),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _maskedContact() {
    final data = journey?.maskedContact ?? const <String, dynamic>{};
    final rawPhones = data['phones'];
    final channels = data['channels'] is List
        ? List<dynamic>.from(data['channels'] as List)
        : const <dynamic>[];
    final lines = <String>[];
    if (rawPhones is List) {
      for (final raw in rawPhones.take(3)) {
        if (raw is Map) {
          final country = (raw['country_code'] ?? '').toString();
          final last4 = (raw['last4'] ?? '').toString();
          if (last4.isNotEmpty) {
            lines.add((country.isEmpty ? '' : country + ' ') + '•••• ' + last4);
          }
        }
      }
    }
    if (prepared != null) {
      for (final item in prepared!.contacts) {
        final last4 = item.last4;
        if (last4 != null && last4.isNotEmpty) {
          final label = item.channel == 'whatsapp' ? 'WhatsApp' : item.channel;
          lines.add(label + ' · •••• ' + last4);
        }
      }
    }
    if (lines.isEmpty && channels.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1FAF6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD5EBE2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations de contact autorisées',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
          ),
          if (lines.isNotEmpty) ...[
            const SizedBox(height: 5),
            for (final line in lines.toSet())
              Text(
                line,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF08745D),
                ),
              ),
          ],
          if (channels.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              'Canaux détectés : ' + channels.join(' · '),
              style: const TextStyle(
                color: Color(0xFF60746E),
                fontSize: 10.5,
              ),
            ),
          ],
          const SizedBox(height: 4),
          const Text(
            'WAOUH ne révèle que les coordonnées publiques, professionnelles ou autorisées.',
            style: TextStyle(
              color: Color(0xFF7B8797),
              fontSize: 9.5,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final contact = prepared;
    final current = journey;
    final level = current?.contactability ??
        contact?.policy.level ??
        widget.product.contactability ??
        'C0';
    final canSend = contact != null &&
        (contact.policy.canBlindMessage || contact.policy.canAutoContact);
    final waiting = current?.waiting == true || level == 'C4';
    final negotiating = current?.negotiating == true || level == 'C5';

    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        14,
        16,
        18 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFD5E1DC),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Row(
              children: [
                const LiveMuseAvatar(
                  mode: LiveMuseMode.neutral,
                  phase: LiveMusePhase.contacting,
                  size: 42,
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Votre Avatar conduit la démarche',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'Découverte → contact C0–C5 → négociation → accord',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF60746E),
                        ),
                      ),
                    ],
                  ),
                ),
                LiveContactabilityBadge(level: level, showCode: true),
              ],
            ),
            const SizedBox(height: 14),
            if (busy)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 10),
                      Text('Avatar vérifie le meilleur chemin de contact…'),
                    ],
                  ),
                ),
              )
            else ...[
              _progress(),
              _maskedContact(),
              if (contact != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE0E7E4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contact.actorName ??
                            contact.productName ??
                            widget.product.title,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        contact.note ??
                            'WAOUH protège vos coordonnées et garde le suivi de bout en bout.',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF60746E),
                          height: 1.35,
                        ),
                      ),
                      if (contact.sourceUrl?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: 6),
                        const Text(
                          'Source originale vérifiée par NEXUS',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF7B8797),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              if (error != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF5E8),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    'Avatar poursuit la démarche. Détail technique : ' +
                        error.toString(),
                    style: const TextStyle(
                      color: Color(0xFF765200),
                      fontSize: 10.5,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              if (level == 'C0' || level == 'C1') ...[
                const Text(
                  'Aucun cul-de-sac : votre Avatar enrichit le signal jusqu’à trouver un canal autorisé.',
                  style: TextStyle(
                    color: Color(0xFF19304F),
                    fontWeight: FontWeight.w800,
                    fontSize: 11.5,
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: enriching ? null : _enrich,
                  icon: enriching
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.manage_search_rounded),
                  label: Text(
                    level == 'C0'
                        ? 'Trouver un moyen de contacter'
                        : 'Vérifier le meilleur canal',
                  ),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ] else if (waiting) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF8F2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.schedule_send_rounded, color: Color(0xFF08745D)),
                      SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          'Message envoyé · réponse en attente. Avatar garde la main et vous avertit dès que la contrepartie répond.',
                          style: TextStyle(
                            color: Color(0xFF08745D),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _refreshJourney,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Actualiser le suivi'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                  ),
                ),
              ] else if (negotiating) ...[
                FilledButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'La contrepartie est prête. Ouvrez le Deal Room pour négocier et conclure.',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.handshake_rounded),
                  label: const Text('Continuer vers la négociation'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ] else if (canSend) ...[
                const Text(
                  'Message proposé par votre Avatar',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
                const SizedBox(height: 7),
                TextField(
                  controller: message,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Message de prise de contact…',
                  ),
                ),
                const SizedBox(height: 9),
                FilledButton.icon(
                  onPressed: sending ? null : _send,
                  icon: sending
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                  label: const Text('Contacter avec WAOUH'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
                const SizedBox(height: 7),
                const Text(
                  'Après l’envoi, cette démarche reste suivie dans WAOUH jusqu’à l’accord.',
                  style: TextStyle(
                    color: Color(0xFF60746E),
                    fontSize: 10,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

String _watchProductPayload(_PremiumProduct product) {
  final params = <String, String>{
    'product_id': product.id ?? product.title,
    'title': product.title,
    'currency': 'XOF',
    if (product.price != null) 'price': product.price!,
    if (product.city != null) 'city': product.city!,
    if (product.images.isNotEmpty) 'image_url': product.images.first.url,
  };
  return 'waouh:watch?${Uri(queryParameters: params).query}';
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
        height: MediaQuery.sizeOf(context).height < 700 ? 250 : 300,
        child: Stack(children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.images.length,
            onPageChanged: (value) => setState(() => _current = value),
            itemBuilder: (_, imageIndex) => GestureDetector(
              onTap: _open,
              child: SizedBox.expand(
                  child: _premiumImage(widget.images[imageIndex],
                      fit: BoxFit.contain)),
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
