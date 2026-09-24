import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import '../data/fa_web_catalog.dart';
import '../domain/fa_web_models.dart';

class FaWebLocalStore {
  static const _journalKey = 'fa_ia_journal_v5_2';
  static const _deviceKey = 'fa_ia_device_v1';
  static const _codeKey = 'fa_ia_access_code_v1';

  Future<String> deviceId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_deviceKey)?.trim();
    if (existing != null && existing.isNotEmpty) return existing;

    final random = Random.secure();
    final value =
        'flutter-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}-'
        '${List.generate(4, (_) => random.nextInt(1 << 30).toRadixString(36)).join()}';
    await prefs.setString(_deviceKey, value);
    return value;
  }

  Future<String?> accessCode() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_codeKey)?.replaceAll(RegExp(r'\D'), '');
    return value != null && value.length == 6 ? value : null;
  }

  Future<void> setAccessCode(String? value) async {
    final prefs = await SharedPreferences.getInstance();
    final clean = value?.replaceAll(RegExp(r'\D'), '');
    if (clean != null && clean.length == 6) {
      await prefs.setString(_codeKey, clean);
    } else {
      await prefs.remove(_codeKey);
    }
  }

  Future<List<FaWebJournalEntry>> loadJournal() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_journalKey);
    if (raw == null || raw.trim().isEmpty) return <FaWebJournalEntry>[];

    try {
      final decoded = jsonDecode(raw);
      final items = decoded is List
          ? decoded
          : decoded is Map
              ? decoded['entries']
              : null;
      if (items is! List) return <FaWebJournalEntry>[];

      final entries = <FaWebJournalEntry>[];
      for (final item in items) {
        if (item is! Map) continue;
        final entry = _entryFromJson(Map<String, dynamic>.from(item));
        if (entry != null) entries.add(entry);
      }
      entries.sort((a, b) => b.date.compareTo(a.date));
      return entries;
    } catch (_) {
      return <FaWebJournalEntry>[];
    }
  }

  Future<void> saveEntry(FaWebJournalEntry entry) async {
    final entries = await loadJournal();
    final index = entries.indexWhere((item) => item.id == entry.id);
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.insert(0, entry);
    }
    await _write(entries);
  }

  Future<void> deleteEntry(String id) async {
    final entries = await loadJournal();
    entries.removeWhere((entry) => entry.id == id);
    await _write(entries);
  }

  Future<void> clearJournal() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_journalKey);
  }

  Future<void> _write(List<FaWebJournalEntry> entries) async {
    final prefs = await SharedPreferences.getInstance();
    final wrapper = <String, dynamic>{
      'version': '5.2',
      'corpus_version': '2026-07-23-corpus-book-256-v14',
      'corpus_presentation_version': '2026-07-24-corpus-presentation-v15',
      'entries': entries.take(100).map((entry) => entry.toJson()).toList(),
    };
    await prefs.setString(_journalKey, jsonEncode(wrapper));
  }

  FaWebJournalEntry? _entryFromJson(Map<String, dynamic> json) {
    final signRaw = json['sign'];
    if (signRaw is! Map) return null;
    final signJson = Map<String, dynamic>.from(signRaw);

    final xIndex = _asInt(signJson['x']) ?? _asInt(signJson['x_index']);
    final yIndex = _asInt(signJson['y']) ?? _asInt(signJson['y_index']);
    if (xIndex == null || yIndex == null) return null;

    final facesRaw = json['faces'];
    final faces =
        facesRaw is List ? facesRaw.map(faWebFaceFrom).toList() : <FaWebFace>[];
    if (faces.length != 8) return null;

    final columnA = _stringList(signJson['column_a']);
    final columnB = _stringList(signJson['column_b']);
    final fallback = FaWebCatalog.resolve(faces);

    final sign = FaWebCatalog.restore(
      xIndex: xIndex,
      yIndex: yIndex,
      columnA: columnA.length == 4 ? columnA : fallback.columnA,
      columnB: columnB.length == 4 ? columnB : fallback.columnB,
      reference:
          '${signJson['ref'] ?? signJson['reference'] ?? fallback.reference}',
      name: '${signJson['name'] ?? fallback.name}',
      corpusKey: '${signJson['corpus_key'] ?? fallback.corpusKey}',
    );

    final messagesRaw = json['msg'] ?? json['messages'];
    final messages = messagesRaw is List
        ? messagesRaw
            .whereType<Map>()
            .map((item) => FaWebChatMessage.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList()
        : <FaWebChatMessage>[];

    final date =
        DateTime.tryParse('${json['date'] ?? ''}')?.toLocal() ?? DateTime.now();

    return FaWebJournalEntry(
      id: '${json['id'] ?? 'fa-${date.microsecondsSinceEpoch}'}',
      date: date,
      category: '${json['cat'] ?? json['category'] ?? 'Question libre'}',
      rawIntention: '${json['raw'] ?? json['raw_intention'] ?? ''}',
      intention: '${json['intent'] ?? json['intention'] ?? ''}',
      faces: faces,
      sign: sign,
      messages: messages,
      favorite: json['fav'] == true || json['favorite'] == true,
    );
  }

  static List<String> _stringList(Object? value) {
    if (value is! List) return <String>[];
    return value.map((item) => '$item').toList();
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse('$value');
  }
}
