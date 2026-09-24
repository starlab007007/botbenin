import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NexusApiException implements Exception {
  const NexusApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

String _text(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString();

double _number(dynamic value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  return double.tryParse(_text(value)) ?? fallback;
}

bool _bool(dynamic value, [bool fallback = false]) =>
    value is bool ? value : fallback;

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

List<dynamic> _list(dynamic value) => value is List ? value : const [];

class NexusScore {
  const NexusScore({
    required this.total,
    required this.relevance,
    required this.trust,
    required this.contactability,
    this.reasons = const [],
  });

  final double total;
  final double relevance;
  final double trust;
  final double contactability;
  final List<String> reasons;

  factory NexusScore.fromJson(Map<String, dynamic> json) => NexusScore(
        total: _number(json['total_score']),
        relevance: _number(json['relevance_score']),
        trust: _number(json['trust_score']),
        contactability: _number(json['contactability_score']),
        reasons: _list(json['reasons'])
            .map(_text)
            .where((value) => value.trim().isNotEmpty)
            .toList(growable: false),
      );
}

class NexusContactPolicy {
  const NexusContactPolicy({
    required this.level,
    required this.label,
    required this.canReveal,
    required this.canAutoContact,
    required this.canBlindMessage,
    required this.requiresApproval,
  });

  final String level;
  final String label;
  final bool canReveal;
  final bool canAutoContact;
  final bool canBlindMessage;
  final bool requiresApproval;

  factory NexusContactPolicy.fromJson(Map<String, dynamic> json) =>
      NexusContactPolicy(
        level: _text(json['level'], 'C0'),
        label: _text(json['label'], 'Découverte uniquement'),
        canReveal: _bool(json['can_reveal']),
        canAutoContact: _bool(json['can_auto_contact']),
        canBlindMessage: _bool(json['can_blind_message']),
        requiresApproval: _bool(json['requires_approval']),
      );
}

class NexusDiscoveryItem {
  const NexusDiscoveryItem({
    required this.fabricId,
    required this.sourceKey,
    required this.intent,
    required this.title,
    required this.scores,
    required this.contactPolicy,
    this.actorType,
    this.category,
    this.city,
    this.priceMin,
    this.priceMax,
    this.currency = 'XOF',
    this.sourceUrl,
  });

  final String fabricId;
  final String sourceKey;
  final String intent;
  final String title;
  final String? actorType;
  final String? category;
  final String? city;
  final double? priceMin;
  final double? priceMax;
  final String currency;
  final String? sourceUrl;
  final NexusScore scores;
  final NexusContactPolicy contactPolicy;

  factory NexusDiscoveryItem.fromJson(Map<String, dynamic> json) {
    final minRaw = json['price_min'];
    final maxRaw = json['price_max'];
    return NexusDiscoveryItem(
      fabricId: _text(json['fabric_id']),
      sourceKey: _text(json['source_key'], 'waouh_app'),
      intent: _text(json['intent'], 'UNKNOWN'),
      title: _text(
        json['subject'] ?? json['category'],
        'Signal commercial',
      ),
      actorType: json['actor_type'] == null ? null : _text(json['actor_type']),
      category: json['category'] == null ? null : _text(json['category']),
      city: json['city'] == null ? null : _text(json['city']),
      priceMin: minRaw == null ? null : _number(minRaw),
      priceMax: maxRaw == null ? null : _number(maxRaw),
      currency: _text(json['currency'], 'XOF'),
      sourceUrl: json['source_url'] == null ? null : _text(json['source_url']),
      scores: NexusScore.fromJson(_map(json['scores'])),
      contactPolicy:
          NexusContactPolicy.fromJson(_map(json['contact_policy'])),
    );
  }
}

class NexusSmartDiscoveryPlan {
  const NexusSmartDiscoveryPlan({
    required this.mode,
    required this.normalizedQuery,
    required this.priorities,
    required this.sourceFamilies,
    required this.missing,
    required this.nextActions,
    required this.confidence,
    required this.rationale,
    this.city,
    this.budgetMax,
  });

  final String mode;
  final String normalizedQuery;
  final String? city;
  final double? budgetMax;
  final List<String> priorities;
  final List<String> sourceFamilies;
  final List<String> missing;
  final List<String> nextActions;
  final double confidence;
  final String rationale;

  bool get findSellers => mode != 'find_buyers';

  factory NexusSmartDiscoveryPlan.fromJson(Map<String, dynamic> json) =>
      NexusSmartDiscoveryPlan(
        mode: _text(json['mode'], 'find_sellers'),
        normalizedQuery: _text(json['normalized_query']),
        city: json['city'] == null ? null : _text(json['city']),
        budgetMax: json['budget_max'] == null
            ? null
            : _number(json['budget_max']),
        priorities: _list(json['priorities'])
            .map(_text)
            .where((value) => value.trim().isNotEmpty)
            .toList(growable: false),
        sourceFamilies: _list(json['source_families'])
            .map(_text)
            .where((value) => value.trim().isNotEmpty)
            .toList(growable: false),
        missing: _list(json['missing'])
            .map(_text)
            .where((value) => value.trim().isNotEmpty)
            .toList(growable: false),
        nextActions: _list(json['next_actions'])
            .map(_text)
            .where((value) => value.trim().isNotEmpty)
            .toList(growable: false),
        confidence: _number(json['confidence']),
        rationale: _text(json['rationale']),
      );
}

class NexusDiscoveryResponse {
  const NexusDiscoveryResponse({
    required this.mode,
    required this.results,
    required this.sourceMix,
    required this.refresh,
    this.normalizedQuery,
    this.explanation,
    this.intelligence,
  });

  final String mode;
  final String? normalizedQuery;
  final String? explanation;
  final NexusSmartDiscoveryPlan? intelligence;
  final List<NexusDiscoveryItem> results;
  final Map<String, int> sourceMix;
  final Map<String, dynamic> refresh;

  bool get findSellers => mode != 'find_buyers';

  factory NexusDiscoveryResponse.fromJson(Map<String, dynamic> json) {
    final intelligenceJson = _map(json['intelligence']);
    return NexusDiscoveryResponse(
      mode: _text(json['mode'], 'find_sellers'),
      normalizedQuery: json['normalized_query'] == null
          ? null
          : _text(json['normalized_query']),
      explanation:
          json['explanation'] == null ? null : _text(json['explanation']),
      intelligence: intelligenceJson.isEmpty
          ? null
          : NexusSmartDiscoveryPlan.fromJson(intelligenceJson),
      results: _list(json['results'])
          .map((value) => NexusDiscoveryItem.fromJson(_map(value)))
          .where((item) => item.fabricId.isNotEmpty)
          .toList(growable: false),
      sourceMix: _map(json['source_mix']).map(
        (key, value) => MapEntry(key, _number(value).round()),
      ),
      refresh: _map(json['refresh']),
    );
  }
}

class NexusSourceInfo {
  const NexusSourceInfo({
    required this.key,
    required this.label,
    required this.family,
    required this.mode,
    required this.state,
    required this.configured,
    required this.signalCount,
    required this.contactability,
    required this.supportsBuy,
    required this.supportsSell,
  });

  final String key;
  final String label;
  final String family;
  final String mode;
  final String state;
  final bool configured;
  final int signalCount;
  final String contactability;
  final bool supportsBuy;
  final bool supportsSell;

  bool get live => state == 'live';

  factory NexusSourceInfo.fromJson(Map<String, dynamic> json) =>
      NexusSourceInfo(
        key: _text(json['source_key']),
        label: _text(json['label'], _text(json['source_key'], 'Source')),
        family: _text(json['family']),
        mode: _text(json['connector_mode']),
        state: _text(json['operational_state'], 'disabled'),
        configured: _bool(json['configured']),
        signalCount: _number(json['signal_count']).round(),
        contactability: _text(json['default_contactability'], 'C0'),
        supportsBuy: _bool(json['supports_buy']),
        supportsSell: _bool(json['supports_sell']),
      );
}

class NexusContactItem {
  const NexusContactItem({
    required this.id,
    required this.channel,
    required this.value,
    required this.level,
    required this.canAutoContact,
    this.last4,
  });

  final String id;
  final String channel;
  final String value;
  final String level;
  final bool canAutoContact;
  final String? last4;

  factory NexusContactItem.fromJson(Map<String, dynamic> json) =>
      NexusContactItem(
        id: _text(json['id']),
        channel: _text(json['channel']),
        value: _text(json['value']),
        level: _text(json['contactability_level'], 'C0'),
        canAutoContact: _bool(json['can_auto_contact']),
        last4:
            json['value_last4'] == null ? null : _text(json['value_last4']),
      );
}

class NexusPreparedContact {
  const NexusPreparedContact({
    required this.fabricId,
    required this.policy,
    required this.contacts,
    this.actorName,
    this.productName,
    this.sourceUrl,
    this.note,
  });

  final String fabricId;
  final NexusContactPolicy policy;
  final List<NexusContactItem> contacts;
  final String? actorName;
  final String? productName;
  final String? sourceUrl;
  final String? note;

  factory NexusPreparedContact.fromJson(Map<String, dynamic> json) =>
      NexusPreparedContact(
        fabricId: _text(json['fabric_id']),
        policy: NexusContactPolicy.fromJson(_map(json['contact_policy'])),
        contacts: _list(json['contacts'])
            .map((value) => NexusContactItem.fromJson(_map(value)))
            .where((item) => item.value.trim().isNotEmpty)
            .toList(growable: false),
        actorName:
            json['actor_name'] == null ? null : _text(json['actor_name']),
        productName:
            json['product_name'] == null ? null : _text(json['product_name']),
        sourceUrl:
            json['source_url'] == null ? null : _text(json['source_url']),
        note: json['note'] == null ? null : _text(json['note']),
      );
}

class NexusSharedSignal {
  const NexusSharedSignal({
    required this.intent,
    required this.actorType,
    required this.contactability,
    required this.confidence,
    this.productName,
    this.category,
    this.city,
  });

  final String intent;
  final String actorType;
  final String contactability;
  final double confidence;
  final String? productName;
  final String? category;
  final String? city;

  factory NexusSharedSignal.fromJson(Map<String, dynamic> json) =>
      NexusSharedSignal(
        intent: _text(json['intent'], 'UNKNOWN'),
        actorType: _text(json['actor_type'], 'unknown'),
        contactability: _text(json['contactability_level'], 'C0'),
        confidence: _number(json['confidence']),
        productName:
            json['product_name'] == null ? null : _text(json['product_name']),
        category: json['category'] == null ? null : _text(json['category']),
        city: json['city'] == null ? null : _text(json['city']),
      );
}

class LiveNexusService {
  LiveNexusService(this.client);

  final SupabaseClient client;

  static const String _agenticFunction = 'waouh-studio-e2e-v21465';

  Future<Map<String, dynamic>> _invoke(
    String action, [
    Map<String, dynamic> payload = const {},
  ]) async {
    if (client.auth.currentUser == null) {
      throw const NexusApiException(
        'Connectez-vous pour utiliser WAOUH NEXUS.',
      );
    }
    final response = await client.functions.invoke(
      _agenticFunction,
      body: <String, dynamic>{'action': action, 'payload': payload},
    );
    final envelope = _map(response.data);
    if (envelope['ok'] != true) {
      final error = _map(envelope['error']);
      throw NexusApiException(
        _text(
          error['message'] ?? error['code'],
          'Le service NEXUS est indisponible.',
        ),
      );
    }
    return _map(envelope['data']);
  }

  Future<String> identifyVisual({
    required String imageUrl,
    String? hint,
  }) async {
    final data = await _invoke('nexus.identify_visual', {
      'image_url': imageUrl,
      if (hint != null && hint.trim().isNotEmpty) 'hint': hint.trim(),
    });
    final query = _text(data['query']).trim();
    if (query.isEmpty) {
      throw const NexusApiException(
        'WAOUH Vision n’a pas pu identifier ce produit.',
      );
    }
    return query;
  }

  Future<String> lookupBarcode(String code) async {
    final normalized = code.trim();
    if (normalized.isEmpty) {
      throw const NexusApiException('Code-barres vide.');
    }
    final data = await _invoke('nexus.barcode_lookup', {'code': normalized});
    final query = _text(data['query']).trim();
    if (query.isEmpty) {
      throw const NexusApiException(
        'Produit non identifié à partir de ce code.',
      );
    }
    return query;
  }

  Future<Map<String, dynamic>> createBuyerAutopilot({
    required String goal,
    String? city,
    double? budgetMax,
  }) =>
      _invoke('nexus.autopilot.create', {
        'mode': 'buyer',
        'goal': goal.trim(),
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        if (budgetMax != null) 'budget_max': budgetMax,
      });

  Future<Map<String, dynamic>> createSellerAutopilot({
    required String articleId,
    required String goal,
    double? minPrice,
    double maxDiscountPercent = 15,
    List<String> deliveryZones = const [],
  }) =>
      _invoke('nexus.autopilot.create', {
        'mode': 'seller',
        'article_id': articleId,
        'goal': goal.trim(),
        if (minPrice != null) 'min_price_amount': minPrice,
        'max_discount_percent': maxDiscountPercent,
        'delivery_zones': deliveryZones,
      });

  Future<Map<String, dynamic>> submitScout({
    required String title,
    double? observedPrice,
    String? city,
    String? placeName,
    String? gtin,
    String sourceType = 'field',
    String availability = 'available',
    String? note,
    List<String> photoUrls = const [],
  }) =>
      _invoke('nexus.scout.submit', {
        'title': title.trim(),
        if (observedPrice != null) 'observed_price': observedPrice,
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        if (placeName != null && placeName.trim().isNotEmpty)
          'place_name': placeName.trim(),
        if (gtin != null && gtin.trim().isNotEmpty) 'gtin': gtin.trim(),
        'source_type': sourceType,
        'availability': availability,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        'photo_urls': photoUrls,
      });

  Future<NexusDiscoveryResponse> search({
    required String query,
    required bool findSellers,
    bool smartMode = false,
    String? city,
    double? budgetMax,
    bool refreshExternal = true,
    int limit = 24,
  }) async {
    final data = await _invoke('nexus.global_discovery', {
      'query': query.trim(),
      'mode': smartMode
          ? 'auto'
          : (findSellers ? 'find_sellers' : 'find_buyers'),
      'smart': true,
      if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
      if (budgetMax != null && (smartMode || findSellers))
        'budget_max': budgetMax,
      'limit': limit,
      'refresh_external': refreshExternal,
    });
    return NexusDiscoveryResponse.fromJson(data);
  }

  Future<List<NexusSourceInfo>> sources() async {
    final data = await _invoke('nexus.sources');
    return _list(data['registry'])
        .map((value) => NexusSourceInfo.fromJson(_map(value)))
        .where((item) => item.key.isNotEmpty)
        .toList(growable: false);
  }

  Future<NexusSharedSignal> ingestShared({
    String? text,
    String? sourceUrl,
    String? imageUrl,
    String originSurface = 'whatsapp',
    bool b2b = false,
  }) async {
    final data = await _invoke('nexus.signal.ingest', {
      'source_key': b2b ? 'b2b_rfq' : 'share_to_waouh',
      if (text != null && text.trim().isNotEmpty) 'raw_text': text.trim(),
      if (sourceUrl != null && sourceUrl.trim().isNotEmpty)
        'source_url': sourceUrl.trim(),
      if (imageUrl != null && imageUrl.trim().isNotEmpty)
        'image_url': imageUrl.trim(),
      'origin_surface': originSurface,
    });
    return NexusSharedSignal.fromJson(_map(data['signal']));
  }

  Future<NexusPreparedContact> prepareContact(String fabricId) async {
    final data = await _invoke('nexus.contact.prepare', {
      'fabric_id': fabricId,
    });
    return NexusPreparedContact.fromJson(data);
  }

  Future<Map<String, dynamic>> sendContact({
    required String fabricId,
    required String message,
  }) =>
      _invoke('nexus.contact.send', {
        'fabric_id': fabricId,
        'message': message.trim(),
        'confirmed': true,
      });

  Future<String> uploadSharedImage(XFile file) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const NexusApiException(
        'Connectez-vous pour analyser une image.',
      );
    }
    final Uint8List bytes = await file.readAsBytes();
    if (bytes.isEmpty) {
      throw const NexusApiException('Image vide ou illisible.');
    }
    final extension = file.name.contains('.')
        ? file.name.split('.').last.toLowerCase()
        : 'jpg';
    final path =
        'nexus/${user.id}/shared/${DateTime.now().microsecondsSinceEpoch}.$extension';
    await client.storage.from('waouh-uploads').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: file.mimeType ?? 'image/jpeg',
            upsert: false,
          ),
        );
    return client.storage.from('waouh-uploads').getPublicUrl(path);
  }
}
