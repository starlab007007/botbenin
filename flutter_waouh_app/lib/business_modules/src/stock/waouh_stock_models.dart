enum WaouhStockState { untracked, outOfStock, low, healthy }

extension WaouhStockStateLabel on WaouhStockState {
  String get label => switch (this) {
        WaouhStockState.untracked => 'À renseigner',
        WaouhStockState.outOfStock => 'Rupture',
        WaouhStockState.low => 'Stock faible',
        WaouhStockState.healthy => 'En stock',
      };
}

class WaouhStockProduct {
  const WaouhStockProduct({
    required this.id,
    required this.partnerId,
    required this.name,
    required this.minimum,
    required this.available,
    this.businessId,
    this.description,
    this.category,
    this.unit,
    this.price,
    this.photoUrl,
    this.stock,
    this.target,
    this.updatedAt,
  });

  final String id;
  final String partnerId;
  final String? businessId;
  final String name;
  final String? description;
  final String? category;
  final String? unit;
  final num? price;
  final String? photoUrl;
  final int? stock;
  final int minimum;
  final int? target;
  final bool available;
  final DateTime? updatedAt;

  WaouhStockState get state {
    final value = stock;
    if (value == null) return WaouhStockState.untracked;
    if (value <= 0) return WaouhStockState.outOfStock;
    if (minimum > 0 && value <= minimum) return WaouhStockState.low;
    return WaouhStockState.healthy;
  }

  int get safeStock => stock ?? 0;

  String get stockLabel {
    if (stock == null) return 'Stock non renseigné';
    final suffix =
        unit == null || unit!.trim().isEmpty ? '' : ' ${unit!.trim()}';
    return '$stock$suffix disponible${stock == 1 ? '' : 's'}';
  }

  factory WaouhStockProduct.fromJson(Map<String, dynamic> json) {
    return WaouhStockProduct(
      id: '${json['id'] ?? ''}',
      partnerId: '${json['partner_id'] ?? ''}',
      businessId: _nullableText(json['business_id']),
      name: _nullableText(json['nom'] ?? json['name']) ?? 'Produit sans nom',
      description: _nullableText(json['description']),
      category: _nullableText(json['categorie'] ?? json['category']),
      unit: _nullableText(json['unite'] ?? json['unit']),
      price: _asNum(json['prix_min'] ?? json['price'] ?? json['prix']),
      photoUrl: _firstPhoto(json['photos'] ?? json['media_urls']),
      stock: _asNullableInt(json['stock_estime'] ?? json['stock']),
      minimum: _asNullableInt(json['stock_minimum']) ?? 0,
      target: _asNullableInt(json['stock_target']),
      available: json['disponible'] != false,
      updatedAt: DateTime.tryParse(
        '${json['stock_last_updated_at'] ?? json['updated_at'] ?? ''}',
      ),
    );
  }
}

class WaouhStockMovement {
  const WaouhStockMovement({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.balanceAfter,
    required this.type,
    required this.createdAt,
    this.note,
  });

  final String id;
  final String productId;
  final int quantity;
  final int balanceAfter;
  final String type;
  final DateTime createdAt;
  final String? note;

  bool get isEntry => quantity >= 0;

  factory WaouhStockMovement.fromJson(Map<String, dynamic> json) {
    return WaouhStockMovement(
      id: '${json['id'] ?? ''}',
      productId: '${json['product_id'] ?? ''}',
      quantity: _asNullableInt(json['quantity']) ?? 0,
      balanceAfter: _asNullableInt(json['balance_after']) ?? 0,
      type: '${json['movement_type'] ?? 'adjustment'}',
      createdAt: DateTime.tryParse('${json['created_at'] ?? ''}') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      note: _nullableText(json['note']),
    );
  }
}

class WaouhStockChatResult {
  const WaouhStockChatResult({
    required this.answer,
    required this.summary,
    required this.kpis,
    required this.columns,
    required this.tableRows,
    required this.insights,
    required this.suggestions,
    required this.chartSpec,
    this.executiveSummary = '',
    this.statistics = const <String, dynamic>{},
    this.recommendations = const <String>[],
    this.charts = const <Map<String, dynamic>>[],
  });

  final String answer;
  final String summary;
  final Map<String, num> kpis;
  final List<String> columns;
  final List<Map<String, dynamic>> tableRows;
  final List<String> insights;
  final List<String> suggestions;
  final Map<String, dynamic> chartSpec;
  final String executiveSummary;
  final Map<String, dynamic> statistics;
  final List<String> recommendations;
  final List<Map<String, dynamic>> charts;

  factory WaouhStockChatResult.fromJson(Map<String, dynamic> json) {
    final rawKpis = json['kpis'];
    final rawChart = json['chart_spec'];
    return WaouhStockChatResult(
      answer: '${json['answer'] ?? ''}'.trim(),
      summary: '${json['summary'] ?? ''}'.trim(),
      kpis: rawKpis is Map
          ? rawKpis.map(
              (key, value) => MapEntry('$key', _asNum(value) ?? 0),
            )
          : const {},
      columns: _stringList(json['columns']),
      tableRows: _mapList(json['table_rows']),
      insights: _stringList(json['insights']),
      suggestions: _stringList(json['suggestions']),
      chartSpec:
          rawChart is Map ? Map<String, dynamic>.from(rawChart) : const {},
      executiveSummary:
          '${json['executive_summary'] ?? json['summary'] ?? ''}'.trim(),
      statistics: json['statistics'] is Map
          ? Map<String, dynamic>.from(json['statistics'] as Map)
          : const <String, dynamic>{},
      recommendations: _stringList(json['recommendations']),
      charts: _mapList(json['charts']),
    );
  }
}

int? _asNullableInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}');
}

num? _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse('${value ?? ''}');
}

String? _nullableText(dynamic value) {
  final text = '${value ?? ''}'.trim();
  return text.isEmpty || text == 'null' ? null : text;
}

String? _firstPhoto(dynamic value) {
  if (value is List && value.isNotEmpty) return _nullableText(value.first);
  if (value is String) return _nullableText(value);
  return null;
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
