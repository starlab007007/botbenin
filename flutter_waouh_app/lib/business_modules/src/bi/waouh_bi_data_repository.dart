import 'package:supabase_flutter/supabase_flutter.dart';

import 'waouh_bi_data_models.dart';

class WaouhBiDataRepository {
  const WaouhBiDataRepository(this.client);

  final SupabaseClient client;

  String get _userId =>
      client.auth.currentUser?.id ??
      (throw StateError('Connectez-vous avant d’utiliser BI / Analyse.'));

  Future<List<WaouhBiSource>> fetchSources() async {
    final rows = await client
        .from('waouh_bi_sources')
        .select()
        .eq('user_id', _userId)
        .order('updated_at', ascending: false);
    return (rows as List)
        .whereType<Map>()
        .map((item) => WaouhBiSource.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<List<Map<String, dynamic>>> fetchRows(
    String sourceId, {
    int limit = 20,
  }) async {
    final rows = await client
        .from('waouh_bi_source_rows')
        .select('row_number,row_data')
        .eq('source_id', sourceId)
        .eq('user_id', _userId)
        .order('row_number')
        .limit(limit);
    return (rows as List).whereType<Map>().map((item) {
      final value = item['row_data'];
      return value is Map
          ? Map<String, dynamic>.from(value)
          : <String, dynamic>{};
    }).toList();
  }

  Future<WaouhBiSource> importSource(WaouhBiImportPayload payload) async {
    if (payload.rows.isEmpty) {
      throw ArgumentError('La source ne contient aucune ligne exploitable.');
    }
    if (payload.rows.length > 5000) {
      throw ArgumentError('Import limité à 5 000 lignes par source.');
    }
    final sourceId = await client.rpc(
      'waouh_bi_store_source',
      params: {
        'p_name': payload.name.trim(),
        'p_source_type': payload.type.value,
        'p_source_url': payload.sourceUrl?.trim(),
        'p_columns': payload.columns,
        'p_rows': payload.rows,
        'p_metadata': payload.metadata,
      },
    );
    final id = '$sourceId'.trim();
    if (id.isEmpty || id == 'null') {
      throw StateError('La source BI n’a pas été enregistrée.');
    }
    final row = await client
        .from('waouh_bi_sources')
        .select()
        .eq('id', id)
        .eq('user_id', _userId)
        .single();
    return WaouhBiSource.fromJson(Map<String, dynamic>.from(row));
  }

  Future<WaouhBiQueryResult> ask({
    required String sourceId,
    required String question,
  }) async {
    final clean = question.trim();
    if (clean.isEmpty) {
      throw ArgumentError.value(question, 'question', 'Question obligatoire');
    }
    final response = await client.functions.invoke(
      'waouh-bi-query',
      body: {'source_id': sourceId, 'question': clean},
    );
    if (response.data is! Map) {
      throw StateError('Réponse BI invalide.');
    }
    final data = Map<String, dynamic>.from(response.data as Map);
    final error = '${data['error'] ?? ''}'.trim();
    if (error.isNotEmpty) throw StateError(error);
    final result = data['result'];
    if (result is! Map) throw StateError('Résultat BI absent.');
    return WaouhBiQueryResult.fromJson(Map<String, dynamic>.from(result));
  }

  Future<void> deleteSource(String sourceId) async {
    await client
        .from('waouh_bi_sources')
        .delete()
        .eq('id', sourceId)
        .eq('user_id', _userId);
  }
}
