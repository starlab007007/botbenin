class LiveWhatsAppIaException implements Exception {
  const LiveWhatsAppIaException(this.message);

  final String message;

  @override
  String toString() => message;
}

class LiveWhatsAppSession {
  const LiveWhatsAppSession({
    this.id = '',
    required this.name,
    required this.status,
    this.wahaSessionName,
    this.phone,
    this.createdAt,
  });

  final String id;
  final String name;
  final String? wahaSessionName;
  final String status;
  final String? phone;
  final DateTime? createdAt;

  bool get isWorking => const {
        'WORKING',
        'AUTHENTICATED',
        'READY',
        'CONNECTED',
      }.contains(status.toUpperCase());

  bool get needsQr => const {
        'SCAN_QR_CODE',
        'STARTING',
        'CONNECTING',
        'STOPPED',
        'DISCONNECTED',
      }.contains(status.toUpperCase());

  String get displayPhone {
    final digits = (phone ?? '')
        .replaceAll(RegExp(r'@c\.us|@lid'), '')
        .replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return 'Aucun numéro lié';
    final value = digits.startsWith('229') && digits.length >= 11
        ? '+229 ${digits.substring(3, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)} ${digits.substring(9)}'
        : '+$digits';
    return value;
  }

  factory LiveWhatsAppSession.fromDatabase(Map<String, dynamic> row) =>
      LiveWhatsAppSession(
        id: '${row['id'] ?? ''}',
        name: '${row['session_name'] ?? ''}',
        wahaSessionName: row['waha_session_name']?.toString(),
        status: '${row['status'] ?? 'STOPPED'}',
        phone: row['phone_number']?.toString(),
        createdAt: DateTime.tryParse('${row['created_at'] ?? ''}')?.toLocal(),
      );

  factory LiveWhatsAppSession.fromWaha(Map<String, dynamic> row) {
    final config = row['config'] is Map
        ? Map<String, dynamic>.from(row['config'] as Map)
        : const <String, dynamic>{};
    final metadata = config['metadata'] is Map
        ? Map<String, dynamic>.from(config['metadata'] as Map)
        : const <String, dynamic>{};
    return LiveWhatsAppSession(
      name: '${row['name'] ?? row['session_name'] ?? ''}',
      wahaSessionName: '${row['name'] ?? row['waha_session_name'] ?? ''}',
      status: '${row['status'] ?? 'DISCONNECTED'}',
      phone: metadata['phone_number']?.toString() ??
          metadata['account']?.toString(),
    );
  }
}

class LiveWhatsAppDashboard {
  const LiveWhatsAppDashboard({
    required this.sessions,
    this.remoteError,
  });

  final List<LiveWhatsAppSession> sessions;
  final String? remoteError;

  int get connectedCount => sessions.where((item) => item.isWorking).length;
}

class LivePairCode {
  const LivePairCode({required this.code, required this.expiresIn});

  final String code;
  final int expiresIn;
}

class LiveWhatsAppBot {
  const LiveWhatsAppBot({
    required this.id,
    required this.name,
    this.webhookUrl,
  });

  final String id;
  final String name;
  final String? webhookUrl;

  factory LiveWhatsAppBot.fromJson(Map<String, dynamic> row) => LiveWhatsAppBot(
        id: '${row['id'] ?? ''}',
        name: '${row['name'] ?? 'Bot sans nom'}',
        webhookUrl: row['webhook_url']?.toString(),
      );
}
