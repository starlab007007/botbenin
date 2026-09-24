enum WaouhBiSourceType {
  csv,
  xlsx,
  googleSheetPublic,
  googleSheetPrivate,
  urlCsv,
  apiJson,
}

extension WaouhBiSourceTypeLabel on WaouhBiSourceType {
  String get value => switch (this) {
    WaouhBiSourceType.csv => 'csv',
    WaouhBiSourceType.xlsx => 'xlsx',
    WaouhBiSourceType.googleSheetPublic => 'google_sheet_public',
    WaouhBiSourceType.googleSheetPrivate => 'google_sheet_private',
    WaouhBiSourceType.urlCsv => 'url_csv',
    WaouhBiSourceType.apiJson => 'api_json',
  };

  String get label => switch (this) {
    WaouhBiSourceType.csv => 'Fichier CSV',
    WaouhBiSourceType.xlsx => 'Fichier Excel',
    WaouhBiSourceType.googleSheetPublic => 'Google Sheet publique',
    WaouhBiSourceType.googleSheetPrivate => 'Google Sheet privée',
    WaouhBiSourceType.urlCsv => 'Lien CSV',
    WaouhBiSourceType.apiJson => 'API JSON',
  };
}

class WaouhBiSource {
  const WaouhBiSource({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.rowCount,
    required this.columnCount,
    required this.columns,
    required this.createdAt,
    this.sourceUrl,
    this.lastError,
  });

  final String id;
  final String name;
  final WaouhBiSourceType type;
  final String status;
  final int rowCount;
  final int columnCount;
  final List<String> columns;
  final DateTime createdAt;
  final String? sourceUrl;
  final String? lastError;

  factory WaouhBiSource.fromJson(Map<String, dynamic> json) => WaouhBiSource(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? 'Source'}',
    type: _sourceType('${json['source_type'] ?? ''}'),
    status: '${json['status'] ?? 'ready'}',
    rowCount: _asInt(json['row_count']),
    columnCount: _asInt(json['column_count']),
    columns: _stringList(json['columns']),
    createdAt:
        DateTime.tryParse('${json['created_at'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    sourceUrl: _text(json['source_url']),
    lastError: _text(json['last_error']),
  );
}

class WaouhBiImportPayload {
  const WaouhBiImportPayload({
    required this.name,
    required this.type,
    required this.columns,
    required this.rows,
    this.sourceUrl,
    this.metadata = const {},
  });

  final String name;
  final WaouhBiSourceType type;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final String? sourceUrl;
  final Map<String, dynamic> metadata;
}

class WaouhBiQueryResult {
  const WaouhBiQueryResult({
    required this.kind,
    required this.title,
    required this.summary,
    required this.data,
    this.value,
    this.unit,
    this.columns = const [],
    this.rows = const [],
  });

  final String kind;
  final String title;
  final String summary;
  final List<WaouhBiPoint> data;
  final num? value;
  final String? unit;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;

  factory WaouhBiQueryResult.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    final rawRows = json['rows'];
    return WaouhBiQueryResult(
      kind: '${json['kind'] ?? 'text'}',
      title: '${json['title'] ?? 'Analyse'}',
      summary: '${json['summary'] ?? ''}',
      data: rawData is List
          ? rawData
                .whereType<Map>()
                .map(
                  (item) =>
                      WaouhBiPoint.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : const [],
      value: _asNum(json['value']),
      unit: _text(json['unit']),
      columns: _stringList(json['columns']),
      rows: rawRows is List
          ? rawRows
                .whereType<Map>()
                .map((item) => Map<String, dynamic>.from(item))
                .toList()
          : const [],
    );
  }
}

class WaouhBiPoint {
  const WaouhBiPoint({required this.label, required this.value});

  final String label;
  final num value;

  factory WaouhBiPoint.fromJson(Map<String, dynamic> json) => WaouhBiPoint(
    label: '${json['label'] ?? ''}',
    value: _asNum(json['value']) ?? 0,
  );
}

WaouhBiSourceType _sourceType(String value) => switch (value) {
  'xlsx' => WaouhBiSourceType.xlsx,
  'google_sheet_public' => WaouhBiSourceType.googleSheetPublic,
  'google_sheet_private' => WaouhBiSourceType.googleSheetPrivate,
  'url_csv' => WaouhBiSourceType.urlCsv,
  'api_json' => WaouhBiSourceType.apiJson,
  _ => WaouhBiSourceType.csv,
};

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('$value') ?? 0;
}

num? _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse('$value');
}

String? _text(dynamic value) {
  final valueAsText = '$value'.trim();
  return valueAsText.isEmpty || valueAsText == 'null' ? null : valueAsText;
}

List<String> _stringList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map((item) => '$item'.trim())
      .where((item) => item.isNotEmpty)
      .toList();
}
