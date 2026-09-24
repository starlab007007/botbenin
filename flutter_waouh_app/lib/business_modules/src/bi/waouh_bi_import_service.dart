import 'dart:convert';
import 'dart:io';

import 'package:csv/csv.dart';
import 'package:excel/excel.dart' as excel;
import 'package:file_picker/file_picker.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'waouh_bi_data_models.dart';

class WaouhBiImportService {
  const WaouhBiImportService();

  static const int maxRows = 5000;

  Future<WaouhBiImportPayload?> pickLocalFile({required String name}) async {
    final picked = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['csv', 'xlsx'],
      withData: true,
    );
    if (picked == null || picked.files.isEmpty) return null;

    final file = picked.files.single;
    final extension = (file.extension ?? '').toLowerCase();
    final bytes = file.bytes ??
        (file.path == null ? null : await File(file.path!).readAsBytes());
    if (bytes == null || bytes.isEmpty) {
      throw StateError('Le fichier sélectionné est vide ou inaccessible.');
    }

    final resolvedName = name.trim().isEmpty
        ? (file.name.replaceFirst(RegExp(r'\.[^.]+$'), ''))
        : name.trim();
    if (extension == 'xlsx') {
      return _fromXlsx(
        bytes: bytes,
        name: resolvedName,
        sourceUrl: null,
        metadata: {'file_name': file.name},
      );
    }
    if (extension == 'csv') {
      return _fromCsv(
        bytes: bytes,
        name: resolvedName,
        type: WaouhBiSourceType.csv,
        sourceUrl: null,
        metadata: {'file_name': file.name},
      );
    }
    throw ArgumentError('Sélectionnez un fichier CSV ou Excel (.xlsx).');
  }

  Future<WaouhBiImportPayload> importPublicGoogleSheet({
    required String name,
    required String url,
  }) async {
    final exportUrl = _publicGoogleSheetCsvUrl(url);
    final bytes = await _getBytes(Uri.parse(exportUrl));
    return _fromCsv(
      bytes: bytes,
      name: name,
      type: WaouhBiSourceType.googleSheetPublic,
      sourceUrl: url,
      metadata: {'google_sheet_mode': 'public'},
    );
  }

  Future<WaouhBiImportPayload> importPrivateGoogleSheet({
    required String name,
    required String url,
  }) async {
    final spreadsheetId = _googleSheetId(url);
    if (spreadsheetId == null) {
      throw ArgumentError('Lien Google Sheet invalide.');
    }
    final signIn = GoogleSignIn(
      scopes: const ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    );
    final account = await signIn.signIn();
    if (account == null) {
      throw StateError('Connexion Google annulée.');
    }
    final headers = await account.authHeaders;
    final metadataUri = Uri.parse(
      'https://sheets.googleapis.com/v4/spreadsheets/$spreadsheetId?fields=sheets.properties',
    );
    final metadata =
        jsonDecode(utf8.decode(await _getBytes(metadataUri, headers: headers)))
            as Map<String, dynamic>;
    final sheets = metadata['sheets'];
    if (sheets is! List || sheets.isEmpty) {
      throw StateError('Aucun onglet Google Sheet exploitable.');
    }
    final first = sheets.first;
    final properties = first is Map ? first['properties'] : null;
    final title = properties is Map ? '${properties['title'] ?? ''}' : '';
    if (title.trim().isEmpty) {
      throw StateError('Nom du premier onglet Google Sheet introuvable.');
    }
    final valuesUri = Uri.parse(
      'https://sheets.googleapis.com/v4/spreadsheets/$spreadsheetId/values/${Uri.encodeComponent(title)}',
    );
    final raw =
        jsonDecode(utf8.decode(await _getBytes(valuesUri, headers: headers)))
            as Map<String, dynamic>;
    final values = raw['values'];
    if (values is! List)
      throw StateError('Cette feuille ne contient aucune donnée.');
    return _fromMatrix(
      matrix: values
          .map(
            (row) =>
                row is List ? row.map((cell) => '$cell').toList() : <String>[],
          )
          .toList(),
      name: name,
      type: WaouhBiSourceType.googleSheetPrivate,
      sourceUrl: url,
      metadata: {'google_sheet_mode': 'private', 'sheet_title': title},
    );
  }

  Future<WaouhBiImportPayload> importFromUrl({
    required String name,
    required String url,
    required WaouhBiSourceType type,
  }) async {
    final uri = Uri.tryParse(url.trim());
    if (uri == null || !uri.hasScheme) {
      throw ArgumentError('Saisissez une URL complète commençant par https://');
    }
    final bytes = await _getBytes(uri);
    if (type == WaouhBiSourceType.apiJson) {
      return _fromJson(bytes: bytes, name: name, sourceUrl: url);
    }
    return _fromCsv(
      bytes: bytes,
      name: name,
      type: WaouhBiSourceType.urlCsv,
      sourceUrl: url,
      metadata: const {'import_mode': 'url'},
    );
  }

  WaouhBiImportPayload _fromCsv({
    required List<int> bytes,
    required String name,
    required WaouhBiSourceType type,
    required String? sourceUrl,
    required Map<String, dynamic> metadata,
  }) {
    final content = utf8.decode(bytes, allowMalformed: true);
    final matrix = CsvCodec()
        .decode(content)
        .map((row) => row.map((cell) => '$cell').toList())
        .toList();
    return _fromMatrix(
      matrix: matrix,
      name: name,
      type: type,
      sourceUrl: sourceUrl,
      metadata: metadata,
    );
  }

  WaouhBiImportPayload _fromXlsx({
    required List<int> bytes,
    required String name,
    required String? sourceUrl,
    required Map<String, dynamic> metadata,
  }) {
    final workbook = excel.Excel.decodeBytes(bytes);
    if (workbook.tables.isEmpty) {
      throw StateError('Le fichier Excel ne contient aucun onglet.');
    }
    final sheet = workbook.tables.values.first;
    final matrix = sheet.rows
        .map(
          (row) => row
              .map((cell) => cell?.value?.toString() ?? '')
              .toList(growable: false),
        )
        .toList(growable: false);
    return _fromMatrix(
      matrix: matrix,
      name: name,
      type: WaouhBiSourceType.xlsx,
      sourceUrl: sourceUrl,
      metadata: {...metadata, 'sheet_name': workbook.tables.keys.first},
    );
  }

  WaouhBiImportPayload _fromJson({
    required List<int> bytes,
    required String name,
    required String sourceUrl,
  }) {
    final decoded = jsonDecode(utf8.decode(bytes));
    List<dynamic> rawRows;
    if (decoded is List) {
      rawRows = decoded;
    } else if (decoded is Map) {
      final candidates = [
        decoded['data'],
        decoded['results'],
        decoded['items'],
        decoded['rows'],
      ];
      rawRows = candidates.firstWhere(
        (candidate) => candidate is List,
        orElse: () => <dynamic>[decoded],
      ) as List<dynamic>;
    } else {
      throw StateError('L’API JSON doit renvoyer une liste ou un objet JSON.');
    }
    final values = rawRows
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    if (values.isEmpty)
      throw StateError(
        'Aucune ligne objet n’a été trouvée dans la réponse JSON.',
      );
    final columns = <String>{};
    for (final row in values.take(maxRows)) {
      columns.addAll(row.keys);
    }
    return _payloadFromRows(
      name: name,
      type: WaouhBiSourceType.apiJson,
      sourceUrl: sourceUrl,
      columns: columns.toList(),
      values: values.take(maxRows).toList(),
      metadata: const {'import_mode': 'api_json'},
    );
  }

  WaouhBiImportPayload _fromMatrix({
    required List<List<String>> matrix,
    required String name,
    required WaouhBiSourceType type,
    required String? sourceUrl,
    required Map<String, dynamic> metadata,
  }) {
    final trimmed = matrix
        .where((row) => row.any((cell) => cell.trim().isNotEmpty))
        .toList();
    if (trimmed.length < 2) {
      throw StateError(
        'Ajoutez une ligne d’en-têtes et au moins une ligne de données.',
      );
    }
    final columns = _headers(trimmed.first);
    final values = <Map<String, dynamic>>[];
    for (final row in trimmed.skip(1).take(maxRows)) {
      final value = <String, dynamic>{};
      for (var index = 0; index < columns.length; index++) {
        value[columns[index]] = index < row.length ? row[index].trim() : '';
      }
      if (value.values.any((item) => '$item'.trim().isNotEmpty))
        values.add(value);
    }
    if (values.isEmpty)
      throw StateError('Aucune donnée exploitable après les en-têtes.');
    return _payloadFromRows(
      name: name,
      type: type,
      sourceUrl: sourceUrl,
      columns: columns,
      values: values,
      metadata: metadata,
    );
  }

  WaouhBiImportPayload _payloadFromRows({
    required String name,
    required WaouhBiSourceType type,
    required String? sourceUrl,
    required List<String> columns,
    required List<Map<String, dynamic>> values,
    required Map<String, dynamic> metadata,
  }) =>
      WaouhBiImportPayload(
        name: name.trim().isEmpty ? 'Nouvelle analyse' : name.trim(),
        type: type,
        sourceUrl: sourceUrl,
        columns: columns,
        rows: values,
        metadata: metadata,
      );

  List<String> _headers(List<String> raw) {
    final used = <String, int>{};
    return List<String>.generate(raw.length, (index) {
      final seed = raw[index].trim().isEmpty
          ? 'Colonne ${index + 1}'
          : raw[index].trim();
      final count = (used[seed] ?? 0) + 1;
      used[seed] = count;
      return count == 1 ? seed : '$seed $count';
    });
  }

  String _publicGoogleSheetCsvUrl(String rawUrl) {
    final id = _googleSheetId(rawUrl);
    if (id == null) {
      throw ArgumentError('Lien Google Sheet invalide.');
    }
    final uri = Uri.tryParse(rawUrl);
    final gid = uri?.queryParameters['gid'];
    return 'https://docs.google.com/spreadsheets/d/$id/export?format=csv${gid == null ? '' : '&gid=$gid'}';
  }

  String? _googleSheetId(String rawUrl) {
    final match = RegExp(
      r'/spreadsheets/d/([a-zA-Z0-9_-]+)',
    ).firstMatch(rawUrl);
    return match?.group(1);
  }

  Future<List<int>> _getBytes(Uri uri, {Map<String, String>? headers}) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(uri);
      headers?.forEach(request.headers.add);
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          'Téléchargement impossible (${response.statusCode}).',
          uri: uri,
        );
      }
      final bytes = <int>[];
      await for (final part in response) {
        bytes.addAll(part);
        if (bytes.length > 10 * 1024 * 1024) {
          throw StateError('Source limitée à 10 Mo.');
        }
      }
      return bytes;
    } finally {
      client.close(force: true);
    }
  }
}
