import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/fa_ia_models.dart';

class FaIaJournalRepository {
  const FaIaJournalRepository();

  static const _storageKey = 'waouh_fa_ia_journal_v1';
  static const _maxEntries = 100;

  Future<List<FaConsultation>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getStringList(_storageKey) ?? const <String>[];
    final entries = <FaConsultation>[];

    for (final item in raw) {
      try {
        entries.add(
          FaConsultation.fromJson(
            Map<String, dynamic>.from(jsonDecode(item) as Map),
          ),
        );
      } catch (_) {
        // Ignore only the corrupted entry; preserve the rest of the journal.
      }
    }

    entries.sort((left, right) => right.createdAt.compareTo(left.createdAt));
    return entries;
  }

  Future<void> save(FaConsultation consultation) async {
    final preferences = await SharedPreferences.getInstance();
    final current = await load();
    final withoutDuplicate = current
        .where((entry) => entry.id != consultation.id)
        .toList();
    final next = <FaConsultation>[consultation, ...withoutDuplicate]
        .take(_maxEntries)
        .map((entry) => jsonEncode(entry.toJson()))
        .toList(growable: false);
    await preferences.setStringList(_storageKey, next);
  }

  Future<void> delete(String id) async {
    final preferences = await SharedPreferences.getInstance();
    final current = await load();
    final next = current
        .where((entry) => entry.id != id)
        .map((entry) => jsonEncode(entry.toJson()))
        .toList(growable: false);
    await preferences.setStringList(_storageKey, next);
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_storageKey);
  }
}
