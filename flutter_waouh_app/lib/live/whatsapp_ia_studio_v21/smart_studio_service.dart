import 'dart:convert';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'smart_agent_catalog.dart';
import 'smart_document_picker.dart';
import 'studio_compat_service.dart';

class SmartStudioProduct {
  const SmartStudioProduct({
    required this.name,
    this.description,
    this.priceFcfa,
    this.id,
    this.kind = 'product',
    this.catalogTitle,
    this.category,
    this.duration,
    this.audience,
    this.startDate,
    this.endDate,
    this.format,
    this.level,
    this.unit,
  });

  final String? id;
  final String name;
  final String? description;
  final int? priceFcfa;
  final String kind;
  final String? catalogTitle;
  final String? category;
  final String? duration;
  final String? audience;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? format;
  final String? level;
  final String? unit;
}

class SmartImportedCatalogItem {
  const SmartImportedCatalogItem({
    required this.name,
    required this.kind,
    this.description,
    this.priceFcfa,
    this.quantity = 0,
    this.catalogTitle,
    this.category,
    this.duration,
    this.audience,
    this.startDate,
    this.endDate,
    this.format,
    this.level,
    this.unit,
  });

  final String name;
  final String kind;
  final String? description;
  final int? priceFcfa;
  final int quantity;
  final String? catalogTitle;
  final String? category;
  final String? duration;
  final String? audience;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? format;
  final String? level;
  final String? unit;
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
    this.photoUrl,
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
  final String? photoUrl;

  factory SmartPartnerProduct.fromResource(
    StudioPartnerProduct resource,
  ) {
    return SmartPartnerProduct(
      id: resource.id,
      name: resource.name,
      businessId: resource.businessId,
      available: resource.available,
      description: resource.description,
      priceMin: resource.priceMin,
      priceMax: resource.priceMax,
      unit: resource.unit,
      category: resource.category,
      businessName: resource.businessName,
      photoUrl: resource.photoUrl,
    );
  }
}

class SmartSessionStatus {
  const SmartSessionStatus({
    required this.status,
    this.error,
  });

  final String status;
  final String? error;

  bool get connected {
    return <String>{
      'connected',
      'working',
      'ready',
    }.contains(status);
  }
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
    required this.selectedDataTypes,
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
  final List<SmartPickedDocument> documents;
  final String knowledge;
  final String knowledgeUrl;
  final String websiteUrl;
  final bool crawlWebsite;
  final String activityDescription;
  final Set<String> selectedDataTypes;
}

class SmartStudioService {
  SmartStudioService({
    SupabaseClient? client,
  })  : client = client ?? Supabase.instance.client,
        api = WhatsAppIaStudioV20Service(
          client: client ?? Supabase.instance.client,
        );

  final SupabaseClient client;
  final WhatsAppIaStudioV20Service api;

  Future<String> requestPairCode({
    required String sessionName,
    required String phoneNumber,
  }) {
    final digits = phoneNumber.replaceAll(
      RegExp(r'[^\d]'),
      '',
    );

    if (!RegExp(r'^[1-9]\d{6,14}$').hasMatch(digits)) {
      throw StateError(
        'INVALID_PHONE: choisissez le pays puis vérifiez le numéro WhatsApp.',
      );
    }

    return api.requestPairCode(
      sessionName: sessionName,
      phoneNumber: digits,
    );
  }

  Future<SmartSessionStatus> checkSessionStatus(
    String sessionName,
  ) async {
    final status = await api.getSessionStatus(
      sessionName,
    );

    return SmartSessionStatus(status: status);
  }

  Future<List<SmartPartnerProduct>> loadPartnerProducts() async {
    final resources = await api.loadPartnerProducts();

    return resources.map(SmartPartnerProduct.fromResource).toList();
  }

