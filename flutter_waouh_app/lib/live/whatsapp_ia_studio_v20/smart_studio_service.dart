import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'studio_compat_service.dart';
import 'smart_agent_catalog.dart';
import 'smart_document_picker.dart';

class SmartStudioProduct {
  const SmartStudioProduct({
    required this.name,
    this.description,
    this.priceFcfa,
    this.id,
  });

  final String? id;
  final String name;
  final String? description;
  final int? priceFcfa;

  SmartStudioProduct copyWith({
    String? name,
    String? description,
    int? priceFcfa,
  }) {
    return SmartStudioProduct(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      priceFcfa: priceFcfa ?? this.priceFcfa,
    );
  }
}

class SmartPartnerProduct {
  const SmartPartnerProduct({
    required this.id,
    required this.name,
    required this.businessId,
    required this.available,
    this.description,
    this.priceMin,
    this.priceMax,
    this.unit,
    this.category,
    this.businessName,
  });

  final String id;
  final String name;
  final String businessId;
  final bool available;
  final String? description;
  final int? priceMin;
  final int? priceMax;
  final String? unit;
  final String? category;
  final String? businessName;

  factory SmartPartnerProduct.fromMap(
    Map<String, dynamic> map, {
    String? businessName,
  }) {
    return SmartPartnerProduct(
      id: '${map['id'] ?? ''}',
      name: '${map['nom'] ?? map['name'] ?? ''}',
      businessId: '${map['business_id'] ?? ''}',
      available: map['disponible'] != false,
      description: map['description']?.toString(),
      priceMin: _toInt(map['prix_min']),
      priceMax: _toInt(map['prix_max']),
      unit: map['unite']?.toString(),
      category: map['categorie']?.toString(),
      businessName: businessName,
    );
  }

  static int? _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse('$value');
  }
}

class SmartUploadedDocument {
  const SmartUploadedDocument({
    required this.name,
    required this.storagePath,
    required this.size,
  });

  final String name;
  final String storagePath;
  final int size;
}

class SmartSessionStatus {
  const SmartSessionStatus({
    required this.status,
    this.error,
  });

  final String status;
  final String? error;

  bool get connected => status == 'connected';
}

class SmartAgentCreationInput {
  const SmartAgentCreationInput({
    required this.name,
    required this.personaName,
    required this.tone,
    required this.sourceKind,
    required this.template,
    required this.capabilities,
    required this.emojis,
    required this.manualProducts,
    required this.partnerProductIds,
    required this.documents,
    required this.knowledge,
    required this.knowledgeUrl,
    required this.websiteUrl,
    required this.crawlWebsite,
    required this.activityDescription,
  });

  final String name;
  final String personaName;
  final String tone;
  final SmartAgentSourceKind sourceKind;
  final SmartSectorTemplate template;
  final Map<String, bool> capabilities;
  final bool emojis;
  final List<SmartStudioProduct> manualProducts;
  final Set<String> partnerProductIds;
  final List<SmartUploadedDocument> documents;
  final String knowledge;
  final String knowledgeUrl;
  final String websiteUrl;
  final bool crawlWebsite;
  final String activityDescription;
}

class SmartStudioService {
  SmartStudioService({
    SupabaseClient? client,
  }) : client = client ?? Supabase.instance.client;

  final SupabaseClient client;

