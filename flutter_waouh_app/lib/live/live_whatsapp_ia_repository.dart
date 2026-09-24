import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_whatsapp_ia_gateway.dart';
import 'live_whatsapp_ia_models.dart';

/// Repository du nouveau WhatsApp IA Studio.
///
/// Toutes les actions WAHA passent par `waha-session-mobile`, qui vérifie
/// systématiquement le propriétaire de chaque session avant toute opération.
class LiveWhatsAppIaRepository {
  LiveWhatsAppIaRepository(this.client)
      : gateway = LiveWhatsAppIaGateway(client);

  final SupabaseClient client;
  final LiveWhatsAppIaGateway gateway;

  Future<LiveWhatsAppDashboard> load() async {
    final user = gateway.user;

    final response = await client
        .from('whatsapp_accounts')
        .select(
          'id,session_name,status,phone_number,created_at,waha_session_data',
        )
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    final local = (response as List)
        .whereType<Map>()
        .map(
          (row) => LiveWhatsAppSession.fromDatabase(
            Map<String, dynamic>.from(row),
          ),
        )
        .where((item) => item.name.isNotEmpty)
        .toList();

    String? remoteError;
    final refreshed = <String, LiveWhatsAppSession>{
      for (final item in local) item.name: item,
    };

    for (final item in local) {
      try {
        final data = await _mobile(
          action: 'status',
          sessionName: item.name,
        );
        final account = _account(data);
        if (account != null) {
          refreshed[item.name] = LiveWhatsAppSession.fromDatabase(account);
        }
      } catch (error) {
        remoteError ??= _friendlyError('$error');
      }
    }

    final sessions = refreshed.values.toList()
      ..sort(
        (a, b) => (b.createdAt ?? DateTime(1970))
            .compareTo(a.createdAt ?? DateTime(1970)),
      );

    return LiveWhatsAppDashboard(
      sessions: sessions,
      remoteError: remoteError,
    );
  }

  Future<LiveWhatsAppSession> create(String displayName) async {
    final clean = displayName.trim();

    if (clean.isEmpty) {
      throw const LiveWhatsAppIaException(
        'Indiquez un nom pour votre ligne WhatsApp.',
      );
    }

    final data = await _mobile(
      action: 'create',
      displayName: clean,
    );

    return _requiredAccount(data);
  }

  Future<void> start(String sessionName) =>
      _mobile(action: 'start', sessionName: sessionName);

  Future<void> stop(String sessionName) =>
      _mobile(action: 'stop', sessionName: sessionName);

  Future<void> delete(String sessionName) =>
      _mobile(action: 'delete', sessionName: sessionName);

  Future<String> fetchQr(String sessionName) async {
    final data = await _mobile(
      action: 'qr',
      sessionName: sessionName,
    );

    final qrCode = _text(data['qrCode'] ?? data['qr']);

    if (qrCode.isEmpty) {
      throw const LiveWhatsAppIaException(
        'WAHA ne retourne pas encore de QR Code pour cette ligne.',
      );
    }

    return qrCode;
  }

  Future<LivePairCode> pairingCode({
    required String sessionName,
    required String phone,
  }) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');

    if (digits.length < 8) {
      throw const LiveWhatsAppIaException(
        'Utilisez votre numéro WhatsApp au format international, par exemple 22990000000.',
      );
    }

    final data = await _mobile(
      action: 'pair-code',
      sessionName: sessionName,
      phoneNumber: digits,
    );

    final code = _text(data['code']);

    if (code.isEmpty) {
      throw const LiveWhatsAppIaException(
        'Code de liaison indisponible. Utilisez plutôt le QR Code.',
      );
    }

    final rawExpires = data['expires_in'];
    final expires =
        rawExpires is int ? rawExpires : int.tryParse('$rawExpires') ?? 300;

    return LivePairCode(
      code: code,
      expiresIn: expires,
    );
  }

  Future<Map<String, dynamic>> _mobile({
    required String action,
    String? sessionName,
    String? displayName,
    String? phoneNumber,
  }) async {
    try {
      final response = await client.functions.invoke(
        'waha-session-mobile',
        body: <String, dynamic>{
          'action': action,
          if (sessionName != null) 'sessionName': sessionName,
          if (displayName != null) 'displayName': displayName,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
        },
      ).timeout(const Duration(seconds: 35));

      final data = _map(response.data);

      if (data['success'] != true) {
        final rawMessage = _text(data['error'] ?? data['message']);
        throw LiveWhatsAppIaException(
          _friendlyError(
            rawMessage.isEmpty
                ? 'Service WhatsApp IA indisponible.'
                : rawMessage,
          ),
        );
      }

      return data;
    } on TimeoutException {
      throw const LiveWhatsAppIaException(
        'WAHA met trop de temps à répondre. Réessayez dans quelques secondes.',
      );
    } on FunctionException catch (error) {
      throw LiveWhatsAppIaException(
        _friendlyError(error.details?.toString() ?? error.toString()),
      );
    } on LiveWhatsAppIaException {
      rethrow;
    } catch (error) {
      throw LiveWhatsAppIaException(_friendlyError('$error'));
    }
  }

  LiveWhatsAppSession _requiredAccount(Map<String, dynamic> data) {
    final account = _account(data);

    if (account == null) {
      throw const LiveWhatsAppIaException(
        'La ligne WhatsApp a été créée, mais sa réponse est incomplète.',
      );
    }

    return LiveWhatsAppSession.fromDatabase(account);
  }

  Map<String, dynamic>? _account(Map<String, dynamic> data) {
    final value = data['account'];

    return value is Map ? Map<String, dynamic>.from(value) : null;
  }

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : const {};

  String _text(dynamic value) => '${value ?? ''}'.trim();

  String _friendlyError(String raw) {
    final value = raw.replaceFirst('LiveWhatsAppIaException: ', '').trim();

    final lower = value.toLowerCase();

    if (lower.contains('exceed_egress_quota') ||
        lower.contains('status 402') ||
        lower.contains('code 402')) {
      return 'Le service WhatsApp IA est temporairement limité. Réessayez plus tard ou contactez l’administrateur.';
    }

    if (lower.contains('session_not_owned')) {
      return 'Cette ligne WhatsApp ne vous appartient pas ou n’existe plus.';
    }

    if (lower.contains('pair_code_unavailable')) {
      return 'Le code de liaison n’est pas disponible sur ce serveur WAHA. Utilisez le QR Code.';
    }

    if (lower.contains('waha_not_configured')) {
      return 'La connexion WAHA n’est pas encore configurée sur le serveur.';
    }

    return value.isEmpty ? 'Une erreur est survenue dans WhatsApp IA.' : value;
  }
}
