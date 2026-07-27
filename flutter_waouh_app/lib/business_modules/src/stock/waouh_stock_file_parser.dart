import 'dart:convert';
import 'dart:typed_data';

import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';

import 'waouh_stock_source_models.dart';

class WaouhStockParsedFile {
  const WaouhStockParsedFile({
    required this.name,
    required this.sourceType,
    required this.columns,
    required this.rows,
    required this.suggestedMapping,
  });

  final String name;
  final WaouhStockSourceType sourceType;
  final List<String> columns;
  final List<Map<String, dynamic>> rows;
  final Map<String, String?> suggestedMapping;
}

class WaouhStockFileParser {
  static const maxRows = 5000;

  static WaouhStockParsedFile parse(PlatformFile file) {
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) {
      throw StateError(
        'Le fichier n’a pas pu être lu. Réessayez en autorisant l’accès au fichier.',
      );
    }

    final extension = (file.extension ?? '').toLowerCase();
    if (extension == 'csv') return _parseCsv(file.name, bytes);
    if (extension == 'xlsx') return _parseExcel(file.name, bytes);
    throw StateError('Format non pris en charge. Utilisez CSV ou Excel .xlsx.');
  }

  static WaouhStockParsedFile _parseCsv(String name, Uint8List bytes) {
    var content = utf8.decode(bytes, allowMalformed: true);
    if (content.startsWith('\ufeff')) content = content.substring(1);
    final delimiter = _detectDelimiter(content);
    final matrix = _parseDelimited(content, delimiter);
    return _fromMatrix(name, WaouhStockSourceType.csv, matrix);
  }

  static WaouhStockParsedFile _parseExcel(String name, Uint8List bytes) {
    final workbook = Excel.decodeBytes(bytes);
    if (workbook.tables.isEmpty) {
      throw StateError('Le classeur Excel ne contient aucune feuille.');
    }
    final table = workbook.tables.values.first;
    if (table.rows.isEmpty) {
      throw StateError('La première feuille Excel est vide.');
    }
    final matrix = table.rows
        .map(
          (row) => row
              .map((cell) => cell?.value == null ? '' : '${cell!.value}')
              .toList(),
        )
        .toList();
    return _fromMatrix(name, WaouhStockSourceType.excel, matrix);
  }

  static WaouhStockParsedFile _fromMatrix(
    String name,
    WaouhStockSourceType sourceType,
    List<List<String>> matrix,
  ) {
    final nonEmpty = matrix
        .where((row) => row.any((cell) => cell.trim().isNotEmpty))
        .toList();
    if (nonEmpty.length < 2) {
      throw StateError(
        'Le fichier doit contenir une ligne d’en-tête et au moins une ligne de données.',
      );
    }

    final headers = _uniqueHeaders(nonEmpty.first);
    final dataRows = nonEmpty.skip(1).take(maxRows + 1).toList();
    if (dataRows.length > maxRows) {
      throw StateError(
        'Le fichier dépasse $maxRows lignes. Divisez-le en plusieurs imports.',
      );
    }

    final rows = <Map<String, dynamic>>[];
    for (final row in dataRows) {
      final item = <String, dynamic>{};
      var hasValue = false;
      for (var index = 0; index < headers.length; index++) {
        final value = index < row.length ? row[index].trim() : '';
        item[headers[index]] = value;
        if (value.isNotEmpty) hasValue = true;
      }
      if (hasValue) rows.add(item);
    }

    if (rows.isEmpty) {
      throw StateError('Aucune ligne exploitable n’a été trouvée.');
    }

    return WaouhStockParsedFile(
      name: name.replaceFirst(RegExp(r'\.[^.]+$'), ''),
      sourceType: sourceType,
      columns: headers,
      rows: rows,
      suggestedMapping: suggestWaouhStockMapping(headers),
    );
  }

  static List<String> _uniqueHeaders(List<String> values) {
    final seen = <String, int>{};
    return values.asMap().entries.map((entry) {
      var value = entry.value.trim();
      if (value.isEmpty) value = 'colonne_${entry.key + 1}';
      final count = seen.update(
        value,
        (current) => current + 1,
        ifAbsent: () => 1,
      );
      return count == 1 ? value : '${value}_$count';
    }).toList();
  }

  static String _detectDelimiter(String content) {
    final firstLine = content.split(RegExp(r'\r?\n')).firstOrNull ?? '';
    final candidates = <String, int>{
      ';': _countOutsideQuotes(firstLine, ';'),
      ',': _countOutsideQuotes(firstLine, ','),
      '\t': _countOutsideQuotes(firstLine, '\t'),
      '|': _countOutsideQuotes(firstLine, '|'),
    };
    return candidates.entries
        .reduce((best, current) => current.value > best.value ? current : best)
        .key;
  }

  static int _countOutsideQuotes(String value, String token) {
    var count = 0;
    var quoted = false;
    for (var index = 0; index < value.length; index++) {
      final char = value[index];
      if (char == '"') quoted = !quoted;
      if (!quoted && char == token) count++;
    }
    return count;
  }

  static List<List<String>> _parseDelimited(String content, String delimiter) {
    final rows = <List<String>>[];
    var row = <String>[];
    var field = StringBuffer();
    var quoted = false;

    void pushField() {
      row.add(field.toString());
      field = StringBuffer();
    }

    void pushRow() {
      pushField();
      rows.add(row);
      row = <String>[];
    }

    for (var index = 0; index < content.length; index++) {
      final char = content[index];
      if (char == '"') {
        if (quoted && index + 1 < content.length && content[index + 1] == '"') {
          field.write('"');
          index++;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (!quoted && char == delimiter) {
        pushField();
        continue;
      }
      if (!quoted && (char == '\n' || char == '\r')) {
        if (char == '\r' &&
            index + 1 < content.length &&
            content[index + 1] == '\n') {
          index++;
        }
        pushRow();
        continue;
      }
      field.write(char);
    }
    if (field.length > 0 || row.isNotEmpty) pushRow();
    return rows;
  }
}

Map<String, String?> suggestWaouhStockMapping(List<String> columns) {
  const synonyms = <String, List<String>>{
    'name': [
      'nom',
      'name',
      'produit',
      'product',
      'article',
      'designation',
      'libelle',
    ],
    'sku': ['sku', 'reference', 'ref', 'code', 'id produit', 'product id'],
    'category': ['categorie', 'category', 'famille', 'type produit'],
    'quantity': [
      'stock',
      'quantite',
      'quantity',
      'qte',
      'stock actuel',
      'stock disponible',
      'solde',
    ],
    'threshold_low': [
      'seuil',
      'minimum',
      'stock minimum',
      'seuil alerte',
      'threshold',
      'threshold low',
    ],
    'target_stock': [
      'objectif',
      'cible',
      'stock cible',
      'target',
      'target stock',
    ],
    'unit_price_fcfa': [
      'prix',
      'prix vente',
      'prix unitaire',
      'unit price',
      'price',
      'montant',
    ],
    'cost_price_fcfa': [
      'prix achat',
      'cout',
      'cost',
      'cost price',
      'prix revient',
    ],
    'supplier': ['fournisseur', 'supplier', 'vendeur'],
    'unit': ['unite', 'unit', 'conditionnement'],
    'location': ['emplacement', 'location', 'magasin', 'depot', 'entrepot'],
    'movement_type': [
      'type mouvement',
      'movement type',
      'operation',
      'sens',
      'entree sortie',
    ],
    'movement_quantity': [
      'quantite mouvement',
      'movement quantity',
      'qte mouvement',
      'volume mouvement',
    ],
    'movement_date': [
      'date mouvement',
      'movement date',
      'date operation',
      'date',
      'created at',
    ],
  };

  String normalized(String value) => value
      .toLowerCase()
      .replaceAll(RegExp(r'[àáâãäå]'), 'a')
      .replaceAll(RegExp(r'[èéêë]'), 'e')
      .replaceAll(RegExp(r'[ìíîï]'), 'i')
      .replaceAll(RegExp(r'[òóôõö]'), 'o')
      .replaceAll(RegExp(r'[ùúûü]'), 'u')
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();

  final normalizedColumns = {
    for (final column in columns) normalized(column): column,
  };
  final result = <String, String?>{};
  for (final entry in synonyms.entries) {
    String? match;
    for (final synonym in entry.value) {
      final target = normalized(synonym);
      match = normalizedColumns[target];
      match ??= normalizedColumns.entries
          .where(
            (column) =>
                column.key.contains(target) || target.contains(column.key),
          )
          .map((column) => column.value)
          .firstOrNull;
      if (match != null) break;
    }
    result[entry.key] = match;
  }
  return result;
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