  Future<List<SmartStudioProduct>> parseCatalogText(
    String text,
  ) async {
    api.requireUser();

    final value = text.trim();
    if (value.isEmpty) {
      throw StateError(
        'Collez d’abord le catalogue à analyser.',
      );
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
            kind: '${map['kind'] ?? 'product'}',
            catalogTitle: map['catalog_title']?.toString(),
            category: map['category']?.toString(),
            duration: map['duration']?.toString(),
            audience: map['audience']?.toString(),
            startDate: _toDate(map['start_date']),
            endDate: _toDate(map['end_date']),
            format: map['format']?.toString(),
            level: map['level']?.toString(),
            unit: map['unit']?.toString(),
          );
        })
        .where((item) => item.name.isNotEmpty)
        .toList();
  }

  Future<List<SmartImportedCatalogItem>> parseCatalogImport({
    required String kind,
    String? text,
    Uint8List? bytes,
    String? filename,
    String? contentType,
  }) async {
    api.requireUser();

    final value = text?.trim() ?? '';
    final hasFile = bytes != null && bytes.isNotEmpty;

    if (value.isEmpty && !hasFile) {
      throw StateError(
        'Ajoutez un texte, une photo ou un fichier de catalogue.',
      );
    }

    final body = <String, dynamic>{
      'kind': kind,
      if (value.isNotEmpty) ...<String, dynamic>{
        'mode': 'text',
        'text': value,
      } else ...<String, dynamic>{
        'mode': contentType?.startsWith('image/') == true ? 'image' : 'file',
        'file_base64': base64Encode(bytes!),
        'file_mime': contentType ?? 'application/octet-stream',
        'filename': filename ?? 'catalogue',
        if (contentType?.startsWith('image/') == true) ...<String, dynamic>{
          'image_base64': base64Encode(bytes!),
          'image_mime': contentType,
        },
      },
    };

    final response = await client.functions.invoke(
      'waouh-agent-parse-catalog',
      body: body,
    );

    final data = _asMap(response.data);
    if (data['error'] != null || data['ok'] == false) {
      throw StateError('${data['error'] ?? 'Import intelligent impossible.'}');
    }

    final raw = data['items'] ?? data['products'];
    if (raw is! List) return const <SmartImportedCatalogItem>[];

    return raw
        .whereType<Map>()
        .map((item) {
          final map = Map<String, dynamic>.from(item);
          return SmartImportedCatalogItem(
            name: '${map['name'] ?? ''}'.trim(),
            kind: '${map['kind'] ?? kind}',
            description: map['description']?.toString(),
            priceFcfa: _toInt(map['price_fcfa']),
            quantity: _toInt(map['quantity']) ?? 0,
            catalogTitle: map['catalog_title']?.toString(),
            category: map['category']?.toString(),
            duration: map['duration']?.toString(),
            audience: map['audience']?.toString(),
            startDate: _toDate(map['start_date']),
            endDate: _toDate(map['end_date']),
            format: map['format']?.toString(),
            level: map['level']?.toString(),
            unit: map['unit']?.toString(),
          );
        })
        .where((item) => item.name.isNotEmpty)
        .toList();
  }

  Future<StudioAgent> createSmartAgent(
    SmartAgentCreationInput input,
  ) async {
    final user = api.requireUser();
    final source = SmartAgentCatalog.source(
      input.sourceKind,
    );

    final capabilities = <String, dynamic>{
      ...input.capabilities,
      'studio_source_mode': input.sourceKind.name,
      'sector_template': input.template.id,
      'data_prompts': input.template.dataPrompts,
      'activity_description': input.activityDescription.trim(),
      'studio_data_types': input.selectedDataTypes.toList()..sort(),
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

    StudioAgent? agent;

    try {
      final created = await api.createAgentRecord(row);
      agent = StudioAgent.fromMap(created);

      for (final product in input.manualProducts) {
        await api.upsertCatalogItem(
          agentId: agent.id,
          name: product.name,
          description: product.description,
          priceFcfa: product.priceFcfa,
          kind: product.kind,
          catalogTitle: product.catalogTitle,
          category: product.category,
          duration: product.duration,
          audience: product.audience,
          startDate: product.startDate,
          endDate: product.endDate,
          format: product.format,
          level: product.level,
          unit: product.unit,
        );
      }

      await api.linkPartnerProducts(
        agentId: agent.id,
        productIds: input.partnerProductIds,
      );

      final combinedText = <String>[
        input.template.starterKnowledge,
        input.activityDescription.trim(),
        input.knowledge.trim(),
      ].where((item) => item.isNotEmpty).join(
            '\n\n---\n\n',
          );

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
        await api.uploadDocument(
          agentId: agent.id,
          bytes: document.bytes,
          filename: document.name,
          contentType: document.contentType,
        );
      }

      return agent;
    } catch (_) {
      if (agent != null && agent.id.isNotEmpty) {
        try {
          await api.deleteAgent(agent.id);
        } catch (_) {
          // La première erreur reste prioritaire.
        }
      }

      rethrow;
    }
  }

  Future<void> _ingest({
    required String agentId,
    required Map<String, dynamic> body,
  }) async {
    api.requireUser();

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

  static DateTime? _toDate(dynamic value) {
    final text = '${value ?? ''}'.trim();
    if (text.isEmpty) return null;
    return DateTime.tryParse(text);
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
