import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

class StudioAuthenticationRequiredException implements Exception {
  const StudioAuthenticationRequiredException([
    this.message = 'Authentification requise.',
  ]);

  final String message;

  @override
  String toString() => message;
}

class StudioSession {
  const StudioSession({
    required this.id,
    required this.sessionName,
    required this.status,
    this.displayName,
    this.phoneNumber,
    this.qrCode,
    this.lastActivity,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String sessionName;
  final String status;
  final String? displayName;
  final String? phoneNumber;
  final String? qrCode;
  final DateTime? lastActivity;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isConnected {
    final value = status.toLowerCase();
    return value == 'connected' || value == 'working' || value == 'ready';
  }

  String get title {
    final value = displayName?.trim() ?? '';
    return value.isEmpty ? sessionName : value;
  }

  factory StudioSession.fromMap(Map<String, dynamic> map) {
    final metadata = _map(map['metadata']);
    return StudioSession(
      id: '${map['id'] ?? ''}',
      sessionName: '${map['session_name'] ?? map['sessionName'] ?? ''}',
      status: '${map['status'] ?? 'disconnected'}',
      displayName: (map['display_name'] ??
              map['session_label'] ??
              map['name'] ??
              metadata['display_name'])
          ?.toString(),
      phoneNumber: (map['phone_number'] ?? map['phoneNumber'])?.toString(),
      qrCode: (map['qr_code'] ?? map['qrCode'])?.toString(),
      lastActivity: _date(
        map['last_activity'] ?? map['lastActivity'],
      ),
      createdAt: _date(
        map['created_at'] ?? map['createdAt'],
      ),
      updatedAt: _date(
        map['updated_at'] ?? map['updatedAt'],
      ),
    );
  }
}

class StudioAgent {
  const StudioAgent({
    required this.id,
    required this.name,
    required this.sector,
    required this.agentType,
    required this.status,
    required this.persona,
    required this.capabilities,
    required this.stats,
    this.sessionName,
    this.websiteUrl,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String sector;
  final String agentType;
  final String status;
  final String? sessionName;
  final String? websiteUrl;
  final Map<String, dynamic> persona;
  final Map<String, dynamic> capabilities;
  final Map<String, dynamic> stats;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == 'active';

  String get personaName {
    final value = '${persona['name'] ?? ''}'.trim();
    return value.isEmpty ? 'Assistant' : value;
  }

  String get tone => '${persona['tone'] ?? ''}'.trim();

  factory StudioAgent.fromMap(Map<String, dynamic> map) {
    return StudioAgent(
      id: '${map['id'] ?? ''}',
      name: '${map['name'] ?? 'Agent IA'}',
      sector: '${map['sector'] ?? 'other'}',
      agentType: '${map['agent_type'] ?? 'commerce'}',
      status: '${map['status'] ?? 'draft'}',
      sessionName: map['waha_session_name']?.toString(),
      websiteUrl: map['website_url']?.toString(),
      persona: _map(map['persona']),
      capabilities: _map(map['capabilities']),
      stats: _map(map['stats']),
      createdAt: _date(map['created_at']),
      updatedAt: _date(map['updated_at']),
    );
  }
}

class StudioAgentShare {
  const StudioAgentShare({
    required this.slug,
    required this.publicUrl,
    required this.qrUrl,
    required this.enabled,
    required this.views,
    required this.conversations,
    required this.messages,
  });

  final String slug;
  final String publicUrl;
  final String qrUrl;
  final bool enabled;
  final int views;
  final int conversations;
  final int messages;

  factory StudioAgentShare.fromMap(Map<String, dynamic> map) {
    return StudioAgentShare(
      slug: '${map['slug'] ?? ''}',
      publicUrl: '${map['public_url'] ?? ''}',
      qrUrl: '${map['qr_url'] ?? ''}',
      enabled: map['enabled'] != false,
      views: int.tryParse('${map['views'] ?? 0}') ?? 0,
      conversations: int.tryParse('${map['conversations'] ?? 0}') ?? 0,
      messages: int.tryParse('${map['messages'] ?? 0}') ?? 0,
    );
  }
}

class StudioCatalogMedia {
  const StudioCatalogMedia({
    required this.type,
    required this.filename,
    required this.mimeType,
    this.storagePath,
    this.url,
    this.caption,
    this.dataBase64,
  });

  final String type;
  final String filename;
  final String mimeType;
  final String? storagePath;
  final String? url;
  final String? caption;
  final String? dataBase64;

  bool get isVideo => type == 'video' || mimeType.startsWith('video/');
  bool get isImage => type == 'image' || mimeType.startsWith('image/');
  bool get isAudio => type == 'audio' || mimeType.startsWith('audio/');
  bool get isDocument => !isVideo && !isImage && !isAudio;

  factory StudioCatalogMedia.fromMap(Map<String, dynamic> map) {
    final mime = '${map['mime_type'] ?? map['mimetype'] ?? ''}';
    return StudioCatalogMedia(
      type: '${map['type'] ?? (mime.startsWith('video/') ? 'video' : 'image')}',
      filename: '${map['filename'] ?? map['name'] ?? 'media'}',
      mimeType: mime.isEmpty ? 'image/jpeg' : mime,
      storagePath: map['storage_path']?.toString(),
      url: (map['url'] ?? map['signed_url'])?.toString(),
      caption: map['caption']?.toString(),
      dataBase64: (map['data'] ?? map['base64'])?.toString(),
    );
  }

  Map<String, dynamic> toApi() => <String, dynamic>{
        'type': type,
        'filename': filename,
        'mime_type': mimeType,
        if (storagePath?.isNotEmpty == true) 'storage_path': storagePath,
        if (url?.isNotEmpty == true) 'url': url,
        if (caption?.isNotEmpty == true) 'caption': caption,
        if (dataBase64?.isNotEmpty == true) 'data': dataBase64,
      };
}

class StudioChatMessage {
  const StudioChatMessage({
    required this.role,
    required this.content,
    this.attachments = const <StudioCatalogMedia>[],
  });

  final String role;
  final String content;
  final List<StudioCatalogMedia> attachments;

  bool get isUser => role == 'user';

  Map<String, dynamic> toApi() {
    final parts = <Map<String, dynamic>>[
      if (content.trim().isNotEmpty)
        <String, dynamic>{
          'type': 'text',
          'text': content.trim(),
        },
      ...attachments
          .where((item) => item.dataBase64?.isNotEmpty == true)
          .map((item) => <String, dynamic>{
                'type': 'file_data',
                'mime_type': item.mimeType,
                'data': item.dataBase64,
              }),
    ];
    return <String, dynamic>{
      'role': role,
      'content': parts.isEmpty ? content : parts,
    };
  }
}

class StudioAgentReply {
  const StudioAgentReply({
    required this.text,
    this.attachments = const <StudioCatalogMedia>[],
  });

  final String text;
  final List<StudioCatalogMedia> attachments;
}

class StudioCatalogItem {
  const StudioCatalogItem({
    required this.id,
    required this.agentId,
    required this.name,
    required this.quantity,
    required this.active,
    this.description,
    this.priceFcfa,
    this.photoUrl,
    this.sku,
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
    this.source = 'manual',
    this.partnerProductId,
    this.media = const <StudioCatalogMedia>[],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String agentId;
  final String name;
  final String? description;
  final int? priceFcfa;
  final int quantity;
  final String? photoUrl;
  final String? sku;
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
  final String source;
  final String? partnerProductId;
  final List<StudioCatalogMedia> media;
  final bool active;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isProduct => kind == 'product';
  bool get isTraining => kind == 'training';
  bool get isPresentation => kind == 'presentation';
  bool get isPartner => source == 'partner';
  String get displayPhotoUrl {
    final firstImage =
        media.where((item) => item.isImage && item.url?.isNotEmpty == true);
    if (firstImage.isNotEmpty) return firstImage.first.url!;
    return photoUrl ?? '';
  }

  factory StudioCatalogItem.fromMap(Map<String, dynamic> map) {
    final rawMedia = map['media'];
    final media = rawMedia is List
        ? rawMedia
            .whereType<Map>()
            .map((item) => StudioCatalogMedia.fromMap(
                  Map<String, dynamic>.from(item),
                ))
            .toList()
        : <StudioCatalogMedia>[];
    final legacyPhoto = (map['photo_url'] ?? map['image_url'])?.toString();
    if (media.isEmpty && legacyPhoto?.isNotEmpty == true) {
      media.add(
        StudioCatalogMedia(
          type: 'image',
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          url: legacyPhoto,
        ),
      );
    }

    return StudioCatalogItem(
      id: '${map['id'] ?? ''}',
      agentId: '${map['agent_id'] ?? ''}',
      name: '${map['name'] ?? map['nom'] ?? ''}',
      description: map['description']?.toString(),
      priceFcfa: _int(map['price_fcfa'] ?? map['prix'] ?? map['prix_min']),
      quantity: _int(map['quantity'] ?? map['quantite']) ?? 0,
      photoUrl: legacyPhoto,
      sku: map['sku']?.toString(),
      kind: '${map['kind'] ?? map['item_kind'] ?? 'product'}',
      catalogTitle: (map['catalog_title'] ?? map['catalogue'])?.toString(),
      category: (map['category'] ?? map['categorie'])?.toString(),
      duration: map['duration']?.toString(),
      audience: map['audience']?.toString(),
      startDate: _date(map['start_date'] ?? map['startDate']),
      endDate: _date(map['end_date'] ?? map['endDate']),
      format: map['format']?.toString(),
      level: map['level']?.toString(),
      unit: map['unit']?.toString(),
      source: '${map['source'] ?? 'manual'}',
      partnerProductId: map['partner_product_id']?.toString(),
      media: media,
      active: map['active'] != false && map['disponible'] != false,
      createdAt: _date(map['created_at']),
      updatedAt: _date(map['updated_at']),
    );
  }
}

class StudioDocumentItem {
  const StudioDocumentItem({
    required this.id,
    required this.agentId,
    required this.name,
    required this.storagePath,
    required this.sizeBytes,
    required this.status,
    this.mimeType,
    this.createdAt,
  });

  final String id;
  final String agentId;
  final String name;
  final String storagePath;
  final int sizeBytes;
  final String status;
  final String? mimeType;
  final DateTime? createdAt;

  factory StudioDocumentItem.fromMap(Map<String, dynamic> map) {
    return StudioDocumentItem(
      id: '${map['id'] ?? map['storage_path'] ?? ''}',
      agentId: '${map['agent_id'] ?? ''}',
      name: '${map['name'] ?? map['filename'] ?? 'Document'}',
      storagePath: '${map['storage_path'] ?? ''}',
      sizeBytes: _int(map['size_bytes'] ?? map['size']) ?? 0,
      status: '${map['status'] ?? 'ready'}',
      mimeType: (map['mime_type'] ?? map['content_type'])?.toString(),
      createdAt: _date(map['created_at']),
    );
  }
}

class StudioHistoryItem {
  const StudioHistoryItem({
    required this.id,
    required this.action,
    required this.message,
    required this.createdAt,
    this.agentId,
    this.sessionName,
    this.kind,
  });

  final String id;
  final String action;
  final String message;
  final DateTime createdAt;
  final String? agentId;
  final String? sessionName;
  final String? kind;

  factory StudioHistoryItem.fromMap(Map<String, dynamic> map) {
    return StudioHistoryItem(
      id: '${map['id'] ?? ''}',
      action: '${map['action'] ?? 'activity'}',
      message: '${map['message'] ?? ''}',
      createdAt: _date(map['created_at']) ?? DateTime.now(),
      agentId: map['agent_id']?.toString(),
      sessionName: map['session_name']?.toString(),
      kind: map['kind']?.toString(),
    );
  }
}

class StudioPartnerProduct {
  const StudioPartnerProduct({
    required this.id,
    required this.name,
    required this.businessId,
    required this.available,
    this.businessName,
    this.description,
    this.priceMin,
    this.priceMax,
    this.unit,
    this.category,
    this.photoUrl,
    this.quantity,
  });

  final String id;
  final String name;
  final String businessId;
  final bool available;
  final String? businessName;
  final String? description;
  final int? priceMin;
  final int? priceMax;
  final String? unit;
  final String? category;
  final String? photoUrl;
  final int? quantity;

  factory StudioPartnerProduct.fromMap(
    Map<String, dynamic> map,
  ) {
    return StudioPartnerProduct(
      id: '${map['id'] ?? ''}',
      name: '${map['nom'] ?? map['name'] ?? ''}',
      businessId: '${map['business_id'] ?? ''}',
      available: map['disponible'] != false,
      businessName: (map['business_name'] ?? map['nom_entreprise'])?.toString(),
      description: map['description']?.toString(),
      priceMin: _int(map['prix_min']),
      priceMax: _int(map['prix_max']),
      unit: map['unite']?.toString(),
      category: map['categorie']?.toString(),
      photoUrl: _firstTextFromList(
            map['photos'],
          ) ??
          (map['photo_url'] ?? map['image_url'])?.toString(),
      quantity: _int(map['quantity'] ?? map['quantite']),
    );
  }
}

class WhatsAppIaStudioV20Service {
  WhatsAppIaStudioV20Service({
    SupabaseClient? client,
  }) : client = client ?? Supabase.instance.client;

  final SupabaseClient client;

  bool _pairCodeBackendV21462Verified = false;

  bool get isAuthenticated =>
      client.auth.currentSession != null && client.auth.currentUser != null;

  User? get currentUser => client.auth.currentUser;

  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  User requireUser() {
    final session = client.auth.currentSession;
    final user = client.auth.currentUser;

    if (session == null || user == null) {
      throw const StudioAuthenticationRequiredException(
        'Connectez-vous pour continuer.',
      );
    }

    return user;
  }

  static bool _isBodyConsumedError(Object error) {
    final value = '$error'.toLowerCase();

    return value.contains('body already consumed') ||
        value.contains('body is unusable') ||
        value.contains('response body already');
  }

  Future<Map<String, dynamic>> _invoke(
    String action, [
    Map<String, dynamic> payload = const <String, dynamic>{},
    Duration timeout = const Duration(seconds: 35),
  ]) async {
    requireUser();

    try {
      final response = await client.functions.invoke(
        'waouh-studio-user-api',
        body: <String, dynamic>{
          'action': action,
          ...payload,
        },
      ).timeout(
        timeout,
        onTimeout: () {
          throw TimeoutException(
            'Le service met trop de temps à répondre.',
          );
        },
      );

      final data = _map(response.data);

      if (data['success'] == false || data['error'] != null) {
        final code = '${data['code'] ?? ''}';
        if (code == 'AUTH_REQUIRED' || code == 'INVALID_TOKEN') {
          throw StudioAuthenticationRequiredException(
            '${data['message'] ?? data['error'] ?? 'Connexion requise.'}',
          );
        }

        if (code == 'FORBIDDEN') {
          throw StateError(
            '${data['message'] ?? data['error'] ?? 'Accès refusé.'}',
          );
        }

        throw StateError(
          '${data['message'] ?? data['error'] ?? 'Opération impossible.'}',
        );
      }

      return data;
    } on FunctionException catch (error) {
      if (error.status == 401) {
        throw const StudioAuthenticationRequiredException(
          'Votre session a expiré. Reconnectez-vous.',
        );
      }

      if (error.status == 403) {
        throw StateError(
          'Accès refusé à cette ressource.',
        );
      }

      final details = error.details;
      if (details is Map) {
        final data = Map<String, dynamic>.from(details);
        throw StateError(
          '${data['message'] ?? data['error'] ?? 'Service indisponible.'}',
        );
      }

      if (details is String && details.trim().isNotEmpty) {
        throw StateError(details.trim());
      }

      throw StateError(
        'Le service IA est momentanément indisponible.',
      );
    }
  }

  Future<Map<String, dynamic>> probeAuthentication() {
    return _invoke('probe');
  }

  Future<List<StudioSession>> loadSessions() async {
    final data = await _invoke('list-sessions');
    final rows = data['sessions'];

    if (rows is! List) {
      return const <StudioSession>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioSession.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<List<StudioAgent>> loadAgents() async {
    final data = await _invoke('list-agents');
    final rows = data['agents'];

    if (rows is! List) {
      return const <StudioAgent>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioAgent.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<String> createSession({
    required String sessionName,
    String? phoneNumber,
  }) async {
    try {
      final data = await _invoke(
        'create-session',
        <String, dynamic>{
          'label': sessionName.trim(),
          if (phoneNumber?.trim().isNotEmpty == true)
            'phoneNumber': phoneNumber!.trim(),
        },
        const Duration(seconds: 22),
      );

      final resolved = '${data['session_name'] ?? ''}'.trim();
      if (resolved.isEmpty) {
        throw StateError('La session n’a pas été créée.');
      }
      return resolved;
    } on TimeoutException {
      throw StateError(
        'Le serveur WhatsApp met trop de temps à répondre. '
        'La demande a été arrêtée sans bloquer l’application. '
        'Vérifiez la connexion WAHA puis réessayez.',
      );
    }
  }

  Future<void> startSession(String sessionName) async {
    await _invoke(
      'start-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    );
  }

  Future<String?> getQrCode(String sessionName) async {
    final data = await _invoke(
      'qr-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    );

    final value =
        '${data['qrCode'] ?? data['qr_code'] ?? data['qr'] ?? ''}'.trim();

    return value.isEmpty ? null : value;
  }

  Future<void> _verifyPairCodeBackendV21462() async {
    if (_pairCodeBackendV21462Verified) return;

    try {
      final response = await client.functions.invoke(
        'waouh-studio-pair-code-v21462',
        body: const <String, dynamic>{
          'action': 'public-health',
        },
      ).timeout(const Duration(seconds: 15));

      final data = _map(response.data);
      final version = '${data['version'] ?? ''}'.trim();
      final functionName = '${data['function_name'] ?? ''}'.trim();
      final endpoint = '${data['pair_code_endpoint'] ?? ''}'.trim();
      final legacyEnabled = data['legacy_pair_code_endpoint_enabled'] == true;

      if (version != '21.4.6.2' ||
          functionName != 'waouh-studio-pair-code-v21462' ||
          endpoint != '/api/{session}/auth/request-code' ||
          legacyEnabled) {
        throw StateError(
          'PAIR_BACKEND_OUTDATED: le backend dédié au code numéro '
          'n’est pas la version 21.4.6.2.',
        );
      }

      _pairCodeBackendV21462Verified = true;
    } on TimeoutException {
      throw StateError(
        'PAIR_BACKEND_TIMEOUT: impossible de vérifier le backend '
        'dédié au code numéro.',
      );
    } on FunctionException catch (error) {
      throw StateError(
        'PAIR_BACKEND_OUTDATED: la fonction dédiée au code numéro '
        'n’est pas déployée (${error.status}).',
      );
    }
  }

  Future<String> requestPairCode({
    required String sessionName,
    required String phoneNumber,
  }) async {
    requireUser();
    await _verifyPairCodeBackendV21462();

    try {
      final response = await client.functions.invoke(
        'waouh-studio-pair-code-v21462',
        body: <String, dynamic>{
          'action': 'request-code',
          'sessionName': sessionName,
          'phoneNumber': phoneNumber,
        },
      ).timeout(
        const Duration(seconds: 50),
        onTimeout: () {
          throw TimeoutException(
            'La génération du code prend trop de temps.',
          );
        },
      );

      final data = _map(response.data);
      if (data['success'] == false || data['error'] != null) {
        final code = '${data['code'] ?? 'PAIR_CODE_FAILED'}';
        final message =
            '${data['error'] ?? data['message'] ?? 'Le code de liaison n’a pas été généré.'}';
        throw StateError('$code: $message');
      }

      final value = '${data['code'] ?? ''}'.trim();
      if (value.isEmpty) {
        throw StateError(
          'PAIR_CODE_EMPTY: WAHA a répondu sans fournir de code.',
        );
      }
      return value;
    } on FunctionException catch (error) {
      final details = error.details;
      if (details is Map) {
        final data = Map<String, dynamic>.from(details);
        final code = '${data['code'] ?? 'PAIR_CODE_FAILED'}';
        final message =
            '${data['error'] ?? data['message'] ?? 'Le code de liaison n’a pas été généré.'}';
        throw StateError('$code: $message');
      }
      if (details is String && details.trim().isNotEmpty) {
        throw StateError(details.trim());
      }
      throw StateError(
        'PAIR_CODE_FAILED: le service de code numéro est indisponible.',
      );
    }
  }

  Future<String> getSessionStatus(
    String sessionName,
  ) async {
    Map<String, dynamic> data;

    try {
      data = await _invoke(
        'session-status',
        <String, dynamic>{
          'sessionName': sessionName,
        },
      );
    } catch (error) {
      if (!_isBodyConsumedError(error)) rethrow;

      await Future<void>.delayed(
        const Duration(milliseconds: 450),
      );

      data = await _invoke(
        'session-status',
        <String, dynamic>{
          'sessionName': sessionName,
        },
      );
    }

    return '${data['status'] ?? 'pending'}'.toLowerCase();
  }

  Future<Map<String, dynamic>> auditSession(
    String sessionName, {
    bool repair = true,
  }) async {
    if (repair) {
      try {
        await _invoke(
          'repair-session',
          <String, dynamic>{
            'sessionName': sessionName,
          },
        );
      } catch (error) {
        if (!_isBodyConsumedError(error)) rethrow;
      }
    }

    Map<String, dynamic> data;

    try {
      data = await _invoke(
        'audit-session',
        <String, dynamic>{
          'sessionName': sessionName,
        },
      );
    } catch (error) {
      if (!_isBodyConsumedError(error)) rethrow;

      await Future<void>.delayed(
        const Duration(milliseconds: 450),
      );

      data = await _invoke(
        'audit-session',
        <String, dynamic>{
          'sessionName': sessionName,
        },
      );
    }

    final audit = _map(data['audit']);

    if (audit.isEmpty) {
      throw StateError(
        'Le diagnostic de la ligne est indisponible.',
      );
    }

    return audit;
  }

  Future<Map<String, dynamic>> transportHealth(
    String sessionName,
  ) async {
    return await _invoke(
      'transport-health',
      <String, dynamic>{
        'sessionName': sessionName,
      },
      const Duration(seconds: 60),
    );
  }

  Future<void> repairSession(
    String sessionName,
  ) async {
    await _invoke(
      'repair-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    );
  }

  Future<void> stopSession(String sessionName) async {
    await _invoke(
      'stop-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    );
  }

  Future<void> disconnectSession(
    String sessionName,
  ) async {
    await _invoke(
      'disconnect-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    );
  }

  Future<void> deleteSession(String sessionName) async {
    await _invoke(
      'delete-session',
      <String, dynamic>{
        'sessionName': sessionName,
      },
    ).timeout(
      const Duration(seconds: 32),
      onTimeout: () {
        throw TimeoutException(
          'La suppression prend trop de temps. '
          'La ligne reste visible pour permettre une nouvelle tentative.',
        );
      },
    );
  }

  Future<void> renameSession({
    required String sessionName,
    required String displayName,
  }) async {
    await _invoke(
      'rename-session',
      <String, dynamic>{
        'sessionName': sessionName,
        'displayName': displayName.trim(),
      },
    );
  }

  Future<Map<String, dynamic>> createAgentRecord(
    Map<String, dynamic> row,
  ) async {
    final data = await _invoke(
      'create-agent',
      <String, dynamic>{
        'agent': row,
      },
    );

    return _map(data['agent']);
  }

  Future<void> updateAgent({
    required String agentId,
    required Map<String, dynamic> changes,
  }) async {
    await _invoke(
      'update-agent',
      <String, dynamic>{
        'agentId': agentId,
        'changes': changes,
      },
    );
  }

  Future<void> deleteAgent(String agentId) async {
    await _invoke(
      'delete-agent',
      <String, dynamic>{
        'agentId': agentId,
      },
    );
  }

  Future<StudioAgentShare> loadAgentShare(String agentId) async {
    final data = await _invoke(
      'get-agent-share',
      <String, dynamic>{'agentId': agentId},
    );
    return StudioAgentShare.fromMap(_map(data['share']));
  }

  Future<StudioAgentShare> setAgentShare({
    required String agentId,
    required bool enabled,
  }) async {
    final data = await _invoke(
      'set-agent-share',
      <String, dynamic>{
        'agentId': agentId,
        'enabled': enabled,
      },
    );
    return StudioAgentShare.fromMap(_map(data['share']));
  }

  Future<StudioAgentShare> regenerateAgentShare(String agentId) async {
    final data = await _invoke(
      'regenerate-agent-share',
      <String, dynamic>{'agentId': agentId},
    );
    return StudioAgentShare.fromMap(_map(data['share']));
  }

  Future<void> toggleAgent(StudioAgent agent) async {
    await _invoke(
      'toggle-agent',
      <String, dynamic>{
        'agentId': agent.id,
        'enabled': !agent.isActive,
      },
    );
  }

  Future<void> deployAgent({
    required String agentId,
    required String sessionName,
  }) async {
    await _invoke(
      'deploy-agent',
      <String, dynamic>{
        'agentId': agentId,
        'sessionName': sessionName,
      },
      const Duration(seconds: 75),
    );
  }

  Future<void> saveAsDraft(String agentId) async {
    await updateAgent(
      agentId: agentId,
      changes: const <String, dynamic>{
        'status': 'draft',
      },
    );
  }

  Future<void> linkAgentToSession({
    required String agentId,
    required String sessionName,
  }) async {
    await updateAgent(
      agentId: agentId,
      changes: <String, dynamic>{
        'waha_session_name': sessionName,
      },
    );
  }

  Future<String> testAgent({
    required String agentId,
    required String message,
    required List<StudioChatMessage> history,
  }) async {
    final result = await testAgentRich(
      agentId: agentId,
      message: message,
      history: history,
    );
    return result.text;
  }

  Future<StudioAgentReply> testAgentRich({
    required String agentId,
    required String message,
    required List<StudioChatMessage> history,
    List<StudioCatalogMedia> attachments = const <StudioCatalogMedia>[],
  }) async {
    requireUser();

    final recentHistory =
        history.length <= 6 ? history : history.sublist(history.length - 6);

    try {
      final response = await client.functions.invoke(
        'waouh-agent-chat',
        body: <String, dynamic>{
          'agent_id': agentId,
          'message': message.trim(),
          'history': recentHistory.map((item) => item.toApi()).toList(),
          'persist': false,
          'attachments': attachments.map((item) => item.toApi()).toList(),
        },
      ).timeout(
        const Duration(seconds: 70),
        onTimeout: () {
          throw TimeoutException(
            'AI_TIMEOUT: le moteur IA met trop de temps à répondre.',
          );
        },
      );

      final data = _map(response.data);

      if (data['ok'] == false || data['error'] != null) {
        final code = '${data['code'] ?? 'AI_PROVIDER_ERROR'}';
        final error = '${data['error'] ?? 'Le moteur IA est indisponible.'}';
        throw StateError('$code: $error');
      }

      final reply = '${data['reply'] ?? ''}'.trim();

      if (reply.isEmpty) {
        throw StateError(
          'AI_EMPTY_RESPONSE: le moteur IA a retourné une réponse vide.',
        );
      }

      final rawAttachments = data['attachments'];
      final replyAttachments = rawAttachments is List
          ? rawAttachments
              .whereType<Map>()
              .map((item) => StudioCatalogMedia.fromMap(
                    Map<String, dynamic>.from(item),
                  ))
              .toList()
          : const <StudioCatalogMedia>[];

      return StudioAgentReply(
        text: reply,
        attachments: replyAttachments,
      );
    } on FunctionException catch (error) {
      final details = error.details;

      if (details is Map) {
        final data = Map<String, dynamic>.from(details);
        final code = '${data['code'] ?? 'AI_PROVIDER_ERROR'}';
        final message =
            '${data['error'] ?? data['message'] ?? 'Le moteur IA est indisponible.'}';
        throw StateError('$code: $message');
      }

      if (details is String && details.trim().isNotEmpty) {
        throw StateError(details.trim());
      }

      throw StateError(
        'AI_PROVIDER_ERROR: le moteur IA est momentanément indisponible.',
      );
    }
  }

  Future<List<StudioPartnerProduct>> loadPartnerProducts() async {
    final data = await _invoke('list-partner-products');
    final rows = data['products'];

    if (rows is! List) {
      return const <StudioPartnerProduct>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioPartnerProduct.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<void> linkPartnerProducts({
    required String agentId,
    required Set<String> productIds,
  }) async {
    await syncPartnerProducts(
      agentId: agentId,
      productIds: productIds,
      replace: false,
    );
  }

  Future<Map<String, dynamic>> syncPartnerProducts({
    required String agentId,
    required Set<String> productIds,
    bool replace = true,
  }) async {
    return _invoke(
      'sync-partner-products',
      <String, dynamic>{
        'agentId': agentId,
        'productIds': productIds.toList(),
        'replace': replace,
      },
    );
  }

  Future<Map<String, dynamic>> auditCatalogIntegrity({
    required String agentId,
  }) async {
    return _invoke(
      'audit-catalog-integrity',
      <String, dynamic>{'agentId': agentId},
    );
  }

  Future<Map<String, dynamic>> repairCatalogIntegrity({
    required String agentId,
  }) async {
    return _invoke(
      'repair-catalog-integrity',
      <String, dynamic>{'agentId': agentId},
    );
  }

  Future<List<StudioCatalogItem>> loadCatalog({
    String? agentId,
  }) async {
    final data = await _invoke(
      'list-catalog',
      <String, dynamic>{
        if (agentId?.isNotEmpty == true) 'agentId': agentId,
      },
    );

    final rows = data['items'];

    if (rows is! List) {
      return const <StudioCatalogItem>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioCatalogItem.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<StudioCatalogItem> upsertCatalogItem({
    String? id,
    required String agentId,
    required String name,
    String? description,
    int? priceFcfa,
    int quantity = 0,
    String? photoUrl,
    String? sku,
    bool active = true,
    String kind = 'product',
    String? catalogTitle,
    String? category,
    String? duration,
    String? audience,
    DateTime? startDate,
    DateTime? endDate,
    String? format,
    String? level,
    String? unit,
    String source = 'manual',
    String? partnerProductId,
    List<StudioCatalogMedia> media = const <StudioCatalogMedia>[],
  }) async {
    final data = await _invoke(
      'upsert-catalog-item',
      <String, dynamic>{
        if (id?.isNotEmpty == true) 'id': id,
        'agentId': agentId,
        'name': name.trim(),
        'description': description?.trim(),
        'priceFcfa': priceFcfa,
        'quantity': quantity,
        'photoUrl': photoUrl,
        'sku': sku?.trim(),
        'active': active,
        'kind': kind,
        'catalogTitle': catalogTitle?.trim(),
        'category': category?.trim(),
        'duration': duration?.trim(),
        'audience': audience?.trim(),
        'startDate': startDate?.toUtc().toIso8601String(),
        'endDate': endDate?.toUtc().toIso8601String(),
        'format': format?.trim(),
        'level': level?.trim(),
        'unit': unit?.trim(),
        'source': source,
        'partnerProductId': partnerProductId,
        'media': media.map((item) => item.toApi()).toList(),
      },
    );

    return StudioCatalogItem.fromMap(
      _map(data['item']),
    );
  }

  Future<void> deleteCatalogItem({
    required String id,
    required String agentId,
  }) async {
    await _invoke(
      'delete-catalog-item',
      <String, dynamic>{
        'id': id,
        'agentId': agentId,
      },
    );
  }

  Future<String> uploadProductImage({
    required String agentId,
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final media = await uploadCatalogMedia(
      agentId: agentId,
      bytes: bytes,
      filename: filename,
      contentType: contentType,
    );
    return media.url ?? '';
  }

  Future<StudioCatalogMedia> uploadCatalogMedia({
    required String agentId,
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final data = await _invoke(
      'upload-catalog-media',
      <String, dynamic>{
        'agentId': agentId,
        'filename': filename,
        'contentType': contentType,
        'base64': base64Encode(bytes),
      },
      const Duration(seconds: 75),
    );

    final media = StudioCatalogMedia.fromMap(
      _map(data['media']),
    );

    if (media.storagePath?.isNotEmpty != true) {
      throw StateError('Le média n’a pas été enregistré.');
    }

    return media;
  }

  Future<List<StudioDocumentItem>> loadDocuments({
    String? agentId,
  }) async {
    final data = await _invoke(
      'list-documents',
      <String, dynamic>{
        if (agentId?.isNotEmpty == true) 'agentId': agentId,
      },
    );

    final rows = data['documents'];

    if (rows is! List) {
      return const <StudioDocumentItem>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioDocumentItem.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<StudioDocumentItem> uploadDocument({
    required String agentId,
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final data = await _invoke(
      'upload-document',
      <String, dynamic>{
        'agentId': agentId,
        'filename': filename,
        'contentType': contentType,
        'base64': base64Encode(bytes),
      },
    );

    return StudioDocumentItem.fromMap(
      _map(data['document']),
    );
  }

  Future<void> deleteDocument({
    required String agentId,
    required String storagePath,
  }) async {
    await _invoke(
      'delete-document',
      <String, dynamic>{
        'agentId': agentId,
        'storagePath': storagePath,
      },
    );
  }

  Future<String> getDocumentSignedUrl({
    required String agentId,
    required String storagePath,
  }) async {
    final data = await _invoke(
      'document-url',
      <String, dynamic>{
        'agentId': agentId,
        'storagePath': storagePath,
      },
    );

    final value = '${data['url'] ?? ''}'.trim();

    if (value.isEmpty) {
      throw StateError(
        'Le document ne peut pas être visualisé actuellement.',
      );
    }

    return value;
  }

  Future<void> renameDocument({
    required String agentId,
    required String storagePath,
    required String name,
  }) async {
    await _invoke(
      'rename-document',
      <String, dynamic>{
        'agentId': agentId,
        'storagePath': storagePath,
        'name': name.trim(),
      },
    );
  }

  Future<List<StudioHistoryItem>> loadHistory() async {
    final data = await _invoke('list-history');
    final rows = data['history'];

    if (rows is! List) {
      return const <StudioHistoryItem>[];
    }

    return rows
        .whereType<Map>()
        .map(
          (item) => StudioHistoryItem.fromMap(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList();
  }

  Future<void> clearHistory() async {
    await _invoke('clear-history');
  }

  Future<void> signOut() => client.auth.signOut();

  static String normalizeSessionName(String value) {
    var output = value.trim().toLowerCase();

    const accents = <String, String>{
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ä': 'a',
      'ã': 'a',
      'ç': 'c',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'ö': 'o',
      'õ': 'o',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'ÿ': 'y',
    };

    accents.forEach((key, replacement) {
      output = output.replaceAll(key, replacement);
    });

    output = output
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');

    if (output.isEmpty) {
      output = 'ligne-${DateTime.now().millisecondsSinceEpoch}';
    }

    return output;
  }
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return <String, dynamic>{};
}

DateTime? _date(dynamic value) {
  if (value is DateTime) return value;
  return DateTime.tryParse('${value ?? ''}');
}

String? _firstTextFromList(dynamic value) {
  if (value is List) {
    for (final item in value) {
      final text = '${item ?? ''}'.trim();
      if (text.isNotEmpty) return text;
    }
  }
  return null;
}

int? _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}');
}
