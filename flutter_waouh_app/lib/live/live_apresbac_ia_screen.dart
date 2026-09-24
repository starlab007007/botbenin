import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'apresbac_notes_sheet.dart';
import 'apresbac_ocr_service.dart';

class LiveApresBacIaScreen extends StatefulWidget {
  const LiveApresBacIaScreen({super.key, required this.client});

  final SupabaseClient client;

  @override
  State<LiveApresBacIaScreen> createState() => _LiveApresBacIaScreenState();
}

class _LiveApresBacIaScreenState extends State<LiveApresBacIaScreen> {
  static const green = Color(0xFF075E54);
  static const darkGreen = Color(0xFF06483F);
  static const purple = Color(0xFFB0448E);
  static const ink = Color(0xFF10211C);
  static const muted = Color(0xFF66736F);
  static const canvas = Color(0xFFF2F7F5);
  static const line = Color(0xFFDDE9E5);
  static const localNotesKey = 'waouh_apresbac_notes_v2_13';

  static const bacSeries = <String>[
    'Toutes',
    'A1',
    'A2',
    'B',
    'C',
    'D',
    'E',
    'F1',
    'F2',
    'F3',
    'F4',
    'G1',
    'G2',
    'G3',
    'EA',
    'DEAT',
    'DT',
  ];

  static const fallbackSubjects = <String>[
    'Mathématiques',
    'PCT/SPCT',
    'SVT',
    'Français',
    'Anglais',
    'Histoire-Géographie',
    'Philosophie',
    'Économie',
    'Comptabilité',
    'Dessin',
    'Informatique',
  ];

  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  final _ocrService = ApresBacOcrService();

  final List<_ChatItem> _messages = [
    const _ChatItem(
      assistant: true,
      text:
          'Bonjour. Ajoute ou scanne tes notes, puis analyse ton profil, '
          'reçois des recommandations, vérifie les calculs de classement '
          'possibles et consulte les universités qui proposent les filières.',
      followUps: [
        'Analyse mon profil',
        'Vérifie les calculs de classement possibles',
        'Montre les universités qui proposent ces filières',
      ],
    ),
  ];

  final List<Map<String, dynamic>> _localNotes = [];

  String _series = 'Toutes';
  String? _sessionId;
  String _serviceStatus = 'CHECKING';
  String _serviceMessage = 'Connexion à AprèsBac IA…';
  bool _sending = false;
  bool _profileBusy = false;
  bool _initialized = false;
  int _savedNotesCount = 0;
  int _catalogCount = 0;
  int _requestCounter = 0;

  String? get _selectedSeries => _series == 'Toutes' ? null : _series;

  List<Map<String, dynamic>> get _notesForSelectedSeries {
    final series = _selectedSeries;

    if (series == null) return List.of(_localNotes);

    return _localNotes
        .where(
          (note) =>
              note['bac_series']?.toString().toUpperCase() ==
              series.toUpperCase(),
        )
        .map(Map<String, dynamic>.from)
        .toList();
  }

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    await _loadLocalNotes();

    if (!mounted) return;

    setState(() => _initialized = true);

