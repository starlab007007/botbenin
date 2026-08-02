import 'live_controller.dart';
import 'live_models.dart';

class LiveWaouhControllerV2 extends LiveWaouhController {
  LiveWaouhControllerV2(super.auth);

  final Map<String, DateTime> _interestLocks = <String, DateTime>{};
  LiveMatch? _immediateMatch;
  String? _resolvedMeetKey;

  LiveMatch? takeImmediateMatch() {
    final value = _immediateMatch;
    _immediateMatch = null;
    return value;
  }

  String? takeResolvedMeetKey() {
    final direct = super.takePendingMeetKey();
    if (direct != null && direct.isNotEmpty) {
      _resolvedMeetKey = direct;
    }
    final value = _resolvedMeetKey;
    _resolvedMeetKey = null;
    return value;
  }

  @override
  String? takePendingMeetKey() {
    final value = super.takePendingMeetKey();
    if (value != null && value.isNotEmpty) {
      _resolvedMeetKey = value;
    }
    return value;
  }

  @override
  Future<void> initialize() async {
    await super.initialize();
    // Same reconciliation performed by React useWaouhIdentity. It links the
    // WAOUH identity created for this Android session to the signed-in account
    // before chat, matches and notifications are queried.
    await chat.waouhUserIds(auth.user?.id);
  }

  @override
  Future<void> sendMain({
    required String text,
    List<LiveAttachment> attachments = const [],
    Map<String, dynamic> meta = const {},
  }) {
    final provisional = _provisionalInterest(text, meta);
    if (provisional != null) {
      final now = DateTime.now();
      _interestLocks.removeWhere(
        (_, createdAt) =>
            now.difference(createdAt) > const Duration(seconds: 8),
      );
      final previous = _interestLocks[provisional.key];
      if (previous != null &&
          now.difference(previous) < const Duration(seconds: 2)) {
        return Future<void>.value();
      }
      _interestLocks[provisional.key] = now;
      _immediateMatch = provisional;
      notifyListeners();
    }
    return super.sendMain(
      text: text,
      attachments: attachments,
      meta: meta,
    );
  }

  LiveMatch? _provisionalInterest(
    String text,
    Map<String, dynamic> meta,
  ) {
    final action = liveText(meta['action'] ?? meta['intent']).toLowerCase();
    final buttonPayload =
        liveText(meta['button_payload'] ?? text).toLowerCase();
    final interested = action == 'interested' ||
        action.startsWith('interess') ||
        action.startsWith('intéress') ||
        buttonPayload.startsWith('interess') ||
        buttonPayload.startsWith('intéress');
    if (!interested) return null;

    final roleValue = liveText(meta['role'], 'buyer').toLowerCase();
    final role = roleValue == 'seller' ? 'seller' : 'buyer';
    final threadId = liveText(meta['thread_id']).trim();
    final counterpart = liveText(
      role == 'seller'
          ? (meta['buyer_user_id'] ?? meta['counterpart_user_id'])
          : (meta['seller_user_id'] ?? meta['counterpart_user_id']),
    ).trim();

    var articleId = liveText(
      meta['article_id'] ??
          meta['radar_item_id'] ??
          meta['status_id'] ??
          meta['commerce_reference'],
    ).trim();
    if (articleId.isEmpty) {
      articleId = 'pending_${_stableToken(buttonPayload)}';
    }

    final rawTitle = liveVisibleText(
      meta['title'] ??
          meta['product_title'] ??
          meta['article_title'] ??
          'Discussion produit',
    );
    final title = rawTitle.isEmpty ? 'Discussion produit' : rawTitle;
    final rawPrice = meta['price'];
    final price = rawPrice is num
        ? rawPrice
        : num.tryParse(
            liveText(rawPrice)
                .replaceAll(RegExp(r'[^0-9,.]'), '')
                .replaceAll(',', '.'),
          );
    final photos = liveAttachments(
      meta['photos'] ?? meta['images'] ?? meta['photo'] ?? meta['image_url'],
    ).map((item) => item.url).toList(growable: false);

    return LiveMatch(
      key: liveMatchKey(
        articleId,
        role,
        counterpart.isEmpty ? null : counterpart,
        threadId.isEmpty ? null : threadId,
      ),
      articleId: articleId,
      role: role,
      title: title,
      lastAt: DateTime.now(),
      counterpartUserId: counterpart.isEmpty ? null : counterpart,
      threadId: threadId.isEmpty ? null : threadId,
      threadType: liveText(meta['thread_type'], 'product_meet'),
      searchRequestId: meta['search_request_id']?.toString(),
      buyerUserId: meta['buyer_user_id']?.toString(),
      sellerUserId: meta['seller_user_id']?.toString(),
      source: meta['source']?.toString(),
      negotiationId: meta['negotiation_id']?.toString(),
      dealId: meta['deal_id']?.toString(),
      transactionId: meta['transaction_id']?.toString(),
      seedText: text,
      price: price,
      city: meta['city']?.toString(),
      photo: photos.isEmpty ? null : photos.first,
      photoUrls: photos,
    );
  }

  String _stableToken(String value) {
    var hash = 0x811c9dc5;
    for (final unit in value.codeUnits) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0x7fffffff;
    }
    return hash.toRadixString(16);
  }
}
