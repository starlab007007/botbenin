import 'dart:convert';

/// Versioned, payment-free contracts understood by the Flutter WAOUH client.
///
/// The factories deliberately accept the historic aliases still emitted by
/// older Edge Functions. Serialisation always emits one canonical shape.
const waouhMessageSchemaV1 = 'waouh.message.v1';
const waouhProductSchemaV1 = 'waouh.product.v1';
const waouhOfferSchemaV1 = 'waouh.offer.v1';

dynamic _decoded(dynamic value) {
  if (value is! String) return value;
  final text = value.trim();
  if (text.isEmpty || !(text.startsWith('{') || text.startsWith('['))) {
    return value;
  }
  try {
    return jsonDecode(text);
  } catch (_) {
    return value;
  }
}

Map<String, dynamic> _map(dynamic value) {
  final decoded = _decoded(value);
  if (decoded is! Map) return const <String, dynamic>{};
  return <String, dynamic>{
    for (final entry in decoded.entries) entry.key.toString(): entry.value,
  };
}

List<dynamic> _list(dynamic value) {
  final decoded = _decoded(value);
  return decoded is List ? decoded : const <dynamic>[];
}

String _text(dynamic value) => value == null ? '' : value.toString().trim();

num? _number(dynamic value) {
  if (value is num) return value;
  final normalized =
      _text(value).replaceAll(RegExp(r'[^0-9,.-]'), '').replaceAll(',', '.');
  return num.tryParse(normalized);
}

String? _optional(dynamic value) {
  final result = _text(value);
  return result.isEmpty || result == 'null' ? null : result;
}

bool _isSafeImageUrl(String value) {
  if (value.startsWith('data:image/')) return true;
  if (value.startsWith('file:') || value.startsWith('/')) return true;
  final uri = Uri.tryParse(value);
  return uri != null && (uri.scheme == 'https' || uri.scheme == 'http');
}

List<String> _images(dynamic value) {
  final found = <String>[];
  final seen = <String>{};

  void collect(dynamic candidate, [int depth = 0]) {
    if (candidate == null || depth > 5) return;
    final decoded = _decoded(candidate);
    if (decoded is List) {
      for (final item in decoded) {
        collect(item, depth + 1);
      }
      return;
    }
    if (decoded is Map) {
      final row = _map(decoded);
      for (final key in const <String>[
        'url',
        'src',
        'uri',
        'public_url',
        'publicUrl',
        'image_url',
        'imageUrl',
        'photo_url',
        'photoUrl',
        'thumbnail_url',
      ]) {
        if (row[key] != null) collect(row[key], depth + 1);
      }
      return;
    }
    final url = _text(decoded).replaceAll(r'\/', '/');
    if (url.isNotEmpty && _isSafeImageUrl(url) && seen.add(url)) {
      found.add(url);
    }
  }

  collect(value);
  return found;
}

class WaouhProductContract {
  const WaouhProductContract({
    required this.id,
    required this.title,
    this.description,
    this.price,
    this.currency = 'XOF',
    this.availability,
    this.city,
    this.sellerId,
    this.sellerLabel,
    this.source,
    this.condition,
    this.photos = const <String>[],
    this.attributes = const <String, dynamic>{},
  });

  final String id;
  final String title;
  final String? description;
  final num? price;
  final String currency;
  final String? availability;
  final String? city;
  final String? sellerId;
  final String? sellerLabel;
  final String? source;
  final String? condition;
  final List<String> photos;
  final Map<String, dynamic> attributes;