    await Future.wait([
      _healthCheck(),
      _loadCatalogStats(silent: true),
      _mergeCloudProfile(silent: true),
    ]);
  }

  Future<void> _loadLocalNotes() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final raw = preferences.getString(localNotesKey);

      if (raw == null || raw.trim().isEmpty) return;

      final decoded = jsonDecode(raw);

      if (decoded is! List) return;

      _localNotes
        ..clear()
        ..addAll(
          decoded
              .whereType<Map>()
              .map(Map<String, dynamic>.from)
              .where(
                (note) => note['subject'] != null && note['score'] != null,
              ),
        );

      _updateNoteCount();
    } catch (_) {
      // Une corruption locale ne doit jamais bloquer le module.
    }
  }

  Future<void> _persistLocalNotes() async {
    final preferences = await SharedPreferences.getInstance();

    await preferences.setString(localNotesKey, jsonEncode(_localNotes));
  }

  void _updateNoteCount() {
    _savedNotesCount = _notesForSelectedSeries.length;
  }

  String _newRequestId() =>
      'android-v214-${DateTime.now().microsecondsSinceEpoch}-${_requestCounter++}';

  Map<String, dynamic> _enrichPayload(
    Map<String, dynamic> body,
    String requestId,
  ) {
    final conversation = _messages.reversed
        .take(8)
        .toList()
        .reversed
        .map(
          (item) => {
            'role': item.assistant ? 'assistant' : 'user',
            'content': item.text,
          },
        )
        .toList();

    return {
      ...body,
      'request_id': requestId,
      'notes': body.containsKey('notes')
          ? body['notes']
          : _notesForSelectedSeries,
      'conversation': conversation,
      'context': {
        'module_version': '2.14.0',
        'locale': 'fr-BJ',
        'response_profile': 'COMPACT_DYNAMIC',
        'max_results': 6,
        'include': {
          'quotas': true,
          'subjects': true,
          'outcomes': true,
          'occupations': true,
          'calculations': true,
          'official_ranking_verification': true,
          'offering_universities': true,
          'sources': false,
          'confidence': false,
          'anomalies': false,
          'follow_up_suggestions': true,
        },
      },
    };
  }

  Future<Map<String, dynamic>> _invoke(
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 24),
    bool retry = true,
  }) async {
    final requestId = _newRequestId();
    final payload = _enrichPayload(body, requestId);
    Object? lastError;

    for (var attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
      try {
        final response = await widget.client.functions
            .invoke(
              'waouh-apresbac-chat',
              body: payload,
              headers: {'x-request-id': requestId},
            )
            .timeout(timeout);

        return _decodeResponse(response.data);
      } on TimeoutException catch (error) {
        lastError = error;

        if (attempt == 0 && retry) {
          await Future<void>.delayed(const Duration(milliseconds: 650));
          continue;
        }

        throw const _ApresBacUiException(
          message:
              'Le service met trop de temps à répondre. La requête a été '
              'libérée : vérifie Internet puis réessaie.',
          stage: 'CLIENT_TIMEOUT',
        );
      } on FunctionException catch (error) {
        lastError = error;

        if (attempt == 0 &&
            retry &&
            (error.status == 401 ||
                error.status == 502 ||
                error.status == 503)) {
          try {
            await widget.client.auth.refreshSession();
          } catch (_) {
            // L’accès public continue même sans session.
          }

          await Future<void>.delayed(const Duration(milliseconds: 500));
          continue;
        }

        throw _ApresBacUiException(
          message: _friendlyFunctionException(error),
          stage: 'FUNCTION_EXCEPTION',
        );
      } catch (error) {
        lastError = error;

        final text = error.toString().toLowerCase();
        final retryable =
            text.contains('socket') ||
            text.contains('network') ||
            text.contains('connection') ||
            text.contains('handshake');

        if (attempt == 0 && retry && retryable) {
          await Future<void>.delayed(const Duration(milliseconds: 650));
          continue;
        }

        rethrow;
      }
    }

    throw _ApresBacUiException(
      message: 'AprèsBac IA n’a pas répondu. Réessaie dans quelques secondes.',
      technicalMessage: lastError?.toString(),
    );
  }

  Map<String, dynamic> _decodeResponse(dynamic raw) {
    Map<String, dynamic>? data;

    if (raw is Map) {
      data = Map<String, dynamic>.from(raw);
    } else if (raw is String) {
      try {
        final decoded = jsonDecode(raw);

        if (decoded is Map) {
          data = Map<String, dynamic>.from(decoded);
        }
      } catch (_) {
        data = null;
      }
    }

    if (data == null) {
      throw const _ApresBacUiException(
        message: 'La réponse du service est invalide. Actualise puis réessaie.',
      );
    }

    if (data['ok'] == false || data['error'] != null) {
      throw _ApresBacUiException(
        message: _responseMessage(data),
        stage: data['stage']?.toString(),
        technicalMessage: data['technical_message']?.toString(),
      );
    }

    return data;
  }

  String _friendlyFunctionException(FunctionException error) {
    final details = error.details;

    if (details is Map) {
      return _responseMessage(Map<String, dynamic>.from(details));
    }

    if (details is String && details.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(details);

        if (decoded is Map) {
          return _responseMessage(Map<String, dynamic>.from(decoded));
        }
      } catch (_) {
        return details.trim();
      }
    }

    return error.reasonPhrase?.trim().isNotEmpty == true
        ? error.reasonPhrase!.trim()
        : 'Le service AprèsBac IA est momentanément indisponible.';
  }

  Future<void> _healthCheck() async {
    try {
      final data = await _invoke({
        'action': 'health',
      }, timeout: const Duration(seconds: 14));

      final catalog = data['catalog'];
      final count = catalog is Map
          ? int.tryParse(catalog['programs']?.toString() ?? '') ?? 0
          : 0;

      if (!mounted) return;

      setState(() {
        _serviceStatus = data['status']?.toString() ?? 'ONLINE';
        _serviceMessage =
            data['message']?.toString() ?? 'AprèsBac IA est opérationnel.';
        if (count > 0) _catalogCount = count;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _serviceStatus = 'DEGRADED';
        _serviceMessage = _friendlyError(error);
      });
    }
  }

  Future<void> _loadCatalogStats({bool silent = false}) async {
    try {
      final data = await _invoke({'action': 'catalog_stats'});

      final stats = data['stats'];
      final count = stats is Map
          ? int.tryParse(stats['published_programs']?.toString() ?? '') ?? 0
          : 0;

      if (!mounted) return;

      setState(() {
        _catalogCount = count;
      });
    } catch (error) {
      if (!silent && mounted) {
        _showSnack(_friendlyError(error));
      }
    }
  }

  Future<void> _mergeCloudProfile({bool silent = false}) async {
    try {
      final data = await _invoke({'action': 'get_profile'});

      final profile = data['profile'];
      final remoteNotes = profile is Map ? profile['notes'] : null;

      if (remoteNotes is! List || remoteNotes.isEmpty) return;

      var changed = false;

      for (final raw in remoteNotes.whereType<Map>()) {
        final note = Map<String, dynamic>.from(raw);
        final subject = note['subject']?.toString().trim();
        final score = double.tryParse(
          note['score']?.toString().replaceAll(',', '.') ?? '',
        );

        if (subject == null || subject.isEmpty || score == null) {
          continue;
        }

        final series = note['bac_series']?.toString().trim().isNotEmpty == true
            ? note['bac_series'].toString()
            : _selectedSeries;

        if (series == null) continue;

        _upsertLocalNote(
          series: series,
          subject: subject,
          score: score,
          confidence: double.tryParse(note['confidence']?.toString() ?? ''),
        );
        changed = true;
      }

      if (changed) {
        await _persistLocalNotes();

        if (!mounted) return;

        setState(_updateNoteCount);
      }
    } catch (error) {
      if (!silent && mounted) {
        _showSnack(_friendlyError(error));
      }
    }
  }

  Future<List<String>> _loadSuggestions() async {
    try {
      final data = await _invoke({
        'action': 'subject_suggestions',
        'bac_series': _selectedSeries,
      });

      final suggestions =
          (data['suggestions'] as List?)
              ?.map((item) => item.toString().trim())
              .where((item) => item.isNotEmpty)
              .toSet()
              .toList() ??
          const <String>[];

      return suggestions.isEmpty ? fallbackSubjects : suggestions;
    } catch (_) {
      return fallbackSubjects;
    }
  }

  Future<void> _send([String? preset]) async {
    final message = (preset ?? _controller.text).trim();

    if (message.isEmpty || _sending) return;

    _focusNode.unfocus();

    setState(() {
      _messages.add(_ChatItem(assistant: false, text: message));
      _controller.clear();
      _sending = true;
    });

    _scrollToBottom();

    try {
      final data = await _invoke({
        'action': 'chat',
        'message': message,
        'bac_series': _selectedSeries,
        'session_id': _sessionId,
      });

      final programs = _maps(data['programs']);
      final sections = _maps(data['sections']);
      final followUps = _strings(data['follow_up_suggestions']);

      if (!mounted) return;

      setState(() {
        _sessionId = data['session_id']?.toString();
        _serviceStatus = 'ONLINE';
        _serviceMessage = 'Réponse reçue en ${data['duration_ms'] ?? '?'} ms';
        _messages.add(
          _ChatItem(
            assistant: true,
            text:
                data['answer']?.toString() ??
                'La réponse ne contient aucun texte.',
            summary: data['summary']?.toString(),
            sections: sections,
            programs: programs,
            followUps: followUps,
            disclaimer: data['disclaimer']?.toString(),
            meta: data['meta'] is Map
                ? Map<String, dynamic>.from(data['meta'])
                : const {},
            retryPrompt: message,
          ),
        );
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _serviceStatus = 'DEGRADED';
        _serviceMessage = _friendlyError(error);
        _messages.add(
          _ChatItem(
            assistant: true,
            error: true,
            text: _friendlyError(error),
            retryPrompt: message,
          ),
        );
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  Future<void> _runProfileAction({
    required String action,
    required String prompt,
    required String fallback,
  }) async {
    final series = _selectedSeries;

    if (series == null) {
      _showSeriesRequired();
      return;
    }

    if (_sending) return;

    setState(() {
      _sending = true;
      _messages.add(_ChatItem(assistant: false, text: prompt));
    });

    _scrollToBottom();

    try {
      final data = await _invoke({
        'action': action,
        'bac_series': series,
        'notes': _notesForSelectedSeries,
      });

      if (!mounted) return;

      setState(() {
        _messages.add(
          _ChatItem(
            assistant: true,
            text: data['answer']?.toString() ?? fallback,
            summary: data['summary']?.toString(),
            sections: _maps(data['sections']),
            programs: _maps(data['programs']),
            followUps: _strings(data['follow_up_suggestions']),
            disclaimer: data['disclaimer']?.toString(),
            meta: data['analysis'] is Map
                ? Map<String, dynamic>.from(data['analysis'])
                : const {},
            retryPrompt: prompt,
          ),
        );
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _messages.add(
          _ChatItem(
            assistant: true,
            error: true,
            text: _friendlyError(error),
            retryPrompt: prompt,
          ),
        );
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  bool get _hasNotesForSelectedSeries => _notesForSelectedSeries.isNotEmpty;

  Future<void> _showAddNotesPrompt({required String purpose}) async {
    final series = _selectedSeries;

    if (series == null) {
      _showSeriesRequired();
      return;
    }

    if (!mounted) return;

    final action = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              purpose,
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              'Ajoute les notes du Bac $series pour obtenir une analyse '
              'personnalisée, des recommandations classées et une '
              'éligibilité indicative.',
              style: const TextStyle(color: muted, height: 1.4),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.pop(sheetContext, 'manual'),
              icon: const Icon(Icons.add_chart_rounded),
              label: const Text('Ajouter mes notes'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: green,
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(sheetContext, 'scan'),
              icon: const Icon(Icons.document_scanner_outlined),
              label: const Text('Scanner mon relevé'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
          ],
        ),
      ),
    );

    if (!mounted || action == null) return;

    if (action == 'manual') {
      await _openManualNotes();
    } else if (action == 'scan') {
      await _scanTranscript();
    }
  }

  Future<bool> _ensurePersonalizedNotes({required String purpose}) async {
    if (_selectedSeries == null) {
      _showSeriesRequired();
      return false;
    }

    if (_hasNotesForSelectedSeries) return true;

    await _showAddNotesPrompt(purpose: purpose);
    return false;
  }

  Future<void> _analyzeProfile() async {
    final ready = await _ensurePersonalizedNotes(
      purpose: 'Analyser mon profil',
    );

    if (!ready) return;

    await _runProfileAction(
      action: 'analyze_profile',
      prompt: 'Analyse mon profil à partir de mes notes.',
      fallback: 'Analyse indisponible.',
    );
  }

  Future<void> _recommendPrograms() async {
    final ready = await _ensurePersonalizedNotes(
      purpose: 'Obtenir mes recommandations',
    );

    if (!ready) return;

    await _runProfileAction(
      action: 'recommendations',
      prompt:
          'Recommande-moi les filières les plus adaptées à ma série et à mes notes.',
      fallback: 'Recommandations indisponibles.',
    );
  }

  Future<void> _checkEligibility() async {
    final ready = await _ensurePersonalizedNotes(
      purpose: 'Vérifier mon éligibilité',
    );

    if (!ready) return;

    await _runProfileAction(
      action: 'eligibility',
      prompt:
          'Vérifie mon éligibilité indicative aux filières à partir de mes notes.',
      fallback: 'Vérification d’éligibilité indisponible.',
    );
  }

  Future<void> _verifyOfficialRanking() async {
    final ready = await _ensurePersonalizedNotes(
      purpose: 'Vérifier les calculs de classement',
    );

    if (!ready) return;

    await _runProfileAction(
      action: 'official_ranking',
      prompt:
          'Vérifie les calculs de classement possibles avec mes notes et indique clairement les formules disponibles ou manquantes.',
      fallback: 'Vérification des calculs indisponible.',
    );
  }

  Future<void> _showOfferingUniversities() async {
    final ready = await _ensurePersonalizedNotes(
      purpose: 'Afficher les universités et établissements',
    );

    if (!ready) return;

    await _runProfileAction(
      action: 'universities',
      prompt:
          'Présente les universités et établissements qui proposent les filières adaptées à ma série et à mes notes.',
      fallback: 'Liste des universités indisponible.',
    );
  }

  void _handlePrimaryAction(String action) {
    if (_sending || _profileBusy) return;

    switch (action) {
      case 'manual':
        unawaited(_openManualNotes());
        return;
      case 'scan':
        unawaited(_scanTranscript());
        return;
      case 'analyze':
        unawaited(_analyzeProfile());
        return;
      case 'recommendations':
        unawaited(_recommendPrograms());
        return;
      case 'eligibility':
        unawaited(_checkEligibility());
        return;
      case 'official_ranking':
        unawaited(_verifyOfficialRanking());
        return;
      case 'universities':
        unawaited(_showOfferingUniversities());
        return;
      case 'discover':
        unawaited(
          _send('Présente-moi les filières compatibles avec ma série.'),
        );
        return;
    }
  }

  _ChatItem get _welcomeMessage => const _ChatItem(
    assistant: true,
    text:
        'Bonjour. Ajoute ou scanne tes notes, puis analyse ton profil, '
        'reçois des recommandations, vérifie les calculs de classement '
        'possibles et consulte les universités qui proposent les filières.',
    followUps: [
      'Analyse mon profil',
      'Vérifie les calculs de classement possibles',
      'Montre les universités qui proposent ces filières',
    ],
  );

  Future<void> _resetExperience() async {
    if (_sending || _profileBusy || !mounted) return;

    final choice = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Tout effacer',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            const Text(
              'Choisis ce qui doit être réinitialisé. Les notes sont '
              'conservées sauf si tu sélectionnes la suppression complète.',
              style: TextStyle(color: muted, height: 1.4),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.pop(sheetContext, 'chat'),
              icon: const Icon(Icons.delete_sweep_outlined),
              label: const Text('Effacer recherches et chat'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: green,
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(sheetContext, 'all'),
              icon: const Icon(Icons.delete_forever_outlined),
              label: const Text('Tout effacer, y compris mes notes'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                foregroundColor: Colors.red.shade700,
              ),
            ),
          ],
        ),
      ),
    );

    if (!mounted || choice == null) return;

    setState(() => _profileBusy = true);

    try {
      final removeNotes = choice == 'all';

      if (removeNotes) {
        final preferences = await SharedPreferences.getInstance();
        await preferences.remove(localNotesKey);
        _localNotes.clear();
      }

      try {
        await _invoke(
          {'action': removeNotes ? 'reset_all' : 'reset_chat'},
          timeout: const Duration(seconds: 12),
          retry: false,
        );
      } catch (_) {
        // La réinitialisation locale reste prioritaire et fonctionnelle.
      }

      if (!mounted) return;

      setState(() {
        _sessionId = null;
        _controller.clear();
        _messages
          ..clear()
          ..add(_welcomeMessage);

        if (removeNotes) {
          _series = 'Toutes';
        }

        _updateNoteCount();
      });

      _focusNode.unfocus();
      _scrollToBottom();

      _showSnack(
        removeNotes
            ? 'Recherches, chat et notes réinitialisés.'
            : 'Recherches et chat réinitialisés. Les notes sont conservées.',
      );
    } finally {
      if (mounted) {
        setState(() => _profileBusy = false);
      }
    }
  }

  Future<void> _refreshModule() async {
    if (_profileBusy) return;

    setState(() => _profileBusy = true);

    try {
      await Future.wait([
        _healthCheck(),
        _loadCatalogStats(silent: true),
        _mergeCloudProfile(silent: true),
      ]);

      if (!mounted) return;

      _showSnack('AprèsBac IA est synchronisé et opérationnel.');
    } finally {
      if (mounted) {
        setState(() => _profileBusy = false);
      }
    }
  }

  Future<void> _openManualNotes() async {
    final series = _selectedSeries;

    if (series == null) {
      _showSeriesRequired();
      return;
    }

    final suggestions = await _loadSuggestions();

    if (!mounted) return;

    final submission = await showModalBottomSheet<ApresBacNotesSubmission>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ApresBacNotesSheet(
        series: series,
        source: 'MANUAL',
        suggestions: suggestions,
      ),
    );

    if (submission == null) return;

    await _saveNotes(series: series, source: 'MANUAL', submission: submission);
  }

  Future<void> _scanTranscript() async {
    final series = _selectedSeries;

    if (series == null) {
      _showSeriesRequired();
      return;
    }

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Scanner mon relevé',
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'L’image reste sur le téléphone. Vérifie toutes les notes '
              'détectées avant l’enregistrement.',
              style: TextStyle(color: muted, height: 1.4),
            ),
            const SizedBox(height: 10),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Prendre une photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choisir dans la galerie'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    setState(() => _profileBusy = true);

    try {
      final result = await _ocrService.scan(source: source);

      if (result == null || !mounted) return;

      final suggestions = await _loadSuggestions();

      if (!mounted) return;

      final submission = await showModalBottomSheet<ApresBacNotesSubmission>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => ApresBacNotesSheet(
          series: series,
          source: 'OCR',
          suggestions: suggestions,
          ocrNotes: result.notes,
          rawOcrText: result.text,
        ),
      );

      if (submission == null) return;

      await _saveNotes(
        series: series,
        source: 'OCR',
        submission: submission,
        rawOcrText: result.text,
      );
    } catch (error) {
      if (!mounted) return;

      _showSnack('Le relevé n’a pas pu être analysé. ${_friendlyError(error)}');
    } finally {
      if (mounted) {
        setState(() => _profileBusy = false);
      }
    }
  }

  void _upsertLocalNote({
    required String series,
    required String subject,
    required double score,
    double? confidence,
  }) {
    final normalizedSubject = _normalizeSubject(subject);
    final index = _localNotes.indexWhere(
      (item) =>
          item['bac_series']?.toString().toUpperCase() ==
              series.toUpperCase() &&
          _normalizeSubject(item['subject']?.toString() ?? '') ==
              normalizedSubject,
    );

    final value = <String, dynamic>{
      'bac_series': series.toUpperCase(),
      'subject': subject.trim(),
      'score': score,
      'confidence': confidence,
      'updated_at': DateTime.now().toIso8601String(),
    };

    if (index < 0) {
      _localNotes.add(value);
    } else {
      _localNotes[index] = value;
    }
  }

  Future<void> _saveNotes({
    required String series,
    required String source,
    required ApresBacNotesSubmission submission,
    String? rawOcrText,
  }) async {
    for (final note in submission.notes) {
      _upsertLocalNote(
        series: series,
        subject: note.subject,
        score: note.score,
        confidence: note.confidence,
      );
    }

    await _persistLocalNotes();

    if (!mounted) return;

    setState(_updateNoteCount);

    var cloudMessage =
        'Notes enregistrées localement. L’analyse est disponible immédiatement.';

    try {
      final data = await _invoke({
        'action': 'save_notes',
        'bac_series': series,
        'source': source,
        'notes': _notesForSelectedSeries,
        'raw_ocr_text': rawOcrText,
        'keep_ocr_text': submission.keepOcrText,
      });

      cloudMessage = data['message']?.toString() ?? cloudMessage;
    } catch (_) {
      // Le stockage local garantit le fonctionnement hors synchronisation.
    }

    if (!mounted) return;

    setState(() {
      _messages.add(
        _ChatItem(
          assistant: true,
          text:
              '$cloudMessage\n\n${_savedNotesCount} note(s) disponible(s) '
              'pour la série $series. Les recommandations et l’éligibilité sont prêtes.',
          followUps: const [
            'Recommande-moi les filières adaptées à mes notes',
            'Vérifie mon éligibilité indicative',
            'Analyse mon profil à partir de mes notes',
          ],
        ),
      );
    });

    _scrollToBottom();
  }

  List<Map<String, dynamic>> _maps(dynamic value) {
    return (value as List?)
            ?.whereType<Map>()
            .map(Map<String, dynamic>.from)
            .toList() ??
        const <Map<String, dynamic>>[];
  }

  List<String> _strings(dynamic value) {
    return (value as List?)
            ?.map((item) => item.toString().trim())
            .where((item) => item.isNotEmpty)
            .toList() ??
        const <String>[];
  }

  String _normalizeSubject(String value) {
    return value.toLowerCase().replaceAll(RegExp(r'[^a-zà-ÿ0-9]+'), ' ').trim();
  }

  String _responseMessage(Map<String, dynamic> data) {
    for (final key in ['message', 'details', 'technical_message', 'error']) {
      final value = data[key];

      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }

    return 'Erreur AprèsBac IA.';
  }

  String _friendlyError(Object error) {
    if (error is _ApresBacUiException) {
      return error.message;
    }

    if (error is TimeoutException) {
      return 'La requête a expiré. Tu peux immédiatement réessayer.';
    }

    final text = error.toString().toLowerCase();

    if (text.contains('socket') ||
        text.contains('network') ||
        text.contains('connection') ||
        text.contains('handshake')) {
      return 'Connexion indisponible. Vérifie Internet puis réessaie.';
    }

    return 'AprèsBac IA n’a pas pu terminer cette opération. '
        'La fenêtre reste disponible : actualise ou réessaie.';
  }

  void _showSeriesRequired() {
    _showSnack('Sélectionne d’abord ta série du Bac.');
  }

  void _showSnack(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;

      unawaited(
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
        ),
      );
    });
  }

  void _retry(String prompt) {
    if (_sending) return;
    unawaited(_send(prompt));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: canvas,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: green,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          tooltip: 'Retour aux Bots',
          onPressed: () => context.go('/app/bots'),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        titleSpacing: 4,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AprèsBac IA', style: TextStyle(fontWeight: FontWeight.w900)),
            Text(
              'Orientation intelligente, publique et explicable',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, color: Color(0xFFD7FFF0)),
            ),
          ],
        ),
        actions: [
          if (_profileBusy)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Center(
                child: SizedBox(
                  width: 19,
                  height: 19,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
              ),
            )
          else
            IconButton(
              tooltip: 'Tester et synchroniser',
              onPressed: _refreshModule,
              icon: const Icon(Icons.sync_rounded),
            ),
          IconButton(
            tooltip: 'Nouvelle conversation',
            onPressed: _sending
                ? null
                : () => setState(() {
                    _sessionId = null;
                    _controller.clear();
                    _messages
                      ..clear()
                      ..add(_welcomeMessage);
                  }),
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            tooltip: 'Tout effacer',
            onPressed: _sending || _profileBusy ? null : _resetExperience,
            icon: const Icon(Icons.delete_sweep_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            return Column(
              children: [
                _StatusStrip(
                  status: _serviceStatus,
                  message: _serviceMessage,
                  onRetry: _healthCheck,
                ),
                _PersistentActionsBar(
                  notesCount: _savedNotesCount,
                  busy: _sending || _profileBusy,
                  onAction: _handlePrimaryAction,
                ),
                _ResponsiveHeader(
                  selectedSeries: _series,
                  onSeriesChanged: (value) {
                    setState(() {
                      _series = value;
                      _updateNoteCount();
                    });
                  },
                  initialized: _initialized,
                  notesCount: _savedNotesCount,
                  catalogCount: _catalogCount,
                  busy: _sending || _profileBusy,
                ),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 18),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (_, index) {
                      if (index == _messages.length) {
                        return const _TypingBubble();
                      }

                      return _MessageBubble(
                        item: _messages[index],
                        onRetry: _retry,
                        onFollowUp: (value) => unawaited(_send(value)),
                      );
                    },
                  ),
                ),
                _Composer(
                  controller: _controller,
                  focusNode: _focusNode,
                  sending: _sending,
                  onSend: () => unawaited(_send()),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatusStrip extends StatelessWidget {
  const _StatusStrip({
    required this.status,
    required this.message,
    required this.onRetry,
  });

  final String status;
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final online = status == 'ONLINE';
    final checking = status == 'CHECKING';
    final color = online
        ? const Color(0xFF0B6B52)
        : checking
        ? const Color(0xFF7A5A10)
        : const Color(0xFF9A2F2F);
    final background = online
        ? const Color(0xFFE5F6EF)
        : checking
        ? const Color(0xFFFFF7DE)
        : const Color(0xFFFFEEEE);

    return Material(
      color: background,
      child: InkWell(
        onTap: online ? null : onRetry,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          child: Row(
            children: [
              if (checking)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(
                  online ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                  size: 17,
                  color: color,
                ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (!online && !checking)
                Icon(Icons.refresh_rounded, size: 18, color: color),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResponsiveHeader extends StatelessWidget {
  const _ResponsiveHeader({
    required this.selectedSeries,
    required this.onSeriesChanged,
    required this.initialized,
    required this.notesCount,
    required this.catalogCount,
    required this.busy,
  });

  final String selectedSeries;
  final ValueChanged<String> onSeriesChanged;
  final bool initialized;
  final int notesCount;
  final int catalogCount;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: Row(
          children: [
            Expanded(
              flex: 5,
              child: DropdownButtonFormField<String>(
                initialValue: selectedSeries,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Série du Bac',
                  prefixIcon: Icon(Icons.school_outlined),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: _LiveApresBacIaScreenState.bacSeries
                    .map(
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
                    )
                    .toList(),
                onChanged: initialized && !busy
                    ? (value) => onSeriesChanged(value ?? 'Toutes')
                    : null,
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              flex: 4,
              child: Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F8F6),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _LiveApresBacIaScreenState.line),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$notesCount note(s)',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        color: _LiveApresBacIaScreenState.green,
                      ),
                    ),
                    Text(
                      catalogCount > 0
                          ? '$catalogCount filières'
                          : 'Catalogue public',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _LiveApresBacIaScreenState.muted,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PersistentActionsBar extends StatefulWidget {
  const _PersistentActionsBar({
    required this.notesCount,
    required this.busy,
    required this.onAction,
  });

  final int notesCount;
  final bool busy;
  final ValueChanged<String> onAction;

  @override
  State<_PersistentActionsBar> createState() => _PersistentActionsBarState();
}

class _PersistentActionsBarState extends State<_PersistentActionsBar> {
  bool _collapsed = false;

  void _trigger(String action) {
    if (widget.busy) return;

    setState(() => _collapsed = true);
    widget.onAction(action);
  }

  @override
  Widget build(BuildContext context) {
    if (_collapsed) {
      return Material(
        color: Colors.white,
        elevation: 2,
        shadowColor: Colors.black12,
        child: InkWell(
          onTap: () => setState(() => _collapsed = false),
          child: SizedBox(
            height: 44,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.apps_rounded,
                    size: 20,
                    color: _LiveApresBacIaScreenState.green,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Outils AprèsBac',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  if (widget.notesCount > 0)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2F4ED),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        '${widget.notesCount} note(s)',
                        style: const TextStyle(
                          color: _LiveApresBacIaScreenState.green,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  const Text(
                    'Afficher',
                    style: TextStyle(
                      color: _LiveApresBacIaScreenState.green,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(width: 3),
                  const Icon(
                    Icons.expand_more_rounded,
                    color: _LiveApresBacIaScreenState.green,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 760 ? 8 : 4;
    final gridHeight = columns == 8 ? 86.0 : 166.0;

    final actions = <_GridActionData>[
      _GridActionData(
        icon: Icons.add_chart_rounded,
        label: 'Ajouter\nmes notes',
        action: 'manual',
        emphasized: true,
        badge: widget.notesCount > 0 ? '${widget.notesCount}' : null,
      ),
      const _GridActionData(
        icon: Icons.document_scanner_outlined,
        label: 'Scanner\nmon relevé',
        action: 'scan',
        emphasized: true,
      ),
      const _GridActionData(
        icon: Icons.analytics_outlined,
        label: 'Analyser\nmon profil',
        action: 'analyze',
      ),
      const _GridActionData(
        icon: Icons.auto_awesome_rounded,
        label: 'Mes\nrecommandations',
        action: 'recommendations',
      ),
      const _GridActionData(
        icon: Icons.verified_user_outlined,
        label: 'Mon\néligibilité',
        action: 'eligibility',
      ),
      const _GridActionData(
        icon: Icons.calculate_outlined,
        label: 'Classement\npossible',
        action: 'official_ranking',
      ),
      const _GridActionData(
        icon: Icons.account_balance_outlined,
        label: 'Universités\net écoles',
        action: 'universities',
      ),
      const _GridActionData(
        icon: Icons.travel_explore_rounded,
        label: 'Explorer\nles filières',
        action: 'discover',
      ),
    ];

    return Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black12,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 32,
            child: Padding(
              padding: const EdgeInsets.only(left: 12, right: 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.apps_rounded,
                    size: 17,
                    color: _LiveApresBacIaScreenState.green,
                  ),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      'Outils AprèsBac',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => setState(() => _collapsed = true),
                    icon: const Icon(Icons.expand_less_rounded, size: 18),
                    label: const Text('Réduire'),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      textStyle: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            height: gridHeight,
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 7),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 6,
                mainAxisSpacing: 6,
                childAspectRatio: columns == 8 ? 1.35 : 1.16,
              ),
              itemCount: actions.length,
              itemBuilder: (_, index) {
                final item = actions[index];

                return _GridActionButton(
                  data: item,
                  onTap: widget.busy ? null : () => _trigger(item.action),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _GridActionData {
  const _GridActionData({
    required this.icon,
    required this.label,
    required this.action,
    this.emphasized = false,
    this.badge,
  });

  final IconData icon;
  final String label;
  final String action;
  final bool emphasized;
  final String? badge;
}

class _GridActionButton extends StatelessWidget {
  const _GridActionButton({required this.data, required this.onTap});

  final _GridActionData data;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final background = data.emphasized
        ? const Color(0xFFE2F4ED)
        : const Color(0xFFF4F7F6);
    final foreground = data.emphasized
        ? _LiveApresBacIaScreenState.green
        : _LiveApresBacIaScreenState.ink;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: onTap == null ? const Color(0xFFF0F0F0) : background,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: data.emphasized
                      ? const Color(0xFFB8DECF)
                      : _LiveApresBacIaScreenState.line,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    data.icon,
                    size: 21,
                    color: onTap == null ? Colors.grey : foreground,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    data.label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: onTap == null ? Colors.grey : foreground,
                      fontSize: 9.4,
                      height: 1.05,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (data.badge != null)
          Positioned(
            right: -2,
            top: -3,
            child: Container(
              constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: _LiveApresBacIaScreenState.purple,
                shape: BoxShape.circle,
              ),
              child: Text(
                data.badge!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 8.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 12,
      shadowColor: Colors.black26,
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(10, 8, 10, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  minHeight: 50,
                  maxHeight: 132,
                ),
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 5,
                  enabled: !sending,
                  textCapitalization: TextCapitalization.sentences,
                  keyboardType: TextInputType.multiline,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText:
                        'Pose une question précise sur une filière, '
                        'un métier, une série ou un quota…',
                    filled: true,
                    fillColor: const Color(0xFFF3F7F5),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 50,
              height: 50,
              child: FilledButton(
                onPressed: sending ? null : onSend,
                style: FilledButton.styleFrom(
                  padding: EdgeInsets.zero,
                  shape: const CircleBorder(),
                  backgroundColor: _LiveApresBacIaScreenState.green,
                ),
                child: sending
                    ? const SizedBox(
                        width: 21,
                        height: 21,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  const _MessageBubble({
    required this.item,
    required this.onRetry,
    required this.onFollowUp,
  });

  final _ChatItem item;
  final ValueChanged<String> onRetry;
  final ValueChanged<String> onFollowUp;

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final isAssistant = item.assistant;
    final foreground = isAssistant
        ? _LiveApresBacIaScreenState.ink
        : Colors.white;
    final background = item.error
        ? const Color(0xFFFFEEEE)
        : isAssistant
        ? Colors.white
        : _LiveApresBacIaScreenState.green;
    final needsExpansion =
        isAssistant &&
        (item.text.length > 360 ||
            item.sections.isNotEmpty ||
            item.programs.length > 3 ||
            item.disclaimer?.trim().isNotEmpty == true);
    final visiblePrograms = _expanded
        ? item.programs.take(6)
        : item.programs.take(3);

    return Align(
      alignment: isAssistant ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        width: isAssistant
            ? double.infinity
            : MediaQuery.sizeOf(context).width * 0.84,
        margin: const EdgeInsets.only(bottom: 11),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(20),
          border: isAssistant
              ? Border.all(
                  color: item.error
                      ? const Color(0xFFE6B5B5)
                      : _LiveApresBacIaScreenState.line,
                )
              : null,
          boxShadow: isAssistant
              ? const [
                  BoxShadow(
                    blurRadius: 10,
                    offset: Offset(0, 3),
                    color: Color(0x0D000000),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.summary?.trim().isNotEmpty == true) ...[
              Text(
                item.summary!,
                style: const TextStyle(
                  color: _LiveApresBacIaScreenState.green,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 7),
            ],
            if (_expanded)
              SelectableText(
                item.text,
                style: TextStyle(color: foreground, height: 1.4, fontSize: 14),
              )
            else
              Text(
                item.text,
                maxLines: isAssistant ? 5 : null,
                overflow: isAssistant
                    ? TextOverflow.ellipsis
                    : TextOverflow.visible,
                style: TextStyle(color: foreground, height: 1.4, fontSize: 14),
              ),
            if (_expanded && item.sections.isNotEmpty) ...[
              const SizedBox(height: 10),
              ...item.sections.map(
                (section) => _ResponseSection(section: section),
              ),
            ],
            if (item.programs.isNotEmpty) ...[
              const SizedBox(height: 10),
              ...visiblePrograms.map(
                (program) =>
                    _ProgramCard(program: program, onVerify: widget.onFollowUp),
              ),
            ],
            if (needsExpansion) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(
                    _expanded
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                  ),
                  label: Text(_expanded ? 'Réduire' : 'Voir plus'),
                ),
              ),
            ],
            if (_expanded && item.disclaimer?.trim().isNotEmpty == true) ...[
              Text(
                item.disclaimer!,
                style: const TextStyle(
                  color: _LiveApresBacIaScreenState.muted,
                  fontSize: 10,
                  height: 1.3,
                ),
              ),
            ],
            if (item.error && item.retryPrompt != null) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => widget.onRetry(item.retryPrompt!),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ],
            if (item.followUps.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children: item.followUps
                    .take(3)
                    .map(
                      (value) => ActionChip(
                        avatar: const Icon(Icons.auto_awesome, size: 15),
                        label: Text(
                          value,
                          style: const TextStyle(fontSize: 10.5),
                        ),
                        onPressed: () => widget.onFollowUp(value),
                      ),
                    )
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResponseSection extends StatelessWidget {
  const _ResponseSection({required this.section});

  final Map<String, dynamic> section;

  @override
  Widget build(BuildContext context) {
    final title = section['title']?.toString().trim();
    final content = section['content']?.toString().trim();

    if (content == null || content.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FAF8),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _LiveApresBacIaScreenState.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title?.isNotEmpty == true) ...[
            Text(
              title!,
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 12,
                color: _LiveApresBacIaScreenState.green,
              ),
            ),
            const SizedBox(height: 5),
          ],
          SelectableText(
            content,
            style: const TextStyle(fontSize: 11.5, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({required this.program, required this.onVerify});

  final Map<String, dynamic> program;
  final ValueChanged<String> onVerify;

  String _value(String key, [String fallback = 'À confirmer']) {
    final value = program[key]?.toString().trim();
    return value == null || value.isEmpty ? fallback : value;
  }

  List<String> _list(String key) {
    return (program[key] as List?)
            ?.map((item) => item.toString().trim())
            .where((item) => item.isNotEmpty)
            .toList() ??
        const <String>[];
  }

  List<Map<String, dynamic>> _maps(String key) {
    return (program[key] as List?)
            ?.whereType<Map>()
            .map(Map<String, dynamic>.from)
            .toList() ??
        const <Map<String, dynamic>>[];
  }

  Color _eligibilityColor(String tone) {
    switch (tone) {
      case 'POSITIVE':
        return const Color(0xFF0B6B52);
      case 'WARNING':
        return const Color(0xFF9B6810);
      case 'CRITICAL':
        return const Color(0xFFA13A3A);
      default:
        return _LiveApresBacIaScreenState.muted;
    }
  }

  Color _calculationColor(String status) {
    switch (status) {
      case 'OFFICIAL_CALCULABLE':
        return const Color(0xFF0B6B52);
      case 'OFFICIAL_INCOMPLETE':
        return const Color(0xFF9B6810);
      default:
        return _LiveApresBacIaScreenState.muted;
    }
  }

  IconData _calculationIcon(String status) {
    switch (status) {
      case 'OFFICIAL_CALCULABLE':
        return Icons.verified_rounded;
      case 'OFFICIAL_INCOMPLETE':
        return Icons.pending_actions_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  String _formatCalculationNumber(dynamic value) {
    if (value == null) return '?';

    final parsed = double.tryParse(value.toString());

    if (parsed == null) return value.toString();

    final text = parsed == parsed.truncateToDouble()
        ? parsed.toStringAsFixed(0)
        : parsed.toStringAsFixed(2);

    return text.replaceAll('.', ',');
  }

  void _showOfficialCalculation(
    BuildContext context, {
    required String programName,
    required Map<String, dynamic> official,
    required List<Map<String, dynamic>> components,
    required List<String> missingSubjects,
    required Color color,
  }) {
    final status =
        official['status']?.toString() ?? 'OFFICIAL_RULE_UNAVAILABLE';
    final result = official['value'];
    final totalCoefficients = official['total_coefficients'];
    final weightedSum = official['weighted_sum'];
    final generalFormula =
        official['general_formula']?.toString() ??
        'M = (m₁×x + m₂×y + m₃×z) ÷ (x+y+z)';
    final rankingRule =
        official['ranking_rule']?.toString() ??
        'Le classement se fait de la moyenne la plus forte à la '
            'plus faible, dans la limite des quotas.';
    final complete = status == 'OFFICIAL_CALCULABLE';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) {
        return FractionallySizedBox(
          heightFactor: 0.86,
          child: Material(
            color: const Color(0xFFF7FAF9),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 24),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Icon(_calculationIcon(status), color: color),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Vérification du calcul',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            programName,
                            style: const TextStyle(
                              color: _LiveApresBacIaScreenState.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Fermer',
                      onPressed: () => Navigator.pop(sheetContext),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withValues(alpha: 0.28)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        official['label']?.toString() ?? 'Calcul de classement',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        official['message']?.toString() ??
                            'Aucune formule explicite disponible.',
                        style: const TextStyle(fontSize: 12, height: 1.4),
                      ),
                      if (result != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          '${_formatCalculationNumber(result)}/20',
                          style: TextStyle(
                            color: color,
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 13),
                const Text(
                  'Formule de classement',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: _LiveApresBacIaScreenState.line),
                  ),
                  child: SelectableText(
                    generalFormula,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      height: 1.5,
                    ),
                  ),
                ),
                if (components.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Détail du calcul',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                  const SizedBox(height: 6),
                  ...components.map((component) {
                    final subject = component['subject']?.toString() ?? '';
                    final score = _formatCalculationNumber(component['score']);
                    final coefficient = _formatCalculationNumber(
                      component['coefficient'],
                    );
                    final weighted = _formatCalculationNumber(
                      component['weighted_score'],
                    );

                    return Container(
                      margin: const EdgeInsets.only(bottom: 7),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(
                          color: _LiveApresBacIaScreenState.line,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              subject,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          Text(
                            component['score'] == null
                                ? 'Note manquante'
                                : '$score × $coefficient = $weighted',
                            style: TextStyle(
                              color: component['score'] == null
                                  ? const Color(0xFF9B6810)
                                  : _LiveApresBacIaScreenState.green,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
                if (complete &&
                    weightedSum != null &&
                    totalCoefficients != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(13),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2F4ED),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Text(
                      'M = (${_formatCalculationNumber(weightedSum)}) '
                      '÷ ${_formatCalculationNumber(totalCoefficients)} '
                      '= ${_formatCalculationNumber(result)}/20',
                      style: const TextStyle(
                        color: _LiveApresBacIaScreenState.green,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
                if (missingSubjects.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    'Notes manquantes : '
                    '${missingSubjects.join(', ')}',
                    style: const TextStyle(
                      color: Color(0xFF9B6810),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7DE),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    rankingRule,
                    style: const TextStyle(
                      color: Color(0xFF6D530B),
                      fontSize: 11.5,
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = _value('name');
    final scholarship = program['scholarship_quota'];
    final aid = program['aid_fpp_quota'];
    final fep = program['fep_quota'];
    final subjects = _list('subjects');
    final occupations = _list('occupations');
    final reasons = _list('reasons');
    final offerings = _maps('offering_institutions');
    final matchScore = program['match_score'];
    final relevantAverage = program['relevant_average'];

    final official = program['official_calculation'];
    final officialMap = official is Map
        ? Map<String, dynamic>.from(official)
        : const <String, dynamic>{};
    final officialStatus =
        officialMap['status']?.toString() ?? 'OFFICIAL_RULE_UNAVAILABLE';
    final officialColor = _calculationColor(officialStatus);
    final officialComponents =
        (officialMap['components'] as List?)
            ?.whereType<Map>()
            .map(Map<String, dynamic>.from)
            .toList() ??
        const <Map<String, dynamic>>[];
    final missingSubjects =
        (officialMap['missing_subjects'] as List?)
            ?.map((item) => item.toString())
            .where((item) => item.trim().isNotEmpty)
            .toList() ??
        const <String>[];

    final eligibility = program['eligibility'];
    final eligibilityMap = eligibility is Map
        ? Map<String, dynamic>.from(eligibility)
        : const <String, dynamic>{};
    final eligibilityLabel =
        eligibilityMap['label']?.toString() ??
        (matchScore == null ? 'À vérifier' : 'Compatibilité $matchScore %');
    final eligibilityTone = eligibilityMap['tone']?.toString() ?? 'NEUTRAL';
    final eligibilityColor = _eligibilityColor(eligibilityTone);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FAF9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _LiveApresBacIaScreenState.line),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        title: Text(
          name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_value('institution')} · ${_value('university')}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: _LiveApresBacIaScreenState.muted,
                fontSize: 10.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              eligibilityLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: eligibilityColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        trailing: matchScore == null
            ? const Icon(Icons.expand_more_rounded)
            : CircleAvatar(
                radius: 20,
                backgroundColor: eligibilityColor.withValues(alpha: 0.12),
                child: Text(
                  '$matchScore',
                  style: TextStyle(
                    color: eligibilityColor,
                    fontWeight: FontWeight.w900,
                    fontSize: 11,
                  ),
                ),
              ),
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _MiniChip(text: _value('admission_mode')),
              if (relevantAverage != null)
                _MiniChip(text: 'Matières $relevantAverage/20'),
              _MiniChip(
                text: scholarship == null
                    ? 'Bourse : à vérifier'
                    : 'Bourse : $scholarship',
              ),
              if (aid != null) _MiniChip(text: 'Aide/FPP : $aid'),
              if (fep != null) _MiniChip(text: 'FEP : $fep'),
              if (offerings.isNotEmpty)
                _MiniChip(text: '${offerings.length} établissement(s)'),
            ],
          ),
          if (eligibilityMap['message'] != null) ...[
            const SizedBox(height: 9),
            Text(
              eligibilityMap['message'].toString(),
              style: TextStyle(
                color: eligibilityColor,
                fontWeight: FontWeight.w800,
                fontSize: 11.5,
                height: 1.35,
              ),
            ),
          ],
          const SizedBox(height: 9),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: officialColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: officialColor.withValues(alpha: 0.28)),
            ),
            child: Row(
              children: [
                Icon(
                  _calculationIcon(officialStatus),
                  color: officialColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        officialMap['label']?.toString() ??
                            'Vérification du classement',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: officialColor,
                          fontWeight: FontWeight.w900,
                          fontSize: 11.5,
                        ),
                      ),
                      if (officialMap['value'] != null)
                        Text(
                          'Résultat : '
                          '${_formatCalculationNumber(officialMap['value'])}/20',
                          style: TextStyle(
                            color: officialColor,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      else
                        Text(
                          missingSubjects.isNotEmpty
                              ? 'Notes à compléter : '
                                    '${missingSubjects.join(', ')}'
                              : 'Vérification disponible',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 10),
                        ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _showOfficialCalculation(
                    context,
                    programName: name,
                    official: officialMap,
                    components: officialComponents,
                    missingSubjects: missingSubjects,
                    color: officialColor,
                  ),
                  child: const Text('Voir le calcul'),
                ),
              ],
            ),
          ),
          if (subjects.isNotEmpty) ...[
            const SizedBox(height: 9),
            SelectableText(
              'Matières : ${subjects.join(', ')}',
              style: const TextStyle(fontSize: 11.5, height: 1.4),
            ),
          ],
          if (offerings.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Text(
              'Universités et établissements',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w900,
                color: _LiveApresBacIaScreenState.green,
              ),
            ),
            const SizedBox(height: 5),
            ...offerings.take(5).map((offering) {
              final university = offering['university']?.toString().trim();
              final institution = offering['institution']?.toString().trim();
              final campus = offering['campus']?.toString().trim();
              final title = [
                if (institution?.isNotEmpty == true) institution,
                if (university?.isNotEmpty == true && university != institution)
                  university,
              ].whereType<String>().join(' · ');

              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.account_balance_outlined,
                      size: 15,
                      color: _LiveApresBacIaScreenState.green,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        campus?.isNotEmpty == true ? '$title — $campus' : title,
                        style: const TextStyle(fontSize: 10.8, height: 1.35),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
          if (reasons.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...reasons
                .take(3)
                .map(
                  (reason) => Padding(
                    padding: const EdgeInsets.only(bottom: 3),
                    child: Text(
                      '• $reason',
                      style: const TextStyle(fontSize: 11, height: 1.35),
                    ),
                  ),
                ),
          ],
          if (_value('outcomes', '').isNotEmpty) ...[
            const SizedBox(height: 8),
            SelectableText(
              'Débouchés : ${_value('outcomes', '')}',
              style: const TextStyle(fontSize: 11, height: 1.4),
            ),
          ],
          if (occupations.isNotEmpty) ...[
            const SizedBox(height: 7),
            SelectableText(
              'Métiers : ${occupations.take(8).join(', ')}',
              style: const TextStyle(fontSize: 11, height: 1.4),
            ),
          ],
          const SizedBox(height: 9),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              _ProgramActionButton(
                icon: Icons.verified_user_outlined,
                label: 'Éligibilité',
                onPressed: () => onVerify(
                  'Vérifie mon éligibilité indicative à la filière $name avec mes notes.',
                ),
              ),
              _ProgramActionButton(
                icon: Icons.account_balance_outlined,
                label: 'Universités',
                onPressed: () => onVerify(
                  'Quelles universités et quels établissements proposent la filière $name ?',
                ),
              ),
              _ProgramActionButton(
                icon: Icons.work_outline_rounded,
                label: 'Métiers',
                onPressed: () => onVerify(
                  'Présente les métiers et débouchés de la filière $name.',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProgramActionButton extends StatelessWidget {
  const _ProgramActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      child: FilledButton.tonalIcon(
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          textStyle: const TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: _LiveApresBacIaScreenState.line),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: Chip(
          avatar: SizedBox(
            width: 15,
            height: 15,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          label: Text('AprèsBac IA prépare une réponse détaillée…'),
        ),
      ),
    );
  }
}

class _ChatItem {
  const _ChatItem({
    required this.assistant,
    required this.text,
    this.summary,
    this.sections = const [],
    this.programs = const [],
    this.followUps = const [],
    this.disclaimer,
    this.meta = const {},
    this.error = false,
    this.retryPrompt,
  });

  final bool assistant;
  final String text;
  final String? summary;
  final List<Map<String, dynamic>> sections;
  final List<Map<String, dynamic>> programs;
  final List<String> followUps;
  final String? disclaimer;
  final Map<String, dynamic> meta;
  final bool error;
  final String? retryPrompt;
}

class _ApresBacUiException implements Exception {
  const _ApresBacUiException({
    required this.message,
    this.stage,
    this.technicalMessage,
  });

  final String message;
  final String? stage;
  final String? technicalMessage;

  @override
  String toString() => message;
}