  User _requireUser() {
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Vous devez être connecté.');
    }
    return user;
  }

  Future<String> requestPairCode({
    required String sessionName,
    required String phoneNumber,
  }) async {
    final digits = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    if (digits.length < 8 || digits.length > 15) {
      throw StateError(
        'Utilisez le format international, par exemple 22997000000.',
      );
    }

    final response = await client.functions.invoke(
      'waha-connect',
      body: <String, dynamic>{
        'action': 'pair-code',
        'sessionName': sessionName,
        'phoneNumber': digits,
      },
    );

    final data = _asMap(response.data);
    if (data['error'] != null) {
      throw StateError('${data['error']}');
    }

    final code = '${data['code'] ?? data['code_raw'] ?? ''}'.trim();
    if (code.isEmpty) {
      throw StateError('WAHA n’a retourné aucun code de connexion.');
    }
    return code;
  }

  Future<SmartSessionStatus> checkSessionStatus(
    String sessionName,
  ) async {
    final response = await client.functions.invoke(
      'waha-connect',
      body: <String, dynamic>{
        'action': 'status',
        'sessionName': sessionName,
      },
    );

    final data = _asMap(response.data);
    return SmartSessionStatus(
      status: '${data['status'] ?? 'pending'}'.toLowerCase(),
      error: data['error']?.toString(),
    );
  }

  Future<List<SmartPartnerProduct>> loadPartnerProducts() async {
    try {
      final businessRows = await client
          .from('waouh_partner_businesses')
          .select('id, nom_entreprise')
          .order('nom_entreprise');

      final names = <String, String>{};
      for (final item in businessRows as List<dynamic>) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        names['${map['id'] ?? ''}'] = '${map['nom_entreprise'] ?? ''}';
      }

      final productRows = await client
          .from('waouh_partner_products')
          .select(
            'id, nom, description, prix_min, prix_max, unite, '
            'categorie, disponible, business_id',
          )
          .order('nom');

      return (productRows as List<dynamic>)
          .whereType<Map>()
          .map((item) {
            final map = Map<String, dynamic>.from(item);
            return SmartPartnerProduct.fromMap(
              map,
              businessName: names['${map['business_id'] ?? ''}'],
            );
          })
          .where((item) => item.id.isNotEmpty && item.name.isNotEmpty)
          .toList();
    } catch (_) {
      return const <SmartPartnerProduct>[];
    }
  }

  Future<List<SmartStudioProduct>> parseCatalogText(
    String text,
  ) async {
    final value = text.trim();
    if (value.isEmpty) {
      throw StateError('Collez d’abord le catalogue à analyser.');
    }

    final response = await client.functions.invoke(
      'waouh-agent-parse-catalog',
      body: <String, dynamic>{
        'mode': 'text',
        'text': value,
      },
    );

    final data = _asMap(response.data);
    if (data['error'] != null) {
      throw StateError('${data['error']}');
    }

    final products = data['products'];
    if (products is! List) {
      return const <SmartStudioProduct>[];
    }

    return products
        .whereType<Map>()
        .map((item) {
          final map = Map<String, dynamic>.from(item);
          return SmartStudioProduct(
            name: '${map['name'] ?? ''}'.trim(),
            description: map['description']?.toString(),
            priceFcfa: _toInt(map['price_fcfa']),
          );
        })
        .where((item) => item.name.isNotEmpty)
        .toList();
  }

  Future<SmartUploadedDocument> uploadDocument(
    SmartPickedDocument document,
  ) async {
    final user = _requireUser();
    final cleanName = document.name.replaceAll(
      RegExp(r'[^A-Za-z0-9._-]+'),
      '_',
    );
    final path =
        '${user.id}/${DateTime.now().millisecondsSinceEpoch}-$cleanName';

    await client.storage.from('agent-documents').uploadBinary(
          path,
          Uint8List.fromList(document.bytes),
          fileOptions: FileOptions(
            contentType: document.contentType,
            upsert: false,
          ),
        );

    return SmartUploadedDocument(
      name: document.name,
      storagePath: path,
      size: document.size,
    );
  }

  Future<StudioAgent> createSmartAgent(
    SmartAgentCreationInput input,
  ) async {
    final user = _requireUser();
    final source = SmartAgentCatalog.source(input.sourceKind);

    final capabilities = <String, dynamic>{
      ...input.capabilities,
      'studio_source_mode': input.sourceKind.name,
      'sector_template': input.template.id,
      'data_prompts': input.template.dataPrompts,
      'activity_description': input.activityDescription.trim(),
    };

    final row = <String, dynamic>{
      'user_id': user.id,
      'name': input.name.trim(),
      'sector': input.template.id,
      'template_id': input.template.id,
      'agent_type': source.backendType,
      'website_url':
          input.websiteUrl.trim().isEmpty ? null : input.websiteUrl.trim(),
      'persona': <String, dynamic>{
        'name': input.personaName.trim(),
        'tone': input.tone.trim(),
        'emojis': input.emojis,
      },
      'capabilities': capabilities,
      'status': 'testing',
    };

    final created =
        await client.from('waouh_ai_agents').insert(row).select().single();

    final agent = StudioAgent.fromMap(
      Map<String, dynamic>.from(created),
    );

    await _saveManualProducts(
      agentId: agent.id,
      userId: user.id,
      products: input.manualProducts,
    );

    await _linkPartnerProducts(
      agentId: agent.id,
      userId: user.id,
      productIds: input.partnerProductIds,
    );

    final combinedText = <String>[
      input.template.starterKnowledge,
      input.activityDescription.trim(),
      input.knowledge.trim(),
    ].where((item) => item.isNotEmpty).join('\n\n---\n\n');

    if (combinedText.isNotEmpty) {
      await _ingest(
        agentId: agent.id,
        body: <String, dynamic>{
          'source_type': 'text',
          'text': combinedText,
        },
      );
    }

    if (input.knowledgeUrl.trim().isNotEmpty) {
      await _ingest(
        agentId: agent.id,
        body: <String, dynamic>{
          'source_type': 'url',
          'url': input.knowledgeUrl.trim(),
        },
      );
    }

    if (input.websiteUrl.trim().isNotEmpty) {
      await _ingest(
        agentId: agent.id,
        body: <String, dynamic>{
          'source_type': 'website',
          'url': input.websiteUrl.trim(),
          'crawl': input.crawlWebsite,
        },
      );
    }

    for (final document in input.documents) {
      await _ingest(
        agentId: agent.id,
        body: <String, dynamic>{
          'source_type': 'doc',
          'storage_path': document.storagePath,
          'filename': document.name,
        },
      );
    }

    return agent;
  }

  Future<void> _saveManualProducts({
    required String agentId,
    required String userId,
    required List<SmartStudioProduct> products,
  }) async {
    final valid =
        products.where((item) => item.name.trim().isNotEmpty).toList();

    if (valid.isEmpty) return;

    await client.from('waouh_ai_agent_products').insert(
          List<Map<String, dynamic>>.generate(
            valid.length,
            (index) {
              final item = valid[index];
              return <String, dynamic>{
                'agent_id': agentId,
                'user_id': userId,
                'name': item.name.trim(),
                'price_fcfa': item.priceFcfa,
                'description': item.description?.trim().isEmpty == true
                    ? null
                    : item.description?.trim(),
                'position': index,
              };
            },
          ),
        );
  }

  Future<void> _linkPartnerProducts({
    required String agentId,
    required String userId,
    required Set<String> productIds,
  }) async {
    if (productIds.isEmpty) return;

    await client.from('waouh_ai_agent_partner_products').insert(
          productIds
              .map(
                (id) => <String, dynamic>{
                  'agent_id': agentId,
                  'product_id': id,
                  'user_id': userId,
                },
              )
              .toList(),
        );
  }

  Future<void> _ingest({
    required String agentId,
    required Map<String, dynamic> body,
  }) async {
    final response = await client.functions.invoke(
      'waouh-agent-ingest',
      body: <String, dynamic>{
        'agent_id': agentId,
        ...body,
      },
    );

    final data = _asMap(response.data);
    if (data['error'] != null) {
      throw StateError('${data['error']}');
    }
  }

  static int? _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse('$value');
  }

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return <String, dynamic>{};
  }
}