  factory WaouhProductContract.fromJson(
    dynamic value, {
    int fallbackIndex = 0,
  }) {
    final row = _map(value);
    final title = _optional(
          row['title'] ?? row['name'] ?? row['nom'] ?? row['label'],
        ) ??
        'Article ${fallbackIndex + 1}';
    final id = _optional(
          row['product_id'] ??
              row['article_id'] ??
              row['variant_id'] ??
              row['id'],
        ) ??
        'product-${fallbackIndex + 1}';
    final photos = _images(<dynamic>[
      row['photos'],
      row['images'],
      row['media'],
      row['attachments'],
      row['photo'],
      row['image'],
      row['photo_url'],
      row['image_url'],
      row['thumbnail_url'],
      row['cover_photo'],
    ]);
    final knownKeys = <String>{
      'schema',
      'id',
      'product_id',
      'article_id',
      'variant_id',
      'title',
      'name',
      'nom',
      'label',
      'description',
      'details',
      'summary',
      'price',
      'prix',
      'amount',
      'currency',
      'devise',
      'availability',
      'status',
      'disponibilite',
      'city',
      'ville',
      'location',
      'seller_id',
      'seller_user_id',
      'merchant_id',
      'owner_user_id',
      'seller_name',
      'seller_label',
      'business_name',
      'source',
      'origin',
      'condition',
      'state',
      'etat',
      'photos',
      'images',
      'media',
      'attachments',
      'photo',
      'image',
      'photo_url',
      'image_url',
      'thumbnail_url',
      'cover_photo',
    };
    return WaouhProductContract(
      id: id,
      title: title,
      description: _optional(
        row['description'] ?? row['details'] ?? row['summary'],
      ),
      price: _number(row['price'] ?? row['prix'] ?? row['amount']),
      currency: _optional(row['currency'] ?? row['devise']) ?? 'XOF',
      availability: _optional(
        row['availability'] ?? row['status'] ?? row['disponibilite'],
      ),
      city: _optional(row['city'] ?? row['ville'] ?? row['location']),
      sellerId: _optional(
        row['seller_id'] ??
            row['seller_user_id'] ??
            row['merchant_id'] ??
            row['owner_user_id'],
      ),
      sellerLabel: _optional(
        row['seller_name'] ?? row['seller_label'] ?? row['business_name'],
      ),
      source: _optional(row['source'] ?? row['origin']),
      condition: _optional(
        row['condition'] ?? row['state'] ?? row['etat'],
      ),
      photos: photos,
      attributes: <String, dynamic>{
        for (final entry in row.entries)
          if (!knownKeys.contains(entry.key)) entry.key: entry.value,
      },
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'schema': waouhProductSchemaV1,
        'product_id': id,
        'title': title,
        if (description != null) 'description': description,
        if (price != null) 'price': price,
        'currency': currency,
        if (availability != null) 'availability': availability,
        if (city != null) 'city': city,
        if (sellerId != null) 'seller_id': sellerId,
        if (sellerLabel != null) 'seller_name': sellerLabel,
        if (source != null) 'source': source,
        if (condition != null) 'condition': condition,
        'photos': photos,
        ...attributes,
      };

  Map<String, dynamic> toLegacyJson() => <String, dynamic>{
        ...toJson(),
        'id': id,
        'article_id': id,
        if (sellerId != null) 'seller_user_id': sellerId,
      };
}

class WaouhOfferContract {
  const WaouhOfferContract({
    required this.id,
    required this.productId,
    this.intentId,
    this.merchantId,
    this.quantity = 1,
    this.unitPrice,
    this.deliveryFee,
    this.currency = 'XOF',
    this.expiresAt,
    this.reservedUntil,
    this.termsHash,
    this.signature,
  });

  final String id;
  final String productId;
  final String? intentId;
  final String? merchantId;
  final int quantity;
  final num? unitPrice;
  final num? deliveryFee;
  final String currency;
  final DateTime? expiresAt;
  final DateTime? reservedUntil;
  final String? termsHash;
  final String? signature;

  factory WaouhOfferContract.fromJson(dynamic value, {int fallbackIndex = 0}) {
    final row = _map(value);
    return WaouhOfferContract(
      id: _optional(row['offer_id'] ?? row['id']) ??
          'offer-${fallbackIndex + 1}',
      productId: _optional(
            row['product_id'] ?? row['variant_id'] ?? row['article_id'],
          ) ??
          '',
      intentId: _optional(row['intent_id']),
      merchantId: _optional(row['merchant_id'] ?? row['seller_id']),
      quantity: (_number(row['quantity']) ?? 1).toInt().clamp(1, 999),
      unitPrice: _number(row['unit_price'] ?? row['price']),
      deliveryFee: _number(row['delivery_fee']),
      currency: _optional(row['currency']) ?? 'XOF',
      expiresAt: DateTime.tryParse(_text(row['expires_at'])),
      reservedUntil: DateTime.tryParse(
        _text(row['stock_reserved_until'] ?? row['reserved_until']),
      ),
      termsHash: _optional(row['terms_hash']),
      signature: _optional(row['signature']),
    );
  }

  bool get expired => expiresAt != null && expiresAt!.isBefore(DateTime.now());

  Map<String, dynamic> toJson() => <String, dynamic>{
        'schema': waouhOfferSchemaV1,
        'offer_id': id,
        'product_id': productId,
        if (intentId != null) 'intent_id': intentId,
        if (merchantId != null) 'merchant_id': merchantId,
        'quantity': quantity,
        if (unitPrice != null) 'unit_price': unitPrice,
        if (deliveryFee != null) 'delivery_fee': deliveryFee,
        'currency': currency,
        if (expiresAt != null)
          'expires_at': expiresAt!.toUtc().toIso8601String(),
        if (reservedUntil != null)
          'stock_reserved_until': reservedUntil!.toUtc().toIso8601String(),
        if (termsHash != null) 'terms_hash': termsHash,
        if (signature != null) 'signature': signature,
      };
}

class WaouhMessageBlock {
  const WaouhMessageBlock({required this.type, required this.data});

  final String type;
  final Map<String, dynamic> data;

