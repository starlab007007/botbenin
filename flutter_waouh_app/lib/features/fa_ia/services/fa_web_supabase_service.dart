import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/fa_web_corpus_repository.dart';
import '../domain/fa_web_models.dart';

class FaWebSupabaseService {
  FaWebSupabaseService({
    required this.corpus,
  });

  static const endpoint =
      'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-fa-chat';
  static const anonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtdnlucXBxdWxoZmx4dHl5bXR6cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ3NTk4MTUzLCJleHAiOjIwNjMxMzQxNTN9.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8';

  final FaWebCorpusRepository corpus;

  Future<String> ask({
    required FaWebResolvedSign sign,
    required String category,
    required String intention,
    required String question,
    required FaWebFocus focus,
    required List<FaWebChatMessage> history,
    required String deviceId,
    required String? accessCode,
  }) async {
    final transport = await corpus.transportMessage(
      sign: sign,
      category: category,
      intention: intention,
      originalQuestion: question,
      focus: focus,
    );

    final compactHistory = history
        .where(
            (message) => !message.text.startsWith('Interprétation intégrale -'))
        .toList()
        .reversed
        .take(6)
        .toList()
        .reversed
        .map((message) => <String, dynamic>{
              'role': message.isUser ? 'user' : 'assistant',
              'content': message.text.length > 1200
                  ? message.text.substring(0, 1200)
                  : message.text,
            })
        .toList();

    final body = <String, dynamic>{
      'action': 'interpret',
      'sign': <String, dynamic>{
        'reference': sign.reference,
        'canonical_name': sign.name,
        'x': sign.x.name,
        'y': sign.y.name,
        'column_a': sign.columnA,
        'column_b': sign.columnB,
      },
      'context': <String, dynamic>{
        'category': category,
        'intention': intention,
        'locale': 'fr-BJ',
      },
      'focus': <String, dynamic>{
        'intent_key': focus.key,
        'label': focus.label,
        'instruction': focus.instruction,
        'required_sections': <String>[focus.label],
        'excluded_angles': <String>[],
      },
      'history': compactHistory,
      'user_message': transport,
      'constraints': <String, dynamic>{
        'document_only': true,
        'simple_french': true,
        'detail_level': 'balanced',
        'max_words': focus.maxWords,
        'hide_sources': true,
        'speak_as_fa_knowledge': true,
        'differentiate_each_payload': true,
        'contextualize_with_intention': true,
        'no_invented_ritual': true,
        'no_occult_accusation': true,
        'no_generic_base_sign_combination': true,
      },
      'device_id': deviceId,
      'access_code': accessCode,
    };

    try {
      final result = await _post(body, deviceId, accessCode);
      final answer = '${result['answer'] ?? ''}'.trim();
      if (answer.isEmpty) {
        return corpus.localAnswer(
          sign: sign,
          category: category,
          intention: intention,
          originalQuestion: question,
          focus: focus,
        );
      }
      return FaWebCorpusRepository.cleanAnswer(answer);
    } on FaWebQuotaException {
      rethrow;
    } catch (_) {
      return corpus.localAnswer(
        sign: sign,
        category: category,
        intention: intention,
        originalQuestion: question,
        focus: focus,
      );
    }
  }

  Future<Map<String, dynamic>> _post(
    Map<String, dynamic> body,
    String deviceId,
    String? accessCode,
  ) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 25);
    try {
      final request = await client.postUrl(Uri.parse(endpoint));
      final token = _currentAccessToken() ?? anonKey;
      request.headers.contentType = ContentType.json;
      request.headers.set('apikey', anonKey);
      request.headers.set('Authorization', 'Bearer $token');
      request.headers.set('x-fa-device', deviceId);
      if (accessCode != null && accessCode.length == 6) {
        request.headers.set('x-fa-code', accessCode);
      }
      request.write(jsonEncode(body));

      final response = await request.close().timeout(
            const Duration(seconds: 75),
          );
      final raw = await utf8.decoder.bind(response).join();
      final decoded =
          raw.trim().isEmpty ? <String, dynamic>{} : jsonDecode(raw);
      final data = decoded is Map
          ? Map<String, dynamic>.from(decoded)
          : <String, dynamic>{'raw': decoded};

      if (response.statusCode == 402) {
        throw FaWebQuotaException(
          reason: '${data['reason'] ?? 'quota_exceeded'}',
          message: '${data['message'] ?? 'Quota atteint.'}',
          details: data,
        );
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw FaWebBackendException(
          '${data['message'] ?? data['error'] ?? 'FA IA indisponible.'}',
          status: response.statusCode,
        );
      }
      return data;
    } on FaWebQuotaException {
      rethrow;
    } on FaWebBackendException {
      rethrow;
    } on SocketException {
      throw const FaWebBackendException(
        'Connexion indisponible. Vérifiez Internet puis réessayez.',
      );
    } on TimeoutException {
      throw const FaWebBackendException(
        'Le serveur FA IA met trop de temps à répondre.',
      );
    } on FormatException {
      throw const FaWebBackendException('Réponse serveur FA IA invalide.');
    } finally {
      client.close(force: true);
    }
  }

  String? _currentAccessToken() {
    try {
      return Supabase.instance.client.auth.currentSession?.accessToken;
    } catch (_) {
      return null;
    }
  }
}
