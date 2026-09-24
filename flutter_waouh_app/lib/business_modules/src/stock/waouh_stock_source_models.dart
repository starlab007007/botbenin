enum WaouhStockSourceType { csv, excel, googleSheet, postgres, supabase }

extension WaouhStockSourceTypeX on WaouhStockSourceType {
  String get wireName => switch (this) {
    WaouhStockSourceType.csv => 'csv',
    WaouhStockSourceType.excel => 'excel',
    WaouhStockSourceType.googleSheet => 'google_sheet',
    WaouhStockSourceType.postgres => 'postgres',
    WaouhStockSourceType.supabase => 'supabase',
  };

  String get label => switch (this) {
    WaouhStockSourceType.csv => 'CSV',
    WaouhStockSourceType.excel => 'Excel',
    WaouhStockSourceType.googleSheet => 'Google Sheets',
    WaouhStockSourceType.postgres => 'PostgreSQL',
    WaouhStockSourceType.supabase => 'Supabase',
  };

  static WaouhStockSourceType fromWireName(String value) => switch (value) {
    'excel' => WaouhStockSourceType.excel,
    'google_sheet' => WaouhStockSourceType.googleSheet,
    'postgres' => WaouhStockSourceType.postgres,
    'supabase' => WaouhStockSourceType.supabase,
    _ => WaouhStockSourceType.csv,
  };
}

class WaouhStockDataSource {
  const WaouhStockDataSource({
    required this.id,
    required this.name,
    required this.sourceType,
    required this.rowCount,
    required this.status,
    required this.canSync,
    required this.createdAt,
    this.lastSyncedAt,
    this.lastError,
  });

  final String id;
  final String name;
  final WaouhStockSourceType sourceType;
  final int rowCount;
  final String status;
  final bool canSync;
  final DateTime createdAt;
  final DateTime? lastSyncedAt;
  final String? lastError;

  bool get isReady => status == 'ready';
  bool get hasError => status == 'error';

  factory WaouhStockDataSource.fromJson(Map<String, dynamic> json) {
    return WaouhStockDataSource(
      id: '${json['id'] ?? ''}',
      name: '${json['name'] ?? 'Source Stock'}',
      sourceType: WaouhStockSourceTypeX.fromWireName(
        '${json['source_type'] ?? 'csv'}',
      ),
      rowCount: _asInt(json['row_count']),
      status: '${json['status'] ?? 'ready'}',
      canSync: json['can_sync'] == true,
      createdAt:
          DateTime.tryParse('${json['created_at'] ?? ''}') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      lastSyncedAt: DateTime.tryParse('${json['last_synced_at'] ?? ''}'),
      lastError: _nullableText(json['last_error']),
    );
  }
}

class WaouhStockSourcePreview {
  const WaouhStockSourcePreview({
    required this.columns,
    required this.rows,
    required this.suggestedMapping,
  });

  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final Map<String, String?> suggestedMapping;

  factory WaouhStockSourcePreview.fromJson(Map<String, dynamic> json) {
    return WaouhStockSourcePreview(
      columns: _stringList(json['columns']),
      rows: _mapList(json['preview']),
      suggestedMapping: _nullableStringMap(json['suggested_mapping']),
    );
  }
}

class WaouhStockImportResult {
  const WaouhStockImportResult({
    required this.datasourceId,
    required this.sourceName,
    required this.rowCount,
    required this.inventoryRows,
    required this.movementRows,
  });

  final String datasourceId;
  final String sourceName;
  final int rowCount;
  final int inventoryRows;
  final int movementRows;

  factory WaouhStockImportResult.fromJson(Map<String, dynamic> json) {
    return WaouhStockImportResult(
      datasourceId: '${json['datasource_id'] ?? ''}',
      sourceName: '${json['source_name'] ?? 'Source Stock'}',
      rowCount: _asInt(json['row_count']),
      inventoryRows: _asInt(json['inventory_rows']),
      movementRows: _asInt(json['movement_rows']),
    );
  }
}

const waouhStockCanonicalFields = <String, String>{
  'name': 'Nom du produit',
  'sku': 'Référence / SKU',
  'category': 'Catégorie',
  'quantity': 'Stock actuel',
  'threshold_low': 'Seuil minimum',
  'target_stock': 'Stock cible',
  'unit_price_fcfa': 'Prix de vente',
  'cost_price_fcfa': 'Prix d’achat',
  'supplier': 'Fournisseur',
  'unit': 'Unité',
  'location': 'Emplacement',
  'movement_type': 'Type de mouvement',
  'movement_quantity': 'Quantité du mouvement',
  'movement_date': 'Date du mouvement',
};

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}') ?? 0;
}

String? _nullableText(dynamic value) {
  final text = '${value ?? ''}'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

List<String> _stringList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map((item) => '$item'.trim())
      .where((item) => item.isNotEmpty)
      .toList();
}

List<Map<String, dynamic>> _mapList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

Map<String, String?> _nullableStringMap(dynamic value) {
  if (value is! Map) return const {};
  return value.map(
    (key, item) => MapEntry(
      '$key',
      item == null || '$item'.trim().isEmpty ? null : '$item'.trim(),
    ),
  );
}