  factory WaouhMessageBlock.fromJson(dynamic value) {
    final row = _map(value);
    return WaouhMessageBlock(
      type: _text(row['type']).toLowerCase(),
      data: row,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{...data, 'type': type};
}

class WaouhMessageContract {
  const WaouhMessageContract({
    required this.text,
    this.messageId,
    this.correlationId,
    this.missionId,
    this.products = const <WaouhProductContract>[],
    this.offers = const <WaouhOfferContract>[],
    this.blocks = const <WaouhMessageBlock>[],
    this.meta = const <String, dynamic>{},
  });

  final String text;
  final String? messageId;
  final String? correlationId;
  final String? missionId;
  final List<WaouhProductContract> products;
  final List<WaouhOfferContract> offers;
  final List<WaouhMessageBlock> blocks;
  final Map<String, dynamic> meta;

  static WaouhMessageContract? tryParse(dynamic value, [int depth = 0]) {
    if (value == null || depth > 5) return null;
    final decoded = _decoded(value);
    if (decoded is List) {
      for (final item in decoded) {
        final parsed = tryParse(item, depth + 1);
        if (parsed != null) return parsed;
      }
      return null;
    }
    if (decoded is! Map) return null;
    final row = _map(decoded);
    final nested = _map(row['data'] ?? row['payload'] ?? row['response']);
    final metadata = <String, dynamic>{
      ..._map(row['meta']),
      ..._map(nested['meta']),
    };
    final containers = <Map<String, dynamic>>[row, nested, metadata];

    dynamic firstValue(List<String> keys) {
      for (final container in containers) {
        for (final key in keys) {
          if (container[key] != null) return container[key];
        }
      }
      return null;
    }

    var rawProducts = _list(firstValue(const <String>[
      'products',
      'articles',
      'items',
      'results',
      'matches',
    ]));
    final blocks = _list(firstValue(const <String>['blocks']))
        .map(WaouhMessageBlock.fromJson)
        .where((block) => block.type.isNotEmpty)
        .toList(growable: false);
    if (rawProducts.isEmpty) {
      for (final block in blocks) {
        if (block.type == 'product_carousel' || block.type == 'products') {
          final embedded = _list(
            block.data['products'] ??
                block.data['items'] ??
                block.data['offers'],
          );
          if (embedded.any((item) => item is Map)) rawProducts = embedded;
        }
      }
    }
    final products = rawProducts
        .asMap()
        .entries
        .where((entry) => entry.value is Map)
        .map((entry) => WaouhProductContract.fromJson(
              entry.value,
              fallbackIndex: entry.key,
            ))
        .toList(growable: false);

    final rawOffers = _list(firstValue(const <String>['signed_offers']));
    final offers = rawOffers
        .asMap()
        .entries
        .where((entry) => entry.value is Map)
        .map((entry) => WaouhOfferContract.fromJson(
              entry.value,
              fallbackIndex: entry.key,
            ))
        .toList(growable: false);

    final text = _optional(firstValue(
          const <String>['text', 'reply', 'message', 'content', 'output'],
        )) ??
        '';
    final schema = _text(firstValue(const <String>['schema']));
    if (schema.isEmpty &&
        text.isEmpty &&
        products.isEmpty &&
        offers.isEmpty &&
        blocks.isEmpty) {
      return null;
    }
    return WaouhMessageContract(
      text: text,
      messageId: _optional(firstValue(const <String>['message_id', 'id'])),
      correlationId: _optional(firstValue(
        const <String>['correlation_id', 'request_id', 'idempotency_key'],
      )),
      missionId:
          _optional(firstValue(const <String>['mission_id', 'intent_id'])),
      products: products,
      offers: offers,
      blocks: blocks,
      meta: metadata,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'schema': waouhMessageSchemaV1,
        if (messageId != null) 'message_id': messageId,
        if (correlationId != null) 'correlation_id': correlationId,
        if (missionId != null) 'mission_id': missionId,
        'text': text,
        if (products.isNotEmpty)
          'products': products.map((product) => product.toJson()).toList(),
        if (offers.isNotEmpty)
          'signed_offers': offers.map((offer) => offer.toJson()).toList(),
        if (blocks.isNotEmpty)
          'blocks': blocks.map((block) => block.toJson()).toList(),
        if (meta.isNotEmpty) 'meta': meta,
      };

  /// Adapter used while the existing premium-card renderer still reads the
  /// historic `meta.products` contract.
  Map<String, dynamic> toLegacyMeta() => <String, dynamic>{
        ...meta,
        'schema': waouhMessageSchemaV1,
        if (correlationId != null) 'correlation_id': correlationId,
        if (missionId != null) 'mission_id': missionId,
        if (products.isNotEmpty)
          'products':
              products.map((product) => product.toLegacyJson()).toList(),
        if (offers.isNotEmpty)
          'signed_offers': offers.map((offer) => offer.toJson()).toList(),
        if (blocks.isNotEmpty)
          'blocks': blocks.map((block) => block.toJson()).toList(),
      };
}
