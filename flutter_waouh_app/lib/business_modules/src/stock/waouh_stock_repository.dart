import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_stock_models.dart';
import 'waouh_stock_source_models.dart';

class WaouhStockRepository {
  const WaouhStockRepository(this.client);

  final SupabaseClient client;

  String get _userId {
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Connectez-vous pour gérer le stock.');
    }
    return user.id;
  }

  Future<List<WaouhStockProduct>> fetchProducts() async {
    final partnerRows = await client
        .from('waouh_partners')
        .select('id')
        .eq('user_id', _userId);

    final partnerIds = (partnerRows as List)
        .whereType<Map>()
        .map((row) => '${row['id'] ?? ''}')
        .where((id) => id.isNotEmpty)
        .toList();

    if (partnerIds.isEmpty) return const [];

    final rows = await client
        .from('waouh_partner_products')
        .select(
          'id,nom,description,categorie,unite,prix_min,disponible,'
          'stock_estime,stock_minimum,stock_target,stock_last_updated_at,'
          'photos,partner_id,business_id,updated_at',
        )
        .inFilter('partner_id', partnerIds)
        .order('updated_at', ascending: false);

    return (rows as List)
        .whereType<Map>()
        .map(
          (item) => WaouhStockProduct.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<List<WaouhStockMovement>> fetchMovements({
    String? productId,
    int limit = 100,
  }) async {
    var query = client
        .from('waouh_partner_stock_movements')
        .select()
        .eq('user_id', _userId);

    if (productId != null && productId.isNotEmpty) {
      query = query.eq('product_id', productId);
    }

    final rows = await query.order('created_at', ascending: false).limit(limit);
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              WaouhStockMovement.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<void> registerMovement({
    required WaouhStockProduct product,
    required int quantity,
    required String movementType,
    String? note,
  }) async {
    if (quantity == 0) {
      throw ArgumentError.value(quantity, 'quantity', 'Quantité obligatoire');
    }
    if (!const {'in', 'out', 'adjustment', 'reorder'}.contains(movementType)) {
      throw ArgumentError.value(movementType, 'movementType', 'Type invalide');
    }

    await client.rpc(
      'waouh_adjust_partner_stock',
      params: {
        'p_product_id': product.id,
        'p_quantity': quantity,
        'p_movement_type': movementType,
        'p_note': note?.trim(),
        'p_stock_minimum': product.minimum,
        'p_stock_target': product.target,
      },
    );
  }

  Future<void> updateThresholds({
    required WaouhStockProduct product,
    required int minimum,
    int? target,
  }) async {
    if (minimum < 0 || (target != null && target < 0)) {
      throw ArgumentError('Les seuils ne peuvent pas être négatifs.');
    }
    await client.rpc(
      'waouh_adjust_partner_stock',
      params: {
        'p_product_id': product.id,
        'p_quantity': 0,
        'p_movement_type': 'adjustment',
        'p_note': 'Mise à jour des seuils',
        'p_stock_minimum': minimum,
        'p_stock_target': target,
      },
    );
  }

  Future<void> requestReorder({
    required WaouhStockProduct product,
    required int quantity,
    String? note,
  }) async {
    if (quantity <= 0) {
      throw ArgumentError.value(quantity, 'quantity', 'Quantité invalide');
    }
    await client.from('waouh_stock_reorder_requests').insert({
      'product_id': product.id,
      'user_id': _userId,
      'quantity_requested': quantity,
      'status': 'pending',
      'note': note?.trim(),
    });
  }

  Future<List<WaouhStockDataSource>> fetchDataSources() async {
    final rows = await client.rpc('waouh_stock_list_sources');
    return (rows as List)
        .whereType<Map>()
        .map(
          (item) =>
              WaouhStockDataSource.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<WaouhStockSourcePreview> previewRemoteSource({
    required WaouhStockSourceType sourceType,
    required Map<String, dynamic> configuration,
    required Map<String, dynamic> credentials,
  }) async {
    final data = await _invokeStockIngest({
      'action': 'preview',
      'source_type': sourceType.wireName,
      'configuration': configuration,
      'credentials': credentials,
    });
    return WaouhStockSourcePreview.fromJson(data);
  }

  Future<WaouhStockImportResult> importFileRows({
    required String sourceName,
    required WaouhStockSourceType sourceType,
    required List<Map<String, dynamic>> rows,
    required Map<String, String?> mapping,
  }) async {
    final data = await _invokeStockIngest({
      'action': 'import',
      'source_name': sourceName,
      'source_type': sourceType.wireName,
      'rows': rows,
      'mapping': mapping,
      'configuration': {'file_name': sourceName},
      'remember_connection': false,
    });
    return WaouhStockImportResult.fromJson(data);
  }

  Future<WaouhStockImportResult> importRemoteSource({
    required String sourceName,
    required WaouhStockSourceType sourceType,
    required Map<String, dynamic> configuration,
    required Map<String, dynamic> credentials,
    required Map<String, String?> mapping,
    required bool rememberConnection,
  }) async {
    final data = await _invokeStockIngest({
      'action': 'import',
      'source_name': sourceName,
      'source_type': sourceType.wireName,
      'configuration': configuration,
      'credentials': credentials,
      'mapping': mapping,
      'remember_connection': rememberConnection,
    });
    return WaouhStockImportResult.fromJson(data);
  }

  Future<WaouhStockImportResult> syncDataSource(String datasourceId) async {
    final data = await _invokeStockIngest({
      'action': 'sync',
      'datasource_id': datasourceId,
    });
    return WaouhStockImportResult.fromJson(data);
  }

  Future<void> deleteDataSource(String datasourceId) async {
    await _invokeStockIngest({
      'action': 'delete',
      'datasource_id': datasourceId,
    });
  }

  Future<Map<String, dynamic>> _invokeStockIngest(
    Map<String, dynamic> body,
  ) async {
    late final FunctionResponse response;
    try {
      response = await client.functions.invoke(
        'waouh-stock-ingest',
        body: body,
      );
    } on FunctionException catch (error) {
      throw StateError(_functionExceptionMessage(error));
    }
    final raw = response.data;
    if (raw is! Map) {
      throw StateError('Réponse du connecteur Stock invalide.');
    }
    final data = Map<String, dynamic>.from(raw);
    if ('${data['error'] ?? ''}'.trim().isNotEmpty) {
      final message = _readErrorDetail(data);
      throw StateError(message.isEmpty ? 'Import Stock impossible.' : message);
    }
    return data;
  }

  Future<WaouhStockChatResult> askStock(
    String question, {
    String analysisScope = 'all',
    String? datasourceId,
  }) async {
    final clean = question.trim();
    if (clean.isEmpty) {
      throw ArgumentError.value(question, 'question', 'Question obligatoire');
    }

    late final FunctionResponse response;
    try {
      response = await client.functions.invoke(
        'waouh-stock-query',
        body: {
          'question': clean,
          'analysis_scope': analysisScope,
          if (datasourceId != null && datasourceId.trim().isNotEmpty)
            'datasource_id': datasourceId.trim(),
        },
      );
    } on FunctionException catch (error) {
      throw StateError(_functionExceptionMessage(error));
    }

    final raw = response.data;
    if (raw is! Map) {
      throw StateError('Réponse Waouh Stock IA invalide.');
    }
    final data = Map<String, dynamic>.from(raw);
    final error = '${data['error'] ?? ''}'.trim();
    if (error.isNotEmpty) throw StateError(error);

    final result = WaouhStockChatResult.fromJson(data);
    if (result.answer.isEmpty) {
      throw StateError('Waouh Stock IA n’a retourné aucune réponse.');
    }
    return result;
  }
}

String _functionExceptionMessage(FunctionException error) {
  final detail = _readErrorDetail(error.details);
  if (detail.isNotEmpty) return detail;
  final reason = '${error.reasonPhrase ?? ''}'.trim();
  if (reason.isNotEmpty) return reason;
  return 'Le service Waouh Stock IA a retourné une erreur ${error.status}.';
}

String _readErrorDetail(dynamic value) {
  if (value == null) return '';
  if (value is String) {
    final text = value.trim();
    return text == '[object Object]' ? '' : text;
  }
  if (value is Map) {
    for (final key in const ['message', 'error', 'details', 'hint', 'code']) {
      if (value.containsKey(key)) {
        final text = _readErrorDetail(value[key]);
        if (text.isNotEmpty) return text;
      }
    }
    final parts = value.entries
        .map((entry) {
          final text = _readErrorDetail(entry.value);
          return text.isEmpty ? '' : '${entry.key}: $text';
        })
        .where((text) => text.isNotEmpty)
        .toList();
    return parts.join(' · ');
  }
  if (value is Iterable) {
    return value
        .map(_readErrorDetail)
        .where((text) => text.isNotEmpty)
        .join(' · ');
  }
  return '$value'.trim();
}
